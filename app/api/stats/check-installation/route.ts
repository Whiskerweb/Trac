import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

export const dynamic = 'force-dynamic'

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_ADMIN_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * GET /api/stats/check-installation
 * 
 * Checks if the SDK has sent any events for this workspace.
 * Used for real-time verification in the Setup & Diagnostics page.
 */
export async function GET() {
    // Mock mode for development
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        return NextResponse.json({
            installed: true,
            eventCount: Math.floor(Math.random() * 100) + 1,
            lastEventAt: new Date().toISOString(),
            status: 'connected'
        })
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return NextResponse.json({
            installed: false,
            eventCount: 0,
            status: 'no_workspace'
        })
    }

    // Check Tinybird for events
    if (!TINYBIRD_ADMIN_TOKEN) {
        return NextResponse.json({
            installed: false,
            eventCount: 0,
            status: 'no_tinybird_token'
        })
    }

    try {
        // Query clicks datasource for this workspace
        const params = new URLSearchParams({
            q: `SELECT count() as event_count, max(timestamp) as last_event 
                FROM click_events 
                WHERE workspace_id = '${workspace.workspaceId}'`
        })

        const response = await fetch(
            `${TINYBIRD_HOST}/v0/sql?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                },
                cache: 'no-store'
            }
        )

        if (!response.ok) {
            // Tinybird query failed - return unknown state
            return NextResponse.json({
                installed: false,
                eventCount: 0,
                status: 'query_failed'
            })
        }

        const data = await response.json()
        const eventCount = data.data?.[0]?.event_count || 0
        const lastEvent = data.data?.[0]?.last_event

        return NextResponse.json({
            installed: eventCount > 0,
            eventCount,
            lastEventAt: lastEvent || null,
            status: eventCount > 0 ? 'connected' : 'waiting'
        })

    } catch (error) {
        console.error('[Check Installation] Error:', error)
        return NextResponse.json({
            installed: false,
            eventCount: 0,
            status: 'error'
        })
    }
}
