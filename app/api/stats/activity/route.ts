import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

interface ActivityEvent {
    type: 'click' | 'sale'
    timestamp: string
    link_id: string | null
    link_slug: string | null
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
 */
function parseTSVResponse(text: string, columns: string[]): Record<string, string>[] {
    if (!text || text.trim() === '') return []

    const lines = text.trim().split('\n')
    const results: Record<string, string>[] = []

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
 * 
 * For AFFILIATES: We lookup their ShortLinks by affiliate_id from the DB,
 * then filter Tinybird events by those link_ids.
 */
export async function GET(req: NextRequest) {
    // ========================================
    // 🦁 MOCK MODE: Return fake data for local development
    // ========================================
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK STATS] Serving fake data for /api/stats/activity')

        const searchParams = req.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '30')
        const viewMode = searchParams.get('mode') || 'startup'

        // Generate realistic mock events
        const mockEvents = []
        const countries = ['FR', 'US', 'DE', 'GB', 'ES', 'IT', 'CA', 'AU']
        const devices = ['mobile', 'desktop', 'tablet']
        const cities = ['Paris', 'New York', 'Berlin', 'London', 'Madrid', 'Rome', 'Toronto', 'Sydney']

        const now = new Date()

        for (let i = 0; i < Math.min(limit, 20); i++) {
            const timestamp = new Date(now.getTime() - i * 1000 * 60 * Math.floor(Math.random() * 30 + 5))
            const isSale = Math.random() < 0.15 // 15% are sales
            const countryIndex = Math.floor(Math.random() * countries.length)

            if (isSale) {
                mockEvents.push({
                    type: 'sale' as const,
                    timestamp: timestamp.toISOString(),
                    link_id: `link_${Math.random().toString(36).substr(2, 9)}`,
                    link_slug: `promo-${Math.floor(Math.random() * 100)}`,
                    affiliate_id: viewMode === 'affiliate' ? 'mock_affiliate_id' : null,
                    workspace_id: 'mock_workspace_id',
                    amount: Math.floor(Math.random() * 200) + 29,
                    currency: 'EUR',
                    click_id: `click_${Math.random().toString(36).substr(2, 9)}`,
                    country: countries[countryIndex],
                    device: devices[Math.floor(Math.random() * devices.length)],
                    _mock_label: `💰 Sale from ${cities[countryIndex]} - Stripe`,
                })
            } else {
                mockEvents.push({
                    type: 'click' as const,
                    timestamp: timestamp.toISOString(),
                    link_id: `link_${Math.random().toString(36).substr(2, 9)}`,
                    link_slug: `promo-${Math.floor(Math.random() * 100)}`,
                    affiliate_id: viewMode === 'affiliate' ? 'mock_affiliate_id' : null,
                    workspace_id: 'mock_workspace_id',
                    click_id: `click_${Math.random().toString(36).substr(2, 9)}`,
                    country: countries[countryIndex],
                    device: devices[Math.floor(Math.random() * devices.length)],
                    _mock_label: `🖱️ Click from ${cities[countryIndex]}`,
                })
            }
        }

        return NextResponse.json({
            success: true,
            mode: viewMode,
            user_id: 'mock_user_id',
            affiliate_links_count: viewMode === 'affiliate' ? 5 : 0,
            total: mockEvents.length,
            events: mockEvents,
            _mock: true,
        })
    }

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
    // FOR AFFILIATES: Get their link_ids from DB
    // ========================================
    let affiliateLinkIds: string[] = []
    let affiliateLinkMap: Map<string, string> = new Map() // link_id -> slug

    if (viewMode === 'affiliate') {
        const affiliateLinks = await prisma.shortLink.findMany({
            where: { affiliate_id: user.id },
            select: { id: true, slug: true }
        })
        affiliateLinkIds = affiliateLinks.map(l => l.id)
        affiliateLinks.forEach(l => affiliateLinkMap.set(l.id, l.slug))

        console.log(`[Activity API] Found ${affiliateLinkIds.length} links for affiliate ${user.id}`)
    }

    // ========================================
    // FETCH CLICKS (use columns that exist in Tinybird Cloud)
    // ========================================
    try {
        // Only use columns that definitely exist
        const clicksColumns = ['timestamp', 'workspace_id', 'click_id', 'link_id', 'url', 'country', 'device']

        let clicksQuery: string
        if (viewMode === 'affiliate') {
            if (affiliateLinkIds.length === 0) {
                console.log('[Activity API] Affiliate has no links, skipping clicks')
            } else {
                // Filter clicks by link_ids owned by this affiliate
                const linkIdList = affiliateLinkIds.map(id => `'${id}'`).join(',')
                clicksQuery = `SELECT ${clicksColumns.join(', ')} FROM clicks WHERE link_id IN (${linkIdList}) ORDER BY timestamp DESC LIMIT ${limit}`

                const clicksResponse = await fetch(
                    `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                    { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                )

                if (clicksResponse.ok) {
                    const clicksText = await clicksResponse.text()
                    const clicksData = parseTSVResponse(clicksText, clicksColumns)
                    console.log(`[Activity API] Parsed ${clicksData.length} affiliate clicks`)

                    for (const click of clicksData) {
                        events.push({
                            type: 'click',
                            timestamp: click.timestamp,
                            link_id: click.link_id || null,
                            link_slug: affiliateLinkMap.get(click.link_id) || null,
                            affiliate_id: user.id, // We know it's theirs
                            workspace_id: click.workspace_id,
                            click_id: click.click_id,
                            country: click.country,
                            device: click.device,
                        })
                    }
                } else {
                    const errorText = await clicksResponse.text()
                    console.error(`[Activity API] Clicks error:`, errorText.slice(0, 200))
                }
            }
        } else {
            // Startup mode: filter by workspace_id
            clicksQuery = `SELECT ${clicksColumns.join(', ')} FROM clicks WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

            const clicksResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (clicksResponse.ok) {
                const clicksText = await clicksResponse.text()
                const clicksData = parseTSVResponse(clicksText, clicksColumns)
                console.log(`[Activity API] Parsed ${clicksData.length} startup clicks`)

                for (const click of clicksData) {
                    events.push({
                        type: 'click',
                        timestamp: click.timestamp,
                        link_id: click.link_id || null,
                        link_slug: null,
                        affiliate_id: null,
                        workspace_id: click.workspace_id,
                        click_id: click.click_id,
                        country: click.country,
                        device: click.device,
                    })
                }
            } else {
                const errorText = await clicksResponse.text()
                console.error(`[Activity API] Clicks error:`, errorText.slice(0, 200))
            }
        }
    } catch (err) {
        console.error('[Activity API] Clicks exception:', err)
    }

    // ========================================
    // FETCH SALES (use columns that exist in Tinybird Cloud)
    // ========================================
    try {
        // Only use columns that definitely exist
        const salesColumns = ['timestamp', 'workspace_id', 'click_id', 'invoice_id', 'amount', 'currency']

        let salesQuery: string
        if (viewMode === 'affiliate') {
            if (affiliateLinkIds.length === 0) {
                console.log('[Activity API] Affiliate has no links, skipping sales')
            } else {
                // We need to find sales that came from clicks on affiliate links
                // For now, we'll get all sales and match by click_id later
                // This is a workaround until link_id column is added to sales in Tinybird
                salesQuery = `SELECT ${salesColumns.join(', ')} FROM sales ORDER BY timestamp DESC LIMIT 100`

                const salesResponse = await fetch(
                    `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
                    { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                )

                if (salesResponse.ok) {
                    const salesText = await salesResponse.text()
                    const salesData = parseTSVResponse(salesText, salesColumns)

                    // Match sales to affiliate's clicks
                    // Get click_ids from affiliate's clicks we just fetched
                    const affiliateClickIds = events
                        .filter(e => e.type === 'click' && e.click_id)
                        .map(e => e.click_id)

                    let matchedSales = 0
                    for (const sale of salesData) {
                        // Match if click_id is in affiliate's clicks
                        if (sale.click_id && affiliateClickIds.includes(sale.click_id)) {
                            matchedSales++
                            events.push({
                                type: 'sale',
                                timestamp: sale.timestamp,
                                link_id: null, // Would need to lookup
                                link_slug: null,
                                affiliate_id: user.id,
                                workspace_id: sale.workspace_id,
                                amount: parseInt(sale.amount) || 0,
                                currency: sale.currency || 'EUR',
                                click_id: sale.click_id,
                            })
                        }
                    }
                    console.log(`[Activity API] Matched ${matchedSales} sales for affiliate`)
                } else {
                    const errorText = await salesResponse.text()
                    console.error(`[Activity API] Sales error:`, errorText.slice(0, 200))
                }
            }
        } else {
            // Startup mode: filter by workspace_id
            salesQuery = `SELECT ${salesColumns.join(', ')} FROM sales WHERE workspace_id = '${user.id}' ORDER BY timestamp DESC LIMIT ${limit}`

            const salesResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (salesResponse.ok) {
                const salesText = await salesResponse.text()
                const salesData = parseTSVResponse(salesText, salesColumns)
                console.log(`[Activity API] Parsed ${salesData.length} startup sales`)

                for (const sale of salesData) {
                    events.push({
                        type: 'sale',
                        timestamp: sale.timestamp,
                        link_id: null,
                        link_slug: null,
                        affiliate_id: null,
                        workspace_id: sale.workspace_id,
                        amount: parseInt(sale.amount) || 0,
                        currency: sale.currency || 'EUR',
                        click_id: sale.click_id,
                    })
                }
            } else {
                const errorText = await salesResponse.text()
                console.error(`[Activity API] Sales error:`, errorText.slice(0, 200))
            }
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
        affiliate_links_count: affiliateLinkIds.length,
        total: limitedEvents.length,
        events: limitedEvents,
    })
}
