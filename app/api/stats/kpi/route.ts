import { NextResponse } from 'next/server'

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_ADMIN_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// Hardcoded workspace for this sprint (will be dynamic from auth later)
const DEV_WORKSPACE_ID = 'ws_PIRATE'

/**
 * KPI Stats Proxy
 * GET /api/stats/kpi
 * 
 * Server-side proxy that fetches KPIs from Tinybird with enforced workspace filtering.
 * This keeps the admin token secure on the server.
 */
export async function GET() {
    if (!TINYBIRD_ADMIN_TOKEN) {
        console.error('[KPI Proxy] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        )
    }

    try {
        // Build Tinybird URL with FORCED workspace_id filter
        // This ensures multi-tenant data isolation at the query level
        const tinybirdUrl = new URL(`${TINYBIRD_HOST}/v0/pipes/kpis.json`)
        tinybirdUrl.searchParams.set('workspace_id', DEV_WORKSPACE_ID)
        tinybirdUrl.searchParams.set('date_from', '2024-01-01')
        tinybirdUrl.searchParams.set('date_to', '2025-12-31')

        console.log('[KPI Proxy] 📊 Fetching from Tinybird:', tinybirdUrl.toString())

        const response = await fetch(tinybirdUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            // Cache for 30 seconds to reduce API calls
            next: { revalidate: 30 },
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[KPI Proxy] ❌ Tinybird error:', response.status, errorText)
            return NextResponse.json(
                { error: 'Failed to fetch analytics', details: errorText },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('[KPI Proxy] ✅ Data fetched successfully')

        // Return the exact Tinybird response
        return NextResponse.json(data)

    } catch (error) {
        console.error('[KPI Proxy] ❌ Network error:', error)
        return NextResponse.json(
            { error: 'Failed to connect to analytics service' },
            { status: 500 }
        )
    }
}
