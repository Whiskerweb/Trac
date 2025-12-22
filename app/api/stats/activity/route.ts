import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

interface ActivityEvent {
    type: 'click' | 'sale'
    timestamp: string
    link_id: string | null
    affiliate_id: string | null
    workspace_id: string
    amount?: number
    currency?: string
    click_id?: string
    country?: string
    device?: string
}

/**
 * GET /api/stats/activity
 * Returns combined click and sale events for debugging
 * Query params: workspace_id (optional), affiliate_id (optional), limit (default: 50)
 */
export async function GET(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const viewMode = searchParams.get('mode') || 'startup' // 'startup' or 'affiliate'

    if (!TINYBIRD_TOKEN) {
        return NextResponse.json({ error: 'Tinybird not configured' }, { status: 500 })
    }

    try {
        const events: ActivityEvent[] = []

        // Fetch clicks
        const clicksQuery = viewMode === 'affiliate'
            ? `SELECT * FROM clicks WHERE affiliate_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`
            : `SELECT * FROM clicks WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

        const clicksResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
            {
                headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
            }
        )

        if (clicksResponse.ok) {
            const clicksData = await clicksResponse.json()
            if (clicksData.data) {
                for (const click of clicksData.data) {
                    events.push({
                        type: 'click',
                        timestamp: click.timestamp,
                        link_id: click.link_id,
                        affiliate_id: click.affiliate_id || null,
                        workspace_id: click.workspace_id,
                        click_id: click.click_id,
                        country: click.country,
                        device: click.device,
                    })
                }
            }
        }

        // Fetch sales
        const salesQuery = viewMode === 'affiliate'
            ? `SELECT * FROM sales WHERE affiliate_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`
            : `SELECT * FROM sales WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

        const salesResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
            {
                headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
            }
        )

        if (salesResponse.ok) {
            const salesData = await salesResponse.json()
            if (salesData.data) {
                for (const sale of salesData.data) {
                    events.push({
                        type: 'sale',
                        timestamp: sale.timestamp,
                        link_id: sale.link_id || null,
                        affiliate_id: sale.affiliate_id || null,
                        workspace_id: sale.workspace_id,
                        amount: sale.amount,
                        currency: sale.currency,
                        click_id: sale.click_id || null,
                    })
                }
            }
        }

        // Sort all events by timestamp descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        // Limit total
        const limitedEvents = events.slice(0, limit)

        return NextResponse.json({
            success: true,
            mode: viewMode,
            user_id: user.id,
            total: limitedEvents.length,
            events: limitedEvents,
        })

    } catch (error) {
        console.error('[Activity API] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}
