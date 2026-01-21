import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_ADMIN_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

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

// SQL queries for each dimension
const DIMENSION_QUERIES: Record<string, (workspaceId: string, dateFrom: string, dateTo: string) => string> = {
    countries: (workspaceId, dateFrom, dateTo) => `
        SELECT country, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 20
    `,
    cities: (workspaceId, dateFrom, dateTo) => `
        SELECT city, country, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
        GROUP BY city, country
        ORDER BY clicks DESC
        LIMIT 20
    `,
    devices: (workspaceId, dateFrom, dateTo) => `
        SELECT device, count() as clicks
        FROM clicks
        WHERE workspace_id = '${workspaceId}'
          AND timestamp >= parseDateTimeBestEffort('${dateFrom}')
          AND timestamp <= parseDateTimeBestEffort('${dateTo}')
        GROUP BY device
        ORDER BY clicks DESC
    `,
    browsers: (workspaceId, dateFrom, dateTo) => `
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
        GROUP BY browser
        ORDER BY clicks DESC
    `,
    os: (workspaceId, dateFrom, dateTo) => `
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
        GROUP BY os
        ORDER BY clicks DESC
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

        const mockData: Record<string, any[]> = {
            countries: [
                { name: 'France', flag: '🇫🇷', clicks: 847 },
                { name: 'United States', flag: '🇺🇸', clicks: 423 },
                { name: 'Germany', flag: '🇩🇪', clicks: 312 },
                { name: 'United Kingdom', flag: '🇬🇧', clicks: 189 },
                { name: 'Spain', flag: '🇪🇸', clicks: 145 },
            ],
            cities: [
                { name: 'Paris', country: 'France', flag: '🇫🇷', clicks: 420 },
                { name: 'Lyon', country: 'France', flag: '🇫🇷', clicks: 147 },
                { name: 'New York', country: 'United States', flag: '🇺🇸', clicks: 235 },
                { name: 'Berlin', country: 'Germany', flag: '🇩🇪', clicks: 188 },
                { name: 'London', country: 'United Kingdom', flag: '🇬🇧', clicks: 144 },
            ],
            devices: [
                { name: 'Desktop', clicks: 1245 },
                { name: 'Mobile', clicks: 671 },
            ],
            browsers: [
                { name: 'Chrome', clicks: 892 },
                { name: 'Safari', clicks: 534 },
                { name: 'Firefox', clicks: 287 },
                { name: 'Edge', clicks: 156 },
                { name: 'Other', clicks: 47 },
            ],
            os: [
                { name: 'Windows', clicks: 678 },
                { name: 'macOS', clicks: 489 },
                { name: 'iOS', clicks: 412 },
                { name: 'Android', clicks: 259 },
                { name: 'Linux', clicks: 78 },
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
        const dimension = searchParams.get('dimension') || 'countries'
        const dateFrom = searchParams.get('date_from') || '2020-01-01'
        let dateTo = searchParams.get('date_to') || '2030-12-31'
        if (dateTo && !dateTo.includes('T')) {
            dateTo = `${dateTo}T23:59:59`
        }

        // Get SQL query for dimension
        const queryBuilder = DIMENSION_QUERIES[dimension]
        if (!queryBuilder) {
            return NextResponse.json({ error: 'Invalid dimension' }, { status: 400 })
        }

        const sql = queryBuilder(workspaceId, dateFrom, dateTo)

        // Use Tinybird SQL endpoint directly (no pipe needed)
        const response = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                'Content-Type': 'text/plain',
            },
            body: sql,
            cache: 'no-store',
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Breakdown API] Tinybird SQL error:', errorText)
            return NextResponse.json({ error: 'Failed to fetch data', details: errorText }, { status: response.status })
        }

        const result = await response.json()
        const rawData = result.data || []

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
