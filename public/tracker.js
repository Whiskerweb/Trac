/**
 * Trac - Client Tracker Script
 * Captures ref_id from URL and exposes trac.capture() for conversion tracking
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'trac_click_id';
    var API_ENDPOINT = '/api/events';

    // Initialize on load
    function init() {
        var urlParams = new URLSearchParams(window.location.search);
        var refId = urlParams.get('ref_id');

        if (refId) {
            // Store the click_id
            localStorage.setItem(STORAGE_KEY, refId);

            // Clean URL by removing ref_id parameter
            urlParams.delete('ref_id');
            var newUrl = window.location.pathname;
            var remainingParams = urlParams.toString();
            if (remainingParams) {
                newUrl += '?' + remainingParams;
            }
            newUrl += window.location.hash;

            window.history.replaceState({}, document.title, newUrl);

            console.log('[Trac] Click ID captured:', refId);
        }
    }

    // Get stored click_id
    function getClickId() {
        return localStorage.getItem(STORAGE_KEY);
    }

    // Capture event and send to API
    function capture(eventName, meta) {
        meta = meta || {};

        var clickId = getClickId();

        if (!clickId) {
            console.warn('[Trac] No click_id found. Event not tracked:', eventName);
            return Promise.resolve({ success: false, reason: 'no_click_id' });
        }

        var payload = {
            click_id: clickId,
            event_name: eventName,
            amount: meta.amount || 0,
            currency: meta.currency || 'EUR',
            external_id: meta.external_id || ''
        };

        console.log('[Trac] Sending event:', payload);

        return fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                console.log('[Trac] Event recorded:', data);
                return data;
            })
            .catch(function (error) {
                console.error('[Trac] Error sending event:', error);
                return { success: false, error: error.message };
            });
    }

    // Initialize
    init();

    // Expose global API
    window.trac = {
        capture: capture,
        getClickId: getClickId
    };

})();
