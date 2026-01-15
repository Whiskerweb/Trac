import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Headers for the analytics endpoint
 * Allows requests from the same origin (your frontend)
 */
function getCorsHeaders(request: NextRequest) {
    // Use custom domain from middleware if available, otherwise wildcard
    const customDomain = request.headers.get('x-custom-domain')
    const origin = customDomain ? `https://${customDomain}` : '*'

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true'
    }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(request),
    });
}

/**
 * POST /api/analytics
 * 
 * First-Party Analytics Ingestion
 * 
 * Features:
 * - First-Party Support: Extracts workspace context from middleware headers
 * - Event Types: pageview, event, click
 * - Mock Mode: Si TINYBIRD_MOCK_MODE=true, loggue et retourne 200
 * - Production: Envoie vers Tinybird events/clicks datasources
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request)

    // Extract first-party context from middleware
    const workspaceIdFromHeader = request.headers.get('x-workspace-id')
    const customDomain = request.headers.get('x-custom-domain')
    const isFirstParty = request.headers.get('x-first-party') === 'true'

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid JSON' },
            { status: 400, headers: corsHeaders }
        )
    }

    // Use workspace_id from header (middleware) or body
    const workspaceId = workspaceIdFromHeader || body.workspace_id || 'unknown'
    const eventType = body.type || 'event'
    const clickId = body.click_id || null
    const timestamp = body.timestamp || new Date().toISOString()

    // ============================================
    // 🦁 MOCK MODE
    // ============================================
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK] Analytics event:', {
            type: eventType,
            workspace_id: workspaceId,
            click_id: clickId,
            url: body.url,
            first_party: isFirstParty,
            domain: customDomain
        })

        return NextResponse.json(
            { success: true, mock: true, message: 'Event logged in mock mode' },
            { status: 200, headers: corsHeaders }
        )
    }

    // ============================================
    // 🚀 PRODUCTION - Send to Tinybird
    // ============================================
    const tinybirdToken = process.env.TINYBIRD_TOKEN

    if (!tinybirdToken) {
        console.error('[Analytics] TINYBIRD_TOKEN not configured')
        return NextResponse.json(
            { success: true, warning: 'Analytics not configured' },
            { status: 200, headers: corsHeaders }
        )
    }

    try {
        // Determine datasource based on event type
        let datasource = 'events'
        let eventData: any = {
            timestamp,
            workspace_id: workspaceId,
            click_id: clickId,
            event_type: eventType,
            url: body.url || '',
            referrer: body.referrer || '',
        }

        if (eventType === 'pageview') {
            datasource = 'pageviews'
            eventData = {
                timestamp,
                workspace_id: workspaceId,
                click_id: clickId,
                url: body.url || '',
                referrer: body.referrer || '',
                source: isFirstParty ? 'first_party' : 'third_party'
            }
        } else if (eventType === 'event') {
            datasource = 'events'
            eventData = {
                timestamp,
                workspace_id: workspaceId,
                click_id: clickId,
                event_name: body.event_name || 'custom',
                url: body.url || '',
                data: JSON.stringify(body.data || {}),
                source: isFirstParty ? 'first_party' : 'third_party'
            }
        }

        const tinybirdUrl = `https://api.tinybird.co/v0/events?name=${datasource}`

        const response = await fetch(tinybirdUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tinybirdToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('[Analytics] Tinybird error:', errorData)
        }

        return NextResponse.json(
            { success: true },
            { status: 200, headers: corsHeaders }
        )

    } catch (error) {
        console.error('[Analytics] Error:', error instanceof Error ? error.message : error)
        // Never fail the client
        return NextResponse.json(
            { success: true, warning: 'Event queued' },
            { status: 200, headers: corsHeaders }
        )
    }
}
