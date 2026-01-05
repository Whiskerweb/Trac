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
    'use strict';

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
        if (config.debug) {
            console.debug('[Trac] CNAME Cloaking enabled via', apiHost);
        }
    }

    const TRAC_CLIENT_TOKEN = config.token || dataToken || 'sk_test_phase2_mvp';
    const DEBUG = config.debug || false;

    /**
     * Helper: Get root domain for cookie persistence
     * Uses Public Suffix List logic for accurate subdomain handling
     * @returns {string} Root domain (e.g., "example.com" from "app.example.com")
     */
    function getRootDomain() {
        const hostname = window.location.hostname;

        // Handle localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return hostname;
        }

        // Simple approach: split by dots and take last 2 parts
        // Works for most cases: app.example.com -> example.com
        const parts = hostname.split('.');

        // Handle TLDs with multiple parts (co.uk, com.br, etc.)
        const multiPartTLDs = ['co.uk', 'com.br', 'com.au', 'co.nz', 'co.jp', 'co.kr', 'or.jp', 'ne.jp'];
        const lastTwo = parts.slice(-2).join('.');

        if (multiPartTLDs.includes(lastTwo) && parts.length > 2) {
            // e.g., app.example.co.uk -> example.co.uk
            return parts.slice(-3).join('.');
        }

        // Standard TLD: app.example.com -> example.com
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }

        return hostname;
    }

    /**
     * Helper: Set a 1st-party cookie with proper domain scope
     */
    function setFirstPartyCookie(name, value, days) {
        const rootDomain = getRootDomain();
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();

        // Set cookie on root domain for cross-subdomain persistence
        document.cookie = `${name}=${value}; expires=${expires}; path=/; domain=.${rootDomain}; SameSite=Lax; Secure`;

        if (DEBUG) {
            console.debug('[Trac] Cookie set on domain:', rootDomain);
        }
    }

    /**
     * Helper: Get cookie value by name
     */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    // Initialize Trac global namespace
    window.Trac = {
        clientToken: TRAC_CLIENT_TOKEN,
        apiUrl: TRAC_API_URL,
        apiHost: apiHost, // Expose for debugging
        debug: DEBUG,

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

                    // Also set 1st-party cookie for 90-day persistence
                    setFirstPartyCookie('_trac_clk', clickId, 90);

                    if (DEBUG) {
                        console.debug('[Trac] Click ID captured:', clickId);
                    }

                    // Server-side extension (90 day cookie) - via proxy path
                    fetch(this.apiUrl + '/api/track/click', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + this.clientToken
                        },
                        body: JSON.stringify({ click_id: clickId }),
                        credentials: 'include'
                    }).then(function (response) {
                        if (response.ok && DEBUG) {
                            console.debug('[Trac] Server-side cookie extended');
                        }
                    }).catch(function (err) {
                        if (DEBUG) {
                            console.debug('[Trac] Server extension failed (this is OK):', err.message);
                        }
                    });
                }
            } catch (error) {
                if (DEBUG) {
                    console.debug('[Trac] Click capture error:', error);
                }
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

            const clickId = this.getClickId();

            if (!clickId && DEBUG) {
                console.debug('[Trac] No click ID found for lead recording');
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
                    if (DEBUG) console.debug('[Trac] Lead recorded successfully');
                } else {
                    console.warn('[Trac] Lead recording failed:', response.status);
                }
            }).catch(function (err) {
                if (DEBUG) console.debug('[Trac] Lead recording error:', err);
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

            const clickId = this.getClickId();

            if (!clickId && DEBUG) {
                console.debug('[Trac] No click ID found for sale recording');
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
                    if (DEBUG) console.debug('[Trac] Sale recorded successfully');
                } else {
                    console.warn('[Trac] Sale recording failed:', response.status);
                }
            }).catch(function (err) {
                if (DEBUG) console.debug('[Trac] Sale recording error:', err);
            });
        },

        /**
         * Get current click ID
         * Checks cookie first (for cross-subdomain), then localStorage
         * @returns {string|null} Current click ID or null
         */
        getClickId: function () {
            // Priority: cookie (cross-subdomain) > localStorage (fallback)
            return getCookie('_trac_clk') || localStorage.getItem('clk_id');
        },

        /**
         * Clear stored click ID (useful for testing)
         */
        clearClickId: function () {
            localStorage.removeItem('clk_id');
            // Clear cookie on root domain
            const rootDomain = getRootDomain();
            document.cookie = `_trac_clk=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain}`;
            if (DEBUG) console.debug('[Trac] Click ID cleared');
        },

        /**
         * Stripe Identity Injection
         * Intercepts Stripe checkout to inject click_id into clientReferenceId
         */
        autoInjectStripeIdentity: function () {
            var self = this;

            // 1. Monkey-patch Stripe() constructor if available
            if (typeof window.Stripe === 'function') {
                var originalStripe = window.Stripe;

                window.Stripe = function (key, options) {
                    var stripeInstance = originalStripe(key, options);
                    var originalRedirect = stripeInstance.redirectToCheckout;

                    stripeInstance.redirectToCheckout = function (opts) {
                        var clickId = self.getClickId();
                        if (clickId) {
                            if (!opts.clientReferenceId) {
                                opts.clientReferenceId = clickId;
                                if (DEBUG) console.debug('[Trac] Injected clientReferenceId into Stripe checkout');
                            } else {
                                // clientReferenceId already set, add to metadata as fallback
                                opts.metadata = opts.metadata || {};
                                opts.metadata.clk_id = clickId;
                                if (DEBUG) console.debug('[Trac] Injected clk_id into Stripe metadata');
                            }
                        }
                        return originalRedirect.apply(this, arguments);
                    };

                    return stripeInstance;
                };

                // Preserve Stripe static methods
                Object.keys(originalStripe).forEach(function (key) {
                    window.Stripe[key] = originalStripe[key];
                });

                if (DEBUG) console.debug('[Trac] Stripe monkey-patch installed');
            }

            // 2. Watch for DOM forms that submit to Stripe (legacy checkout)
            document.addEventListener('submit', function (e) {
                var form = e.target;
                if (form.action && form.action.includes('checkout.stripe.com')) {
                    var clickId = self.getClickId();
                    if (clickId) {
                        // Inject hidden field with click_id
                        var input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'client_reference_id';
                        input.value = clickId;
                        form.appendChild(input);
                        if (DEBUG) console.debug('[Trac] Injected click_id into Stripe form');
                    }
                }
            });
        },

        /**
         * Cross-Domain Tracking: Parameter Decoration
         * Automatically appends clk_id to external links
         */
        decorateLinks: function () {
            var clickId = this.getClickId();
            if (!clickId) return;

            var domain = window.location.hostname;
            var links = document.querySelectorAll('a');

            links.forEach(function (link) {
                try {
                    var url = new URL(link.href);
                    // Only decorate external links (different hostname)
                    if (url.hostname !== domain && url.hostname !== 'localhost') {
                        url.searchParams.set('clk_id', clickId);
                        link.href = url.toString();
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            });

            if (DEBUG) console.debug('[Trac] Links decorated with click ID');
        },

        /**
         * Initialize MutationObserver for SPA support
         * Watches for dynamically added links
         */
        initObserver: function () {
            var self = this;

            // Watch for new links (SPA support)
            var observer = new MutationObserver(function (mutations) {
                var shouldDecorate = false;
                mutations.forEach(function (mutation) {
                    if (mutation.addedNodes.length) shouldDecorate = true;
                });
                if (shouldDecorate) self.decorateLinks();
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

    if (DEBUG) {
        console.debug('[Trac SDK] Initialized successfully', {
            apiUrl: TRAC_API_URL,
            apiHost: apiHost,
            token: TRAC_CLIENT_TOKEN.substring(0, 10) + '...'
        });
    }
})();
