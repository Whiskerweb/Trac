import { NextResponse, userAgent } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// =============================================
// EDGE RUNTIME DECLARATION
// Note: Next.js 16 automatically runs middleware on Edge
// The runtime export has been removed as it's deprecated
// Middleware always runs on Edge in Next.js 16+
// =============================================
// REDIS CLIENT (Edge-Compatible)
// =============================================

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// =============================================
// RATE LIMITING CONFIGURATION (Traaaction-Style)
// =============================================

/**
 * Rate Limiter for Link Redirects (Very Permissive)
 * - 100 requests per 10 seconds per IP
 * - Uses sliding window for smooth limiting
 */
const linkRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    prefix: 'ratelimit:link',
    analytics: true,
})

/**
 * Rate Limiter for API Endpoints (Stricter)
 * - 1000 requests per 5 minutes per IP/User
 * - Uses sliding window
 */
const apiRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '5 m'),
    prefix: 'ratelimit:api',
    analytics: true,
})

// =============================================
// TINYBIRD CONFIG
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN
const TRAC_CLIENT_TOKEN = process.env.TRAC_CLIENT_TOKEN

// =============================================
// DOMAIN CONFIGURATION
// =============================================

const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'traaaction.com'
const PRIMARY_DOMAINS = [
    'traaaction.com',
    'www.traaaction.com',
    'seller.traaaction.com',
    'app.traaaction.com',
    'vercel.app',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
]

// Seller subdomain for biface architecture
const PARTNER_SUBDOMAIN = 'seller.traaaction.com'

// Cache for domain lookups (Edge-compatible in-memory)
const domainCache = new Map<string, { workspaceId: string | null; timestamp: number }>()
const DOMAIN_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// =============================================
// TYPES
// =============================================

interface RedisLinkData {
    url: string
    linkId: string
    workspaceId: string
    sellerId?: string | null
    ogTitle?: string | null
    ogDescription?: string | null
    ogImage?: string | null
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

const SOCIAL_CRAWLERS = /Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|WhatsApp|Discordbot|TelegramBot|Applebot/i

function isSocialCrawler(ua: string): boolean {
    return SOCIAL_CRAWLERS.test(ua)
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Generate a unique Click ID
 * Format: clk_<12-char>
 */
function generateClickId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'clk_'
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Extract domain from request for Redis key lookup
 * Supports CNAME Cloaking via X-Forwarded-Host
 */
function getDomain(request: NextRequest): string {
    const forwardedHost = request.headers.get('x-forwarded-host')
    if (forwardedHost) {
        // Handle multiple hosts if comma-separated
        return forwardedHost.split(',')[0].trim()
    }
    return request.nextUrl.hostname
}

/**
 * Build Redis key for shortlink lookup
 */
function buildRedisKey(domain: string, slug: string): string {
    return `shortlink:${domain}:${slug}`
}

/**
 * Determine device type from user-agent
 */
function parseDevice(ua: ReturnType<typeof userAgent>): string {
    if (ua.device.type === 'mobile') return 'Mobile'
    if (ua.device.type === 'tablet') return 'Tablet'
    return 'Desktop'
}

/**
 * Check if hostname is a custom domain (not primary)
 */
function isCustomDomain(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase().replace(/:\d+$/, '') // Remove port
    return !PRIMARY_DOMAINS.some(d => normalizedHost === d || normalizedHost.endsWith('.' + d))
}

/**
 * Extract root domain for cookie setting on client's domain
 * e.g., track.startup.com → .startup.com
 */
function getRootDomainForCookie(hostname: string): string {
    const parts = hostname.split('.')
    if (parts.length >= 2) {
        return '.' + parts.slice(-2).join('.')
    }
    return hostname
}

/**
 * Lookup workspace ID for a custom domain
 * Uses Redis cache with DB fallback
 */
async function getWorkspaceIdFromDomain(hostname: string, baseUrl: string): Promise<string | null> {
    const cacheKey = hostname.toLowerCase()

    // Check in-memory cache first
    const cached = domainCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < DOMAIN_CACHE_TTL) {
        console.log('[Edge] 💾 Domain cache HIT:', hostname, '→', cached.workspaceId)
        return cached.workspaceId
    }

    // Check Redis cache
    try {
        const redisKey = `domain:${cacheKey}`
        const cachedWorkspaceId = await redis.get<string>(redisKey)

        if (cachedWorkspaceId !== null) {
            console.log('[Edge] 📦 Redis domain cache HIT:', hostname, '→', cachedWorkspaceId)
            domainCache.set(cacheKey, { workspaceId: cachedWorkspaceId || null, timestamp: Date.now() })
            return cachedWorkspaceId || null
        }
    } catch (err) {
        console.error('[Edge] ⚠️ Redis domain cache error:', err)
    }

    // Fallback to API lookup
    // ⚠️ CRITICAL: Always use PRIMARY domain for API calls to avoid circular dependency
    // If we use the custom domain, the middleware will try to verify itself → infinite loop
    const lookupUrl = `https://${PRIMARY_DOMAIN}/api/domains/lookup?hostname=${encodeURIComponent(cacheKey)}`
    console.log('[Edge] 🔍 Domain lookup via API:', lookupUrl)

    try {
        const res = await fetch(lookupUrl, {
            cache: 'no-store',
        })

        if (res.ok) {
            const data = await res.json()
            const workspaceId = data.verified ? data.workspaceId : null

            console.log('[Edge] ✅ Domain lookup result:', hostname, '→', workspaceId)

            // Cache in Redis for future requests
            try {
                await redis.set(`domain:${cacheKey}`, workspaceId || '', { ex: 3600 }) // 1 hour TTL
            } catch (e) {
                // Ignore cache write errors
            }

            domainCache.set(cacheKey, { workspaceId, timestamp: Date.now() })
            return workspaceId
        } else {
            console.error('[Edge] ❌ Domain lookup failed:', res.status, await res.text())
        }
    } catch (err) {
        console.error('[Edge] ⚠️ Domain lookup API error:', err)
    }

    // Cache negative result
    domainCache.set(cacheKey, { workspaceId: null, timestamp: Date.now() })
    return null
}

// =============================================
// TRACKING FUNCTION (Fire-and-Forget)
// =============================================

/**
 * Log click event to Tinybird
 * Returns a Promise for use with waitUntil()
 */
function logClickToTinybird(data: {
    timestamp: string
    click_id: string
    workspace_id: string
    link_id: string
    affiliate_id: string | null
    url: string
    user_agent: string
    ip: string
    country: string
    city: string
    referrer: string
    device: string
}): Promise<void> {
    if (!TINYBIRD_TOKEN) {
        console.warn('[Edge] ⚠️ Missing TINYBIRD_ADMIN_TOKEN')
        return Promise.resolve()
    }

    return fetch(`${TINYBIRD_HOST}/v0/events?name=clicks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(res => {
            if (res.ok) {
                console.log('[Edge] ✅ Click logged:', data.click_id)
            } else {
                res.text().then(t => console.error('[Edge] ❌ Tinybird error:', t))
            }
        })
        .catch(err => {
            console.error('[Edge] ❌ Click logging failed:', err.message)
        })
}

/**
 * Log abuse/rate limit events to Tinybird for monitoring
 * Returns a Promise for use with waitUntil()
 */
function logAbuseToTinybird(ip: string, path: string, reason: string): Promise<void> {
    if (!TINYBIRD_TOKEN) {
        return Promise.resolve()
    }

    const data = {
        timestamp: new Date().toISOString(),
        ip,
        path,
        reason,
    }

    return fetch(`${TINYBIRD_HOST}/v0/events?name=abuse_events`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(res => {
            if (res.ok) {
                console.log('[Edge] 📝 Abuse logged:', reason, ip)
            }
        })
        .catch(() => {
            // Silently fail - don't block for logging
        })
}

// =============================================
// MIDDLEWARE HANDLER
// =============================================

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    const { pathname, searchParams } = request.nextUrl // Use nextUrl for easier manipulation
    const hostname = getDomain(request)
    const customDomain = isCustomDomain(hostname)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'

    // ============================================
    // HOST HEADER ROUTING (Architecture Alignment)
    // ============================================
    const isPartnersDomain = hostname === PARTNER_SUBDOMAIN ||
        (process.env.NODE_ENV === 'development' && hostname === 'seller.localhost')

    const isAppDomain = hostname === 'app.traaaction.com' ||
        (process.env.NODE_ENV === 'development' && hostname === 'app.localhost')

    // 🔄 SELLER PORTAL ROUTING (seller.traaaction.com)
    if (isPartnersDomain) {
        // Exclude shared pages (auth, assets) from rewriting — they work normally
        // NOTE: /onboarding is NOT shared — seller.traaaction.com/onboarding → /seller/onboarding
        const sharedPaths = ['/login', '/auth', '/seller-terms',
                             '/_next', '/api', '/Logotrac', '/favicon']
        const isShared = sharedPaths.some(p => pathname.startsWith(p))

        if (!isShared) {
            const newUrl = request.nextUrl.clone()
            if (pathname === '/') {
                newUrl.pathname = '/seller'
            } else if (!pathname.startsWith('/seller')) {
                newUrl.pathname = `/seller${pathname}`
            }
            console.log(`[Middleware] 🔀 Rewriting Seller Domain: ${hostname}${pathname} -> ${newUrl.pathname}`)
            return NextResponse.rewrite(newUrl)
        }
        // Shared paths: fall through to normal middleware flow (login, auth, etc.)
    }

    // 🔄 APP PORTAL ROUTING (app.traaaction.com)
    if (isAppDomain) {
        const sharedPaths = ['/login', '/auth', '/onboarding',
                             '/_next', '/api', '/Logotrac', '/favicon']
        const isShared = sharedPaths.some(p => pathname.startsWith(p))

        if (!isShared) {
            const newUrl = request.nextUrl.clone()
            if (pathname === '/') {
                newUrl.pathname = '/dashboard'
            } else if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/admin')) {
                newUrl.pathname = `/dashboard${pathname}`
            }
            console.log(`[Middleware] 🔀 Rewriting App Domain: ${hostname}${pathname} -> ${newUrl.pathname}`)
            return NextResponse.rewrite(newUrl)
        }
    }

    // ============================================
    // RATE LIMITING (Traaaction-Style)
    // ============================================

    // 🏠 BYPASS: Skip rate limiting for localhost in development
    const isLocalhost = ip === '127.0.0.1' || ip === '::1' || hostname === 'localhost'
    const isDev = process.env.NODE_ENV === 'development'

    if (isLocalhost && isDev) {
        console.log('[Edge] 🏠 Localhost - bypassing rate limit')
        // Continue to normal flow without rate limiting
    }
    // 🛡️ EXEMPT: Stripe webhooks - NEVER rate limit
    else if (pathname.startsWith('/api/webhooks/stripe')) {
        console.log('[Edge] 💳 Stripe webhook - bypassing rate limit')
        // Continue to normal flow
    }
    // 🔗 LINK REDIRECTS: Very permissive (100 req/10s per IP)
    else if (pathname.startsWith('/s/') || pathname.startsWith('/c/')) {
        try {
            const { success, limit, remaining, reset } = await linkRateLimiter.limit(ip)

            if (!success) {
                console.warn('[Edge] ⚠️ Rate limited (link):', ip, '- Limit:', limit, 'Remaining:', remaining)

                // Log abuse to Tinybird (fire-and-forget)
                event.waitUntil(
                    logAbuseToTinybird(ip, pathname, 'link_rate_limit')
                )

                return new NextResponse(
                    JSON.stringify({ error: 'Too many requests', retryAfter: Math.ceil((reset - Date.now()) / 1000) }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': reset.toString(),
                            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                        },
                    }
                )
            }
        } catch (err) {
            // 🔓 FAIL OPEN: If Redis is down, allow the request through
            console.error('[Edge] ⚠️ Rate limiter error (fail-open):', err)
        }
    }
    // 📡 API ENDPOINTS: Stricter (1000 req/5min per IP)
    else if (pathname.startsWith('/api/') && !pathname.startsWith('/api/domains/lookup')) {
        try {
            const { success, limit, remaining, reset } = await apiRateLimiter.limit(ip)

            if (!success) {
                console.warn('[Edge] ⚠️ Rate limited (API):', ip, '- Limit:', limit, 'Remaining:', remaining)

                return new NextResponse(
                    JSON.stringify({ error: 'Rate limit exceeded', retryAfter: Math.ceil((reset - Date.now()) / 1000) }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': reset.toString(),
                            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                        },
                    }
                )
            }
        } catch (err) {
            // 🔓 FAIL OPEN: If Redis is down, allow the request through
            console.error('[Edge] ⚠️ Rate limiter error (fail-open):', err)
        }
    }

    // ============================================
    // CUSTOM DOMAIN SECURITY GUARDS
    // ============================================
    if (customDomain) {
        // Block dashboard access on custom domains - redirect to primary
        if (pathname.startsWith('/dashboard')) {
            const primaryUrl = new URL(pathname, `https://${PRIMARY_DOMAIN}`)
            primaryUrl.search = request.nextUrl.search
            console.log('[Edge] 🛡️ Blocking dashboard on custom domain, redirecting to primary')
            return NextResponse.redirect(primaryUrl.toString())
        }

        // Block auth endpoints on custom domains
        if (pathname.startsWith('/api/auth') || pathname.startsWith('/login') || pathname.startsWith('/auth')) {
            console.log('[Edge] 🛡️ Blocking auth route on custom domain')
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Verify domain ownership for non-static routes
        if (!pathname.startsWith('/_next') && !pathname.startsWith('/favicon') && !pathname.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)$/)) {
            const workspaceId = await getWorkspaceIdFromDomain(hostname, request.nextUrl.origin)

            if (!workspaceId) {
                console.log('[Edge] ⛔ Unverified custom domain:', hostname)
                return NextResponse.json({ error: 'Domain not configured' }, { status: 404 })
            }

            // Attach workspace ID to request for downstream use
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-workspace-id', workspaceId)
            requestHeaders.set('x-custom-domain', hostname)
        }
    }

    // ============================================
    // FIRST-PARTY TRACKING ROUTES (CSP Bypass)
    // Rewrites /trac.js and /_trac/* on custom domains
    // Enables boutiques to load tracking without CSP errors
    // ============================================
    if (customDomain) {
        // Get workspace ID for this domain (needed for tracking context)
        const workspaceId = await getWorkspaceIdFromDomain(hostname, request.nextUrl.origin)

        // Serve trac.js as first-party script
        if (pathname === '/trac.js' || pathname === '/trac.min.js') {
            console.log('[Edge] 📜 First-Party Script Request:', hostname, pathname)

            const newUrl = request.nextUrl.clone()
            newUrl.pathname = '/api/script'
            newUrl.searchParams.set('domain', hostname)
            if (workspaceId) {
                newUrl.searchParams.set('workspace_id', workspaceId)
            }

            const response = NextResponse.rewrite(newUrl)
            response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
            return response
        }

        // Proxy /_trac/* API calls (tracking events, clicks, etc.)
        if (pathname.startsWith('/_trac/')) {
            console.log('[Edge] 🔄 First-Party API Proxy:', hostname, pathname)

            const newUrl = request.nextUrl.clone()
            // Remove /_trac prefix: /_trac/api/events → /api/events
            newUrl.pathname = pathname.replace('/_trac', '')

            // Forward workspace context
            const requestHeaders = new Headers(request.headers)
            if (workspaceId) {
                requestHeaders.set('x-workspace-id', workspaceId)
            }
            requestHeaders.set('x-custom-domain', hostname)
            requestHeaders.set('x-first-party', 'true')

            const response = NextResponse.rewrite(newUrl, {
                request: { headers: requestHeaders }
            })

            // Dynamic CORS for first-party tracking
            response.headers.set('Access-Control-Allow-Origin', `https://${hostname}`)
            response.headers.set('Access-Control-Allow-Credentials', 'true')
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

            return response
        }

        // Handle CORS preflight for /_trac routes
        if (request.method === 'OPTIONS' && pathname.startsWith('/_trac/')) {
            return new NextResponse(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': `https://${hostname}`,
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            })
        }
    }

    // ============================================
    // SHORT LINK REDIRECT (/s/*)
    // Ultra-fast Edge redirect via Redis
    // ============================================
    if (pathname.startsWith('/s/')) {
        const slug = pathname.replace('/s/', '')

        if (!slug) {
            return NextResponse.redirect(new URL('/404', request.url))
        }

        // Build Redis key
        const domain = getDomain(request)
        const redisKey = buildRedisKey(domain, slug)

        console.log('[Edge] 🔍 Looking up:', redisKey)

        // Try Redis first (fast path)
        let linkData: RedisLinkData | null = null

        try {
            const rawData = await redis.get<string | RedisLinkData>(redisKey)

            if (rawData) {
                // Handle both string and object formats
                linkData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
            }

            // 🔄 FALLBACK: If custom domain miss, try primary domain
            if (!linkData && customDomain) {
                const fallbackKey = buildRedisKey(PRIMARY_DOMAIN, slug)
                console.log('[Edge] 🔄 Fallback lookup:', fallbackKey)

                const fallbackData = await redis.get<string | RedisLinkData>(fallbackKey)
                if (fallbackData) {
                    linkData = typeof fallbackData === 'string' ? JSON.parse(fallbackData) : fallbackData
                    console.log('[Edge] ✅ Fallback HIT on primary domain')
                }
            }
        } catch (err) {
            console.error('[Edge] ❌ Redis error:', err)
        }

        // ✅ REDIS HIT: Fast Edge redirect
        if (linkData) {
            console.log('[Edge] ⚡ Redis HIT:', slug, '→', linkData.url.slice(0, 50))

            // 🔍 SOCIAL CRAWLER: Serve OG meta tags instead of 302
            const uaString = request.headers.get('user-agent') || ''
            if (isSocialCrawler(uaString) && (linkData.ogTitle || linkData.ogDescription || linkData.ogImage)) {
                console.log('[Edge] 🤖 Social crawler detected:', uaString.slice(0, 40))

                const crawlerClickId = generateClickId()
                const crawlerUa = userAgent(request)
                const crawlerIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                    || request.headers.get('x-real-ip') || '0.0.0.0'
                const crawlerCountry = request.headers.get('x-vercel-ip-country') || ''
                const crawlerCity = request.headers.get('x-vercel-ip-city') || ''
                const crawlerReferrer = request.headers.get('referer') || ''
                const crawlerDevice = parseDevice(crawlerUa)

                event.waitUntil(
                    Promise.all([
                        logClickToTinybird({
                            timestamp: new Date().toISOString(),
                            click_id: crawlerClickId,
                            workspace_id: linkData.workspaceId,
                            link_id: linkData.linkId,
                            affiliate_id: linkData.sellerId || null,
                            url: linkData.url,
                            user_agent: crawlerUa.ua || '',
                            ip: crawlerIp, country: crawlerCountry, city: crawlerCity,
                            referrer: crawlerReferrer, device: crawlerDevice,
                        }),
                        redis.set(
                            `click:${crawlerClickId}`,
                            JSON.stringify({
                                linkId: linkData.linkId,
                                sellerId: linkData.sellerId || null,
                                workspaceId: linkData.workspaceId
                            }),
                            { ex: 90 * 24 * 60 * 60 }
                        ).catch(() => {}),
                        fetch(`${request.nextUrl.origin}/api/track/increment-click`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(TRAC_CLIENT_TOKEN && { 'Authorization': `Bearer ${TRAC_CLIENT_TOKEN}` }),
                            },
                            body: JSON.stringify({ linkId: linkData.linkId }),
                        }).catch(() => {}),
                    ])
                )

                const ogTitle = linkData.ogTitle || ''
                const ogDesc = linkData.ogDescription || ''
                const ogImg = linkData.ogImage || ''
                const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<title>${escapeHtml(ogTitle)}</title>
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDesc)}">
${ogImg ? `<meta property="og:image" content="${escapeHtml(ogImg)}">` : ''}
<meta property="og:url" content="${escapeHtml(linkData.url)}">
<meta name="twitter:card" content="${ogImg ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${escapeHtml(ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(ogDesc)}">
${ogImg ? `<meta name="twitter:image" content="${escapeHtml(ogImg)}">` : ''}
<meta http-equiv="refresh" content="0;url=${escapeHtml(linkData.url)}">
</head><body></body></html>`

                return new NextResponse(html, {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                })
            }

            // Generate unique click ID
            const click_id = generateClickId()

            // Extract visitor data from headers
            const ua = userAgent(request)
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || request.headers.get('x-real-ip')
                || '0.0.0.0'
            const country = request.headers.get('x-vercel-ip-country') || ''
            const city = request.headers.get('x-vercel-ip-city') || ''
            const referrer = request.headers.get('referer') || ''
            const device = parseDevice(ua)

            // Build destination URL with tracking params
            const destinationUrl = new URL(linkData.url)
            destinationUrl.searchParams.set('trac_id', click_id)
            destinationUrl.searchParams.set('client_reference_id', click_id)

            // Create redirect response
            const response = NextResponse.redirect(destinationUrl.toString())

            // Set first-party cookie for attribution (survives URL param stripping)
            // ✅ COOKIE STRATEGY:
            // - Domain: .client.com (shared across all subdomains)
            // - HttpOnly: false (allows SDK to read for page_view tracking)
            // - SameSite: Lax (cross-site navigation allowed)
            const cookieDomain = customDomain ? getRootDomainForCookie(hostname) : undefined

            console.log('[Edge] 🍪 Cookie Config:', {
                domain: cookieDomain || '(default)',
                hostname: hostname,
                customDomain: customDomain,
            })

            response.cookies.set('clk_id', click_id, {
                httpOnly: false,  // ✅ SDK READABLE for page_view tracking
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 90, // 90 days attribution window
                path: '/',
                ...(cookieDomain && { domain: cookieDomain })
            })

            // 🔥 FIRE-AND-FORGET: Log click in background
            // User doesn't wait for tracking to complete
            event.waitUntil(
                Promise.all([
                    // 1. Log to Tinybird for analytics
                    logClickToTinybird({
                        timestamp: new Date().toISOString(),
                        click_id,
                        workspace_id: linkData.workspaceId,
                        link_id: linkData.linkId,
                        affiliate_id: linkData.sellerId || null,
                        url: linkData.url,
                        user_agent: ua.ua || '',
                        ip,
                        country,
                        city,
                        referrer,
                        device,
                    }),
                    // 2. CRITICAL: Store in Redis for Lead attribution lookup
                    // Lead tracking looks up click:{clickId} to get sellerId
                    redis.set(
                        `click:${click_id}`,
                        JSON.stringify({
                            linkId: linkData.linkId,
                            sellerId: linkData.sellerId || null,
                            workspaceId: linkData.workspaceId
                        }),
                        { ex: 90 * 24 * 60 * 60 } // 90 days (same as cookie)
                    ).then(() => {
                        console.log(`[Edge] ✅ Stored click:${click_id} in Redis for Lead attribution`)
                    }).catch(err => {
                        console.error('[Edge] ⚠️ Failed to store click in Redis:', err)
                    }),
                    // 3. INCREMENT ShortLink.clicks in Prisma via internal API
                    // Edge runtime cannot use Prisma directly, so we call a lightweight endpoint
                    fetch(`${request.nextUrl.origin}/api/track/increment-click`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(TRAC_CLIENT_TOKEN && { 'Authorization': `Bearer ${TRAC_CLIENT_TOKEN}` }),
                        },
                        body: JSON.stringify({ linkId: linkData.linkId }),
                    }).then(() => {
                        console.log(`[Edge] ✅ Incremented ShortLink.clicks for ${linkData.linkId}`)
                    }).catch(err => {
                        console.error('[Edge] ⚠️ Failed to increment click count:', err)
                    })
                ])
            )

            console.log('[Edge] 🚀 Redirect:', slug, '→', destinationUrl.hostname)
            return response
        }

        // ❌ REDIS MISS: Fall through to page handler (Prisma fallback)
        console.log('[Edge] 📦 Redis MISS, falling back to page:', slug)
        return NextResponse.next()
    }

    // ============================================
    // AFFILIATE LINK TRACKING (/c/*)
    // Legacy path - uses API lookup
    // ============================================
    if (pathname.startsWith('/c/')) {
        const slug = pathname.replace('/c/', '')

        // Get link data from API
        const linkData = await getLinkDataFromAPI(slug, request.nextUrl.origin)

        if (!linkData) {
            console.log('[Edge] ❌ Link not found:', slug)
            return NextResponse.redirect(new URL('/404', request.url))
        }

        // Generate unique click ID
        const click_id = generateClickId()

        // Extract user data
        const ua = userAgent(request)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
        const country = request.headers.get('x-vercel-ip-country') || ''
        const city = request.headers.get('x-vercel-ip-city') || ''
        const referrer = request.headers.get('referer') || ''
        const device = parseDevice(ua)

        // Log to Tinybird + increment Prisma clicks in background
        event.waitUntil(
            Promise.all([
                logClickToTinybird({
                    timestamp: new Date().toISOString(),
                    click_id,
                    workspace_id: linkData.workspace_id,
                    link_id: linkData.link_id,
                    affiliate_id: null,
                    url: request.url,
                    user_agent: ua.ua || '',
                    ip,
                    country,
                    city,
                    referrer,
                    device,
                }),
                // INCREMENT ShortLink.clicks in Prisma via internal API
                fetch(`${request.nextUrl.origin}/api/track/increment-click`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(TRAC_CLIENT_TOKEN && { 'Authorization': `Bearer ${TRAC_CLIENT_TOKEN}` }),
                    },
                    body: JSON.stringify({ linkId: linkData.link_id }),
                }).then(() => {
                    console.log(`[Edge] ✅ Incremented ShortLink.clicks for ${linkData.link_id}`)
                }).catch(err => {
                    console.error('[Edge] ⚠️ Failed to increment click count:', err)
                })
            ])
        )

        // Build destination URL with tracking params
        const destinationUrl = new URL(linkData.destination_url)
        destinationUrl.searchParams.set('trac_id', click_id)
        destinationUrl.searchParams.set('client_reference_id', click_id)

        // Create redirect response with cookie
        // ✅ UNIFIED: Cookie name 'clk_id' matches SDK, TTL 90 days
        const response = NextResponse.redirect(destinationUrl.toString())
        response.cookies.set('clk_id', click_id, {
            httpOnly: false,  // JS accessible for SDK compatibility
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90, // 90 days (unified)
            path: '/',
        })

        return response
    }

    // ============================================
    // SUPABASE SESSION REFRESH & AUTH
    // ============================================
    const { user, supabaseResponse } = await updateSession(request)

    // Protected routes - redirect to login if not authenticated
    if (pathname.startsWith('/dashboard')) {
        // In production on the main domain, redirect to app subdomain
        if (!isAppDomain && !isDev) {
            const appUrl = new URL(pathname, 'https://app.traaaction.com')
            appUrl.search = request.nextUrl.search
            return NextResponse.redirect(appUrl)
        }

        if (!user) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // ============================================
        // WORKSPACE EXISTENCE CHECK (Onboarding Guard)
        // ============================================
        try {
            const checkUrl = new URL('/api/auth/workspace-check', request.url)
            const checkRes = await fetch(checkUrl, {
                headers: {
                    cookie: request.headers.get('cookie') || ''
                }
            })

            if (checkRes.ok) {
                const { hasWorkspace, hasSeller } = await checkRes.json()

                if (!hasWorkspace) {
                    // Strict Isolation: If Seller tries to access Dashboard/Onboarding, send to Seller Portal
                    if (hasSeller) {
                        console.log('[Middleware] 🛡️ Seller attempting to access Dashboard - Redirecting to /seller')
                        return NextResponse.redirect(new URL('/seller', request.url))
                    }

                    console.log('[Middleware] 🚀 User has no workspace, redirecting to onboarding')
                    return NextResponse.redirect(new URL('/onboarding', request.url))
                }
            }
        } catch (err) {
            // Fail open - let the page handle it if the check fails
            console.error('[Middleware] ⚠️ Workspace check failed:', err)
        }

        // ============================================
        // WORKSPACE SECURITY CHECK
        // ============================================
        // Check if path is /dashboard/[slug]...
        const pathParts = pathname.split('/') // ['', 'dashboard', 'slug', ...]

        // Reserved slugs that are actual page routes, not workspace slugs
        const reservedSlugs = ['new', 'links', 'settings', 'domains', 'integration', 'marketplace', 'missions', 'affiliate', 'startup', 'partners', 'sellers', 'profile', 'commissions', 'messages', 'payouts', 'customers', 'analytics', 'fraud', 'bounties', 'campaigns', 'resources', 'admin']

        if (pathParts.length >= 3 && !reservedSlugs.includes(pathParts[2])) {
            const slug = pathParts[2]

            try {
                // Verify access via internal API (Context: Middleware runs on Edge, Prisma doesn't)
                const verifyUrl = new URL('/api/auth/verify', request.url)
                verifyUrl.searchParams.set('slug', slug)

                // Pass cookie headers for auth
                const verifyRes = await fetch(verifyUrl, {
                    headers: {
                        cookie: request.headers.get('cookie') || ''
                    }
                })

                if (verifyRes.status === 403 || verifyRes.status === 404) {
                    console.warn(`[Middleware] ⛔ Access denied to workspace: ${slug}`)
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } catch (err) {
                console.error('[Middleware] ⚠️ Verify check failed:', err)
            }
        }
    }

    // ============================================
    // SELLER PORTAL PROTECTION (Biface Architecture)
    // Subdomain = source of truth. No workspace-check API call.
    // The seller layout handles "no seller record" → redirect to onboarding.
    // ============================================
    if (pathname.startsWith('/seller') && !pathname.startsWith('/seller-terms')) {
        // In production on main domain, redirect /seller/* to seller subdomain
        if (!isPartnersDomain && !isDev) {
            const sellerPath = pathname.replace('/seller', '') || '/'
            const sellerUrl = new URL(sellerPath, `https://${PARTNER_SUBDOMAIN}`)
            sellerUrl.search = request.nextUrl.search
            return NextResponse.redirect(sellerUrl)
        }

        if (!user) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Onboarding: let the page handle it (no seller record check needed)
        if (pathname === '/seller/onboarding') {
            return supabaseResponse
        }

        // No workspace-check. The seller layout verifies the seller record.
        // Any authenticated user can reach the seller pages;
        // the layout redirects to /seller/onboarding if no seller record.
        return supabaseResponse
    }

    // ============================================
    // AUTH CHOICE PAGE PROTECTION
    // ============================================
    if (pathname.startsWith('/auth/choice')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Safety net: if user signed up as seller but got redirected here,
        // skip choice page and go straight to seller onboarding
        const signupRoleChoice = request.cookies.get('trac_signup_role')?.value
        if (signupRoleChoice === 'seller') {
            console.log('[Middleware] 🛡️ Seller signup detected at /auth/choice, redirecting to /seller/onboarding')
            return NextResponse.redirect(new URL('/seller/onboarding', request.url))
        }
    }

    // ============================================
    // ONBOARDING PAGE PROTECTION
    // ============================================
    if (pathname === '/onboarding') {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Safety net 1: cookie check (fast, no DB call)
        const signupRole = request.cookies.get('trac_signup_role')?.value
        if (signupRole === 'seller') {
            console.log('[Middleware] 🛡️ Seller signup detected via cookie, redirecting to /seller/onboarding')
            const response = NextResponse.redirect(new URL('/seller/onboarding', request.url))
            response.cookies.delete('trac_signup_role')
            return response
        }
        // Safety net 2: DB check — sellers should NEVER see startup onboarding
        try {
            const checkUrl = new URL('/api/auth/workspace-check', request.url)
            const checkRes = await fetch(checkUrl, {
                headers: { cookie: request.headers.get('cookie') || '' }
            })
            if (checkRes.ok) {
                const { hasWorkspace, hasSeller } = await checkRes.json()
                if (hasSeller && !hasWorkspace) {
                    console.log('[Middleware] 🛡️ Seller detected at /onboarding, redirecting to /seller')
                    return NextResponse.redirect(new URL('/seller', request.url))
                }
                if (hasWorkspace) {
                    console.log('[Middleware] 🛡️ User already has workspace, redirecting to /dashboard')
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            }
        } catch (err) {
            console.error('[Middleware] ⚠️ Onboarding check failed:', err)
        }
        // Allow access to onboarding - user has no workspace and no seller
    }

    if (pathname.startsWith('/marketplace')) {
        if (!user) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    return supabaseResponse
}

// =============================================
// HELPER: Legacy API lookup for /c/* routes
// =============================================

async function getLinkDataFromAPI(slug: string, baseUrl: string): Promise<{
    workspace_id: string
    link_id: string
    destination_url: string
} | null> {
    try {
        const res = await fetch(`${baseUrl}/api/links/lookup?slug=${slug}`, {
            cache: 'no-store',
        })
        if (res.ok) {
            return await res.json()
        }
    } catch (e) {
        console.error('[Edge] ❌ Failed to lookup link:', e)
    }
    return null
}

// =============================================
// MATCHER CONFIG
// =============================================

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
