/**
 * Trac Analytics - Production Tracker
 * Handles cross-subdomain tracking with robust cookie management
 * Version: 2.0.0
 */

(function () {
    'use strict';

    // Configuration from script tag attributes
    var scriptTag = document.currentScript || document.querySelector('script[src*="tracker.js"]');
    var config = {
        apiEndpoint: (scriptTag && scriptTag.getAttribute('data-endpoint')) || '/api/events',
        domain: scriptTag && scriptTag.getAttribute('data-domain'),
        token: scriptTag && scriptTag.getAttribute('data-token')
    };

    // Constants
    var COOKIE_NAME = 'trac_click_id';
    var COOKIE_DURATION = 30; // days
    var URL_PARAM = 'ref_id';

    /**
     * Get root domain for cookie (e.g., ".example.com" from "blog.shop.example.com")
     */
    function getRootDomain() {
        var hostname = window.location.hostname;

        // Skip for localhost or IP addresses
        if (hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
            return hostname;
        }

        var parts = hostname.split('.');

        // For domains like "example.com" or "example.co.uk"
        if (parts.length <= 2) {
            return '.' + hostname;
        }

        // Try to set cookie at different domain levels until it works
        for (var i = parts.length - 2; i >= 0; i--) {
            var testDomain = '.' + parts.slice(i).join('.');

            // Try to set a test cookie
            document.cookie = '__trac_test=1; path=/; domain=' + testDomain + '; SameSite=Lax';

            // Check if it worked
            if (document.cookie.indexOf('__trac_test=1') !== -1) {
                // Clean up test cookie
                document.cookie = '__trac_test=; path=/; domain=' + testDomain + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                return testDomain;
            }
        }

        // Fallback to current hostname
        return '.' + hostname;
    }

    /**
     * Set cookie with automatic root domain detection
     */
    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }

        var domain = config.domain || getRootDomain();
        document.cookie = name + '=' + value + expires + '; path=/; domain=' + domain + '; SameSite=Lax';
    }

    /**
     * Get cookie value by name
     */
    function getCookie(name) {
        var nameEQ = name + '=';
        var cookies = document.cookie.split(';');

        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length, cookie.length);
            }
        }
        return null;
    }

    /**
     * Get URL parameter value
     */
    function getUrlParam(name) {
        var params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    /**
     * Clean URL by removing tracking parameter (visual cleanup)
     */
    function cleanUrl() {
        if (!window.history || !window.history.replaceState) return;

        var url = new URL(window.location.href);
        if (url.searchParams.has(URL_PARAM)) {
            url.searchParams.delete(URL_PARAM);
            window.history.replaceState({}, '', url.toString());
        }
    }

    /**
     * Initialize tracking - capture ref_id from URL if present
     */
    function init() {
        var refId = getUrlParam(URL_PARAM);

        if (refId) {
            // New click - save to cookie
            setCookie(COOKIE_NAME, refId, COOKIE_DURATION);
            cleanUrl();
        }
        // If no ref_id in URL, cookie will persist from previous visit
    }

    /**
     * Send event data to API
     * Uses sendBeacon for reliability, falls back to fetch
     */
    function capture(eventName, eventData) {
        var clickId = getCookie(COOKIE_NAME);

        if (!clickId) {
            console.warn('[Trac] No click_id found - user may not have come from a tracked link');
            return;
        }

        var payload = {
            click_id: clickId,
            event_name: eventName,
            amount: (eventData && eventData.amount) || 0,
            currency: (eventData && eventData.currency) || 'EUR',
            external_id: (eventData && eventData.external_id) || ''
        };

        var data = JSON.stringify(payload);
        var url = config.apiEndpoint;

        // Prefer sendBeacon for reliability (works even when page is closing)
        if (navigator.sendBeacon) {
            var blob = new Blob([data], { type: 'application/json' });
            var sent = navigator.sendBeacon(url, blob);

            if (sent) {
                console.log('[Trac] Event sent via beacon:', eventName);
                return;
            }
        }

        // Fallback to fetch
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: data,
            keepalive: true // Keep request alive even if page unloads
        })
            .then(function (response) {
                if (response.ok) {
                    console.log('[Trac] Event sent:', eventName);
                } else {
                    console.error('[Trac] Event failed:', response.status);
                }
            })
            .catch(function (error) {
                console.error('[Trac] Event error:', error);
            });
    }

    /**
     * Process queued commands
     */
    function processQueue() {
        var queue = window.trac.q || [];

        for (var i = 0; i < queue.length; i++) {
            var args = queue[i];
            var command = args[0];

            if (command === 'capture') {
                capture(args[1], args[2]);
            }
        }

        // Clear queue
        window.trac.q = [];
    }

    /**
     * Main API - replaces the stub function
     */
    function trac() {
        var args = Array.prototype.slice.call(arguments);
        var command = args[0];

        if (command === 'capture') {
            capture(args[1], args[2]);
        }
    }

    // Initialize
    init();

    // Process any queued commands (from snippet loaded before this script)
    if (window.trac && window.trac.q) {
        processQueue();
    }

    // Replace stub with actual implementation
    window.trac = trac;
    window.trac.capture = capture;

    console.log('[Trac] Tracker initialized');
})();
