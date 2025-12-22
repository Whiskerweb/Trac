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
 * Parse Tinybird SQL response (NDJSON format)
 * Returns array of rows from the response
 */
function parseTinybirdResponse(text: string): Record<string, unknown>[] {
    if (!text || text.trim() === '') return []

    const lines = text.trim().split('\n').filter(line => line.trim())
    const results: Record<string, unknown>[] = []

    for (const line of lines) {
        try {
            const parsed = JSON.parse(line)
            // Tinybird SQL returns rows directly, not wrapped in {data: [...]}
            if (typeof parsed === 'object' && parsed !== null) {
                results.push(parsed)
            }
        } catch {
            // Skip lines that aren't valid JSON (like stats lines)
            continue
        }
    }

    return results
}

/**
 * GET /api/stats/activity
 * Returns combined click and sale events for debugging
 * Query params: mode ('startup' or 'affiliate'), limit (default: 30)
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

    try {
        const events: ActivityEvent[] = []

        // Build queries based on view mode
        // affiliate_id column may not exist yet in clicks - use FAIL-SAFE approach
        const clicksQuery = viewMode === 'affiliate'
            ? `SELECT timestamp, workspace_id, click_id, link_id, url, country, device FROM clicks ORDER BY timestamp DESC LIMIT ${limit}`
            : `SELECT timestamp, workspace_id, click_id, link_id, url, country, device FROM clicks WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

        console.log('[Activity API] Fetching clicks...')

        try {
            const clicksResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                {
                    headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
                }
            )

            if (clicksResponse.ok) {
                const clicksText = await clicksResponse.text()
                console.log('[Activity API] Clicks response:', clicksText.slice(0, 200))

                const clicksData = parseTinybirdResponse(clicksText)
                for (const click of clicksData) {
                    // Filter affiliate events client-side if in affiliate mode
                    events.push({
                        type: 'click',
                        timestamp: String(click.timestamp || ''),
                        link_id: String(click.link_id || ''),
                        affiliate_id: null, // Will be null until column exists
                        workspace_id: String(click.workspace_id || ''),
                        click_id: String(click.click_id || ''),
                        country: String(click.country || ''),
                        device: String(click.device || ''),
                    })
                }
            } else {
                console.log('[Activity API] Clicks fetch failed:', clicksResponse.status)
            }
        } catch (clickError) {
            console.error('[Activity API] Clicks error:', clickError)
        }

        // Fetch sales
        const salesQuery = viewMode === 'affiliate'
            ? `SELECT timestamp, workspace_id, click_id, link_id, affiliate_id, amount, currency FROM sales WHERE affiliate_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`
            : `SELECT timestamp, workspace_id, click_id, link_id, affiliate_id, amount, currency FROM sales WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

        console.log('[Activity API] Fetching sales...')

        try {
            const salesResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
                {
                    headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
                }
            )

            if (salesResponse.ok) {
                const salesText = await salesResponse.text()
                console.log('[Activity API] Sales response:', salesText.slice(0, 200))

                const salesData = parseTinybirdResponse(salesText)
                for (const sale of salesData) {
                    events.push({
                        type: 'sale',
                        timestamp: String(sale.timestamp || ''),
                        link_id: sale.link_id ? String(sale.link_id) : null,
                        affiliate_id: sale.affiliate_id ? String(sale.affiliate_id) : null,
                        workspace_id: String(sale.workspace_id || ''),
                        amount: typeof sale.amount === 'number' ? sale.amount : 0,
                        currency: String(sale.currency || 'EUR'),
                        click_id: sale.click_id ? String(sale.click_id) : undefined,
                    })
                }
            } else {
                console.log('[Activity API] Sales fetch failed:', salesResponse.status)
            }
        } catch (saleError) {
            console.error('[Activity API] Sales error:', saleError)
        }

        // Sort all events by timestamp descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        // Limit total
        const limitedEvents = events.slice(0, limit)

        console.log(`[Activity API] Returning ${limitedEvents.length} events for mode: ${viewMode}`)

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
