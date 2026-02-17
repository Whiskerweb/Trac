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
 * Helper: Execute SQL query on Tinybird
 */
async function executeTinybirdSQL(sql: string): Promise<any> {
    const response = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
            'Content-Type': 'text/plain',
        },
        body: sql,
        cache: 'no-store' as RequestCache,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Tinybird SQL error: ${response.status} - ${errorText}`)
    }

    return response.json()
}

// Region to Cities mapping (must match frontend and breakdown API)
const REGION_TO_CITIES: Record<string, string[]> = {
    'Île-de-France': ['Paris', 'Versailles', 'Saint-Denis', 'Boulogne-Billancourt'],
    'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Toulon'],
    'Nouvelle-Aquitaine': ['Bordeaux', 'Limoges', 'Poitiers'],
    'Occitanie': ['Toulouse', 'Montpellier', 'Nîmes'],
    'Hauts-de-France': ['Lille', 'Amiens', 'Roubaix'],
    'Normandie': ['Rouen', 'Le Havre', 'Caen'],
    'Grand Est': ['Strasbourg', 'Reims', 'Metz'],
}

// Continent to Countries mapping (must match frontend and breakdown API)
const CONTINENT_TO_COUNTRIES: Record<string, string[]> = {
    'Europe': ['France', 'Germany', 'United Kingdom', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Poland', 'Austria', 'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland'],
    'North America': ['United States', 'Canada', 'Mexico'],
    'Asia': ['Japan', 'China', 'India', 'South Korea', 'Singapore', 'Thailand', 'Vietnam', 'Indonesia'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru'],
    'Africa': ['South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Morocco'],
    'Oceania': ['Australia', 'New Zealand'],
}

/**
 * Helper: Build SQL WHERE clauses for dimensional filters
 */
function buildClicksFilterSQL(filters: {
    country?: string
    city?: string
    region?: string
    continent?: string
    device?: string
    browser?: string
    os?: string
}): string {
    const clauses: string[] = []

    // Handle country filters (including those derived from continent filters)
    let allCountries: string[] = []
    if (filters.country) {
        allCountries.push(...filters.country.split(',').map(c => c.trim()))
    }
    // Convert continent filters to country filters
    if (filters.continent) {
        filters.continent.split(',').forEach(continent => {
            const trimmedContinent = continent.trim()
            const countries = CONTINENT_TO_COUNTRIES[trimmedContinent] || []
            allCountries.push(...countries)
        })
    }
    if (allCountries.length > 0) {
        const uniqueCountries = [...new Set(allCountries)]
        const countries = uniqueCountries.map(c => `'${c}'`).join(',')
        clauses.push(`country IN (${countries})`)
    }

    // Handle city filters (including those derived from region filters)
    let allCities: string[] = []
    if (filters.city) {
        allCities.push(...filters.city.split(',').map(c => c.trim()))
    }
    // Convert region filters to city filters
    if (filters.region) {
        filters.region.split(',').forEach(region => {
            const trimmedRegion = region.trim()
            const cities = REGION_TO_CITIES[trimmedRegion] || []
            allCities.push(...cities)
        })
    }
    if (allCities.length > 0) {
        const uniqueCities = [...new Set(allCities)]
        const cities = uniqueCities.map(c => `'${c}'`).join(',')
        clauses.push(`city IN (${cities})`)
    }

    if (filters.device) {
        const devices = filters.device.split(',').map(d => `'${d.trim()}'`).join(',')
        clauses.push(`device IN (${devices})`)
    }

    if (filters.browser) {
        const browsers = filters.browser.split(',')
        const browserConditions = browsers.map(b => {
            const browser = b.trim()
            // Exclusive detection to avoid double counting (Chrome user agents contain "Safari")
            if (browser === 'Edge') return "positionCaseInsensitive(user_agent, 'Edg') > 0"
            if (browser === 'Chrome') return "(positionCaseInsensitive(user_agent, 'Chrome') > 0 AND positionCaseInsensitive(user_agent, 'Edg') = 0)"
            if (browser === 'Safari') return "(positionCaseInsensitive(user_agent, 'Safari') > 0 AND positionCaseInsensitive(user_agent, 'Chrome') = 0)"
            if (browser === 'Firefox') return "positionCaseInsensitive(user_agent, 'Firefox') > 0"
            if (browser === 'Opera') return "(positionCaseInsensitive(user_agent, 'Opera') > 0 OR positionCaseInsensitive(user_agent, 'OPR') > 0)"
            return `positionCaseInsensitive(user_agent, '${browser}') > 0`
        })
        clauses.push(`(${browserConditions.join(' OR ')})`)
    }

    if (filters.os) {
        const oses = filters.os.split(',')
        const osConditions = oses.map(o => {
            const os = o.trim()
            if (os === 'Windows') return "positionCaseInsensitive(user_agent, 'Windows') > 0"
            if (os === 'macOS') return "(positionCaseInsensitive(user_agent, 'Mac OS X') > 0 OR positionCaseInsensitive(user_agent, 'Macintosh') > 0)"
            if (os === 'iOS') return "(positionCaseInsensitive(user_agent, 'iPhone') > 0 OR positionCaseInsensitive(user_agent, 'iPad') > 0)"
            if (os === 'Android') return "positionCaseInsensitive(user_agent, 'Android') > 0"
            if (os === 'Linux') return "positionCaseInsensitive(user_agent, 'Linux') > 0"
            return `positionCaseInsensitive(user_agent, '${os}') > 0`
        })
        clauses.push(`(${osConditions.join(' OR ')})`)
    }

    return clauses.length > 0 ? 'AND ' + clauses.join(' AND ') : ''
}

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

        // Parse date range from query params
        const { searchParams } = new URL(request.url)
        const source = searchParams.get('source')
        const dateFromParam = searchParams.get('date_from')
        const dateToParam = searchParams.get('date_to')

        const now = new Date()
        const dateTo = dateToParam ? new Date(dateToParam) : now
        const dateFrom = dateFromParam ? new Date(dateFromParam) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Calculate diff in hours and days
        const hoursDiff = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60)))
        const daysDiff = Math.max(1, Math.ceil(hoursDiff / 24))

        // Use hourly granularity for periods of 2 days or less, otherwise daily
        const useHourly = daysDiff <= 2
        const timeseries = []

        if (useHourly) {
            // Generate hourly data points
            for (let i = 0; i < Math.min(hoursDiff, 48); i++) {
                const date = new Date(dateFrom.getTime() + i * 60 * 60 * 1000)
                timeseries.push({
                    date: date.toISOString(),
                    clicks: Math.floor(Math.random() * 10) + 1,
                    leads: Math.floor(Math.random() * 2),
                    sales: Math.random() > 0.7 ? 1 : 0,
                    revenue: Math.random() > 0.7 ? Math.floor(Math.random() * 3000) + 500 : 0,
                })
            }
        } else {
            // Generate daily data points
            for (let i = 0; i < daysDiff; i++) {
                const date = new Date(dateFrom)
                date.setDate(date.getDate() + i)
                timeseries.push({
                    date: date.toISOString().split('T')[0],
                    clicks: Math.floor(Math.random() * 50) + 10,
                    leads: Math.floor(Math.random() * 5),
                    sales: Math.floor(Math.random() * 3),
                    revenue: Math.floor(Math.random() * 5000) + 500,
                })
            }
        }

        // Reduce values for marketing source (fewer links = fewer events)
        if (source === 'marketing') {
            for (let i = 0; i < timeseries.length; i++) {
                timeseries[i] = {
                    ...timeseries[i],
                    clicks: Math.max(1, Math.floor(timeseries[i].clicks * 0.3)),
                    leads: Math.max(0, Math.floor(timeseries[i].leads * 0.2)),
                    sales: Math.random() > 0.8 ? 1 : 0,
                    revenue: Math.random() > 0.8 ? Math.floor(Math.random() * 2000) + 300 : 0,
                }
            }
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

        // ========================================
        // SOURCE FILTER: Marketing links only
        // ========================================
        const source = searchParams.get('source')
        const campaignId = searchParams.get('campaign_id')
        let linkIdFilter = ''
        if (source === 'marketing') {
            const { prisma } = await import('@/lib/db')
            const marketingWhere: Record<string, unknown> = { workspace_id: workspaceId, link_type: 'marketing' }
            if (campaignId) marketingWhere.campaign_id = campaignId
            const marketingLinks = await prisma.shortLink.findMany({
                where: marketingWhere,
                select: { id: true },
            })
            if (marketingLinks.length === 0) {
                // No marketing links — return zeros
                return NextResponse.json({
                    meta: [],
                    data: [{ clicks: 0, leads: 0, sales: 0, revenue: 0, conversion_rate: 0, timeseries: [] }],
                    rows: 1,
                    statistics: { elapsed: 0, rows_read: 0, bytes_read: 0 },
                }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } })
            }
            const ids = marketingLinks.map(l => `'${l.id}'`).join(',')
            linkIdFilter = `AND link_id IN (${ids})`
            console.log(`[KPI Proxy] 🎯 Marketing filter: ${marketingLinks.length} link IDs${campaignId ? ` (campaign: ${campaignId})` : ''}`)
        }

        const dateFrom = searchParams.get('date_from') || '2020-01-01'
        // ✅ Append T23:59:59 to include the FULL day (Tinybird parses 2026-01-07 as midnight, excluding clicks at 10:53)
        let dateTo = searchParams.get('date_to') || '2030-12-31'
        if (dateTo && !dateTo.includes('T')) {
            dateTo = `${dateTo}T23:59:59`  // Include entire day
        }

        // Parse filter params
        const countryFilter = searchParams.get('country')
        const cityFilter = searchParams.get('city')
        const regionFilter = searchParams.get('region')
        const continentFilter = searchParams.get('continent')
        const deviceFilter = searchParams.get('device')
        const browserFilter = searchParams.get('browser')
        const osFilter = searchParams.get('os')
        const eventTypeFilter = searchParams.get('event_type')

        // Parse event types
        const eventTypes = eventTypeFilter
            ? eventTypeFilter.split(',').map(t => t.trim())
            : ['clicks', 'leads', 'sales']

        console.log('[KPI Proxy] 🎯 Event types:', eventTypes.join(', '))

        let kpi: any = { clicks: 0, leads: 0, sales: 0, revenue: 0 }
        let timeseries: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }> = []
        let kpisData: any = { statistics: { elapsed: 0, rows_read: 0, bytes_read: 0 } }

        // ========================================
        // IF EVENT_TYPE FILTERING OR DIMENSIONAL FILTERS: Use direct SQL queries
        // ========================================
        const hasDimensionalFilters = !!(countryFilter || cityFilter || regionFilter || continentFilter || deviceFilter || browserFilter || osFilter)
        const needsSQLFiltering = (eventTypeFilter && eventTypes.length < 3) || hasDimensionalFilters || !!linkIdFilter

        if (needsSQLFiltering) {
            console.log('[KPI Proxy] 🔍 Using direct SQL (event_type or dimensional filters active)')

            const filters = {
                country: countryFilter || undefined,
                city: cityFilter || undefined,
                region: regionFilter || undefined,
                continent: continentFilter || undefined,
                device: deviceFilter || undefined,
                browser: browserFilter || undefined,
                os: osFilter || undefined,
            }

            // Build CTE for filtered clicks
            const filteredClicksWhere = `
                workspace_id = '${workspaceId}'
                AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
                AND timestamp <= parseDateTimeBestEffort('${dateTo}')
                ${linkIdFilter}
                ${buildClicksFilterSQL(filters)}
            `

            // Query clicks (if included)
            if (eventTypes.includes('clicks')) {
                const clicksSQL = `
                    SELECT count() as clicks
                    FROM clicks
                    WHERE ${filteredClicksWhere}
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing clicks SQL')
                const result = await executeTinybirdSQL(clicksSQL)
                kpi.clicks = result.data?.[0]?.clicks || 0
            }

            // Query leads (if included) - via click_id JOIN
            if (eventTypes.includes('leads')) {
                const leadsSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT count() as leads
                    FROM leads
                    WHERE workspace_id = '${workspaceId}'
                      AND click_id IN (SELECT click_id FROM filtered_clicks)
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing leads SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(leadsSQL)
                kpi.leads = result.data?.[0]?.leads || 0
            }

            // Query sales (if included) - via click_id JOIN
            if (eventTypes.includes('sales')) {
                const salesSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT count() as sales, sum(net_amount) as revenue
                    FROM sales
                    WHERE workspace_id = '${workspaceId}'
                      AND click_id IN (SELECT click_id FROM filtered_clicks)
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing sales SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(salesSQL)
                kpi.sales = result.data?.[0]?.sales || 0
                kpi.revenue = result.data?.[0]?.revenue || 0
            }

            // Calculate conversion rates
            kpi.conversion_rate = kpi.clicks > 0 ? ((kpi.sales / kpi.clicks) * 100) : 0
            kpi.click_to_lead_rate = kpi.clicks > 0 ? ((kpi.leads / kpi.clicks) * 100) : 0
            kpi.lead_to_sale_rate = kpi.leads > 0 ? ((kpi.sales / kpi.leads) * 100) : 0

            // Generate timeseries with filters
            console.log('[KPI Proxy] 📈 Generating timeseries with filters')

            // Determine granularity based on date range
            const dateFromObj = new Date(dateFrom)
            const dateToObj = new Date(dateTo)
            const daysDiff = Math.ceil((dateToObj.getTime() - dateFromObj.getTime()) / (1000 * 60 * 60 * 24))
            const granularity = daysDiff <= 31 ? 'day' : 'month'

            console.log(`[KPI Proxy] Date range: ${daysDiff} days, using ${granularity} granularity`)

            // Query timeseries for clicks (if included)
            const timeseriesMap = new Map<string, { clicks: number; leads: number; sales: number; revenue: number }>()

            if (eventTypes.includes('clicks')) {
                const clicksTimeseriesSQL = `
                    SELECT
                        ${granularity === 'day' ? 'toDate(timestamp)' : 'toStartOfMonth(timestamp)'} as date,
                        count() as clicks
                    FROM clicks
                    WHERE ${filteredClicksWhere}
                    GROUP BY date
                    ORDER BY date ASC
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing clicks timeseries SQL')
                const result = await executeTinybirdSQL(clicksTimeseriesSQL)
                const data = result.data || []

                data.forEach((item: any) => {
                    const dateKey = item.date
                    if (!timeseriesMap.has(dateKey)) {
                        timeseriesMap.set(dateKey, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
                    }
                    const entry = timeseriesMap.get(dateKey)!
                    entry.clicks = item.clicks || 0
                })
            }

            // Query timeseries for leads (if included) - via click_id JOIN
            if (eventTypes.includes('leads')) {
                const leadsTimeseriesSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id, timestamp
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT
                        ${granularity === 'day' ? 'toDate(fc.timestamp)' : 'toStartOfMonth(fc.timestamp)'} as date,
                        count() as leads
                    FROM leads l
                    JOIN filtered_clicks fc ON l.click_id = fc.click_id
                    WHERE l.workspace_id = '${workspaceId}'
                    GROUP BY date
                    ORDER BY date ASC
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing leads timeseries SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(leadsTimeseriesSQL)
                const data = result.data || []

                data.forEach((item: any) => {
                    const dateKey = item.date
                    if (!timeseriesMap.has(dateKey)) {
                        timeseriesMap.set(dateKey, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
                    }
                    const entry = timeseriesMap.get(dateKey)!
                    entry.leads = item.leads || 0
                })
            }

            // Query timeseries for sales (if included) - via click_id JOIN
            if (eventTypes.includes('sales')) {
                const salesTimeseriesSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id, timestamp
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT
                        ${granularity === 'day' ? 'toDate(fc.timestamp)' : 'toStartOfMonth(fc.timestamp)'} as date,
                        count() as sales,
                        sum(s.net_amount) as revenue
                    FROM sales s
                    JOIN filtered_clicks fc ON s.click_id = fc.click_id
                    WHERE s.workspace_id = '${workspaceId}'
                    GROUP BY date
                    ORDER BY date ASC
                    FORMAT JSON
                `
                console.log('[KPI Proxy] 📊 Executing sales timeseries SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(salesTimeseriesSQL)
                const data = result.data || []

                data.forEach((item: any) => {
                    const dateKey = item.date
                    if (!timeseriesMap.has(dateKey)) {
                        timeseriesMap.set(dateKey, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
                    }
                    const entry = timeseriesMap.get(dateKey)!
                    entry.sales = item.sales || 0
                    entry.revenue = item.revenue || 0
                })
            }

            // Convert map to array
            timeseries = Array.from(timeseriesMap.entries())
                .map(([date, data]) => ({
                    date: date,
                    clicks: data.clicks,
                    leads: data.leads,
                    sales: data.sales,
                    revenue: data.revenue
                }))
                .sort((a, b) => a.date.localeCompare(b.date))

            console.log(`[KPI Proxy] 📈 Generated ${timeseries.length} timeseries data points`)
        }
        // ========================================
        // ELSE: Use legacy Tinybird pipes (all event types)
        // ========================================
        else {
            const baseParams = new URLSearchParams({
                workspace_id: workspaceId,
                date_from: dateFrom,
                date_to: dateTo,
            })

            // Add filters to params if present
            if (countryFilter) baseParams.set('country', countryFilter)
            if (deviceFilter) baseParams.set('device', deviceFilter)
            if (browserFilter) baseParams.set('browser', browserFilter)
            if (osFilter) baseParams.set('os', osFilter)

            const kpisUrl = `${TINYBIRD_HOST}/v0/pipes/kpis.json?${baseParams}`
            const trendUrl = `${TINYBIRD_HOST}/v0/pipes/trend.json?${baseParams}`

            console.log('[KPI Proxy] 🎯 Fetching KPIs (pipes):', kpisUrl)
            console.log('[KPI Proxy] 📈 Fetching Trend (pipes):', trendUrl)

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

            if (!kpisResponse.ok) {
                const errorText = await kpisResponse.text()
                console.error('[KPI Proxy] ❌ KPIs Tinybird error:', kpisResponse.status, errorText)
                return NextResponse.json(
                    { error: 'Failed to fetch KPIs', details: errorText },
                    { status: kpisResponse.status }
                )
            }

            kpisData = await kpisResponse.json()
            kpi = kpisData.data?.[0] || { clicks: 0, leads: 0, sales: 0, revenue: 0, conversion_rate: 0, click_to_lead_rate: 0, lead_to_sale_rate: 0 }

            if (trendResponse.ok) {
                const trendData = await trendResponse.json()
                timeseries = trendData.data || []
                console.log('[KPI Proxy] 📈 Trend data:', timeseries.length, 'days')
            } else {
                const errorText = await trendResponse.text()
                console.warn('[KPI Proxy] ⚠️ Trend pipe error (fallback to empty):', errorText.slice(0, 100))
            }
        }

        // ========================================
        // MERGE RESULTS INTO UNIFIED RESPONSE
        // ========================================
        const mergedData = {
            meta: [
                { name: 'clicks', type: 'Int64' },
                { name: 'leads', type: 'Int64' },
                { name: 'sales', type: 'Int64' },
                { name: 'revenue', type: 'Float64' },
                { name: 'conversion_rate', type: 'Float64' },
                { name: 'click_to_lead_rate', type: 'Float64' },
                { name: 'lead_to_sale_rate', type: 'Float64' },
                { name: 'timeseries', type: 'Array' },
            ],
            data: [{
                clicks: kpi.clicks || 0,
                leads: kpi.leads || 0,
                sales: kpi.sales || 0,
                revenue: kpi.revenue || 0,
                conversion_rate: kpi.conversion_rate || 0,
                click_to_lead_rate: kpi.click_to_lead_rate || 0,
                lead_to_sale_rate: kpi.lead_to_sale_rate || 0,
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
