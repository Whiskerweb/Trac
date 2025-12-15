/**
 * Trac Analytics - Production Tracker
 * Handles cross-subdomain tracking with robust cookie management
 * Version: 2.0.0
 */

(function () {
    'use strict';

    console.log("🚀 [Tracker] Script chargé et démarré !");

    // Configuration from script tag attributes
    var scriptTag = document.currentScript || document.querySelector('script[src*="pixel.js"]');
    var config = {
        apiEndpoint: (scriptTag && scriptTag.getAttribute('data-endpoint')) || '/api/events',
        domain: scriptTag && scriptTag.getAttribute('data-domain'),
        token: scriptTag && scriptTag.getAttribute('data-token')
    };

    // Validation du token multi-tenant
    if (!config.token) {
        console.warn("⚠️ [Trac] Missing data-token - Les événements ne seront pas authentifiés");
    } else {
        console.log("🔑 [Tracker] Token détecté:", config.token.substring(0, 10) + "...");
    }

    // Constants
    var COOKIE_NAME = 'trac_click_id';
    var COOKIE_DURATION = 30; // days
    var URL_PARAM = 'ref_id';

    /**
     * Get root domain for cookie (e.g., ".example.com" from "blog.shop.example.com")
     */
    function getRootDomain() {
        try {
            var hostname = window.location.hostname;
            console.log("🔍 [Tracker] Détection du domaine racine pour:", hostname);

            // Skip for localhost or IP addresses
            if (hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
                console.log("🏠 [Tracker] Domaine local détecté:", hostname);
                return hostname;
            }

            var parts = hostname.split('.');

            // For domains like "example.com" or "example.co.uk"
            if (parts.length <= 2) {
                console.log("🌐 [Tracker] Domaine simple détecté:", '.' + hostname);
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
                    console.log("✅ [Tracker] Domaine racine trouvé:", testDomain);
                    return testDomain;
                }
            }

            // Fallback to current hostname
            console.log("⚠️ [Tracker] Fallback au domaine actuel:", '.' + hostname);
            return '.' + hostname;
        } catch (error) {
            console.warn("⚠️ [Tracker] Erreur dans getRootDomain, utilisation de window.location.hostname", error);
            return window.location.hostname;
        }
    }

    /**
     * Set cookie with automatic root domain detection
     */
    function setCookie(name, value, days) {
        try {
            var expires = '';
            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toUTCString();
            }

            var domain = config.domain || getRootDomain();
            console.log("🍪 [Tracker] Tentative écriture cookie:", name, "=", value, "sur domaine:", domain);
            document.cookie = name + '=' + value + expires + '; path=/; domain=' + domain + '; SameSite=Lax';

            // Vérifier que le cookie a bien été écrit
            var cookieSet = getCookie(name);
            if (cookieSet) {
                console.log("✅ [Tracker] Cookie écrit avec succès:", name, "=", cookieSet);
            } else {
                console.warn("⚠️ [Tracker] Cookie non écrit (possible dans iframe ou mode incognito)");
            }
        } catch (error) {
            console.warn("⚠️ [Tracker] Erreur lors de l'écriture du cookie (iframe/sandbox?), mais le script continue", error);
            // Ne pas bloquer le script, continuer l'exécution
        }
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
        console.log("🏁 [Tracker] Initialisation...");
        var refId = getUrlParam(URL_PARAM);

        if (refId) {
            console.log("🔗 [Tracker] Paramètre ref_id détecté dans l'URL:", refId);
            // New click - save to cookie
            setCookie(COOKIE_NAME, refId, COOKIE_DURATION);
            console.log("🧹 [Tracker] Nettoyage de l'URL...");
            cleanUrl();
        } else {
            console.log("ℹ️ [Tracker] Aucun ref_id dans l'URL. Cookie existant:", getCookie(COOKIE_NAME) || 'aucun');
        }
        // If no ref_id in URL, cookie will persist from previous visit
    }

    /**
     * Send event data to API
     * Uses sendBeacon for reliability, falls back to fetch
     */
    function capture(eventName, eventData) {
        console.log("📡 [Tracker] Tentative capture événement:", eventName, eventData);
        var clickId = getCookie(COOKIE_NAME);

        if (!clickId) {
            console.warn('⚠️ [Trac] Aucun click_id trouvé - utilisateur non tracké ou cookie bloqué');
            return;
        }

        var payload = {
            click_id: clickId,
            event_name: eventName,
            amount: (eventData && eventData.amount) || 0,
            currency: (eventData && eventData.currency) || 'EUR',
            external_id: (eventData && eventData.external_id) || ''
        };

        console.log("📡 [Tracker] Envoi événement:", eventName, payload);

        var data = JSON.stringify(payload);
        var url = config.apiEndpoint;

        // Note: sendBeacon ne supporte pas les headers custom, donc on utilise fetch avec keepalive
        // Cela permet d'envoyer le x-publishable-key pour l'authentification multi-tenant

        // Envoi avec fetch (supporte les headers custom pour l'auth)
        var headers = {
            'Content-Type': 'application/json'
        };

        // Ajouter le token d'authentification si présent
        if (config.token) {
            headers['x-publishable-key'] = config.token;
            console.log("🔐 [Tracker] Header x-publishable-key ajouté");
        }

        fetch(url, {
            method: 'POST',
            headers: headers,
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
