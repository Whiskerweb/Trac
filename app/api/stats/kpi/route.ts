import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

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
export async function GET(request: NextRequest) {
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

        // Calculate conversion rate (sales / clicks * 100)
        const conversion_rate = totals.clicks > 0
            ? parseFloat(((totals.sales / totals.clicks) * 100).toFixed(2))
            : 0

        // Mock affiliates data (top 5 partners)
        const affiliates = [
            { affiliate_id: 'Alice Johnson', total_clicks: 234, total_sales: 12, total_revenue: 45000 },
            { affiliate_id: 'Bob Martinez', total_clicks: 189, total_sales: 8, total_revenue: 32000 },
            { affiliate_id: 'Charlie Chen', total_clicks: 156, total_sales: 7, total_revenue: 28000 },
            { affiliate_id: 'Diana Foster', total_clicks: 98, total_sales: 4, total_revenue: 15000 },
            { affiliate_id: 'Eve Williams', total_clicks: 67, total_sales: 2, total_revenue: 9000 },
        ]

        return NextResponse.json({
            meta: [
                { name: 'date', type: 'Date' },
                { name: 'clicks', type: 'Int64' },
                { name: 'leads', type: 'Int64' },
                { name: 'sales', type: 'Int64' },
                { name: 'revenue', type: 'Float64' },
                { name: 'conversion_rate', type: 'Float64' },
            ],
            data: [
                {
                    ...totals,
                    conversion_rate,
                    timeseries,
                    affiliates,
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
    // GET ACTIVE WORKSPACE
    // ========================================
    const workspace = await getActiveWorkspaceForUser()

    if (!workspace) {
        console.warn('[KPI Proxy] ⚠️ User has no workspace, redirect to onboarding')
        return NextResponse.json(
            { error: 'No workspace found. Please complete onboarding.', code: 'NO_WORKSPACE' },
            { status: 400 }
        )
    }

    const workspaceId = workspace.workspaceId

    // ========================================
    // SECURITY LOG: Trace the requesting user
    // ========================================
    console.log('[SECURITY CHECK] ✅ Requesting User:', user.id)
    console.log('[SECURITY CHECK] 🏢 Workspace ID:', workspaceId)

    try {
        // ========================================
        // BUILD TINYBIRD URLS (Two pipes in parallel)
        // ========================================
        // Get date range from query params (sent by frontend DateRangePicker)
        const { searchParams } = new URL(request.url)
        const dateFrom = searchParams.get('date_from') || '2020-01-01'
        // ✅ Append T23:59:59 to include the FULL day (Tinybird parses 2026-01-07 as midnight, excluding clicks at 10:53)
        let dateTo = searchParams.get('date_to') || '2030-12-31'
        if (dateTo && !dateTo.includes('T')) {
            dateTo = `${dateTo}T23:59:59`  // Include entire day
        }

        const baseParams = new URLSearchParams({
            workspace_id: workspaceId,
            date_from: dateFrom,
            date_to: dateTo,
        })

        const kpisUrl = `${TINYBIRD_HOST}/v0/pipes/kpis.json?${baseParams}`
        const trendUrl = `${TINYBIRD_HOST}/v0/pipes/trend.json?${baseParams}`

        console.log('[KPI Proxy] 🎯 Fetching KPIs:', kpisUrl)
        console.log('[KPI Proxy] 📈 Fetching Trend:', trendUrl)

        // ========================================
        // PARALLEL FETCH FROM TINYBIRD (NO CACHE)
        // ========================================
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store' as RequestCache,
        }

        const [kpisResponse, trendResponse] = await Promise.all([
            fetch(kpisUrl, fetchOptions),
            fetch(trendUrl, fetchOptions),
        ])

        // ========================================
        // HANDLE KPI RESPONSE
        // ========================================
        if (!kpisResponse.ok) {
            const errorText = await kpisResponse.text()
            console.error('[KPI Proxy] ❌ KPIs Tinybird error:', kpisResponse.status, errorText)
            return NextResponse.json(
                { error: 'Failed to fetch KPIs', details: errorText },
                { status: kpisResponse.status }
            )
        }

        const kpisData = await kpisResponse.json()
        const kpi = kpisData.data?.[0] || { clicks: 0, sales: 0, revenue: 0, conversion_rate: 0 }

        // ========================================
        // HANDLE TREND RESPONSE (Graceful fallback)
        // ========================================
        let timeseries: Array<{ date: string; clicks: number; sales: number; revenue: number }> = []

        if (trendResponse.ok) {
            const trendData = await trendResponse.json()
            timeseries = trendData.data || []
            console.log('[KPI Proxy] 📈 Trend data:', timeseries.length, 'days')
        } else {
            // Log but don't fail - timeseries is optional
            const errorText = await trendResponse.text()
            console.warn('[KPI Proxy] ⚠️ Trend pipe error (fallback to empty):', errorText.slice(0, 100))
        }

        // ========================================
        // MERGE RESULTS INTO UNIFIED RESPONSE
        // ========================================
        const mergedData = {
            meta: [
                { name: 'clicks', type: 'Int64' },
                { name: 'sales', type: 'Int64' },
                { name: 'revenue', type: 'Float64' },
                { name: 'conversion_rate', type: 'Float64' },
                { name: 'timeseries', type: 'Array' },
            ],
            data: [{
                clicks: kpi.clicks || 0,
                sales: kpi.sales || 0,
                revenue: kpi.revenue || 0,
                conversion_rate: kpi.conversion_rate || 0,
                timeseries: timeseries,
            }],
            rows: 1,
            statistics: kpisData.statistics || { elapsed: 0, rows_read: 0, bytes_read: 0 },
        }

        console.log('[KPI Proxy] ✅ Merged data for user:', user.id)

        // Return with no-cache headers
        return NextResponse.json(mergedData, {
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
