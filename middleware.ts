import { NextResponse, userAgent } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// Test link mapping (will be replaced by DB lookup)
const TEST_LINKS: Record<string, { url: string; link_id: string }> = {
    'test': {
        url: 'https://buy.stripe.com/test_bJe5kE1CB5oS9n63Ev2ZO00',
        link_id: 'link_test_001',
    },
}

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
            console.log('[Middleware] ✅ Click logged:', data.click_id)
        } else {
            res.text().then(t => console.error('[Middleware] ❌ Tinybird error:', t))
        }
    }).catch(err => {
        console.error('[Middleware] ❌ Click logging failed:', err.message)
    })
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // ============================================
    // AFFILIATE LINK TRACKING (/c/*)
    // ============================================
    if (pathname.startsWith('/c/')) {
        const slug = pathname.replace('/c/', '')
        const linkConfig = TEST_LINKS[slug]

        if (!linkConfig) {
            // Link not found - return 404
            return NextResponse.redirect(new URL('/404', request.url))
        }

        // Generate unique click ID
        const click_id = generateUUID()

        // Extract user data
        const ua = userAgent(request)
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'
        const country = request.geo?.country || ''
        const city = request.geo?.city || ''
        const referrer = request.headers.get('referer') || ''

        // Determine device type
        let device = 'Desktop'
        if (ua.device.type === 'mobile') device = 'Mobile'
        else if (ua.device.type === 'tablet') device = 'Tablet'

        console.log('[Middleware] 🔗 Affiliate click:', {
            slug,
            click_id,
            ip,
            country,
            device,
        })

        // Log to Tinybird (non-blocking)
        logClickToTinybird({
            workspace_id: 'ws_dev_001',
            click_id,
            link_id: linkConfig.link_id,
            url: request.url,
            user_agent: ua.ua || '',
            ip,
            country,
            city,
            referrer,
            device,
        })

        // Build destination URL with tracking params
        const destinationUrl = new URL(linkConfig.url)
        destinationUrl.searchParams.set('client_reference_id', click_id)
        destinationUrl.searchParams.set('prefilled_email', 'test@example.com')

        // Redirect to destination
        return NextResponse.redirect(destinationUrl.toString())
    }

    // ============================================
    // DASHBOARD AUTHENTICATION
    // ============================================
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('auth_token')?.value

        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        const payload = await verifyToken(token)

        if (!payload) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Role-based access control
        if (pathname.startsWith('/dashboard/startup') && payload.role !== 'STARTUP') {
            return NextResponse.redirect(new URL('/dashboard/affiliate', request.url))
        }

        if (pathname.startsWith('/dashboard/affiliate') && payload.role !== 'AFFILIATE') {
            return NextResponse.redirect(new URL('/dashboard/startup', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/c/:path*',  // Affiliate tracking links
    ],
}
