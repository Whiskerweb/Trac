import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic to get fresh stats, but we can cache if needed
export const dynamic = 'force-dynamic'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

export async function GET() {
    try {
        const [linksCount, revenueResult, tinybirdClicks] = await Promise.all([
            // 1. Links count from Postgres
            prisma.shortLink.count(),
            // 2. Revenue from Commission table (source of truth, verified via Stripe webhooks)
            prisma.commission.aggregate({ _sum: { gross_amount: true } }),
            // 3. Clicks from Tinybird
            fetchTinybirdClicks()
        ])

        return NextResponse.json({
            links: linksCount,
            clicks: tinybirdClicks,
            revenue: (revenueResult._sum.gross_amount || 0) / 100
        }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
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

async function fetchTinybirdClicks(): Promise<number> {
    if (!TINYBIRD_TOKEN) {
        console.warn('[Platform Stats] Missing TINYBIRD_ADMIN_TOKEN')
        return 0
    }

    try {
        const sql = `SELECT count() as total_clicks FROM clicks FORMAT JSON`
        const url = `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(sql)}`

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
            cache: 'no-store'
        })

        if (!response.ok) {
            console.error('[Platform Stats] Tinybird error:', await response.text())
            return 0
        }

        const result = await response.json()
        return result.data?.[0]?.total_clicks || 0

    } catch (error) {
        console.error('[Platform Stats] Tinybird fetch error:', error)
        return 0
    }
}
