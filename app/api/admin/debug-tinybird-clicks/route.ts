import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * Debug Tinybird clicks to see what's actually stored
 * GET /api/admin/debug-tinybird-clicks
 */
export async function GET(request: Request) {
    // Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const workspaceId = workspace.workspaceId

    try {
        // Query last 20 clicks from Tinybird
        const clicksQuery = `
            SELECT
                timestamp,
                click_id,
                link_id,
                affiliate_id,
                workspace_id,
                country,
                device
            FROM clicks
            WHERE workspace_id = '${workspaceId}'
            ORDER BY timestamp DESC
            LIMIT 20
        `

        const response = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
            {
                headers: {
                    'Authorization': `Bearer ${TINYBIRD_TOKEN}`
                }
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json({
                error: 'Tinybird query failed',
                details: errorText
            }, { status: 500 })
        }

        const text = await response.text()
        const lines = text.trim().split('\n')

        const clicks = lines.map(line => {
            const [timestamp, click_id, link_id, affiliate_id, workspace_id, country, device] = line.split('\t')
            return {
                timestamp,
                click_id,
                link_id: link_id || null,
                affiliate_id: affiliate_id || null,
                workspace_id,
                country,
                device,
                has_affiliate_id: !!affiliate_id && affiliate_id !== '',
                has_link_id: !!link_id && link_id !== ''
            }
        })

        const summary = {
            total_clicks: clicks.length,
            clicks_with_affiliate_id: clicks.filter(c => c.has_affiliate_id).length,
            clicks_without_affiliate_id: clicks.filter(c => !c.has_affiliate_id).length,
            clicks_with_link_id: clicks.filter(c => c.has_link_id).length,
            clicks_without_link_id: clicks.filter(c => !c.has_link_id).length,
            unique_link_ids: [...new Set(clicks.map(c => c.link_id).filter(Boolean))],
            unique_affiliate_ids: [...new Set(clicks.map(c => c.affiliate_id).filter(Boolean))]
        }

        return NextResponse.json({
            workspace_id: workspaceId,
            summary,
            clicks,
            diagnosis: {
                problem: summary.clicks_without_affiliate_id > 0 ?
                    `${summary.clicks_without_affiliate_id} clicks in Tinybird have NO affiliate_id` :
                    'All clicks have affiliate_id',
                explanation: summary.clicks_without_affiliate_id > 0 ?
                    'These clicks were logged BEFORE the affiliate_id was added to the link, or from a link created manually without affiliate_id. The activity feed cannot show seller names for these old clicks.' :
                    'All clicks should show seller names in the activity feed.',
                solution: summary.clicks_without_affiliate_id > 0 ?
                    'Create a NEW test click on your seller link. Only NEW clicks (after fixing the attribution) will show seller names.' :
                    'If you still see Anonymous, check the Activity API enrichment logic.'
            }
        })

    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to query Tinybird',
            details: error.message
        }, { status: 500 })
    }
}
