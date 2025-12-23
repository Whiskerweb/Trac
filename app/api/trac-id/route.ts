import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/trac-id
 * 
 * Recovery endpoint for click_id when URL parameter was stripped.
 * Returns the HTTPOnly cookie set during redirect.
 * 
 * This is used by the SDK as a fallback when:
 * - Privacy browsers stripped the URL parameter
 * - User returned after closing browser (client cookie might be gone)
 */
export async function GET(req: NextRequest) {
    const clickId = req.cookies.get('trac_click_id')?.value

    // CORS headers for cross-origin requests from shop domains
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-store',
    }

    if (clickId) {
        console.log('[Trac API] 🔑 Click ID recovered from cookie:', clickId)
        return NextResponse.json({ click_id: clickId }, { headers })
    }

    console.log('[Trac API] ⚠️ No click_id cookie found')
    return NextResponse.json({ click_id: null }, { headers })
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true',
        },
    })
}
