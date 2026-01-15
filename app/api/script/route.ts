import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * First-Party Script Generator
 * GET /api/script?domain=example.com&workspace_id=xxx
 * 
 * Generates trac.js dynamically with:
 * - Relative paths only (CSP-compliant)
 * - Obfuscated variable names (anti-adblock)
 * - First-party cookie configuration
 */
export async function GET(request: NextRequest) {
    const domain = request.nextUrl.searchParams.get('domain') || ''
    const workspaceId = request.nextUrl.searchParams.get('workspace_id') || ''

    // Get root domain for cookie setting
    const rootDomain = getRootDomain(domain)

    // Generate the first-party tracking script
    const script = generateFirstPartyScript({
        domain,
        rootDomain,
        workspaceId
    })

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'X-First-Party': 'true',
            'X-Content-Type-Options': 'nosniff'
        }
    })
}

/**
 * Extract root domain for cookie setting
 * e.g., track.startup.com → .startup.com
 */
function getRootDomain(hostname: string): string {
    if (!hostname) return ''
    const parts = hostname.split('.')
    if (parts.length >= 2) {
        return '.' + parts.slice(-2).join('.')
    }
    return hostname
}

/**
 * Generate First-Party tracking script
 * Uses relative paths only - no external domains
 */
function generateFirstPartyScript(config: {
    domain: string
    rootDomain: string
    workspaceId: string
}): string {
    // Obfuscated variable names to avoid ad-blocker detection
    const varNames = {
        tracker: '_t' + Math.random().toString(36).substring(2, 6),
        clickId: '_c' + Math.random().toString(36).substring(2, 6),
        storage: '_s' + Math.random().toString(36).substring(2, 6)
    }

    return `/**
 * Trac Analytics SDK v3.0.0 - First-Party Edition
 * Auto-generated for: ${config.domain}
 * All paths are relative for CSP compliance
 */
(function() {
    'use strict';

    // Configuration (First-Party via /_trac/ proxy)
    var CONFIG = {
        eventsEndpoint: '/_trac/api/analytics',
        clickEndpoint: '/_trac/api/track/click',
        cookieName: 'trac_click_id',
        partnerDataCookieName: 'trac_partner_data',
        cookieDays: 90,
        rootDomain: '${config.rootDomain}',
        workspaceId: '${config.workspaceId}',
        // Attribution model: 'first-click' (preserve original) or 'last-click' (overwrite)
        attributionModel: 'first-click',
        // Query params to listen for (Dub-style data-query-params)
        queryParams: ['via', 'ref', 'trac_id', 'clk_id'],
        // Domains config (Dub-style data-domains)
        // { refer: "short.link" } = short link domain for referral tracking
        domains: null,
        // API host for reverse proxy (Dub-style data-api-host)
        apiHost: null,
        debug: false
    };
    
    // Read data-* attributes from script tag (Dub Partners style)
    (function() {
        try {
            var script = document.currentScript || document.querySelector('script[src*=\"trac\"]');
            if (script) {
                // data-query-params='["via", "ref"]'
                var queryParams = script.getAttribute('data-query-params');
                if (queryParams) {
                    CONFIG.queryParams = JSON.parse(queryParams);
                }
                // data-attribution-model="first-click" or "last-click"
                var attribModel = script.getAttribute('data-attribution-model');
                if (attribModel) {
                    CONFIG.attributionModel = attribModel;
                }
                // data-cookie-options='{"expiresInDays": 60}'
                var cookieOptions = script.getAttribute('data-cookie-options');
                if (cookieOptions) {
                    var opts = JSON.parse(cookieOptions);
                    if (opts.expiresInDays) CONFIG.cookieDays = opts.expiresInDays;
                }
                // data-domains='{"refer":"short.link"}'
                var domains = script.getAttribute('data-domains');
                if (domains) {
                    CONFIG.domains = JSON.parse(domains);
                }
                // data-api-host="https://custom-proxy.com"
                var apiHost = script.getAttribute('data-api-host');
                if (apiHost) {
                    CONFIG.apiHost = apiHost;
                    CONFIG.eventsEndpoint = apiHost + '/api/analytics';
                    CONFIG.clickEndpoint = apiHost + '/api/track/click';
                }
                // data-debug
                if (script.hasAttribute('data-debug')) {
                    CONFIG.debug = true;
                }
            }
        } catch(e) {
            if (CONFIG.debug) console.error('[Trac] Config parse error:', e);
        }
    })();

    // Obfuscated internals
    // NOTE: Cookie-only storage (aligned with Dub)
    // localStorage intentionally NOT used:
    // - Cross-subdomain issues (origin-specific)
    // - Easier to detect by adblockers
    // - Startup should capture trac_id from URL and persist in their own session
    var ${varNames.storage} = {
        set: function(name, value, days) {
            try {
                var expires = '';
                if (days) {
                    var date = new Date();
                    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                    expires = '; expires=' + date.toUTCString();
                }
                var domainAttr = CONFIG.rootDomain ? '; domain=' + CONFIG.rootDomain : '';
                var secure = location.protocol === 'https:' ? '; Secure' : '';
                document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + domainAttr + '; SameSite=Lax' + secure;
            } catch(e) {}
        },
        get: function(name) {
            try {
                var nameEQ = name + '=';
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var c = cookies[i].trim();
                    if (c.indexOf(nameEQ) === 0) {
                        return decodeURIComponent(c.substring(nameEQ.length));
                    }
                }
                return null;
            } catch(e) {
                return null;
            }
        },
        delete: function(name) {
            // Delete cookie by setting expiry in the past (Dub pattern)
            try {
                var domainAttr = CONFIG.rootDomain ? '; domain=' + CONFIG.rootDomain : '';
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domainAttr;
            } catch(e) {}
        }
    };

    var ${varNames.clickId} = {
        generate: function() {
            var timestamp = Math.floor(Date.now() / 1000);
            var random = '';
            for (var i = 0; i < 16; i++) {
                random += Math.floor(Math.random() * 16).toString(16);
            }
            return 'clk_' + timestamp + '_' + random;
        },
        get: function() {
            // Priority: URL param > Cookie
            var params = new URLSearchParams(location.search);
            var fromUrl = params.get('trac_id') || params.get('via') || params.get('ref') || params.get('clk_id');
            var existing = ${varNames.storage}.get(CONFIG.cookieName);
            
            if (fromUrl) {
                // Attribution model check (Dub-style)
                if (CONFIG.attributionModel === 'first-click' && existing) {
                    // First-click: preserve original attribution, don't overwrite
                    if (CONFIG.debug) console.log('[Trac] First-click: keeping existing', existing);
                    return existing;
                }
                // Last-click: always update to new click
                ${varNames.storage}.set(CONFIG.cookieName, fromUrl, CONFIG.cookieDays);
                return fromUrl;
            }
            return existing;
        },
        save: function(id) {
            ${varNames.storage}.set(CONFIG.cookieName, id, CONFIG.cookieDays);
        }
    };

    var ${varNames.tracker} = {
        init: function() {
            var self = this;
            
            // Check for query param that needs API call
            var params = new URLSearchParams(location.search);
            var queryKey = null;
            
            for (var i = 0; i < CONFIG.queryParams.length; i++) {
                var param = CONFIG.queryParams[i];
                var value = params.get(param);
                if (value) {
                    queryKey = value;
                    break;
                }
            }
            
            // If query param found and no existing partner data, call /track/click
            if (queryKey && !${varNames.storage}.get(CONFIG.partnerDataCookieName)) {
                self.trackClick(queryKey);
            } else {
                // Just capture click ID normally
                var clickId = ${varNames.clickId}.get();
                if (clickId && CONFIG.debug) {
                    console.log('[Trac] Click ID:', clickId);
                }
            }
            
            // Auto-inject into Stripe elements
            this.injectStripe();
            
            // Observe DOM for dynamic elements
            this.observeDOM();
            
            // Track pageview
            this.trackPageview();
        },
        
        // Call /track/click API to get partner data (Dub-style)
        trackClick: function(key) {
            var self = this;
            var existing = ${varNames.storage}.get(CONFIG.cookieName);
            
            // Attribution model check
            if (CONFIG.attributionModel === 'first-click' && existing) {
                if (CONFIG.debug) console.log('[Trac] First-click: keeping existing', existing);
                return;
            }
            
            fetch(CONFIG.clickEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    key: key,
                    domain: location.hostname
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success && data.clickId) {
                    // Save click ID
                    ${varNames.storage}.set(CONFIG.cookieName, data.clickId, CONFIG.cookieDays);
                    
                    // Save partner data if present
                    if (data.partner || data.discount) {
                        ${varNames.storage}.set(
                            CONFIG.partnerDataCookieName,
                            JSON.stringify({
                                clickId: data.clickId,
                                partner: data.partner,
                                discount: data.discount
                            }),
                            CONFIG.cookieDays
                        );
                        if (CONFIG.debug) console.log('[Trac] Partner data saved:', data.partner?.name);
                    }
                }
            })
            .catch(function(e) {
                if (CONFIG.debug) console.error('[Trac] trackClick error:', e);
            });
        },

        trackPageview: function() {
            var clickId = ${varNames.clickId}.get();
            if (!clickId) return;

            fetch(CONFIG.eventsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'pageview',
                    click_id: clickId,
                    workspace_id: CONFIG.workspaceId,
                    url: location.href,
                    referrer: document.referrer,
                    timestamp: new Date().toISOString()
                }),
                credentials: 'include',
                keepalive: true
            }).catch(function() {});
        },

        trackEvent: function(eventName, data) {
            var clickId = ${varNames.clickId}.get();
            
            fetch(CONFIG.eventsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'event',
                    event_name: eventName,
                    click_id: clickId,
                    workspace_id: CONFIG.workspaceId,
                    data: data || {},
                    url: location.href,
                    timestamp: new Date().toISOString()
                }),
                credentials: 'include',
                keepalive: true
            }).catch(function() {});
        },

        injectStripe: function() {
            var clickId = ${varNames.clickId}.get();
            if (!clickId) return;

            // Payment Links
            var links = document.querySelectorAll('a[href*="stripe.com"], a[href*="buy.stripe.com"]');
            links.forEach(function(link) {
                try {
                    var url = new URL(link.href);
                    if (!url.searchParams.has('client_reference_id')) {
                        url.searchParams.set('client_reference_id', clickId);
                        link.href = url.toString();
                    }
                } catch(e) {}
            });

            // Web Components
            var buyButtons = document.querySelectorAll('stripe-buy-button');
            buyButtons.forEach(function(btn) {
                if (!btn.getAttribute('client-reference-id')) {
                    btn.setAttribute('client-reference-id', clickId);
                }
            });

            var pricingTables = document.querySelectorAll('stripe-pricing-table');
            pricingTables.forEach(function(table) {
                if (!table.getAttribute('client-reference-id')) {
                    table.setAttribute('client-reference-id', clickId);
                }
            });
        },

        observeDOM: function() {
            var self = this;
            if (!window.MutationObserver) return;

            var observer = new MutationObserver(function(mutations) {
                var shouldInject = false;
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            var tag = node.tagName;
                            if (tag === 'A' || tag === 'STRIPE-BUY-BUTTON' || tag === 'STRIPE-PRICING-TABLE') {
                                shouldInject = true;
                            }
                        }
                    });
                });
                if (shouldInject) {
                    setTimeout(function() { self.injectStripe(); }, 50);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
    };

    // Public API
    window.Trac = {
        getClickId: function() { return ${varNames.clickId}.get(); },
        trackEvent: function(name, data) { ${varNames.tracker}.trackEvent(name, data); },
        trackPageview: function() { ${varNames.tracker}.trackPageview(); },
        injectStripe: function() { ${varNames.tracker}.injectStripe(); },
        
        // ========================================
        // CUSTOMER ID (Dub-style Attribution)
        // Store internal user ID for lifetime attribution
        // Uses cookie (not localStorage) per Dub's approach
        // ========================================
        setCustomerId: function(customerId) {
            if (!customerId) return;
            ${varNames.storage}.set('trac_customer_id', customerId, CONFIG.cookieDays);
            if (CONFIG.debug) console.log('[Trac] Customer ID set:', customerId);
        },
        getCustomerId: function() {
            return ${varNames.storage}.get('trac_customer_id');
        },

        trackLead: function(options) {
            var self = this;
            var clickId = ${varNames.clickId}.get();
            if (!options || !options.customerId) {
                console.error('[Trac] trackLead requires customerId');
                return Promise.resolve(null);
            }
            // Auto-persist customer ID in cookie for future attribution
            this.setCustomerId(options.customerId);
            
            return fetch('/_trac/api/track/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    clickId: clickId || '',
                    eventName: options.eventName || 'Sign Up',
                    customerExternalId: options.customerId,
                    customerEmail: options.email,
                    customerName: options.name,
                    mode: options.deferred ? 'deferred' : 'async'
                })
            }).then(function(r) { 
                return r.json().then(function(data) {
                    // Delete click_id cookie after successful lead creation (Dub pattern)
                    // customerExternalId is now the source of truth for all future attributions
                    if (data && !data.error) {
                        ${varNames.storage}.delete(CONFIG.cookieName);
                        if (CONFIG.debug) console.log('[Trac] Cookie deleted after lead creation');
                    }
                    return data;
                });
            });
        },
        
        // Get attribution data for Stripe checkout
        getAttributionData: function() {
            return {
                client_reference_id: this.getClickId() || undefined,
                customer_id: this.getCustomerId() || undefined
            };
        },
        
        // Get partner data from cookie (Dub-style for UI banners)
        getPartnerData: function() {
            try {
                var data = ${varNames.storage}.get(CONFIG.partnerDataCookieName);
                return data ? JSON.parse(data) : null;
            } catch(e) {
                return null;
            }
        },
        
        // Partner and discount data accessible as properties (Dub-style)
        partner: null,
        discount: null,
        
        version: '4.2.0-dub-complete'
    };
    
    // Callbacks registry for tracAnalytics("ready", callback) pattern
    var _callbacks = { ready: [] };
    var _isReady = false;
    
    // tracAnalytics function (like Dub's dubAnalytics)
    // Usage: tracAnalytics("ready", function() { console.log(Trac.partner); })
    window.tracAnalytics = function(event, callback) {
        if (typeof event === 'string' && typeof callback === 'function') {
            if (event === 'ready') {
                if (_isReady) {
                    callback();
                } else {
                    _callbacks.ready.push(callback);
                }
            }
        }
    };
    
    // Alias for console verification (like Dub's _dubAnalytics)
    window._tracAnalytics = window.Trac;

    // Initialize when DOM is ready
    function initAndReady() {
        ${varNames.tracker}.init();
        
        // Populate partner/discount properties from cookie
        var partnerData = window.Trac.getPartnerData();
        if (partnerData) {
            window.Trac.partner = partnerData.partner;
            window.Trac.discount = partnerData.discount;
        }
        
        // Fire ready callbacks
        _isReady = true;
        for (var i = 0; i < _callbacks.ready.length; i++) {
            try { _callbacks.ready[i](); } catch(e) {}
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAndReady);
    } else {
        initAndReady();
    }
})();
`
}
