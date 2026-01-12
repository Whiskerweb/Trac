'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { createClient } from '@/utils/supabase/server'
import { getRecentClicks } from '@/lib/analytics/tinybird'

// =============================================
// LAST EVENTS FOR DASHBOARD OVERVIEW
// =============================================

export interface DashboardEvent {
    id: string
    type: 'click' | 'sale' | 'commission' | 'enrollment'
    partner_name: string | null
    partner_email: string
    amount?: number
    currency?: string
    mission_title?: string
    created_at: Date
}

/**
 * Get latest events for the dashboard overview
 * Returns mix of clicks, enrollments, sales, and commissions with partner names
 */
export async function getLastEvents(limit: number = 10): Promise<{
    success: boolean
    events?: DashboardEvent[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Get recent clicks from Tinybird
        const clicks = await getRecentClicks(workspace.workspaceId, limit)

        // Get recent enrollments (partners joining missions)
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                Mission: {
                    workspace_id: workspace.workspaceId
                }
            },
            include: {
                Mission: {
                    select: { title: true }
                }
            },
            orderBy: { created_at: 'desc' },
            take: limit
        })

        // Get recent commissions (sales attributed to partners)
        const commissions = await prisma.commission.findMany({
            where: {
                program_id: workspace.workspaceId
            },
            include: {
                Partner: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' },
            take: limit
        })

        // Combine and sort events
        const events: DashboardEvent[] = []

        // Map clicks to events
        for (const click of clicks) {
            // Try to find partner info from affiliate_id
            let partnerName: string | null = null
            let partnerEmail = 'Visiteur anonyme'

            if (click.affiliate_id) {
                const partner = await prisma.partner.findFirst({
                    where: { user_id: click.affiliate_id },
                    select: { name: true, email: true }
                })
                if (partner) {
                    partnerName = partner.name
                    partnerEmail = partner.email
                }
            }

            events.push({
                id: click.click_id,
                type: 'click',
                partner_name: partnerName,
                partner_email: partnerEmail,
                created_at: new Date(click.timestamp)
            })
        }

        // Map enrollments to events
        for (const e of enrollments) {
            // Get partner info from user_id if possible
            let partnerName: string | null = null
            let partnerEmail = 'Unknown Partner'

            // Try to find partner by user_id
            const partner = await prisma.partner.findFirst({
                where: { user_id: e.user_id },
                select: { name: true, email: true }
            })

            if (partner) {
                partnerName = partner.name
                partnerEmail = partner.email
            }

            events.push({
                id: e.id,
                type: 'enrollment',
                partner_name: partnerName,
                partner_email: partnerEmail,
                mission_title: e.Mission.title,
                created_at: e.created_at
            })
        }

        // Map commissions to events
        for (const c of commissions) {
            events.push({
                id: c.id,
                type: c.status === 'COMPLETE' ? 'commission' : 'sale',
                partner_name: c.Partner.name,
                partner_email: c.Partner.email,
                amount: c.commission_amount,
                currency: c.currency,
                created_at: c.created_at
            })
        }

        // Sort by created_at descending and limit
        events.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        const limitedEvents = events.slice(0, limit)

        return { success: true, events: limitedEvents }

    } catch (error) {
        console.error('[Dashboard] ❌ getLastEvents error:', error)
        return { success: false, error: 'Failed to fetch events' }
    }
}

