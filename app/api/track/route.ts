import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// =============================================
// CORS CONFIGURATION
// =============================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // MVP: Accept all origins (restrict in prod)
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-trac-id, x-trac-key',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24h
}

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// =============================================
// OPTIONS - CORS Preflight
// =============================================

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: CORS_HEADERS,
    })
}

// =============================================
// POST - Track Conversion Event
// =============================================

/**
 * Track API - Receives conversion events from client SDK
 * 
 * POST /api/track
 * Body: { click_id, event_name, amount, currency }
 * 
 * Flow:
 * 1. Validate click_id
 * 2. Lookup workspace_id via attribution pipe
 * 3. Log sale/conversion to Tinybird
 */
export async function POST(req: NextRequest) {
    const headersList = await headers()

    try {
        const body = await req.json()

        const { click_id, event_name, amount, currency } = body

        // Validate required field
        if (!click_id) {
            return NextResponse.json(
                { error: 'click_id is required' },
                { status: 400, headers: CORS_HEADERS }
            )
        }

        console.log('[Track API] 📥 Received:', { click_id, event_name, amount, currency })

        // ========================================
        // 1. RESOLVE CLICK TO WORKSPACE
        // ========================================
        let workspace_id = 'unknown'

        if (click_id.startsWith('clk_')) {
            const attributionUrl = `${TINYBIRD_HOST}/v0/pipes/attribution.json?click_id=${encodeURIComponent(click_id)}&token=${TINYBIRD_TOKEN}`

            try {
                const attrRes = await fetch(attributionUrl)
                if (attrRes.ok) {
                    const attrData = await attrRes.json()
                    if (attrData.data?.[0]?.workspace_id) {
                        workspace_id = attrData.data[0].workspace_id
                        console.log(`[Track API] 🔄 Resolved ${click_id} → ${workspace_id}`)
                    }
                }
            } catch (err) {
                console.error('[Track API] ⚠️ Attribution lookup failed:', err)
            }
        }

        // ========================================
        // 2. EXTRACT VISITOR DATA
        // ========================================
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || '0.0.0.0'
        const userAgent = headersList.get('user-agent') || ''

        // ========================================
        // 3. LOG TO TINYBIRD
        // ========================================
        if (!TINYBIRD_TOKEN) {
            console.error('[Track API] ❌ Missing TINYBIRD_ADMIN_TOKEN')
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500, headers: CORS_HEADERS }
            )
        }

        const payload = {
            timestamp: new Date().toISOString(),
            event_id: crypto.randomUUID(),
            invoice_id: `trk_${crypto.randomUUID().slice(0, 8)}`,
            workspace_id,
            click_id,
            customer_external_id: ip, // Use IP as customer identifier for now
            amount: amount || 0,
            currency: (currency || 'EUR').toUpperCase(),
            payment_processor: 'track_api',
        }

        console.log('[Track API] 📊 Logging to Tinybird:', payload)

        const tbRes = await fetch(`${TINYBIRD_HOST}/v0/events?name=sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (!tbRes.ok) {
            const errText = await tbRes.text()
            console.error('[Track API] ❌ Tinybird error:', errText)
            return NextResponse.json(
                { error: 'Failed to log event' },
                { status: 500, headers: CORS_HEADERS }
            )
        }

        console.log('[Track API] ✅ Conversion tracked:', { click_id, workspace_id, amount })

        return NextResponse.json(
            {
                success: true,
                click_id,
                workspace_id,
                message: 'Conversion tracked'
            },
            { status: 200, headers: CORS_HEADERS }
        )

    } catch (error) {
        console.error('[Track API] ❌ Error:', error)
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400, headers: CORS_HEADERS }
        )
    }
}
