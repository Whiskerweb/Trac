// Stats service - fetches analytics from Tinybird

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

export interface LinkStats {
    clicks: number
    sales: number
    revenue: number
}

/**
 * Fetch stats for multiple link IDs from Tinybird
 * @param linkIds Array of link IDs to fetch stats for
 * @returns Record mapping link_id -> stats
 */
export async function getLinkStats(linkIds: string[]): Promise<Record<string, LinkStats>> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Stats] Missing TINYBIRD_ADMIN_TOKEN')
        return {}
    }

    if (linkIds.length === 0) {
        return {}
    }

    try {
        // Build the query params with link_ids array
        const params = new URLSearchParams()
        linkIds.forEach(id => params.append('link_ids', id))

        const url = `${TINYBIRD_HOST}/v0/pipes/link_stats.json?${params.toString()}`
        console.log('[Stats] Fetching link stats from Tinybird...')

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            },
            cache: 'no-store',
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Stats] Tinybird error:', errorText)
            return {}
        }

        const result = await response.json()

        // Transform Tinybird response into a map
        const statsMap: Record<string, LinkStats> = {}

        if (result.data && Array.isArray(result.data)) {
            for (const row of result.data) {
                statsMap[row.click_id] = {
                    clicks: row.total_clicks || 0,
                    sales: row.total_sales || 0,
                    revenue: row.total_revenue || 0,
                }
            }
        }

        console.log(`[Stats] Retrieved stats for ${Object.keys(statsMap).length} links`)
        return statsMap
    } catch (error) {
        console.error('[Stats] Error fetching link stats:', error)
        return {}
    }
}

/**
 * Get total aggregated stats across all provided links
 */
export function aggregateStats(stats: Record<string, LinkStats>): LinkStats {
    return Object.values(stats).reduce(
        (acc, s) => ({
            clicks: acc.clicks + s.clicks,
            sales: acc.sales + s.sales,
            revenue: acc.revenue + s.revenue,
        }),
        { clicks: 0, sales: 0, revenue: 0 }
    )
}

// =============================================
// PARTNER-SPECIFIC STATS (Direct SQL)
// =============================================

export interface PartnerStats {
    clicks: number
    sales: number
    revenue: number
}

/**
 * Fetch click stats for a specific partner using their affiliate_id
 * Uses direct SQL query to Tinybird (no pipe deployment required)
 * 
 * @param partnerId The partner's user ID (stored as affiliate_id in clicks)
 * @param dateFrom Optional start date (ISO string)
 * @param dateTo Optional end date (ISO string)
 */
export async function getPartnerClickStats(
    partnerId: string,
    dateFrom?: string,
    dateTo?: string
): Promise<{ clicks: number }> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Stats] Missing TINYBIRD_ADMIN_TOKEN')
        return { clicks: 0 }
    }

    if (!partnerId) {
        return { clicks: 0 }
    }

    try {
        // Build safe SQL query (partnerId is UUID, safe from injection)
        const from = dateFrom || '2020-01-01'
        const to = dateTo || '2099-12-31'

        const query = `
            SELECT count() as total_clicks 
            FROM clicks 
            WHERE affiliate_id = '${partnerId}'
            AND timestamp >= parseDateTimeBestEffort('${from}')
            AND timestamp <= parseDateTimeBestEffort('${to}')
        `.trim()

        const response = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
            },
            body: `q=${encodeURIComponent(query)} FORMAT JSON`,
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Stats] Tinybird SQL error:', errorText)
            return { clicks: 0 }
        }

        const result = await response.json()

        if (result.data && result.data.length > 0) {
            const clicks = result.data[0].total_clicks || 0
            console.log(`[Stats] Partner ${partnerId.slice(0, 8)}... has ${clicks} clicks`)
            return { clicks }
        }

        return { clicks: 0 }
    } catch (error) {
        console.error('[Stats] Error fetching partner click stats:', error)
        return { clicks: 0 }
    }
}

/**
 * Fetch full stats for a partner (clicks + sales + revenue)
 * Combines clicks from clicks datasource and sales from sales datasource
 */
export async function getPartnerFullStats(
    partnerId: string,
    dateFrom?: string,
    dateTo?: string
): Promise<PartnerStats> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Stats] Missing TINYBIRD_ADMIN_TOKEN')
        return { clicks: 0, sales: 0, revenue: 0 }
    }

    if (!partnerId) {
        return { clicks: 0, sales: 0, revenue: 0 }
    }

    try {
        const from = dateFrom || '2020-01-01'
        const to = dateTo || '2099-12-31'

        // Query clicks
        const clicksQuery = `
            SELECT count() as c 
            FROM clicks 
            WHERE affiliate_id = '${partnerId}'
            AND timestamp >= parseDateTimeBestEffort('${from}')
            AND timestamp <= parseDateTimeBestEffort('${to}')
        `.trim()

        // Query sales (using link_id from partner's links)
        const salesQuery = `
            SELECT 
                count() as sales,
                sum(amount) as revenue
            FROM sales 
            WHERE affiliate_id = '${partnerId}'
            AND timestamp >= parseDateTimeBestEffort('${from}')
            AND timestamp <= parseDateTimeBestEffort('${to}')
        `.trim()

        // Execute both queries in parallel
        const [clicksRes, salesRes] = await Promise.all([
            fetch(`${TINYBIRD_HOST}/v0/sql`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
                body: `q=${encodeURIComponent(clicksQuery)} FORMAT JSON`,
            }),
            fetch(`${TINYBIRD_HOST}/v0/sql`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
                body: `q=${encodeURIComponent(salesQuery)} FORMAT JSON`,
            }),
        ])

        let clicks = 0
        let sales = 0
        let revenue = 0

        if (clicksRes.ok) {
            const clicksData = await clicksRes.json()
            if (clicksData.data && clicksData.data.length > 0) {
                clicks = clicksData.data[0].c || 0
            }
        }

        if (salesRes.ok) {
            const salesData = await salesRes.json()
            if (salesData.data && salesData.data.length > 0) {
                sales = salesData.data[0].sales || 0
                revenue = (salesData.data[0].revenue || 0) / 100 // Convert from cents
            }
        }

        console.log(`[Stats] Partner ${partnerId.slice(0, 8)}...: ${clicks} clicks, ${sales} sales, €${revenue}`)
        return { clicks, sales, revenue }

    } catch (error) {
        console.error('[Stats] Error fetching partner full stats:', error)
        return { clicks: 0, sales: 0, revenue: 0 }
    }
}

