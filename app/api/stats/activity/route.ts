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
 * Parse Tinybird SQL response (TSV format by default)
 * First line is headers, subsequent lines are data
 */
function parseTSVResponse(text: string, columns: string[]): Record<string, string>[] {
    if (!text || text.trim() === '') return []

    const lines = text.trim().split('\n')
    const results: Record<string, string>[] = []

    // Each line is tab-separated values matching our column order
    for (const line of lines) {
        const values = line.split('\t')
        if (values.length >= columns.length) {
            const row: Record<string, string> = {}
            columns.forEach((col, idx) => {
                row[col] = values[idx] || ''
            })
            results.push(row)
        }
    }

    return results
}

/**
 * GET /api/stats/activity
 * Returns combined click and sale events for debugging
 */
export async function GET(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '30')
    const viewMode = searchParams.get('mode') || 'startup'

    if (!TINYBIRD_TOKEN) {
        return NextResponse.json({ error: 'Tinybird not configured' }, { status: 500 })
    }

    const events: ActivityEvent[] = []

    // ========================================
    // FETCH CLICKS (columns we know exist)
    // ========================================
    try {
        const clicksColumns = ['timestamp', 'workspace_id', 'click_id', 'link_id', 'url', 'country', 'device']
        const clicksQuery = viewMode === 'affiliate'
            ? `SELECT ${clicksColumns.join(', ')} FROM clicks ORDER BY timestamp DESC LIMIT ${limit}`
            : `SELECT ${clicksColumns.join(', ')} FROM clicks WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

        const clicksResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (clicksResponse.ok) {
            const clicksText = await clicksResponse.text()
            const clicksData = parseTSVResponse(clicksText, clicksColumns)

            console.log(`[Activity API] Parsed ${clicksData.length} clicks`)

            for (const click of clicksData) {
                events.push({
                    type: 'click',
                    timestamp: click.timestamp,
                    link_id: click.link_id || null,
                    affiliate_id: null, // Not in clicks table yet
                    workspace_id: click.workspace_id,
                    click_id: click.click_id,
                    country: click.country,
                    device: click.device,
                })
            }
        } else {
            const errorText = await clicksResponse.text()
            console.error(`[Activity API] Clicks error ${clicksResponse.status}:`, errorText.slice(0, 200))
        }
    } catch (err) {
        console.error('[Activity API] Clicks exception:', err)
    }

    // ========================================
    // FETCH SALES (use only columns that exist)
    // ========================================
    try {
        // Query columns - include link_id and affiliate_id if they exist
        const salesColumns = ['timestamp', 'workspace_id', 'click_id', 'invoice_id', 'amount', 'currency', 'link_id', 'affiliate_id']

        // Different filter based on view mode
        const salesFilter = viewMode === 'affiliate'
            ? `affiliate_id = '${user.id}'`  // Affiliate sees their own sales
            : `workspace_id = '${user.id}'`  // Startup sees all workspace sales

        const salesQuery = `SELECT ${salesColumns.join(', ')} FROM sales WHERE ${salesFilter} ORDER BY timestamp DESC LIMIT ${limit}`

        console.log(`[Activity API] Sales query (${viewMode}):`, salesQuery.slice(0, 100))

        const salesResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (salesResponse.ok) {
            const salesText = await salesResponse.text()
            const salesData = parseTSVResponse(salesText, salesColumns)

            console.log(`[Activity API] Parsed ${salesData.length} sales`)

            for (const sale of salesData) {
                events.push({
                    type: 'sale',
                    timestamp: sale.timestamp,
                    link_id: sale.link_id || null,
                    affiliate_id: sale.affiliate_id || null,
                    workspace_id: sale.workspace_id,
                    amount: parseInt(sale.amount) || 0,
                    currency: sale.currency || 'EUR',
                    click_id: sale.click_id || undefined,
                })
            }
        } else {
            const errorText = await salesResponse.text()
            console.error(`[Activity API] Sales error ${salesResponse.status}:`, errorText.slice(0, 200))
        }
    } catch (err) {
        console.error('[Activity API] Sales exception:', err)
    }

    // Sort all events by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit total
    const limitedEvents = events.slice(0, limit)

    console.log(`[Activity API] ✅ Returning ${limitedEvents.length} events for mode: ${viewMode}`)

    return NextResponse.json({
        success: true,
        mode: viewMode,
        user_id: user.id,
        total: limitedEvents.length,
        events: limitedEvents,
    })
}
