/**
 * TRAC SDK - Standalone Conversion Tracking
 * Version: 2.0.0 (Phase 2 MVP)
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="https://your-domain.com/trac.sdk.js"></script>
 * 2. SDK auto-captures click IDs from URL on page load
 * 3. Call window.Trac.recordLead(email) on email signups
 * 4. Call window.Trac.recordSale(orderId, amount, currency) on order completion
 */

(function () {
    // Configuration
    const DEFAULT_API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://your-production-domain.com';

    // 1. Check for global config object
    const config = window.TracConfig || {};

    // Check for script tag data attributes
    const scriptTag = document.currentScript || document.querySelector('script[src*="core/v1.js"]');
    const dataToken = scriptTag ? scriptTag.getAttribute('data-token') : null;
    const dataHost = scriptTag ? scriptTag.getAttribute('data-host') : null;

    // 2. Determine API URL (Direct vs Proxied)
    // If apiHost is set (e.g. "/_trac"), we use it as the base path
    const apiHost = config.apiHost || dataHost;
    let TRAC_API_URL = config.apiUrl || DEFAULT_API_URL;

    if (apiHost) {
        // CNAME Cloaking Mode: apiHost is a path like "/_trac"
        // Requests go to: https://client-site.com/_trac/api/...
        TRAC_API_URL = window.location.origin + apiHost;
        console.debug('[Trac] CNAME Cloaking enabled via', apiHost);
    }

    const TRAC_CLIENT_TOKEN = config.token || dataToken || 'sk_test_phase2_mvp';

    // Initialize Trac global namespace
    window.Trac = {
        clientToken: TRAC_CLIENT_TOKEN,
        apiUrl: TRAC_API_URL,
        apiHost: config.apiHost, // Expose for debugging

        /**
         * Capture click ID from URL parameters
         * Automatically called on page load
         * Supports multiple parameter names: clk, via, ref
         */
        captureClickId: function () {
            try {
                const params = new URLSearchParams(window.location.search);
                const clickId = params.get('clk') || params.get('via') || params.get('ref');

                if (clickId) {
                    // Store in localStorage (cross-domain fallback)
                    localStorage.setItem('clk_id', clickId);
                    console.debug('[Trac] Click ID captured:', clickId);

                    // Server-side extension (90 day cookie) - optional enhancement
                    fetch(this.apiUrl + '/api/track/click', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + this.clientToken
                        },
                        body: JSON.stringify({ click_id: clickId }),
                        credentials: 'include'
                    }).then(function (response) {
                        if (response.ok) {
                            console.debug('[Trac] Server-side cookie extended');
                        }
                    }).catch(function (err) {
                        console.debug('[Trac] Server extension failed (this is OK):', err.message);
                    });
                }
            } catch (error) {
                console.debug('[Trac] Click capture error:', error);
            }
        },

        /**
         * Record lead conversion (email signup)
         * @param {string} email - Customer email address
         */
        recordLead: function (email) {
            if (!email) {
                console.warn('[Trac] recordLead called without email');
                return;
            }

            const clickId = localStorage.getItem('clk_id');

            if (!clickId) {
                console.debug('[Trac] No click ID found for lead recording');
                // Still send the lead event without click_id
            }

            fetch(this.apiUrl + '/api/conversions/lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.clientToken
                },
                body: JSON.stringify({
                    click_id: clickId || 'direct',
                    email: email,
                    timestamp: new Date().toISOString()
                })
            }).then(function (response) {
                if (response.ok) {
                    console.debug('[Trac] Lead recorded successfully');
                } else {
                    console.warn('[Trac] Lead recording failed:', response.status);
                }
            }).catch(function (err) {
                console.debug('[Trac] Lead recording error:', err);
            });
        },

        /**
         * Record sale conversion (order completed)
         * @param {string} orderId - Unique order identifier
         * @param {number} amount - Order total amount
         * @param {string} currency - Currency code (default: USD)
         */
        recordSale: function (orderId, amount, currency) {
            if (!orderId || !amount) {
                console.warn('[Trac] recordSale called without orderId or amount');
                return;
            }

            const clickId = localStorage.getItem('clk_id');

            if (!clickId) {
                console.debug('[Trac] No click ID found for sale recording');
                // Still send the sale event without click_id
            }

            fetch(this.apiUrl + '/api/conversions/sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.clientToken
                },
                body: JSON.stringify({
                    click_id: clickId || 'direct',
                    order_id: String(orderId),
                    amount: parseFloat(amount),
                    currency: currency || 'USD',
                    timestamp: new Date().toISOString()
                })
            }).then(function (response) {
                if (response.ok) {
                    console.debug('[Trac] Sale recorded successfully');
                } else {
                    console.warn('[Trac] Sale recording failed:', response.status);
                }
            }).catch(function (err) {
                console.debug('[Trac] Sale recording error:', err);
            });
        },

        /**
         * Get current click ID
         * @returns {string|null} Current click ID or null
         */
        getClickId: function () {
            return localStorage.getItem('clk_id');
        },

        /**
         * Clear stored click ID (useful for testing)
         */
        clearClickId: function () {
            localStorage.removeItem('clk_id');
            console.debug('[Trac] Click ID cleared');
        }
    };

    /**
     * Stripe Identity Injection
     * Intercepts Stripe checkout to inject click_id
     */
    autoInjectStripeIdentity: function() {
        // 1. Monkey-patch Stripe() constructor if available
        if (typeof window.Stripe === 'function') {
            const originalStripe = window.Stripe;
            window.Stripe = function (key, options) {
                const stripeInstance = originalStripe(key, options);
                const originalRedirect = stripeInstance.redirectToCheckout;

                stripeInstance.redirectToCheckout = function (opts) {
                    const clickId = localStorage.getItem('clk_id');
                    if (clickId) {
                        if (!opts.clientReferenceId) {
                            opts.clientReferenceId = clickId;
                            console.debug('[Trac] Injected clientReferenceId into Stripe checkout');
                        } else if (!opts.metadata) {
                            opts.metadata = { click_id: clickId }; // Fallback
                        }
                    }
                    return originalRedirect.apply(this, arguments);
                };
                return stripeInstance;
            };
        }

        // 2. Watch for DOM forms (legacy)
        document.addEventListener('submit', function (e) {
            const form = e.target;
            if (form.action && form.action.includes('checkout.stripe.com')) {
                // Logic for legacy forms if needed
            }
        });
    }
};

/**
 * Cross-Domain Tracking: Parameter Decoration
 * Automatically appends clk_id to external links
 */
decorateLinks: function () {
    const clickId = this.getClickId();
    if (!clickId) return;

    const domain = window.location.hostname;
    const links = document.querySelectorAll('a');

    links.forEach(function (link) {
        try {
            const url = new URL(link.href);
            // Only decorate external links (different hostname)
            if (url.hostname !== domain && url.hostname !== 'localhost') {
                url.searchParams.set('clk_id', clickId); // Use unified param
                link.href = url.toString();
            }
        } catch (e) {
            // Ignore invalid URLs
        }
    });
    console.debug('[Trac] Links decorated with click ID');
},

initObserver: function() {
    // Watch for new links (SPA support)
    const observer = new MutationObserver((mutations) => {
        let shouldDecorate = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) shouldDecorate = true;
        });
        if (shouldDecorate) this.decorateLinks();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
};

// Auto-run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        window.Trac.captureClickId();
        window.Trac.decorateLinks();
        window.Trac.autoInjectStripeIdentity();
        window.Trac.initObserver();
    });
} else {
    window.Trac.captureClickId();
    window.Trac.decorateLinks();
    window.Trac.autoInjectStripeIdentity();
    window.Trac.initObserver();
}

console.debug('[Trac SDK] Initialized successfully');
}) ();
