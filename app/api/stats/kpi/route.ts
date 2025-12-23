import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// ⚠️ SECURITY: Force dynamic rendering - NEVER cache this route
// This ensures each request gets fresh auth context
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_ADMIN_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * KPI Stats Proxy
 * GET /api/stats/kpi
 * 
 * Server-side proxy that fetches KPIs from Tinybird with enforced workspace filtering.
 * Uses authenticated user's ID as workspace_id for multi-tenant data isolation.
 * 
 * SECURITY: Each request MUST authenticate fresh - no caching allowed.
 */
export async function GET() {
    // ========================================
    // 🦁 MOCK MODE: Return fake data for local development
    // ========================================
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK STATS] Serving fake data for /api/stats/kpi')

        // Generate realistic mock timeseries data (last 30 days)
        const timeseries = []
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            timeseries.push({
                date: date.toISOString().split('T')[0],
                clicks: Math.floor(Math.random() * 50) + 10,
                leads: Math.floor(Math.random() * 5),
                sales: Math.floor(Math.random() * 3),
                revenue: Math.floor(Math.random() * 200) + 50,
            })
        }

        // Calculate totals from timeseries
        const totals = timeseries.reduce(
            (acc, day) => ({
                clicks: acc.clicks + day.clicks,
                leads: acc.leads + day.leads,
                sales: acc.sales + day.sales,
                revenue: acc.revenue + day.revenue,
            }),
            { clicks: 0, leads: 0, sales: 0, revenue: 0 }
        )

        return NextResponse.json({
            meta: [
                { name: 'date', type: 'Date' },
                { name: 'clicks', type: 'Int64' },
                { name: 'leads', type: 'Int64' },
                { name: 'sales', type: 'Int64' },
                { name: 'revenue', type: 'Float64' },
            ],
            data: [
                {
                    ...totals,
                    timeseries,
                }
            ],
            rows: 1,
            statistics: { elapsed: 0.001, rows_read: 100, bytes_read: 1024 },
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    }

    // ========================================
    // SECURITY CHECK 1: Admin Token Present
    // ========================================
    if (!TINYBIRD_ADMIN_TOKEN) {
        console.error('[KPI Proxy] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        )
    }

    // ========================================
    // SECURITY CHECK 2: Authenticate User (FRESH - no cache)
    // ========================================
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.error('[SECURITY CHECK] ❌ Authentication failed - no user session')
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    // ========================================
    // SECURITY LOG: Trace the requesting user
    // ========================================
    console.log('[SECURITY CHECK] ✅ Requesting User:', user.id)
    console.log('[SECURITY CHECK] 📧 User Email:', user.email)

    try {
        // ========================================
        // BUILD TINYBIRD REQUEST (Strict Isolation)
        // ========================================
        const tinybirdUrl = new URL(`${TINYBIRD_HOST}/v0/pipes/kpis.json`)

        // CRITICAL: Use the authenticated user's ID as workspace_id
        // This is the ONLY way data isolation is enforced
        tinybirdUrl.searchParams.set('workspace_id', user.id)
        tinybirdUrl.searchParams.set('date_from', '2024-01-01')
        tinybirdUrl.searchParams.set('date_to', '2025-12-31')

        console.log('[SECURITY CHECK] 🎯 Target Tinybird URL:', tinybirdUrl.toString())

        // ========================================
        // FETCH FROM TINYBIRD (NO CACHE)
        // ========================================
        const response = await fetch(tinybirdUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            // CRITICAL: Never cache this request
            cache: 'no-store',
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
        console.log('[KPI Proxy] ✅ Data fetched successfully for user:', user.id)

        // Return with no-cache headers for the response too
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })

    } catch (error) {
        console.error('[KPI Proxy] ❌ Network error:', error)
        return NextResponse.json(
            { error: 'Failed to connect to analytics service' },
            { status: 500 }
        )
    }
}
