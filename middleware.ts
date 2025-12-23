import { NextResponse, userAgent } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

/**
 * Send click event to Tinybird (fire-and-forget)
 */
function logClickToTinybird(data: {
    workspace_id: string
    click_id: string
    link_id: string
    url: string
    user_agent: string
    ip: string
    country: string
    city: string
    referrer: string
    device: string
}) {
    if (!TINYBIRD_TOKEN) {
        console.warn('[Middleware] Missing TINYBIRD_ADMIN_TOKEN')
        return
    }

    const payload = {
        timestamp: new Date().toISOString(),
        ...data,
    }

    console.log('[Middleware] 📊 Logging click with workspace_id:', data.workspace_id)

    // Fire-and-forget - don't await
    fetch(`${TINYBIRD_HOST}/v0/events?name=clicks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    }).then(res => {
        if (res.ok) {
            console.log('[Middleware] ✅ Click logged:', data.click_id, 'for workspace:', data.workspace_id)
        } else {
            res.text().then(t => console.error('[Middleware] ❌ Tinybird error:', t))
        }
    }).catch(err => {
        console.error('[Middleware] ❌ Click logging failed:', err.message)
    })
}

/**
 * Fetch link data from database via API
 * Returns workspace_id (project owner) and link_id
 */
async function getLinkData(slug: string, baseUrl: string): Promise<{
    workspace_id: string
    link_id: string
    destination_url: string
} | null> {
    try {
        const res = await fetch(`${baseUrl}/api/links/lookup?slug=${slug}`, {
            cache: 'no-store',
        })
        if (res.ok) {
            const data = await res.json()
            return data
        }
    } catch (e) {
        console.error('[Middleware] ❌ Failed to lookup link:', e)
    }
    return null
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // ============================================
    // AFFILIATE LINK TRACKING (/c/*)
    // ============================================
    if (pathname.startsWith('/c/')) {
        const slug = pathname.replace('/c/', '')

        // Get link data including workspace_id from the project owner
        const linkData = await getLinkData(slug, request.nextUrl.origin)

        if (!linkData) {
            console.log('[Middleware] ❌ Link not found:', slug)
            return NextResponse.redirect(new URL('/404', request.url))
        }

        // Generate unique click ID
        const click_id = generateUUID()

        // Extract user data
        const ua = userAgent(request)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown'
        const country = request.headers.get('x-vercel-ip-country') || ''
        const city = request.headers.get('x-vercel-ip-city') || ''
        const referrer = request.headers.get('referer') || ''

        // Determine device type
        let device = 'Desktop'
        if (ua.device.type === 'mobile') device = 'Mobile'
        else if (ua.device.type === 'tablet') device = 'Tablet'

        console.log('[Middleware] 🔗 Affiliate click:', {
            slug,
            click_id,
            workspace_id: linkData.workspace_id,
            ip,
            country,
            device,
        })

        // Log to Tinybird with DYNAMIC workspace_id from project owner
        logClickToTinybird({
            workspace_id: linkData.workspace_id,  // ✅ DYNAMIC from link owner
            click_id,
            link_id: linkData.link_id,
            url: request.url,
            user_agent: ua.ua || '',
            ip,
            country,
            city,
            referrer,
            device,
        })

        // Build destination URL with tracking params
        const destinationUrl = new URL(linkData.destination_url)
        // Use trac_id (matches SDK expectation) + client_reference_id for Stripe
        destinationUrl.searchParams.set('trac_id', click_id)
        destinationUrl.searchParams.set('client_reference_id', click_id)

        // Create redirect response with HTTPOnly cookie fallback
        // This cookie survives URL parameter stripping by privacy browsers
        const response = NextResponse.redirect(destinationUrl.toString())
        response.cookies.set('trac_click_id', click_id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days attribution window
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

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
