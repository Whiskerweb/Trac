import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

// Country flags for display
const COUNTRY_FLAGS: Record<string, string> = {
    'France': '🇫🇷',
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Canada': '🇨🇦',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Japan': '🇯🇵',
    'Australia': '🇦🇺',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'India': '🇮🇳',
    'China': '🇨🇳',
}

// Filter interface
interface Filters {
    country?: string[]
    city?: string[]
    region?: string[]
    continent?: string[]
    device?: string[]
    browser?: string[]
    os?: string[]
}

// Region to Cities mapping (must match frontend)
const REGION_TO_CITIES: Record<string, string[]> = {
    'Île-de-France': ['Paris', 'Versailles', 'Saint-Denis', 'Boulogne-Billancourt'],
    'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Toulon'],
    'Nouvelle-Aquitaine': ['Bordeaux', 'Limoges', 'Poitiers'],
    'Occitanie': ['Toulouse', 'Montpellier', 'Nîmes'],
    'Hauts-de-France': ['Lille', 'Amiens', 'Roubaix'],
    'Normandie': ['Rouen', 'Le Havre', 'Caen'],
    'Grand Est': ['Strasbourg', 'Reims', 'Metz'],
    'Other': [], // Will be handled separately
}

// Continent to Countries mapping (must match frontend)
const CONTINENT_TO_COUNTRIES: Record<string, string[]> = {
    'Europe': ['France', 'Germany', 'United Kingdom', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Poland', 'Austria', 'Portugal', 'Sweden', 'Norway', 'Denmark', 'Finland'],
    'North America': ['United States', 'Canada', 'Mexico'],
    'Asia': ['Japan', 'China', 'India', 'South Korea', 'Singapore', 'Thailand', 'Vietnam', 'Indonesia'],
    'South America': ['Brazil', 'Argentina', 'Colombia', 'Chile', 'Peru'],
    'Africa': ['South Africa', 'Nigeria', 'Egypt', 'Kenya', 'Morocco'],
    'Oceania': ['Australia', 'New Zealand'],
    'Other': [], // Will be handled separately
}

// Build filter WHERE clauses
function buildFilterClauses(filters: Filters): string {
    const clauses: string[] = []

    // Handle country filters (including those derived from continent filters)
    let allCountries: string[] = []
    if (filters.country && filters.country.length > 0) {
        allCountries.push(...filters.country)
    }
    // Convert continent filters to country filters
    if (filters.continent && filters.continent.length > 0) {
        filters.continent.forEach(continent => {
            const countries = CONTINENT_TO_COUNTRIES[continent] || []
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
    if (filters.city && filters.city.length > 0) {
        allCities.push(...filters.city)
    }
    // Convert region filters to city filters
    if (filters.region && filters.region.length > 0) {
        filters.region.forEach(region => {
            const cities = REGION_TO_CITIES[region] || []
            allCities.push(...cities)
        })
    }
    if (allCities.length > 0) {
        const uniqueCities = [...new Set(allCities)]
        const cities = uniqueCities.map(c => `'${c}'`).join(',')
        clauses.push(`city IN (${cities})`)
    }
    if (filters.device && filters.device.length > 0) {
        const devices = filters.device.map(d => `'${d}'`).join(',')
        clauses.push(`device IN (${devices})`)
    }
    // Browser and OS require special handling since they're derived from user_agent
    if (filters.browser && filters.browser.length > 0) {
        const browserConditions = filters.browser.map(b => {
            switch (b) {
                case 'Chrome': return `(positionCaseInsensitive(user_agent, 'Chrome') > 0 AND positionCaseInsensitive(user_agent, 'Edg') = 0)`
                case 'Safari': return `(positionCaseInsensitive(user_agent, 'Safari') > 0 AND positionCaseInsensitive(user_agent, 'Chrome') = 0)`
                case 'Firefox': return `positionCaseInsensitive(user_agent, 'Firefox') > 0`
                case 'Edge': return `positionCaseInsensitive(user_agent, 'Edg') > 0`
                case 'Opera': return `(positionCaseInsensitive(user_agent, 'Opera') > 0 OR positionCaseInsensitive(user_agent, 'OPR') > 0)`
                default: return '1=1'
            }
        }).join(' OR ')
        clauses.push(`(${browserConditions})`)
    }
    if (filters.os && filters.os.length > 0) {
        const osConditions = filters.os.map(o => {
            switch (o) {
                case 'Windows': return `positionCaseInsensitive(user_agent, 'Windows') > 0`
                case 'macOS': return `(positionCaseInsensitive(user_agent, 'Mac OS X') > 0 OR positionCaseInsensitive(user_agent, 'Macintosh') > 0)`
                case 'iOS': return `(positionCaseInsensitive(user_agent, 'iPhone') > 0 OR positionCaseInsensitive(user_agent, 'iPad') > 0)`
                case 'Android': return `positionCaseInsensitive(user_agent, 'Android') > 0`
                case 'Linux': return `positionCaseInsensitive(user_agent, 'Linux') > 0`
                default: return '1=1'
            }
        }).join(' OR ')
        clauses.push(`(${osConditions})`)
    }

    return clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : ''
}

// SQL queries for each dimension (FORMAT JSON required for proper response)
const DIMENSION_QUERIES: Record<string, (workspaceId: string, dateFrom: string, dateTo: string, filters: Filters, linkIdFilter?: string) => string> = {
    countries: (workspaceId, dateFrom, dateTo, filters, linkIdFilter = '') => `
        SELECT country, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
          ${linkIdFilter}
          ${buildFilterClauses(filters)}
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 20
        FORMAT JSON
    `,
    cities: (workspaceId, dateFrom, dateTo, filters, linkIdFilter = '') => `
        SELECT city, country, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
          ${linkIdFilter}
          ${buildFilterClauses(filters)}
        GROUP BY city, country
        ORDER BY clicks DESC
        LIMIT 20
        FORMAT JSON
    `,
    devices: (workspaceId, dateFrom, dateTo, filters, linkIdFilter = '') => `
        SELECT device, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
          ${linkIdFilter}
          ${buildFilterClauses(filters)}
        GROUP BY device
        ORDER BY clicks DESC
        FORMAT JSON
    `,
    browsers: (workspaceId, dateFrom, dateTo, filters, linkIdFilter = '') => `
        SELECT
            CASE
                WHEN positionCaseInsensitive(user_agent, 'Chrome') > 0 AND positionCaseInsensitive(user_agent, 'Edg') = 0 THEN 'Chrome'
                WHEN positionCaseInsensitive(user_agent, 'Firefox') > 0 THEN 'Firefox'
                WHEN positionCaseInsensitive(user_agent, 'Safari') > 0 AND positionCaseInsensitive(user_agent, 'Chrome') = 0 THEN 'Safari'
                WHEN positionCaseInsensitive(user_agent, 'Edg') > 0 THEN 'Edge'
                WHEN positionCaseInsensitive(user_agent, 'Opera') > 0 OR positionCaseInsensitive(user_agent, 'OPR') > 0 THEN 'Opera'
                ELSE 'Other'
            END as browser,
            count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
          ${linkIdFilter}
          ${buildFilterClauses(filters)}
        GROUP BY browser
        ORDER BY clicks DESC
        FORMAT JSON
    `,
    os: (workspaceId, dateFrom, dateTo, filters, linkIdFilter = '') => `
        SELECT
            CASE
                WHEN positionCaseInsensitive(user_agent, 'Windows') > 0 THEN 'Windows'
                WHEN positionCaseInsensitive(user_agent, 'Mac OS X') > 0 OR positionCaseInsensitive(user_agent, 'Macintosh') > 0 THEN 'macOS'
                WHEN positionCaseInsensitive(user_agent, 'iPhone') > 0 OR positionCaseInsensitive(user_agent, 'iPad') > 0 THEN 'iOS'
                WHEN positionCaseInsensitive(user_agent, 'Android') > 0 THEN 'Android'
                WHEN positionCaseInsensitive(user_agent, 'Linux') > 0 THEN 'Linux'
                ELSE 'Other'
            END as os,
            count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
          ${linkIdFilter}
          ${buildFilterClauses(filters)}
        GROUP BY os
        ORDER BY clicks DESC
        FORMAT JSON
    `,
}



/**
 * Analytics Breakdown API
 * GET /api/stats/breakdown?dimension=countries|cities|devices|browsers|os
 * 
 * Uses Tinybird SQL endpoint directly (no custom pipes needed)
 */
export async function GET(request: NextRequest) {
    // ========================================
    // MOCK MODE
    // ========================================
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        const { searchParams } = new URL(request.url)
        const dimension = searchParams.get('dimension') || 'countries'
        const source = searchParams.get('source')
        const scale = source === 'marketing' ? 0.3 : 1

        const mockData: Record<string, any[]> = {
            countries: [
                { name: 'France', flag: '🇫🇷', clicks: Math.floor(847 * scale) },
                { name: 'United States', flag: '🇺🇸', clicks: Math.floor(423 * scale) },
                { name: 'Germany', flag: '🇩🇪', clicks: Math.floor(312 * scale) },
                { name: 'United Kingdom', flag: '🇬🇧', clicks: Math.floor(189 * scale) },
                { name: 'Spain', flag: '🇪🇸', clicks: Math.floor(145 * scale) },
            ],
            cities: [
                { name: 'Paris', country: 'France', flag: '🇫🇷', clicks: Math.floor(420 * scale) },
                { name: 'Lyon', country: 'France', flag: '🇫🇷', clicks: Math.floor(147 * scale) },
                { name: 'New York', country: 'United States', flag: '🇺🇸', clicks: Math.floor(235 * scale) },
                { name: 'Berlin', country: 'Germany', flag: '🇩🇪', clicks: Math.floor(188 * scale) },
                { name: 'London', country: 'United Kingdom', flag: '🇬🇧', clicks: Math.floor(144 * scale) },
            ],
            devices: [
                { name: 'Desktop', clicks: Math.floor(1245 * scale) },
                { name: 'Mobile', clicks: Math.floor(671 * scale) },
            ],
            browsers: [
                { name: 'Chrome', clicks: Math.floor(892 * scale) },
                { name: 'Safari', clicks: Math.floor(534 * scale) },
                { name: 'Firefox', clicks: Math.floor(287 * scale) },
                { name: 'Edge', clicks: Math.floor(156 * scale) },
                { name: 'Other', clicks: Math.floor(47 * scale) },
            ],
            os: [
                { name: 'Windows', clicks: Math.floor(678 * scale) },
                { name: 'macOS', clicks: Math.floor(489 * scale) },
                { name: 'iOS', clicks: Math.floor(412 * scale) },
                { name: 'Android', clicks: Math.floor(259 * scale) },
                { name: 'Linux', clicks: Math.floor(78 * scale) },
            ],
        }

        return NextResponse.json({
            data: mockData[dimension] || [],
            dimension,
        })
    }

    // ========================================
    // SECURITY CHECKS
    // ========================================
    console.log('[Breakdown API] Starting request...')

    if (!TINYBIRD_ADMIN_TOKEN) {
        console.error('[Breakdown API] Missing TINYBIRD_ADMIN_TOKEN')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    let user
    try {
        const supabase = await createClient()
        const result = await supabase.auth.getUser()
        user = result.data?.user

        if (result.error) {
            console.error('[Breakdown API] Auth error:', result.error.message)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!user) {
            console.error('[Breakdown API] No user found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[Breakdown API] User authenticated:', user.id)
    } catch (authErr) {
        console.error('[Breakdown API] Auth exception:', authErr)
        return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
    }

    let workspace
    try {
        workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            console.error('[Breakdown API] No workspace found for user:', user.id)
            return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
        }
        console.log('[Breakdown API] Workspace:', workspace.workspaceId)
    } catch (wsErr) {
        console.error('[Breakdown API] Workspace exception:', wsErr)
        return NextResponse.json({ error: 'Workspace error' }, { status: 500 })
    }

    const workspaceId = workspace.workspaceId

    try {
        const { searchParams } = new URL(request.url)

        // ========================================
        // SOURCE FILTER: Marketing links only
        // ========================================
        const source = searchParams.get('source')
        let linkIdFilter = ''
        if (source === 'marketing') {
            const { prisma } = await import('@/lib/db')
            const marketingLinks = await prisma.shortLink.findMany({
                where: { workspace_id: workspaceId, link_type: 'marketing' },
                select: { id: true },
            })
            if (marketingLinks.length === 0) {
                return NextResponse.json({ data: [], dimension: searchParams.get('dimension') || 'countries' })
            }
            const ids = marketingLinks.map(l => `'${l.id}'`).join(',')
            linkIdFilter = `AND link_id IN (${ids})`
            console.log(`[Breakdown API] 🎯 Marketing filter: ${marketingLinks.length} link IDs`)
        }

        const dimension = searchParams.get('dimension') || 'countries'
        const dateFrom = searchParams.get('date_from') || '2020-01-01'
        let dateTo = searchParams.get('date_to') || '2030-12-31'
        if (dateTo && !dateTo.includes('T')) {
            dateTo = `${dateTo}T23:59:59`
        }

        // Parse filters from query params
        const filters: Filters = {}
        const countryFilter = searchParams.get('country')
        const cityFilter = searchParams.get('city')
        const regionFilter = searchParams.get('region')
        const continentFilter = searchParams.get('continent')
        const deviceFilter = searchParams.get('device')
        const browserFilter = searchParams.get('browser')
        const osFilter = searchParams.get('os')
        const eventTypeFilter = searchParams.get('event_type')

        if (countryFilter) filters.country = countryFilter.split(',')
        if (cityFilter) filters.city = cityFilter.split(',')
        if (regionFilter) filters.region = regionFilter.split(',')
        if (continentFilter) filters.continent = continentFilter.split(',')
        if (deviceFilter) filters.device = deviceFilter.split(',')
        if (browserFilter) filters.browser = browserFilter.split(',')
        if (osFilter) filters.os = osFilter.split(',')

        // Parse event types
        const eventTypes = eventTypeFilter
            ? eventTypeFilter.split(',').map(t => t.trim())
            : ['clicks']

        console.log('[Breakdown API] Event types:', eventTypes.join(', '))

        // Get SQL query for dimension
        const queryBuilder = DIMENSION_QUERIES[dimension]
        if (!queryBuilder) {
            return NextResponse.json({ error: 'Invalid dimension' }, { status: 400 })
        }

        let rawData: any[] = []

        // ========================================
        // IF MULTIPLE EVENT TYPES: Aggregate from multiple datasources
        // ========================================
        if (eventTypes.length > 1 || (eventTypes.length === 1 && eventTypes[0] !== 'clicks')) {
            console.log('[Breakdown API] Aggregating multiple event types')

            // Build filters EXCLUDING the current dimension (for cross-filtering)
            const filtersExcludingDimension: Filters = {}

            // Copy all filters EXCEPT the one matching current dimension
            if (filters.country && dimension !== 'countries') filtersExcludingDimension.country = filters.country
            if (filters.city && dimension !== 'cities') filtersExcludingDimension.city = filters.city
            if (filters.region) filtersExcludingDimension.region = filters.region // Regions are derived, always include
            if (filters.continent) filtersExcludingDimension.continent = filters.continent // Continents are derived, always include
            if (filters.device && dimension !== 'devices') filtersExcludingDimension.device = filters.device
            if (filters.browser && dimension !== 'browsers') filtersExcludingDimension.browser = filters.browser
            if (filters.os && dimension !== 'os') filtersExcludingDimension.os = filters.os

            // Build CTE for filtered clicks (excluding current dimension)
            const filterClauses = buildFilterClauses(filtersExcludingDimension)
            const filteredClicksWhere = `
                workspace_id = '${workspaceId}'
                AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
                AND timestamp <= parseDateTimeBestEffort('${dateTo}')
                ${linkIdFilter}
                ${filterClauses}
            `

            console.log('[Breakdown API] Filters excluding dimension:', filtersExcludingDimension)

            const resultsMap = new Map<string, number>()

            // Query clicks (if included)
            if (eventTypes.includes('clicks')) {
                // Use filters excluding current dimension for cross-filtering
                const sql = queryBuilder(workspaceId, dateFrom, dateTo, filtersExcludingDimension, linkIdFilter)
                console.log('[Breakdown API] Executing clicks SQL')
                const result = await executeTinybirdSQL(sql)
                const clicksData = result.data || []

                clicksData.forEach((item: any) => {
                    const key = dimension === 'countries' ? item.country :
                               dimension === 'cities' ? item.city :
                               dimension === 'devices' ? item.device :
                               dimension === 'browsers' ? item.browser :
                               dimension === 'os' ? item.os :
                               'Unknown'
                    resultsMap.set(key, (resultsMap.get(key) || 0) + (item.clicks || 0))
                })
            }

            // Query leads (if included) - via click_id JOIN
            if (eventTypes.includes('leads')) {
                const dimensionField = dimension === 'countries' ? 'country' :
                                     dimension === 'cities' ? 'city' :
                                     dimension === 'devices' ? 'device' :
                                     dimension === 'browsers' ? 'user_agent' :
                                     dimension === 'os' ? 'user_agent' : 'country'

                const leadsSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id, ${dimensionField}
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT fc.${dimensionField} as dimension_value, count() as count
                    FROM leads l
                    JOIN filtered_clicks fc ON l.click_id = fc.click_id
                    WHERE l.workspace_id = '${workspaceId}'
                    GROUP BY fc.${dimensionField}
                    ORDER BY count DESC
                    LIMIT 20
                    FORMAT JSON
                `
                console.log('[Breakdown API] Executing leads SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(leadsSQL)
                const leadsData = result.data || []

                leadsData.forEach((item: any) => {
                    const key = item.dimension_value || 'Unknown'
                    resultsMap.set(key, (resultsMap.get(key) || 0) + (item.count || 0))
                })
            }

            // Query sales (if included) - via click_id JOIN
            if (eventTypes.includes('sales')) {
                const dimensionField = dimension === 'countries' ? 'country' :
                                     dimension === 'cities' ? 'city' :
                                     dimension === 'devices' ? 'device' :
                                     dimension === 'browsers' ? 'user_agent' :
                                     dimension === 'os' ? 'user_agent' : 'country'

                const salesSQL = `
                    WITH filtered_clicks AS (
                        SELECT click_id, ${dimensionField}
                        FROM clicks
                        WHERE ${filteredClicksWhere}
                    )
                    SELECT fc.${dimensionField} as dimension_value, count() as count
                    FROM sales s
                    JOIN filtered_clicks fc ON s.click_id = fc.click_id
                    WHERE s.workspace_id = '${workspaceId}'
                    GROUP BY fc.${dimensionField}
                    ORDER BY count DESC
                    LIMIT 20
                    FORMAT JSON
                `
                console.log('[Breakdown API] Executing sales SQL (via click_id JOIN)')
                const result = await executeTinybirdSQL(salesSQL)
                const salesData = result.data || []

                salesData.forEach((item: any) => {
                    const key = item.dimension_value || 'Unknown'
                    resultsMap.set(key, (resultsMap.get(key) || 0) + (item.count || 0))
                })
            }

            // Convert map to array and sort by count
            rawData = Array.from(resultsMap.entries())
                .map(([name, count]) => {
                    const obj: any = { clicks: count }
                    if (dimension === 'countries') obj.country = name
                    else if (dimension === 'cities') obj.city = name
                    else if (dimension === 'devices') obj.device = name
                    else if (dimension === 'browsers') obj.browser = name
                    else if (dimension === 'os') obj.os = name
                    return obj
                })
                .sort((a, b) => b.clicks - a.clicks)
                .slice(0, 20)

        } else {
            // ========================================
            // LEGACY: Single event type (clicks only)
            // ========================================
            const sql = queryBuilder(workspaceId, dateFrom, dateTo, filters, linkIdFilter)
            console.log('[Breakdown API] Executing SQL:', sql)

            const response = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(sql)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                },
                cache: 'no-store',
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('[Breakdown API] Tinybird SQL error:', errorText)
                return NextResponse.json({ error: 'Failed to fetch data', details: errorText }, { status: response.status })
            }

            const result = await response.json()
            rawData = result.data || []
        }

        // Transform data for frontend
        let data: any[] = []

        if (dimension === 'countries') {
            data = rawData.map((item: any) => ({
                name: item.country || 'Unknown',
                flag: COUNTRY_FLAGS[item.country] || '🌍',
                clicks: item.clicks || 0,
            }))
        } else if (dimension === 'cities') {
            data = rawData.map((item: any) => ({
                name: item.city || 'Unknown',
                country: item.country || 'Unknown',
                flag: COUNTRY_FLAGS[item.country] || '🌍',
                clicks: item.clicks || 0,
            }))
        } else if (dimension === 'devices') {
            data = rawData.map((item: any) => ({
                name: item.device || 'Unknown',
                clicks: item.clicks || 0,
            }))
        } else if (dimension === 'browsers') {
            data = rawData.map((item: any) => ({
                name: item.browser || 'Unknown',
                clicks: item.clicks || 0,
            }))
        } else if (dimension === 'os') {
            data = rawData.map((item: any) => ({
                name: item.os || 'Unknown',
                clicks: item.clicks || 0,
            }))
        }

        return NextResponse.json({
            data,
            dimension,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        })

    } catch (error) {
        console.error('[Breakdown API] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        return NextResponse.json({
            error: 'Failed to fetch analytics',
            debug: {
                message: errorMessage,
                stack: errorStack?.split('\n').slice(0, 5)
            }
        }, { status: 500 })
    }
}
