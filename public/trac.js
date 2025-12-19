/**
 * =============================================
 * TRAC ANALYTICS SDK v1.2.0
 * =============================================
 * 
 * Cross-subdomain tracking with API key authentication.
 * Similar to @dub/analytics.
 * 
 * USAGE:
 * <script src="https://your-domain.com/trac.js" data-key="pk_trac_xxx" defer></script>
 * 
 * API:
 * - Trac.getClickId()     - Get stored click ID
 * - Trac.trackConversion() - Track a conversion event
 * - Trac.getApiKey()      - Get the configured API key
 * =============================================
 */

(function () {
    'use strict';

    // =============================================
    // CONFIGURATION
    // =============================================

    var PARAM_NAME = 'trac_id';
    var COOKIE_NAME = 'trac_click_id';
    var COOKIE_DAYS = 30;
    var TEST_COOKIE = '_trac_domain_test';

    // Internal config object
    var Config = {
        apiKey: null,
        apiEndpoint: '/api/track',
        debug: false
    };

    // =============================================
    // SCRIPT SELF-DETECTION
    // =============================================

    /**
     * Find the script tag that loaded this SDK and extract config
     */
    function initConfig() {
        // Find all script tags
        var scripts = document.querySelectorAll('script[src*="trac.js"]');

        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];

            // Check for data-key attribute
            var apiKey = script.getAttribute('data-key');
            if (apiKey) {
                Config.apiKey = apiKey;
            }

            // Check for data-endpoint attribute (optional override)
            var endpoint = script.getAttribute('data-endpoint');
            if (endpoint) {
                Config.apiEndpoint = endpoint;
            }

            // Check for data-debug attribute
            if (script.hasAttribute('data-debug')) {
                Config.debug = true;
            }
        }

        if (Config.apiKey) {
            console.log('[Trac] 🔑 Initialized with key:', Config.apiKey.slice(0, 20) + '...');
        } else {
            console.warn('[Trac] ⚠️ No API key found. Add data-key="pk_trac_xxx" to your script tag.');
        }
    }

    // =============================================
    // ROOT DOMAIN DETECTION
    // =============================================

    /**
     * Find the root domain (TLD+1) by testing cookie writes
     */
    function getRootDomain() {
        var hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return hostname;
        }

        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return hostname;
        }

        var parts = hostname.split('.');

        for (var i = parts.length - 1; i >= 0; i--) {
            var testDomain = '.' + parts.slice(i).join('.');
            document.cookie = TEST_COOKIE + '=1;domain=' + testDomain + ';path=/;max-age=1';

            if (document.cookie.indexOf(TEST_COOKIE + '=1') !== -1) {
                document.cookie = TEST_COOKIE + '=;domain=' + testDomain + ';path=/;max-age=0';
                return testDomain;
            }
        }

        return hostname;
    }

    var rootDomain = null;
    function getCachedRootDomain() {
        if (rootDomain === null) {
            rootDomain = getRootDomain();
        }
        return rootDomain;
    }

    // =============================================
    // COOKIE UTILITIES
    // =============================================

    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }

        var domain = getCachedRootDomain();
        var domainAttr = domain.startsWith('.') ? '; domain=' + domain : '';
        var secure = window.location.protocol === 'https:' ? '; Secure' : '';

        document.cookie = name + '=' + encodeURIComponent(value) +
            expires +
            '; path=/' +
            domainAttr +
            '; SameSite=Lax' +
            secure;

        if (Config.debug) {
            console.log('[Trac] 🍪 Cookie set on domain:', domain);
        }
    }

    function getCookie(name) {
        var nameEQ = name + '=';
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length));
            }
        }
        return null;
    }

    function deleteCookie(name) {
        var domain = getCachedRootDomain();
        var domainAttr = domain.startsWith('.') ? '; domain=' + domain : '';
        document.cookie = name + '=; path=/' + domainAttr + '; max-age=0';
    }

    // =============================================
    // URL UTILITIES
    // =============================================

    function getUrlParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    function cleanUrl() {
        var url = new URL(window.location.href);
        if (url.searchParams.has(PARAM_NAME)) {
            url.searchParams.delete(PARAM_NAME);
            var cleanedUrl = url.pathname + url.search + url.hash;
            window.history.replaceState({}, document.title, cleanedUrl || '/');
            if (Config.debug) {
                console.log('[Trac] 🧹 URL cleaned');
            }
        }
    }

    // =============================================
    // CORE LOGIC
    // =============================================

    function init() {
        // First, extract config from script tag
        initConfig();

        // Then capture tracking ID
        var tracId = getUrlParam(PARAM_NAME);

        if (tracId) {
            setCookie(COOKIE_NAME, tracId, COOKIE_DAYS);
            console.log('[Trac] ✅ Click ID captured:', tracId);
            cleanUrl();
        } else {
            var existingId = getCookie(COOKIE_NAME);
            if (existingId && Config.debug) {
                console.log('[Trac] 📌 Existing Click ID:', existingId);
            }
        }
    }

    function getClickId() {
        return getCookie(COOKIE_NAME);
    }

    function getApiKey() {
        return Config.apiKey;
    }

    function clearClickId() {
        deleteCookie(COOKIE_NAME);
        console.log('[Trac] 🗑️ Click ID cleared');
    }

    /**
     * Track a conversion event
     * Sends click_id and API key to the track endpoint
     */
    function trackConversion(data) {
        var clickId = getClickId();

        if (!clickId) {
            console.warn('[Trac] ⚠️ No click ID found - conversion not tracked');
            return Promise.resolve(false);
        }

        if (!Config.apiKey) {
            console.warn('[Trac] ⚠️ No API key configured - conversion may not be attributed');
        }

        var payload = {
            click_id: clickId,
            event_name: data.eventName || 'conversion',
            amount: data.amount || 0,
            currency: data.currency || 'EUR',
            timestamp: new Date().toISOString()
        };

        console.log('[Trac] 📊 Tracking conversion:', payload);

        // Build headers with API key
        var headers = {
            'Content-Type': 'application/json'
        };

        if (Config.apiKey) {
            headers['x-trac-key'] = Config.apiKey;
        }

        return fetch(Config.apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
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
        getClickId: getClickId,
        clearClickId: clearClickId,
        trackConversion: trackConversion,

        // Config methods
        getApiKey: getApiKey,
        getRootDomain: getCachedRootDomain,

        // Version
        version: '1.2.0'
    };

    // =============================================
    // AUTO-INITIALIZE
    // =============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Trac] 🚀 SDK v1.2.0 | Root domain:', getCachedRootDomain());

})();
