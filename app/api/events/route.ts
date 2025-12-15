import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/tinybird'

// CORS Headers for public tracking API
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-publishable-key',
}

// Handle CORS preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}

export async function POST(request: Request) {
    // 🔍 DEBUG: Vérification de la variable d'environnement
    console.log("🔍 DEBUG ENV VAR TINYBIRD_ADMIN_TOKEN:", process.env.TINYBIRD_ADMIN_TOKEN ? "✅ Présent" : "❌ Manquant")

    try {
        const body = await request.json()
        const { click_id, event_name, amount, currency, external_id } = body

        // Validation
        if (!click_id) {
            return NextResponse.json(
                { success: false, error: 'click_id is required' },
                { status: 400, headers: corsHeaders }
            )
        }

        if (!event_name) {
            return NextResponse.json(
                { success: false, error: 'event_name is required' },
                { status: 400, headers: corsHeaders }
            )
        }

        // Record event to Tinybird
        const result = await recordEvent({
            click_id,
            event_name,
            amount: amount || 0,
            currency: currency || 'EUR',
            external_id: external_id || '',
        })

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500, headers: corsHeaders }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Event recorded',
                event_name,
                click_id,
            },
            { status: 200, headers: corsHeaders }
        )
    } catch (error) {
        console.error('Error recording event:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        )
    }
}
