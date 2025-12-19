/**
 * =============================================
 * TRAC ANALYTICS SDK v1.1.0
 * =============================================
 * 
 * Cross-subdomain tracking with root domain detection.
 * Similar to @dub/analytics.
 * 
 * USAGE:
 * <script src="https://your-domain.com/trac.js" defer></script>
 * 
 * API:
 * - Trac.getClickId()     - Get stored click ID
 * - Trac.trackConversion() - Track a conversion event
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

    // =============================================
    // ROOT DOMAIN DETECTION
    // =============================================

    /**
     * Find the root domain (TLD+1) by testing cookie writes
     * This method works for all TLDs including co.uk, com.au, etc.
     * 
     * Example: On "shop.example.com", returns ".example.com"
     */
    function getRootDomain() {
        var hostname = window.location.hostname;

        // Localhost handling
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return hostname;
        }

        // IP address handling
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            return hostname;
        }

        var parts = hostname.split('.');

        // Try each domain level starting from TLD+1
        // e.g., for "a.b.site.com": try ".com" (fail), ".site.com" (success)
        for (var i = parts.length - 1; i >= 0; i--) {
            var testDomain = '.' + parts.slice(i).join('.');

            // Try to set a test cookie on this domain
            document.cookie = TEST_COOKIE + '=1;domain=' + testDomain + ';path=/;max-age=1';

            // Check if it was set
            if (document.cookie.indexOf(TEST_COOKIE + '=1') !== -1) {
                // Clean up test cookie
                document.cookie = TEST_COOKIE + '=;domain=' + testDomain + ';path=/;max-age=0';
                return testDomain;
            }
        }

        // Fallback: return current hostname
        return hostname;
    }

    // Cache the root domain
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

    /**
     * Set a cookie with cross-subdomain support
     */
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

        console.log('[Trac] 🍪 Cookie set on domain:', domain);
    }

    /**
     * Get a cookie value
     */
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

    /**
     * Delete a cookie
     */
    function deleteCookie(name) {
        var domain = getCachedRootDomain();
        var domainAttr = domain.startsWith('.') ? '; domain=' + domain : '';
        document.cookie = name + '=; path=/' + domainAttr + '; max-age=0';
    }

    // =============================================
    // URL UTILITIES
    // =============================================

    /**
     * Get URL parameter value
     */
    function getUrlParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * Remove parameter from URL without reload
     */
    function cleanUrl() {
        var url = new URL(window.location.href);
        if (url.searchParams.has(PARAM_NAME)) {
            url.searchParams.delete(PARAM_NAME);
            var cleanedUrl = url.pathname + url.search + url.hash;
            window.history.replaceState({}, document.title, cleanedUrl || '/');
            console.log('[Trac] 🧹 URL cleaned');
        }
    }

    // =============================================
    // CORE LOGIC
    // =============================================

    /**
     * Initialize tracking
     */
    function init() {
        var tracId = getUrlParam(PARAM_NAME);

        if (tracId) {
            // Store in cookie for 30 days (cross-subdomain)
            setCookie(COOKIE_NAME, tracId, COOKIE_DAYS);
            console.log('[Trac] ✅ Click ID captured:', tracId);

            // Clean URL
            cleanUrl();
        } else {
            var existingId = getCookie(COOKIE_NAME);
            if (existingId) {
                console.log('[Trac] 📌 Existing Click ID:', existingId);
            }
        }
    }

    /**
     * Get the stored click ID
     */
    function getClickId() {
        return getCookie(COOKIE_NAME);
    }

    /**
     * Clear the stored click ID
     */
    function clearClickId() {
        deleteCookie(COOKIE_NAME);
        console.log('[Trac] 🗑️ Click ID cleared');
    }

    /**
     * Track a conversion event
     */
    function trackConversion(data) {
        var clickId = getClickId();

        if (!clickId) {
            console.warn('[Trac] ⚠️ No click ID found - conversion not tracked');
            return Promise.resolve(false);
        }

        var payload = {
            click_id: clickId,
            event_name: data.eventName || 'conversion',
            amount: data.amount || 0,
            currency: data.currency || 'EUR',
            timestamp: new Date().toISOString()
        };

        console.log('[Trac] 📊 Tracking conversion:', payload);

        return fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(function (res) {
                if (res.ok) {
                    console.log('[Trac] ✅ Conversion tracked');
                    return true;
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
        getClickId: getClickId,
        clearClickId: clearClickId,
        trackConversion: trackConversion,
        getRootDomain: getCachedRootDomain,
        version: '1.1.0'
    };

    // =============================================
    // AUTO-INITIALIZE
    // =============================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Trac] 🚀 SDK v1.1.0 initialized | Root domain:', getCachedRootDomain());

})();
