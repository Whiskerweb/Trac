/**
 * =============================================
 * TRAC LINK REDIRECT - Dub.co Architecture
 * =============================================
 * 
 * This page acts as an "Identity Transporter":
 * 1. Generates unique click_id (trac_id)
 * 2. Logs click to Tinybird analytics
 * 3. Decorates destination URL with trac_id parameter
 * 4. Redirects user to decorated destination
 * 
 * The trac_id can be used by any destination site for
 * conversion attribution via the /track API endpoint.
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

// =============================================
// CONFIGURATION
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// The universal tracking parameter (like Dub's dub_id)
const TRAC_ID_PARAM = 'trac_id'

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Generate a unique Click ID
 * Format: clk_<12-char-nanoid>
 */
function generateClickId(): string {
    return `clk_${nanoid(12)}`
}

/**
 * Determine device type from User-Agent
 */
function parseDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'Mobile'
    if (/ipad|tablet/i.test(ua)) return 'Tablet'
    return 'Desktop'
}

/**
 * Decorate URL with trac_id parameter
 * Handles existing query params gracefully
 */
function decorateUrl(originalUrl: string, tracId: string): string {
    try {
        const url = new URL(originalUrl)
        url.searchParams.set(TRAC_ID_PARAM, tracId)
        return url.toString()
    } catch {
        // Fallback for malformed URLs
        const sep = originalUrl.includes('?') ? '&' : '?'
        return `${originalUrl}${sep}${TRAC_ID_PARAM}=${tracId}`
    }
}

/**
 * Log click event to Tinybird (fire-and-forget)
 * Non-blocking: uses .then() instead of await
 */
function logClick(payload: {
    timestamp: string
    click_id: string
    workspace_id: string
    link_id: string
    url: string
    user_agent: string
    ip: string
    country: string
    city: string
    referrer: string
    device: string
}): void {
    if (!TINYBIRD_TOKEN) {
        console.warn('[Trac] ⚠️ TINYBIRD_ADMIN_TOKEN missing')
        return
    }

    // Fire-and-forget: don't block redirect
    fetch(`${TINYBIRD_HOST}/v0/events?name=clicks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
        .then(res => {
            if (res.ok) {
                console.log('[Trac] ✅ Click logged:', payload.click_id)
            } else {
                res.text().then(t => console.error('[Trac] ❌ Tinybird error:', t))
            }
        })
        .catch(err => console.error('[Trac] ❌ Network error:', err.message))
}

// =============================================
// PAGE HANDLER
// =============================================

export default async function TracRedirect({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const headersList = await headers()

    // ----------------------------------------
    // 1. LOOKUP LINK
    // ----------------------------------------
    const link = await prisma.shortLink.findUnique({
        where: { slug }
    })

    if (!link) {
        console.log('[Trac] ❌ Not found:', slug)
        redirect('/404')
    }

    // ----------------------------------------
    // 2. GENERATE UNIQUE CLICK ID
    // ----------------------------------------
    const click_id = generateClickId()

    // ----------------------------------------
    // 3. EXTRACT VISITOR DATA
    // ----------------------------------------
    const userAgent = headersList.get('user-agent') || ''
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || '0.0.0.0'
    const country = headersList.get('x-vercel-ip-country') || ''
    const city = headersList.get('x-vercel-ip-city') || ''
    const referrer = headersList.get('referer') || ''
    const device = parseDevice(userAgent)

    // ----------------------------------------
    // 4. INCREMENT LOCAL COUNTER
    // ----------------------------------------
    prisma.shortLink.update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } }
    }).catch(() => { }) // Fire-and-forget

    // ----------------------------------------
    // 5. LOG TO TINYBIRD (Fire-and-Forget)
    // ----------------------------------------
    logClick({
        timestamp: new Date().toISOString(),
        click_id,
        workspace_id: link.workspace_id,
        link_id: link.slug,
        url: link.original_url,
        user_agent: userAgent,
        ip,
        country,
        city,
        referrer,
        device,
    })

    // ----------------------------------------
    // 6. DECORATE & REDIRECT
    // ----------------------------------------
    const destination = decorateUrl(link.original_url, click_id)

    console.log('[Trac] 🚀 Redirect:', {
        slug,
        click_id,
        destination: destination.slice(0, 80) + '...',
    })

    redirect(destination)
}
