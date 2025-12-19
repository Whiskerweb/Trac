import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// =============================================
// CORS CONFIGURATION
// =============================================

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-trac-key, x-trac-id',
    'Access-Control-Max-Age': '86400',
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
// API KEY VALIDATION
// =============================================

/**
 * Validate API key and return workspace_id
 * Returns null if key is invalid
 */
async function validateApiKey(publicKey: string): Promise<string | null> {
    if (!publicKey || !publicKey.startsWith('pk_trac_')) {
        return null
    }

    try {
        const apiKey = await prisma.apiKey.findUnique({
            where: { public_key: publicKey }
        })

        if (!apiKey) {
            console.log('[Track API] ❌ Invalid API key:', publicKey.slice(0, 20) + '...')
            return null
        }

        // Update last_used_at (fire-and-forget)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { last_used_at: new Date() }
        }).catch(() => { })

        console.log('[Track API] ✅ API key validated for workspace:', apiKey.workspace_id)
        return apiKey.workspace_id

    } catch (error) {
        console.error('[Track API] ❌ Key validation error:', error)
        return null
    }
}

// =============================================
// POST - Track Conversion Event
// =============================================

/**
 * Track API - Receives conversion events from client SDK
 * 
 * POST /api/track
 * Headers: x-trac-key: pk_trac_xxx (required)
 * Body: { click_id, event_name, amount, currency }
 * 
 * Security: 
 * - API key is validated against database
 * - workspace_id is derived from API key, not from request body
 */
export async function POST(req: NextRequest) {
    const headersList = await headers()

    // ========================================
    // 1. EXTRACT & VALIDATE API KEY
    // ========================================
    const apiKey = headersList.get('x-trac-key')

    if (!apiKey) {
        console.log('[Track API] ❌ Missing x-trac-key header')
        return NextResponse.json(
            { error: 'Missing API key. Include x-trac-key header.' },
            { status: 401, headers: CORS_HEADERS }
        )
    }

    const workspaceId = await validateApiKey(apiKey)

    if (!workspaceId) {
        return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401, headers: CORS_HEADERS }
        )
    }

    // ========================================
    // 2. PARSE REQUEST BODY
    // ========================================
    let body
    try {
        body = await req.json()
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400, headers: CORS_HEADERS }
        )
    }

    const { click_id, event_name, amount, currency } = body

    // Validate required field
    if (!click_id) {
        return NextResponse.json(
            { error: 'click_id is required' },
            { status: 400, headers: CORS_HEADERS }
        )
    }

    console.log('[Track API] 📥 Conversion event:', {
        workspace_id: workspaceId,
        click_id,
        event_name,
        amount,
        currency
    })

    // ========================================
    // 3. EXTRACT VISITOR DATA
    // ========================================
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
        || headersList.get('x-real-ip')
        || '0.0.0.0'

    // ========================================
    // 4. LOG TO TINYBIRD
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
        // SECURITY: workspace_id comes from validated API key, not request body
        workspace_id: workspaceId,
        click_id,
        customer_external_id: ip,
        amount: amount || 0,
        currency: (currency || 'EUR').toUpperCase(),
        payment_processor: 'track_api',
    }

    console.log('[Track API] 📊 Logging to Tinybird:', {
        workspace_id: payload.workspace_id,
        click_id: payload.click_id,
        amount: payload.amount,
    })

    try {
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

        console.log('[Track API] ✅ Conversion tracked:', {
            click_id,
            workspace_id: workspaceId,
            amount
        })

        return NextResponse.json(
            {
                success: true,
                click_id,
                workspace_id: workspaceId,
                message: 'Conversion tracked'
            },
            { status: 200, headers: CORS_HEADERS }
        )

    } catch (error) {
        console.error('[Track API] ❌ Network error:', error)
        return NextResponse.json(
            { error: 'Network error' },
            { status: 500, headers: CORS_HEADERS }
        )
    }
}
