/**
 * =============================================
 * TRAC ANALYTICS SDK v2.3.0 - FIRST-PARTY PROXY
 * =============================================
 * 
 * FEATURES:
 * - Cookie priority (HTTPOnly from middleware first)
 * - Dual storage fallback (Cookie + localStorage)
 * - Aggressive Stripe injection (Payment Links, Checkout, Buy Buttons)
 * - MutationObserver for SPA/React/Next.js (OPTIMIZED)
 * - History API Monkey-Patch for pushState/replaceState detection
 * - Robust retry pattern for Web Components
 * - requestIdleCallback for non-blocking initialization
 * - Debug mode with clear console logs
 * - First-Party Proxy for Anti-AdBlock resilience
 * 
 * CHANGELOG v2.3.0:
 * - [NEW] First-party proxy: all events sent to /api/analytics (anti-adblock)
 * - [NEW] sendEvent() function with fire-and-forget (keepalive: true)
 * - [NEW] trackPageview() for page view tracking
 * - [NEW] trackEvent() for custom event tracking
 * - [FIX] Removed hardcoded Tinybird URLs - all traffic through local tunnel
 * 
 * CHANGELOG v2.2.0:
 * - [FIX] Monkey-patch History API for SPA navigation (pushState/replaceState)
 * - [FIX] Optimized MutationObserver to avoid CPU waste
 * - [FIX] Retry pattern for stripe-buy-button Web Component loading
 * - [FIX] requestIdleCallback for non-blocking initial injection
 * 
 * USAGE:
 * <script src="https://your-domain.com/trac.js" data-key="pk_trac_xxx" defer></script>
 * 
 * DEBUG MODE:
 * <script src="..." data-key="..." data-debug defer></script>
 * 
 * API:
 * - Trac.getClickId()        - Get stored click ID
 * - Trac.trackConversion()   - Track a conversion event
 * - Trac.trackPageview()     - Track a page view
 * - Trac.trackEvent(name, data) - Track a custom event
 * - Trac.injectStripe()      - Manually inject ID into Stripe elements
 * =============================================
 */

(function () {
    'use strict';

    // =============================================
    // TRAC UTILS (DUB.CO ARCHITECTURE)
    // =============================================

    if (typeof window.TracUtils === 'undefined') {
        window.TracUtils = {
            generateClickId: function () {
                const timestamp = Math.floor(Date.now() / 1000);
                // Generate exactly 16 hex characters (8 bytes)
                let random = '';
                for (let i = 0; i < 16; i++) {
                    random += Math.floor(Math.random() * 16).toString(16);
                }
                return `clk_${timestamp}_${random}`;
            },
            isValidClickId: function (id) {
                return /^clk_\d+_[a-z0-9]{16}$/.test(id);
            },
            getRootDomain: function () {
                const hostname = window.location.hostname;
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return hostname;
                }
                const parts = hostname.split('.');
                return parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : hostname;
            }
        };
    }

    // =============================================
    // CONFIGURATION
    // =============================================

    var PARAM_NAME = 'trac_id';
    var COOKIE_NAME = 'trac_click_id';
    var LS_KEY = 'trac_click_id';
    var COOKIE_DAYS = 30;
    var TEST_COOKIE = '_trac_domain_test';
    var VERSION = '2.3.0';
    var NAVIGATION_EVENT = 'trac:navigation';

    // First-Party Proxy Endpoint (Anti-AdBlock)
    var ANALYTICS_ENDPOINT = '/_trac/api/analytics';

    // Retry config for Web Components
    var WEB_COMPONENT_RETRY_INTERVAL = 100; // ms
    var WEB_COMPONENT_MAX_RETRIES = 50; // 5 seconds max

    // AGGRESSIVE Stripe selectors for auto-injection
    var STRIPE_SELECTORS = [
        // Payment Links
        'a[href*="buy.stripe.com"]',
        'a[href*="checkout.stripe.com"]',
        'a[href*="payment.stripe.com"]',
        'a[href*="billing.stripe.com"]',

        // Forms
        'form[action*="stripe.com"]',

        // Stripe Buy Button Web Component
        'stripe-buy-button',

        // Stripe Pricing Table
        'stripe-pricing-table',

        // Common button classes (merchant-defined)
        '[data-stripe-checkout]',
        '[data-stripe-buy]',
        '.stripe-checkout-btn',
        '.stripe-buy-button',
        '#buy-btn',
        '#checkout-btn',

        // Trac explicit marker
        '[data-trac-inject]'
    ];

    // Internal config object
    var Config = {
        apiKey: null,
        apiEndpoint: '/_trac/api/track',
        debug: false,
        autoInject: true
    };

    // Track injected elements to avoid duplicates
    var injectedElements = new WeakSet();

    // Flag to ignore self-caused mutations
    var isSelfMutating = false;

    // =============================================
    // POLYFILL: requestIdleCallback
    // =============================================

    var requestIdleCallbackPolyfill = window.requestIdleCallback || function (cb) {
        var start = Date.now();
        return setTimeout(function () {
            cb({
                didTimeout: false,
                timeRemaining: function () {
                    return Math.max(0, 50 - (Date.now() - start));
                }
            });
        }, 1);
    };

    // =============================================
    // SCRIPT SELF-DETECTION
    // =============================================

    function initConfig() {
        try {
            // Priority 1: Global Config Object
            if (window.TracConfig) {
                if (window.TracConfig.apiKey) Config.apiKey = window.TracConfig.apiKey;
                if (window.TracConfig.apiEndpoint) Config.apiEndpoint = window.TracConfig.apiEndpoint;
                if (window.TracConfig.debug) Config.debug = window.TracConfig.debug;
                if (window.TracConfig.autoInject !== undefined) Config.autoInject = window.TracConfig.autoInject;
            }

            // Priority 2: Script Attributes (overrides global config)
            var scripts = document.querySelectorAll('script[src*="trac.js"]');
            for (var i = 0; i < scripts.length; i++) {
                var script = scripts[i];

                var apiKey = script.getAttribute('data-key');
                if (apiKey) Config.apiKey = apiKey;

                var endpoint = script.getAttribute('data-endpoint');
                if (endpoint) Config.apiEndpoint = endpoint;

                // Support data-api-host (sets base for endpoint)
                var apiHost = script.getAttribute('data-api-host');
                if (apiHost) {
                    // Remove trailing slash if present
                    apiHost = apiHost.replace(/\/$/, '');
                    Config.apiEndpoint = apiHost + '/api/track';
                }

                if (script.hasAttribute('data-debug')) Config.debug = true;
                if (script.hasAttribute('data-no-inject')) Config.autoInject = false;
            }

            if (Config.debug) {
                console.log('[Trac] 🔧 Config:', Config);
            }
        } catch (e) {
            // Silent fail
        }
    }

    // =============================================
    // ROOT DOMAIN DETECTION
    // =============================================

    var cachedRootDomain = null;

    function getRootDomain() {
        if (cachedRootDomain) return cachedRootDomain;

        try {
            var hostname = window.location.hostname;

            // Skip for localhost or IP addresses
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                cachedRootDomain = hostname;
                return hostname;
            }
            if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
                cachedRootDomain = hostname;
                return hostname;
            }

            var parts = hostname.split('.');

            // Test cookie at each domain level
            for (var i = parts.length - 1; i >= 0; i--) {
                var testDomain = '.' + parts.slice(i).join('.');
                document.cookie = TEST_COOKIE + '=1;domain=' + testDomain + ';path=/;max-age=1';

                if (document.cookie.indexOf(TEST_COOKIE + '=1') !== -1) {
                    document.cookie = TEST_COOKIE + '=;domain=' + testDomain + ';path=/;max-age=0';
                    cachedRootDomain = testDomain;
                    return testDomain;
                }
            }

            cachedRootDomain = hostname;
            return hostname;
        } catch (e) {
            cachedRootDomain = window.location.hostname;
            return cachedRootDomain;
        }
    }

    // =============================================
    // DUAL STORAGE: Cookie + localStorage
    // =============================================

    function setCookie(name, value, days) {
        try {
            var expires = '';
            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toUTCString();
            }

            var domain = getRootDomain();
            var domainAttr = domain.startsWith('.') ? '; domain=' + domain : '';
            var secure = window.location.protocol === 'https:' ? '; Secure' : '';

            document.cookie = name + '=' + encodeURIComponent(value) +
                expires +
                '; path=/' +
                domainAttr +
                '; SameSite=Lax' +
                secure;

            if (Config.debug) {
                console.log('[Trac] 🍪 Cookie set:', name, '=', value, 'on', domain);
            }
        } catch (e) {
            // Cookie blocked - rely on localStorage
        }
    }

    function getCookie(name) {
        try {
            var nameEQ = name + '=';
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var c = cookies[i].trim();
                if (c.indexOf(nameEQ) === 0) {
                    return decodeURIComponent(c.substring(nameEQ.length));
                }
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }

    function deleteCookie(name) {
        try {
            var domain = getRootDomain();
            var domainAttr = domain.startsWith('.') ? '; domain=' + domain : '';
            document.cookie = name + '=; path=/' + domainAttr + '; max-age=0';
        } catch (e) {
            // Ignore
        }
    }

    function setLocalStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
            if (Config.debug) {
                console.log('[Trac] 💾 localStorage set:', key, '=', value);
            }
        } catch (e) {
            // localStorage blocked (Safari private mode)
        }
    }

    function getLocalStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function deleteLocalStorage(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            // Ignore
        }
    }

    /**
     * BULLETPROOF STORAGE: Write to BOTH Cookie AND localStorage
     */
    function saveClickId(value) {
        setCookie(COOKIE_NAME, value, COOKIE_DAYS);
        setLocalStorage(LS_KEY, value);
    }

    /**
     * BULLETPROOF RETRIEVAL: 
     * Priority order:
     * 1. HTTPOnly cookie (set by middleware - most reliable)
     * 2. JavaScript cookie (set by SDK)
     * 3. localStorage
     */
    function loadClickId() {
        // Priority 1 & 2: Cookie (includes HTTPOnly from middleware)
        var fromCookie = getCookie(COOKIE_NAME);
        if (fromCookie) {
            // Sync to localStorage if missing
            if (!getLocalStorage(LS_KEY)) {
                setLocalStorage(LS_KEY, fromCookie);
            }
            if (Config.debug) {
                console.log('[Trac] 🍪 Click ID from cookie:', fromCookie);
            }
            return fromCookie;
        }

        // Priority 3: localStorage (backup)
        var fromLS = getLocalStorage(LS_KEY);
        if (fromLS) {
            // Sync to cookie if missing
            setCookie(COOKIE_NAME, fromLS, COOKIE_DAYS);
            if (Config.debug) {
                console.log('[Trac] 💾 Click ID from localStorage:', fromLS);
            }
            return fromLS;
        }

        return null;
    }

    function clearClickId() {
        deleteCookie(COOKIE_NAME);
        deleteLocalStorage(LS_KEY);
        console.log('[Trac] 🗑️ Click ID cleared');
    }

    // =============================================
    // URL UTILITIES + MULTI-SOURCE TRACKING
    // =============================================

    // Multi-source click tracking (Traaaction architecture)
    var CLICK_SOURCES = {
        'gclid': { cookie: '_trac_gclid', duration: 90 },
        'fbclid': { cookie: '_trac_fbclid', duration: 90 },
        'trac_id': { cookie: '_trac_click_id', duration: 30 },
        'ref': { cookie: '_trac_ref', duration: 30 },
        'via': { cookie: '_trac_via', duration: 90 },
        'clk': { cookie: 'clk_id', duration: 90 }  // Primary
    };

    function getUrlParam(name) {
        try {
            var params = new URLSearchParams(window.location.search);
            return params.get(name);
        } catch (e) {
            return null;
        }
    }

    function captureAllClickIds() {
        var params = new URLSearchParams(window.location.search);

        Object.entries(CLICK_SOURCES).forEach(function (entry) {
            var paramName = entry[0];
            var config = entry[1];
            var value = params.get(paramName);
            if (value) {
                setCookie(config.cookie, value, config.duration);
                setLocalStorage(config.cookie, value);
                extendClickIdViaServer(value);
                console.log('[Trac] Captured ' + paramName + '=' + value + ' → ' + config.cookie);
            }
        });
    }

    function extendClickIdViaServer(clickId) {
        fetch('/_trac/api/track/click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ click_id: clickId }),
            credentials: 'include'  // CRITICAL
        }).catch(function () {
            console.debug('[Trac] Server extension failed (using client-side only)');
        });
    }

    function getPrimaryClickId() {
        return getCookie('clk_id') ||
            getCookie('_trac_gclid') ||
            getCookie('_trac_fbclid') ||
            getCookie('_trac_click_id') ||
            getCookie('_trac_ref');
    }

    function cleanUrl() {
        try {
            var url = new URL(window.location.href);
            if (url.searchParams.has(PARAM_NAME)) {
                url.searchParams.delete(PARAM_NAME);
                // Also clean client_reference_id if present
                url.searchParams.delete('client_reference_id');
                var cleanedUrl = url.pathname + url.search + url.hash;
                window.history.replaceState({}, document.title, cleanedUrl || '/');
                if (Config.debug) {
                    console.log('[Trac] 🧹 URL cleaned');
                }
            }
        } catch (e) {
            // Old browser, ignore
        }
    }

    // =============================================
    // HISTORY API MONKEY-PATCH (SPA NAVIGATION)
    // =============================================

    function monkeyPatchHistoryAPI() {
        try {
            var originalPushState = history.pushState;
            var originalReplaceState = history.replaceState;

            history.pushState = function () {
                var result = originalPushState.apply(this, arguments);
                // Dispatch custom navigation event
                window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, {
                    detail: { type: 'pushState', args: arguments }
                }));
                return result;
            };

            history.replaceState = function () {
                var result = originalReplaceState.apply(this, arguments);
                // Dispatch custom navigation event
                window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, {
                    detail: { type: 'replaceState', args: arguments }
                }));
                return result;
            };

            if (Config.debug) {
                console.log('[Trac] 🔗 History API monkey-patched for SPA navigation');
            }
        } catch (e) {
            if (Config.debug) {
                console.warn('[Trac] ⚠️ Failed to monkey-patch History API:', e);
            }
        }
    }

    function listenForSPANavigation() {
        // Listen for custom navigation event (from monkey-patch)
        window.addEventListener(NAVIGATION_EVENT, function (e) {
            if (Config.debug) {
                console.log('[Trac] 🧭 SPA navigation detected:', e.detail.type);
            }
            // Re-inject Stripe elements after navigation
            // Small delay to allow DOM to update
            setTimeout(function () {
                injectStripe();
            }, 50);
        });

        // Also listen for popstate (back/forward buttons)
        window.addEventListener('popstate', function () {
            if (Config.debug) {
                console.log('[Trac] 🧭 popstate navigation detected');
            }
            setTimeout(function () {
                injectStripe();
            }, 100);
        });
    }

    // =============================================
    // STRIPE AUTO-INJECTION (AGGRESSIVE)
    // =============================================

    /**
     * Inject client_reference_id into a single element
     * Returns true if injection was performed
     */
    function injectIntoElement(el, clickId) {
        // Skip if already injected
        if (injectedElements.has(el)) {
            return false;
        }

        var tagName = el.tagName ? el.tagName.toUpperCase() : '';
        var injected = false;
        var info = '';

        // Set flag to ignore self-caused mutations
        isSelfMutating = true;

        try {
            // CASE 1: Anchor links (Payment Links)
            if (tagName === 'A') {
                var href = el.getAttribute('href');
                if (href && (
                    href.includes('buy.stripe.com') ||
                    href.includes('checkout.stripe.com') ||
                    href.includes('payment.stripe.com') ||
                    href.includes('billing.stripe.com')
                )) {
                    var url = new URL(href, window.location.origin);
                    url.searchParams.set('client_reference_id', clickId);
                    el.setAttribute('href', url.toString());
                    injected = true;
                    info = url.hostname + url.pathname;
                }
            }

            // CASE 2: Forms
            else if (tagName === 'FORM') {
                var existingInput = el.querySelector('input[name="client_reference_id"]');
                if (existingInput) {
                    existingInput.value = clickId;
                } else {
                    var hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = 'client_reference_id';
                    hiddenInput.value = clickId;
                    el.appendChild(hiddenInput);
                }
                injected = true;
                info = 'form[action=' + (el.action || 'unknown') + ']';
            }

            // CASE 3: Stripe Buy Button Web Component
            else if (tagName === 'STRIPE-BUY-BUTTON') {
                // Set data attribute - Stripe reads this
                el.setAttribute('client-reference-id', clickId);
                injected = true;
                info = 'stripe-buy-button';
            }

            // CASE 4: Stripe Pricing Table Web Component
            else if (tagName === 'STRIPE-PRICING-TABLE') {
                el.setAttribute('client-reference-id', clickId);
                injected = true;
                info = 'stripe-pricing-table';
            }

            // CASE 5: Generic element with data-trac-inject
            else if (el.hasAttribute && el.hasAttribute('data-trac-inject')) {
                el.setAttribute('data-client-reference-id', clickId);
                injected = true;
                info = 'data-trac-inject element';
            }

            // Mark as injected
            if (injected) {
                injectedElements.add(el);
                console.log('[Trac] 💉 Injected click_id:', clickId, 'into Stripe Link:', info);
            }

        } catch (e) {
            if (Config.debug) {
                console.error('[Trac] ⚠️ Injection error:', e);
            }
        } finally {
            // Reset flag after mutation is complete
            // Use setTimeout to ensure DOM mutation has been processed
            setTimeout(function () {
                isSelfMutating = false;
            }, 0);
        }

        return injected;
    }

    /**
     * Inject client_reference_id into ALL Stripe links/forms
     */
    function injectStripe() {
        var clickId = loadClickId();
        if (!clickId) {
            if (Config.debug) {
                console.log('[Trac] ⚠️ No click ID to inject');
            }
            return 0;
        }

        var injectedCount = 0;

        // Find all matching elements
        var selector = STRIPE_SELECTORS.join(', ');
        var elements;
        try {
            elements = document.querySelectorAll(selector);
        } catch (e) {
            elements = [];
        }

        for (var i = 0; i < elements.length; i++) {
            if (injectIntoElement(elements[i], clickId)) {
                injectedCount++;
            }
        }

        // Also check for any links we might have missed
        try {
            var allLinks = document.querySelectorAll('a[href]');
            for (var j = 0; j < allLinks.length; j++) {
                var href = allLinks[j].getAttribute('href') || '';
                if (href.includes('stripe.com')) {
                    if (injectIntoElement(allLinks[j], clickId)) {
                        injectedCount++;
                    }
                }
            }
        } catch (e) {
            // Ignore
        }

        if (injectedCount > 0) {
            console.log('[Trac] ✅ Total Stripe elements injected:', injectedCount);
        }

        return injectedCount;
    }

    /**
     * Robust retry pattern for Web Components
     * Waits for stripe-buy-button to be defined before injection
     */
    function waitForWebComponentsAndInject() {
        var retryCount = 0;

        var intervalId = setInterval(function () {
            retryCount++;

            // Check if stripe-buy-button exists in DOM
            var stripeBuyButtons = document.querySelectorAll('stripe-buy-button');
            var stripePricingTables = document.querySelectorAll('stripe-pricing-table');

            if (stripeBuyButtons.length > 0 || stripePricingTables.length > 0) {
                // Found Web Components - wait for them to be defined
                var promises = [];

                if (stripeBuyButtons.length > 0 && window.customElements) {
                    promises.push(
                        customElements.whenDefined('stripe-buy-button').catch(function () { })
                    );
                }

                if (stripePricingTables.length > 0 && window.customElements) {
                    promises.push(
                        customElements.whenDefined('stripe-pricing-table').catch(function () { })
                    );
                }

                if (promises.length > 0) {
                    Promise.all(promises).then(function () {
                        // Small delay after definition to ensure component is ready
                        setTimeout(injectStripe, 50);
                    });
                } else {
                    // customElements not supported, inject anyway
                    injectStripe();
                }

                // Clear interval - we found what we needed
                clearInterval(intervalId);

                if (Config.debug) {
                    console.log('[Trac] 🎯 Web Components detected after', retryCount, 'retries');
                }
            }

            // Stop retrying after max attempts
            if (retryCount >= WEB_COMPONENT_MAX_RETRIES) {
                clearInterval(intervalId);
                if (Config.debug) {
                    console.log('[Trac] ℹ️ No Stripe Web Components found after', retryCount, 'retries');
                }
            }
        }, WEB_COMPONENT_RETRY_INTERVAL);

        // Return cleanup function
        return function () {
            clearInterval(intervalId);
        };
    }

    /**
     * Observe DOM for dynamically added Stripe elements
     * OPTIMIZED: Checks injectedElements BEFORE processing
     */
    function observeDOM() {
        if (!window.MutationObserver) return;

        try {
            var observer = new MutationObserver(function (mutations) {
                // OPTIMIZATION: Skip if we caused this mutation
                if (isSelfMutating) {
                    return;
                }

                var shouldInject = false;

                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];

                    // Check added nodes
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node.nodeType === 1) { // Element node
                            // OPTIMIZATION: Skip if already injected
                            if (injectedElements.has(node)) {
                                continue;
                            }

                            var tagName = node.tagName ? node.tagName.toUpperCase() : '';

                            // Quick checks for Stripe elements
                            if (
                                tagName === 'STRIPE-BUY-BUTTON' ||
                                tagName === 'STRIPE-PRICING-TABLE' ||
                                tagName === 'A' ||
                                tagName === 'FORM' ||
                                (node.querySelector && node.querySelector(STRIPE_SELECTORS.join(', ')))
                            ) {
                                shouldInject = true;
                                break;
                            }
                        }
                    }

                    // Check attribute changes on existing elements
                    if (mutation.type === 'attributes') {
                        var target = mutation.target;

                        // OPTIMIZATION: Skip if already injected
                        if (injectedElements.has(target)) {
                            continue;
                        }

                        // Check for href changes on anchors
                        if (mutation.attributeName === 'href') {
                            var href = target.getAttribute && target.getAttribute('href');
                            if (href && href.includes('stripe.com')) {
                                shouldInject = true;
                            }
                        }

                        // Check for client-reference-id changes we didn't cause
                        if (mutation.attributeName === 'client-reference-id') {
                            // Skip - this was likely set by us or by Stripe itself
                            continue;
                        }
                    }

                    if (shouldInject) break;
                }

                if (shouldInject) {
                    // Debounce
                    clearTimeout(window._tracInjectTimer);
                    window._tracInjectTimer = setTimeout(function () {
                        injectStripe();
                    }, 50); // Faster response for SPA
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href', 'client-reference-id']
            });

            if (Config.debug) {
                console.log('[Trac] 👁️ MutationObserver active (optimized)');
            }
        } catch (e) {
            // MutationObserver not supported
        }
    }

    // =============================================
    // SERVER-SIDE RECOVERY (FALLBACK)
    // =============================================

    function tryServerRecovery(callback) {
        try {
            var recoveryUrl = '/api/trac-id';

            // If SDK is loaded from different origin, use that origin
            var scripts = document.querySelectorAll('script[src*="trac.js"]');
            if (scripts.length > 0 && scripts[0].src) {
                try {
                    var scriptUrl = new URL(scripts[0].src);
                    recoveryUrl = scriptUrl.origin + '/api/trac-id';
                } catch (e) {
                    // Keep default
                }
            }

            fetch(recoveryUrl, {
                method: 'GET',
                credentials: 'include'
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.click_id) {
                        saveClickId(data.click_id);
                        console.log('[Trac] ✅ Click ID recovered from server:', data.click_id);
                        if (callback) callback(data.click_id);
                    } else {
                        if (Config.debug) {
                            console.log('[Trac] ℹ️ No attribution found (direct visit)');
                        }
                        if (callback) callback(null);
                    }
                })
                .catch(function (err) {
                    if (Config.debug) {
                        console.log('[Trac] ⚠️ Server recovery failed:', err.message);
                    }
                    if (callback) callback(null);
                });
        } catch (e) {
            if (callback) callback(null);
        }
    }

    // =============================================
    // CORE INITIALIZATION
    // =============================================

    function init() {
        initConfig();

        // Setup History API monkey-patch FIRST (for SPA support)
        monkeyPatchHistoryAPI();
        listenForSPANavigation();

        // NOUVEAU: Capture tous les click IDs (multi-source)
        captureAllClickIds();

        // 1. CAPTURE: Check for trac_id in URL (LAST CLICK WINS)
        var urlTracId = getUrlParam(PARAM_NAME);

        if (urlTracId) {
            // New attribution - overwrite existing (Last Click Wins)
            saveClickId(urlTracId);
            console.log('[Trac] ✅ Click ID captured from URL:', urlTracId);
            cleanUrl();

            // Inject using requestIdleCallback (non-blocking)
            if (Config.autoInject) {
                requestIdleCallbackPolyfill(function () {
                    injectStripe();
                    waitForWebComponentsAndInject();
                });
            }
        } else {
            // 2. STORAGE CHECK: Try to load from dual storage
            var existingId = loadClickId();

            if (existingId) {
                console.log('[Trac] 📌 Using existing Click ID:', existingId);

                // Inject using requestIdleCallback (non-blocking)
                if (Config.autoInject) {
                    requestIdleCallbackPolyfill(function () {
                        injectStripe();
                        waitForWebComponentsAndInject();
                    });
                }
            } else {
                // 3. SERVER RECOVERY: Last resort for stripped parameters
                if (Config.debug) {
                    console.log('[Trac] 🔄 Attempting server-side recovery...');
                }
                tryServerRecovery(function (recoveredId) {
                    if (recoveredId && Config.autoInject) {
                        requestIdleCallbackPolyfill(function () {
                            injectStripe();
                            waitForWebComponentsAndInject();
                        });
                    }
                });
            }
        }

        // 4. OBSERVE: Watch for dynamically added Stripe elements (SPA support)
        if (Config.autoInject) {
            if (document.readyState === 'complete') {
                observeDOM();
            } else {
                window.addEventListener('load', function () {
                    observeDOM();
                });
            }
        }

        // 5. AUTO-PING: Verify cookie persistence and send page_view
        autoPingPageView();
    }

    // =============================================
    // AUTO-PING: PAGE VIEW WITH COOKIE VERIFICATION
    // =============================================

    /**
     * Auto-ping on every page load:
     * - Verifies clk_id cookie is present
     * - Sends enriched page_view event if cookie found
     * - Proves tracking persists across navigation
     */
    function autoPingPageView() {
        // Check for clk_id cookie (set by middleware on first click)
        var clkId = getCookie('clk_id');
        var tracId = loadClickId();

        console.log('========================================');
        console.log('[Trac] 🔍 AUTO-PING DIAGNOSTIC');
        console.log('[Trac] clk_id cookie:', clkId ? '✅ FOUND' : '❌ NOT FOUND');
        console.log('[Trac] trac_click_id:', tracId ? '✅ FOUND' : '❌ NOT FOUND');
        console.log('[Trac] Page:', window.location.pathname);
        console.log('========================================');

        // If either tracking ID is found, send enriched page_view
        var trackingId = clkId || tracId;

        if (trackingId) {
            console.log('[Trac] 📊 Sending enriched page_view with click_id:', trackingId);

            // Send page_view event with tracking proof
            sendEvent('page_views', {
                click_id: trackingId,
                page_url: window.location.href,
                page_path: window.location.pathname,
                page_title: document.title || '',
                referrer: document.referrer || '',
                timestamp: new Date().toISOString(),
                cookie_verified: !!clkId,  // Proves cookie persisted
                session_proof: true,       // Marker for attribution verification
                user_agent: navigator.userAgent || ''
            });

            console.log('[Trac] ✅ Page view tracked with attribution: session continues');
        } else {
            if (Config.debug) {
                console.log('[Trac] ℹ️ No tracking ID - visitor not yet attributed');
            }
        }
    }

    // =============================================
    // FIRST-PARTY PROXY: sendEvent (Fire-and-Forget)
    // =============================================

    /**
     * Send an event to the first-party proxy
     * Uses keepalive: true for fire-and-forget behavior
     * Silent error handling to avoid blocking user experience
     * 
     * @param {string} datasource - The Tinybird datasource name ('events', 'clicks', etc.)
     * @param {object} eventData - The event data to send
     * @returns {Promise} - Resolves to true on success, false on failure
     */
    function sendEvent(datasource, eventData) {
        var payload = {
            datasource: datasource,
            data: eventData
        };

        if (Config.debug) {
            console.log('[Trac] 📤 Sending event to proxy:', payload);
        }

        return fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            keepalive: true // Fire-and-forget: survives page unload
        })
            .then(function (res) {
                if (res.ok) {
                    if (Config.debug) {
                        console.log('[Trac] ✅ Event sent successfully');
                    }
                    return true;
                }
                if (Config.debug) {
                    console.error('[Trac] ❌ Event send failed:', res.status);
                }
                return false;
            })
            .catch(function (err) {
                // Silent error handling - don't block user experience
                if (Config.debug) {
                    console.error('[Trac] ❌ Network error (silent):', err.message);
                }
                return false;
            });
    }

    // =============================================
    // PUBLIC API: trackConversion
    // =============================================

    function trackConversion(data) {
        var clickId = loadClickId();

        if (!clickId) {
            console.warn('[Trac] ⚠️ No click ID found - conversion not tracked');
            return Promise.resolve(false);
        }

        var eventData = {
            click_id: clickId,
            event_name: (data && data.eventName) || 'conversion',
            amount: (data && data.amount) || 0,
            currency: (data && data.currency) || 'EUR',
            timestamp: new Date().toISOString()
        };

        console.log('[Trac] 📊 Tracking conversion:', eventData);

        // Send via first-party proxy
        return sendEvent('events', eventData);
    }

    // =============================================
    // PUBLIC API: trackPageview
    // =============================================

    function trackPageview(additionalData) {
        var clickId = loadClickId();

        var eventData = {
            click_id: clickId || null,
            event_name: 'pageview',
            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer || null,
            timestamp: new Date().toISOString()
        };

        // Merge additional data if provided
        if (additionalData && typeof additionalData === 'object') {
            for (var key in additionalData) {
                if (additionalData.hasOwnProperty(key)) {
                    eventData[key] = additionalData[key];
                }
            }
        }

        if (Config.debug) {
            console.log('[Trac] 👁️ Tracking pageview:', eventData);
        }

        return sendEvent('events', eventData);
    }

    // =============================================
    // PUBLIC API: trackEvent (Custom Events)
    // =============================================

    function trackEvent(eventName, eventData) {
        var clickId = loadClickId();

        var payload = {
            click_id: clickId || null,
            event_name: eventName || 'custom_event',
            timestamp: new Date().toISOString()
        };

        // Merge event data if provided
        if (eventData && typeof eventData === 'object') {
            for (var key in eventData) {
                if (eventData.hasOwnProperty(key)) {
                    payload[key] = eventData[key];
                }
            }
        }

        if (Config.debug) {
            console.log('[Trac] 📊 Tracking event:', eventName, payload);
        }

        return sendEvent('events', payload);
    }

    // =============================================
    // GLOBAL API
    // =============================================

    window.Trac = {
        // Core methods
        getClickId: loadClickId,
        clearClickId: clearClickId,
        trackConversion: trackConversion,
        trackPageview: trackPageview,
        trackEvent: trackEvent,

        // Multi-source tracking API
        getClickIds: function () {
            return {
                gclid: getCookie('_trac_gclid'),
                fbclid: getCookie('_trac_fbclid'),
                trac_id: getCookie('_trac_click_id'),
                clk: getCookie('clk_id'),
                primary: getPrimaryClickId()
            };
        },

        // Manual injection
        injectStripe: injectStripe,

        // Internal (exposed for advanced usage)
        sendEvent: sendEvent,

        // Config
        getApiKey: function () { return Config.apiKey; },
        getRootDomain: getRootDomain,
        isDebug: function () { return Config.debug; },

        // Version
        version: VERSION
    };

    // =============================================
    // AUTO-INITIALIZE
    // =============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Trac] 🚀 SDK v' + VERSION + ' loaded | Domain:', getRootDomain());

})();
