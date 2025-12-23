/**
 * =============================================
 * TRAC ANALYTICS SDK v2.0.0 - BULLETPROOF EDITION
 * =============================================
 * 
 * Multi-session persistence with dual storage (Cookie + localStorage).
 * Auto-injection into Stripe Payment Links and Checkout forms.
 * 
 * USAGE:
 * <script src="https://your-domain.com/trac.js" data-key="pk_trac_xxx" defer></script>
 * 
 * API:
 * - Trac.getClickId()      - Get stored click ID
 * - Trac.trackConversion() - Track a conversion event
 * - Trac.injectStripe()    - Manually inject ID into Stripe elements
 * =============================================
 */

(function () {
    'use strict';

    // =============================================
    // CONFIGURATION
    // =============================================

    var PARAM_NAME = 'trac_id';
    var COOKIE_NAME = 'trac_click_id';
    var LS_KEY = 'trac_click_id';
    var COOKIE_DAYS = 30;
    var TEST_COOKIE = '_trac_domain_test';
    var VERSION = '2.0.0';

    // Stripe selectors for auto-injection
    var STRIPE_SELECTORS = [
        'a[href*="buy.stripe.com"]',
        'a[href*="checkout.stripe.com"]',
        'a[href*="payment.stripe.com"]',
        'form[action*="stripe.com"]',
        '[data-stripe-checkout]',
        '#buy-btn',
        '.stripe-checkout-btn',
        '[data-trac-inject]'
    ];

    // Internal config object
    var Config = {
        apiKey: null,
        apiEndpoint: '/api/track',
        debug: false,
        autoInject: true
    };

    // =============================================
    // SCRIPT SELF-DETECTION
    // =============================================

    function initConfig() {
        try {
            var scripts = document.querySelectorAll('script[src*="trac.js"]');
            for (var i = 0; i < scripts.length; i++) {
                var script = scripts[i];

                var apiKey = script.getAttribute('data-key');
                if (apiKey) Config.apiKey = apiKey;

                var endpoint = script.getAttribute('data-endpoint');
                if (endpoint) Config.apiEndpoint = endpoint;

                if (script.hasAttribute('data-debug')) Config.debug = true;
                if (script.hasAttribute('data-no-inject')) Config.autoInject = false;
            }

            if (Config.debug) {
                console.log('[Trac] 🔑 Config:', Config);
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
     * BULLETPROOF RETRIEVAL: Cookie first (most reliable on Safari), then localStorage
     */
    function loadClickId() {
        // Priority: Cookie > localStorage (cookies survive Safari ITP better)
        var fromCookie = getCookie(COOKIE_NAME);
        if (fromCookie) {
            // Sync to localStorage if missing
            if (!getLocalStorage(LS_KEY)) {
                setLocalStorage(LS_KEY, fromCookie);
            }
            return fromCookie;
        }

        var fromLS = getLocalStorage(LS_KEY);
        if (fromLS) {
            // Sync to cookie if missing
            setCookie(COOKIE_NAME, fromLS, COOKIE_DAYS);
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
    // URL UTILITIES
    // =============================================

    function getUrlParam(name) {
        try {
            var params = new URLSearchParams(window.location.search);
            return params.get(name);
        } catch (e) {
            return null;
        }
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
    // STRIPE AUTO-INJECTION
    // =============================================

    /**
     * Inject client_reference_id into all Stripe links/forms
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
            var el = elements[i];

            try {
                if (el.tagName === 'A') {
                    // Link element - modify href
                    var href = el.getAttribute('href');
                    if (href) {
                        var url = new URL(href, window.location.origin);
                        url.searchParams.set('client_reference_id', clickId);
                        el.setAttribute('href', url.toString());
                        injectedCount++;

                        if (Config.debug) {
                            console.log('[Trac] 💉 Injected into link:', url.toString());
                        }
                    }
                } else if (el.tagName === 'FORM') {
                    // Form element - add hidden input
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
                    injectedCount++;

                    if (Config.debug) {
                        console.log('[Trac] 💉 Injected into form');
                    }
                }
            } catch (e) {
                // Skip this element
            }
        }

        if (injectedCount > 0) {
            console.log('[Trac] ✅ Injected click_id into', injectedCount, 'Stripe element(s)');
        }

        return injectedCount;
    }

    /**
     * Observe DOM for dynamically added Stripe elements
     */
    function observeDOM() {
        if (!window.MutationObserver) return;

        try {
            var observer = new MutationObserver(function (mutations) {
                var shouldInject = false;
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes.length > 0) {
                        shouldInject = true;
                        break;
                    }
                }
                if (shouldInject) {
                    // Debounce
                    clearTimeout(window._tracInjectTimer);
                    window._tracInjectTimer = setTimeout(function () {
                        injectStripe();
                    }, 100);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
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
                        console.log('[Trac] ℹ️ No attribution found (direct visit)');
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

        // 1. CAPTURE: Check for trac_id in URL (LAST CLICK WINS)
        var urlTracId = getUrlParam(PARAM_NAME);

        if (urlTracId) {
            // New attribution - overwrite existing (Last Click Wins)
            saveClickId(urlTracId);
            console.log('[Trac] ✅ Click ID captured:', urlTracId);
            cleanUrl();

            // Inject immediately
            if (Config.autoInject) {
                injectStripe();
            }
        } else {
            // 2. STORAGE CHECK: Try to load from dual storage
            var existingId = loadClickId();

            if (existingId) {
                console.log('[Trac] 📌 Existing Click ID:', existingId);

                // Inject immediately
                if (Config.autoInject) {
                    injectStripe();
                }
            } else {
                // 3. SERVER RECOVERY: Last resort for stripped parameters
                console.log('[Trac] 🔄 Attempting server-side recovery...');
                tryServerRecovery(function (recoveredId) {
                    if (recoveredId && Config.autoInject) {
                        injectStripe();
                    }
                });
            }
        }

        // 4. OBSERVE: Watch for dynamically added Stripe elements
        if (Config.autoInject) {
            if (document.readyState === 'complete') {
                observeDOM();
            } else {
                window.addEventListener('load', observeDOM);
            }
        }
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

        if (!Config.apiKey) {
            console.warn('[Trac] ⚠️ No API key configured');
        }

        var payload = {
            click_id: clickId,
            event_name: (data && data.eventName) || 'conversion',
            amount: (data && data.amount) || 0,
            currency: (data && data.currency) || 'EUR',
            timestamp: new Date().toISOString()
        };

        console.log('[Trac] 📊 Tracking conversion:', payload);

        var headers = { 'Content-Type': 'application/json' };
        if (Config.apiKey) {
            headers['x-trac-key'] = Config.apiKey;
        }

        return fetch(Config.apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            keepalive: true
        })
            .then(function (res) {
                if (res.ok) {
                    console.log('[Trac] ✅ Conversion tracked');
                    return res.json();
                }
                console.error('[Trac] ❌ Failed to track conversion');
                return false;
            })
            .catch(function (err) {
                console.error('[Trac] ❌ Network error:', err);
                return false;
            });
    }

    // =============================================
    // GLOBAL API
    // =============================================

    window.Trac = {
        // Core methods
        getClickId: loadClickId,
        clearClickId: clearClickId,
        trackConversion: trackConversion,

        // Manual injection
        injectStripe: injectStripe,

        // Config
        getApiKey: function () { return Config.apiKey; },
        getRootDomain: getRootDomain,

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

    console.log('[Trac] 🚀 SDK v' + VERSION + ' | Root domain:', getRootDomain());

})();
