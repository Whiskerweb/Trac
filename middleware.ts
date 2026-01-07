import { NextResponse, userAgent } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { Redis } from '@upstash/redis'

// =============================================
// REDIS CLIENT (Edge-Compatible)
// =============================================

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// =============================================
// TINYBIRD CONFIG
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// =============================================
// DOMAIN CONFIGURATION
// =============================================

const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'traaaction.com'
const PRIMARY_DOMAINS = [
    'traaaction.com',
    'www.traaaction.com',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
]

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
    affiliateId?: string | null
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

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
        return cached.workspaceId
    }

    // Check Redis cache
    try {
        const redisKey = `domain:${cacheKey}`
        const cachedWorkspaceId = await redis.get<string>(redisKey)

        if (cachedWorkspaceId !== null) {
            domainCache.set(cacheKey, { workspaceId: cachedWorkspaceId || null, timestamp: Date.now() })
            return cachedWorkspaceId || null
        }
    } catch (err) {
        console.error('[Edge] ⚠️ Redis domain cache error:', err)
    }

    // Fallback to API lookup
    try {
        const res = await fetch(`${baseUrl}/api/domains/lookup?hostname=${encodeURIComponent(cacheKey)}`, {
            cache: 'no-store',
        })

        if (res.ok) {
            const data = await res.json()
            const workspaceId = data.verified ? data.workspaceId : null

            // Cache in Redis for future requests
            try {
                await redis.set(`domain:${cacheKey}`, workspaceId || '', { ex: 3600 }) // 1 hour TTL
            } catch (e) {
                // Ignore cache write errors
            }

            domainCache.set(cacheKey, { workspaceId, timestamp: Date.now() })
            return workspaceId
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

// =============================================
// MIDDLEWARE HANDLER
// =============================================

export async function middleware(request: NextRequest, event: NextFetchEvent) {
    const { pathname } = request.nextUrl
    const hostname = getDomain(request)
    const customDomain = isCustomDomain(hostname)

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
        } catch (err) {
            console.error('[Edge] ❌ Redis error:', err)
        }

        // ✅ REDIS HIT: Fast Edge redirect
        if (linkData) {
            console.log('[Edge] ⚡ Redis HIT:', slug, '→', linkData.url.slice(0, 50))

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
                logClickToTinybird({
                    timestamp: new Date().toISOString(),
                    click_id,
                    workspace_id: linkData.workspaceId,
                    link_id: linkData.linkId,
                    affiliate_id: linkData.affiliateId || null,
                    url: linkData.url,
                    user_agent: ua.ua || '',
                    ip,
                    country,
                    city,
                    referrer,
                    device,
                })
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

        // Log to Tinybird in background
        event.waitUntil(
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
            })
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
                const { hasWorkspace } = await checkRes.json()
                if (!hasWorkspace) {
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
        const reservedSlugs = ['new', 'links', 'settings', 'domains', 'integration', 'marketplace', 'missions', 'affiliate', 'startup']

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
    // ONBOARDING PAGE PROTECTION
    // ============================================
    if (pathname === '/onboarding') {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        // Allow access to onboarding - the page will handle redirect if user already has workspace
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
