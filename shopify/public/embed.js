/**
 * SHOPIFY EMBED SCRIPT - AUTO-INJECTION
 * Task: Capture clk_id and inject into Shopify checkout
 */

(function () {
    'use strict';

    // 1. Get clk_id from localStorage/cookie
    function getClickId() {
        // Check localStorage first (faster)
        const stored = localStorage.getItem('clk_id');
        if (stored) return stored;

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'clk_id') return decodeURIComponent(value);
        }
        return null;
    }

    // 2. Inject into cart/checkout forms
    function injectClickId() {
        const clickId = getClickId();
        if (!clickId) {
            console.log('[Shopify Embed] No clk_id found');
            return;
        }

        console.log('[Shopify Embed] Injecting clk_id:', clickId);

        // Method A: Inject into form attributes (post-purchase)
        const forms = document.querySelectorAll('form[action*="/cart/add"]');
        forms.forEach((form) => {
            // Check if already injected
            if (form.querySelector('input[name="attributes[clk_id]"]')) {
                return;
            }

            // Add hidden input for clk_id
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'attributes[clk_id]'; // Shopify custom attribute
            input.value = clickId;
            form.appendChild(input);

            console.log('[Shopify Embed] Injected into form:', form.action);
        });

        // Method B: Update cart attributes (direct API)
        if (window.Shopify && window.Shopify.cart) {
            fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attributes: {
                        clk_id: clickId // Custom attribute
                    }
                })
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log('[Shopify Embed] Cart attributes updated:', data);
                })
                .catch((err) => {
                    console.debug('[Shopify Embed] Cart update failed:', err);
                });
        }
    }

    // 3. Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectClickId);
    } else {
        injectClickId();
    }

    // 4. Also observe for dynamic changes (SPAs)
    const observer = new MutationObserver(function () {
        injectClickId();
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    console.log('[Shopify Embed] Script loaded and active');
})();
