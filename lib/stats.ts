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
