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
 */
function getDomain(request: NextRequest): string {
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
            response.cookies.set('trac_click_id', click_id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days attribution window
                path: '/',
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
        const response = NextResponse.redirect(destinationUrl.toString())
        response.cookies.set('trac_click_id', click_id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
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
