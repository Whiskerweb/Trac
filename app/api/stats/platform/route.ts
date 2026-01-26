import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic to get fresh stats, but we can cache if needed
export const dynamic = 'force-dynamic'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

export async function GET() {
    try {
        // 1. Fetch Links Count from Postgres (Prisma)
        const linksCountPromise = prisma.shortLink.count()

        // 2. Fetch Aggregated Stats from Tinybird (Clicks & Revenue)
        // Using SQL API for global aggregation
        const tinybirdPromise = fetchTinybirdGlobalStats()

        const [linksCount, tinybirdStats] = await Promise.all([
            linksCountPromise,
            tinybirdPromise
        ])

        return NextResponse.json({
            links: linksCount,
            clicks: tinybirdStats.clicks,
            revenue: tinybirdStats.revenue
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300' // Cache for 1 min
            }
        })

    } catch (error) {
        console.error('[Platform Stats] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats', details: String(error) },
            { status: 500 }
        )
    }
}

async function fetchTinybirdGlobalStats() {
    if (!TINYBIRD_TOKEN) {
        console.warn('[Platform Stats] Missing TINYBIRD_ADMIN_TOKEN')
        return { clicks: 0, revenue: 0 }
    }

    try {
        // Run two queries: 
        // 1. Total clicks from 'clicks' datasource
        // 2. Total revenue from 'events' datasource (where event_name = 'sale')

        // Note: In a real high-scale scenario, we should use a materialized view (Pipe).
        // For now, simple SQL aggregation is fine if the dataset isn't billions (TB handles it well though).
        const sql = `
            SELECT 
                (SELECT count() FROM clicks) as total_clicks,
                (SELECT sum(amount) FROM events WHERE event_name = 'sale') as total_revenue
            FORMAT JSON
        `

        const url = `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(sql)}`

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
            cache: 'no-store'
        })

        if (!response.ok) {
            console.error('[Platform Stats] Tinybird error:', await response.text())
            return { clicks: 0, revenue: 0 }
        }

        const result = await response.json()
        const row = result.data?.[0] || {}

        return {
            clicks: row.total_clicks || 0,
            revenue: (row.total_revenue || 0) / 100 // Convert cents to dollars/euros
        }

    } catch (error) {
        console.error('[Platform Stats] Tinybird fetch error:', error)
        return { clicks: 0, revenue: 0 }
    }
}
