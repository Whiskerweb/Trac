import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

export const dynamic = 'force-dynamic'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

interface ActivityEvent {
    type: 'click' | 'lead' | 'sale'
    timestamp: string
    link_id: string | null
    link_slug: string | null
    affiliate_id: string | null
    workspace_id: string
    amount?: number
    net_amount?: number
    currency?: string
    click_id?: string
    country?: string
    device?: string
    event_name?: string
    // NEW: Mission Control fields
    hostname?: string
    product_name?: string
    user_agent?: string
    referrer?: string
    payment_processor?: string
    // Seller info
    seller?: {
        id: string
        name: string
        avatar?: string
    }
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
        const sellerNames = ['John Doe', 'Sarah Smith', 'Mike Johnson', 'Emma Wilson', 'David Brown']
        const eventTypes = ['click', 'lead', 'sale'] as const

        const now = new Date()

        for (let i = 0; i < Math.min(limit, 20); i++) {
            const timestamp = new Date(now.getTime() - i * 1000 * 60 * Math.floor(Math.random() * 30 + 5))
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
            const countryIndex = Math.floor(Math.random() * countries.length)
            const sellerName = sellerNames[Math.floor(Math.random() * sellerNames.length)]

            const baseEvent = {
                timestamp: timestamp.toISOString(),
                link_id: `link_${Math.random().toString(36).substr(2, 9)}`,
                link_slug: `promo-${Math.floor(Math.random() * 100)}`,
                affiliate_id: viewMode === 'affiliate' ? 'mock_affiliate_id' : `affiliate_${i}`,
                workspace_id: 'mock_workspace_id',
                click_id: `click_${Math.random().toString(36).substr(2, 9)}`,
                country: countries[countryIndex],
                device: devices[Math.floor(Math.random() * devices.length)],
                seller: {
                    id: `seller_${i % 5}`,
                    name: sellerName,
                    avatar: undefined,
                }
            }

            if (eventType === 'sale') {
                mockEvents.push({
                    ...baseEvent,
                    type: 'sale' as const,
                    amount: Math.floor(Math.random() * 200) + 29,
                    currency: 'EUR',
                    _mock_label: `💰 Sale from ${cities[countryIndex]} - Stripe`,
                })
            } else if (eventType === 'lead') {
                mockEvents.push({
                    ...baseEvent,
                    type: 'lead' as const,
                    event_name: 'signup',
                    _mock_label: `👤 Lead from ${cities[countryIndex]}`,
                })
            } else {
                mockEvents.push({
                    ...baseEvent,
                    type: 'click' as const,
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
            data: mockEvents,
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

    // Get actual workspace ID (NOT user.id)
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }
    const workspaceId = workspace.workspaceId

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
        // Only use columns that definitely exist + new enrichments
        const clicksColumns = ['timestamp', 'workspace_id', 'click_id', 'link_id', 'affiliate_id', 'url', 'country', 'device', 'referrer', 'user_agent']

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
                        // Extract hostname from URL for domain validation
                        let hostname = ''
                        try {
                            if (click.url) {
                                hostname = new URL(click.url).hostname
                            }
                        } catch (e) { /* ignore */ }

                        events.push({
                            type: 'click',
                            timestamp: click.timestamp,
                            link_id: click.link_id && click.link_id !== '\\N' ? click.link_id : null,
                            link_slug: affiliateLinkMap.get(click.link_id) || null,
                            affiliate_id: click.affiliate_id && click.affiliate_id !== '\\N' ? click.affiliate_id : user.id,
                            workspace_id: click.workspace_id,
                            click_id: click.click_id,
                            country: click.country,
                            device: click.device,
                            hostname,
                            referrer: click.referrer,
                            user_agent: click.user_agent,
                        })
                    }
                } else {
                    const errorText = await clicksResponse.text()
                    console.error(`[Activity API] Clicks error:`, errorText.slice(0, 200))
                }
            }
        } else {
            // Startup mode: filter by workspace_id
            clicksQuery = `SELECT ${clicksColumns.join(', ')} FROM clicks WHERE workspace_id = '${workspaceId}' ORDER BY timestamp DESC LIMIT ${limit}`

            const clicksResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (clicksResponse.ok) {
                const clicksText = await clicksResponse.text()
                const clicksData = parseTSVResponse(clicksText, clicksColumns)
                console.log(`[Activity API] Parsed ${clicksData.length} startup clicks`)

                for (const click of clicksData) {
                    // Extract hostname from URL for domain validation
                    let hostname = ''
                    try {
                        if (click.url) {
                            hostname = new URL(click.url).hostname
                        }
                    } catch (e) { /* ignore */ }

                    events.push({
                        type: 'click',
                        timestamp: click.timestamp,
                        link_id: click.link_id && click.link_id !== '\\N' ? click.link_id : null,
                        link_slug: null,
                        affiliate_id: click.affiliate_id && click.affiliate_id !== '\\N' ? click.affiliate_id : null,
                        workspace_id: click.workspace_id,
                        click_id: click.click_id,
                        country: click.country,
                        device: click.device,
                        hostname,
                        referrer: click.referrer,
                        user_agent: click.user_agent,
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
        // Only use columns that definitely exist + new enrichments
        const salesColumns = ['timestamp', 'workspace_id', 'click_id', 'invoice_id', 'amount', 'net_amount', 'currency', 'payment_processor']

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
                                net_amount: parseInt(sale.net_amount) || 0,
                                currency: sale.currency || 'EUR',
                                click_id: sale.click_id,
                                payment_processor: sale.payment_processor || 'stripe',
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
            salesQuery = `SELECT ${salesColumns.join(', ')} FROM sales WHERE workspace_id = '${workspaceId}' ORDER BY timestamp DESC LIMIT ${limit}`

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
                        net_amount: parseInt(sale.net_amount) || 0,
                        currency: sale.currency || 'EUR',
                        click_id: sale.click_id,
                        payment_processor: sale.payment_processor || 'stripe',
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

    // ========================================
    // FETCH LEADS
    // ========================================
    try {
        const leadsColumns = ['timestamp', 'workspace_id', 'click_id', 'event_name', 'customer_id']

        let leadsQuery: string
        if (viewMode === 'affiliate') {
            if (affiliateLinkIds.length > 0) {
                // Get click_ids from affiliate's clicks
                const affiliateClickIds = events
                    .filter(e => e.type === 'click' && e.click_id)
                    .map(e => e.click_id)

                if (affiliateClickIds.length > 0) {
                    const clickIdList = affiliateClickIds.map(id => `'${id}'`).join(',')
                    leadsQuery = `SELECT ${leadsColumns.join(', ')} FROM leads WHERE click_id IN (${clickIdList}) ORDER BY timestamp DESC LIMIT ${limit}`

                    const leadsResponse = await fetch(
                        `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`,
                        { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                    )

                    if (leadsResponse.ok) {
                        const leadsText = await leadsResponse.text()
                        const leadsData = parseTSVResponse(leadsText, leadsColumns)
                        console.log(`[Activity API] Parsed ${leadsData.length} affiliate leads`)

                        for (const lead of leadsData) {
                            events.push({
                                type: 'lead',
                                timestamp: lead.timestamp,
                                link_id: null,
                                link_slug: null,
                                affiliate_id: user.id,
                                workspace_id: lead.workspace_id,
                                click_id: lead.click_id,
                                event_name: lead.event_name,
                            })
                        }
                    }
                }
            }
        } else {
            // Startup mode: filter by workspace_id
            leadsQuery = `SELECT ${leadsColumns.join(', ')} FROM leads WHERE workspace_id = '${workspaceId}' ORDER BY timestamp DESC LIMIT ${limit}`

            const leadsResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (leadsResponse.ok) {
                const leadsText = await leadsResponse.text()
                const leadsData = parseTSVResponse(leadsText, leadsColumns)
                console.log(`[Activity API] Parsed ${leadsData.length} startup leads`)

                for (const lead of leadsData) {
                    events.push({
                        type: 'lead',
                        timestamp: lead.timestamp,
                        link_id: null,
                        link_slug: null,
                        affiliate_id: null,
                        workspace_id: lead.workspace_id,
                        click_id: lead.click_id,
                        event_name: lead.event_name,
                    })
                }
            } else {
                const errorText = await leadsResponse.text()
                console.error(`[Activity API] Leads error:`, errorText.slice(0, 200))
            }
        }
    } catch (err) {
        console.error('[Activity API] Leads exception:', err)
    }

    // ========================================
    // STEP 0: ENRICH LEADS AND SALES WITH LINK_ID FROM CLICKS
    // ========================================
    // Create a map of click_id -> link_id from click events
    const clickIdToLinkMap = new Map<string, string>()
    events.forEach(event => {
        if (event.type === 'click' && event.click_id && event.link_id) {
            clickIdToLinkMap.set(event.click_id, event.link_id)
        }
    })

    // If we have leads/sales without link_id but with click_id, try to get link_id from the map
    events.forEach(event => {
        if ((event.type === 'lead' || event.type === 'sale') && event.click_id && !event.link_id) {
            const linkId = clickIdToLinkMap.get(event.click_id)
            if (linkId) {
                event.link_id = linkId
            }
        }
    })

    // If there are still leads/sales without link_id, fetch from clicks table in Tinybird
    const eventsNeedingLinkId = events.filter(e =>
        (e.type === 'lead' || e.type === 'sale') && e.click_id && !e.link_id
    )

    if (eventsNeedingLinkId.length > 0) {
        try {
            const clickIds = [...new Set(eventsNeedingLinkId.map(e => e.click_id).filter(Boolean))] as string[]
            const clickIdList = clickIds.map(id => `'${id}'`).join(',')

            const clicksQuery = `SELECT click_id, link_id FROM clicks WHERE click_id IN (${clickIdList})`
            const clicksResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (clicksResponse.ok) {
                const clicksText = await clicksResponse.text()
                const clicksData = parseTSVResponse(clicksText, ['click_id', 'link_id'])

                clicksData.forEach(click => {
                    if (click.click_id && click.link_id) {
                        clickIdToLinkMap.set(click.click_id, click.link_id)
                    }
                })

                // Re-assign link_ids
                events.forEach(event => {
                    if ((event.type === 'lead' || event.type === 'sale') && event.click_id && !event.link_id) {
                        const linkId = clickIdToLinkMap.get(event.click_id)
                        if (linkId) {
                            event.link_id = linkId
                        }
                    }
                })

                console.log(`[Activity API] Enriched ${clickIds.length} click_ids with link_ids`)
            }
        } catch (err) {
            console.error('[Activity API] Failed to enrich click_ids with link_ids:', err)
        }
    }

    // ========================================
    // STEP 1: GET AFFILIATE_IDS FROM LINK_IDS
    // ========================================
    const uniqueLinkIds = [...new Set(events.map(e => e.link_id).filter(Boolean))] as string[]
    console.log(`[Activity API] 🔍 Found ${uniqueLinkIds.length} unique link_ids:`, uniqueLinkIds.slice(0, 5))

    if (uniqueLinkIds.length > 0) {
        try {
            const links = await prisma.shortLink.findMany({
                where: {
                    id: { in: uniqueLinkIds }
                },
                select: {
                    id: true,
                    affiliate_id: true,
                    slug: true,
                }
            })

            console.log(`[Activity API] 📊 Found ${links.length} links in database`)
            console.log(`[Activity API] 👤 Links with affiliate_id: ${links.filter(l => l.affiliate_id).length}`)

            // Create link -> affiliate map
            const linkToAffiliateMap = new Map<string, string>()
            links.forEach(link => {
                if (link.affiliate_id) {
                    linkToAffiliateMap.set(link.id, link.affiliate_id)
                    console.log(`[Activity API] 🔗 Mapping link ${link.slug} → affiliate ${link.affiliate_id}`)
                }
            })

            // Assign affiliate_id to events based on their link_id
            let enrichedCount = 0
            events.forEach(event => {
                if (event.link_id && !event.affiliate_id) {
                    const affiliateId = linkToAffiliateMap.get(event.link_id)
                    if (affiliateId) {
                        event.affiliate_id = affiliateId
                        enrichedCount++
                    }
                }
            })

            console.log(`[Activity API] ✅ Enriched ${enrichedCount} events with affiliate_id`)
        } catch (err) {
            console.error('[Activity API] Failed to map links to affiliates:', err)
        }
    } else {
        console.log(`[Activity API] ⚠️ No link_ids found in events!`)
    }

    // ========================================
    // STEP 2: ENRICH WITH SELLER INFORMATION
    // ========================================
    const uniqueAffiliateIds = [...new Set(events.map(e => e.affiliate_id).filter(Boolean))] as string[]
    console.log(`[Activity API] 👥 Found ${uniqueAffiliateIds.length} unique affiliate_ids:`, uniqueAffiliateIds.slice(0, 5))

    if (uniqueAffiliateIds.length > 0) {
        try {
            const sellers = await prisma.seller.findMany({
                where: {
                    user_id: { in: uniqueAffiliateIds }
                },
                select: {
                    user_id: true,
                    name: true,
                    email: true,
                }
            })

            console.log(`[Activity API] 📋 Found ${sellers.length} sellers in database`)

            // Also get profiles for avatars
            const profiles = await prisma.sellerProfile.findMany({
                where: {
                    Seller: {
                        user_id: { in: uniqueAffiliateIds }
                    }
                },
                select: {
                    Seller: {
                        select: {
                            user_id: true
                        }
                    },
                    avatar_url: true
                }
            })

            console.log(`[Activity API] 🖼️ Found ${profiles.length} seller profiles with avatars`)

            // Create seller info map
            const sellerInfoMap = new Map<string, { id: string; name: string; avatar?: string }>()
            sellers.forEach(seller => {
                if (seller.user_id) {
                    const name = seller.name || seller.email.split('@')[0]
                    sellerInfoMap.set(seller.user_id, {
                        id: seller.user_id,
                        name: name,
                        avatar: undefined
                    })
                    console.log(`[Activity API] 💼 Seller ${seller.user_id} → ${name}`)
                }
            })

            // Add avatars
            profiles.forEach(profile => {
                const userId = profile.Seller.user_id
                if (userId) {
                    const existing = sellerInfoMap.get(userId)
                    if (existing && profile.avatar_url) {
                        existing.avatar = profile.avatar_url
                    }
                }
            })

            // Enrich events with seller info
            let enrichedEvents = 0
            events.forEach(event => {
                if (event.affiliate_id) {
                    const sellerInfo = sellerInfoMap.get(event.affiliate_id)
                    if (sellerInfo) {
                        event.seller = sellerInfo
                        enrichedEvents++
                    }
                }
            })

            console.log(`[Activity API] ✅ Enriched ${enrichedEvents} events with seller info`)
        } catch (err) {
            console.error('[Activity API] ❌ Failed to enrich seller info:', err)
        }
    } else {
        console.log(`[Activity API] ⚠️ No affiliate_ids found to enrich!`)
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
        data: limitedEvents,
    })
}
