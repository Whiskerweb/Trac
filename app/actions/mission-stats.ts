'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// TYPES
// =============================================

export interface PartnerStats {
    partner_id: string
    partner_name: string
    avatar_url?: string
    total_revenue: number
    total_commission: number
    leads: number
    clicks: number
    rank: number
}

export interface MissionStatsForStartup {
    mission_id: string
    mission_title: string
    total_revenue: number
    total_to_pay: number
    total_partners: number
    conversion_rate: number
    partner_leaderboard: PartnerStats[]
}

export interface MissionStatsForPartner {
    mission_id: string
    mission_title: string
    my_revenue: number
    my_commission: number
    my_leads: number
    my_clicks: number
    my_rank: number
    total_partners: number
}

export interface ActivityLogEntry {
    id: string
    type: 'click' | 'lead' | 'sale'
    timestamp: Date
    details: string
    amount?: number
    commission?: number
}

// =============================================
// HELPER: Get link IDs for a mission
// =============================================

async function getLinkIdsForMission(missionId: string): Promise<string[]> {
    const enrollments = await prisma.missionEnrollment.findMany({
        where: { mission_id: missionId },
        select: { link_id: true }
    })
    return enrollments.filter(e => e.link_id).map(e => e.link_id!)
}

// =============================================
// STARTUP: Get Mission Stats + Leaderboard
// =============================================

export async function getMissionStatsForStartup(missionId: string): Promise<{
    success: boolean
    stats?: MissionStatsForStartup
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'No active workspace' }
        }

        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                workspace_id: workspace.workspaceId
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        // Get link IDs for this mission
        const linkIds = await getLinkIdsForMission(missionId)

        // Get commissions via link_id
        const commissions = linkIds.length > 0 ? await prisma.commission.findMany({
            where: {
                link_id: { in: linkIds }
            },
            include: {
                Partner: true
            }
        }) : []

        const enrollments = await prisma.missionEnrollment.findMany({
            where: { mission_id: missionId, status: 'APPROVED' }
        })

        const partnerMap = new Map<string, {
            partner_id: string
            partner_name: string
            total_revenue: number
            total_commission: number
            leads: number
            clicks: number
        }>()

        let totalRevenue = 0
        let totalToPay = 0

        for (const c of commissions) {
            totalRevenue += c.net_amount
            totalToPay += c.commission_amount + c.platform_fee

            const existing = partnerMap.get(c.partner_id)
            if (existing) {
                existing.total_revenue += c.net_amount
                existing.total_commission += c.commission_amount
            } else {
                partnerMap.set(c.partner_id, {
                    partner_id: c.partner_id,
                    partner_name: c.Partner.name || c.Partner.email,
                    total_revenue: c.net_amount,
                    total_commission: c.commission_amount,
                    leads: 0,
                    clicks: 0
                })
            }
        }

        const leaderboard: PartnerStats[] = Array.from(partnerMap.values())
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .map((p, index) => ({ ...p, rank: index + 1 }))

        return {
            success: true,
            stats: {
                mission_id: missionId,
                mission_title: mission.title,
                total_revenue: totalRevenue,
                total_to_pay: totalToPay,
                total_partners: enrollments.length,
                conversion_rate: 0,
                partner_leaderboard: leaderboard
            }
        }
    } catch (err) {
        console.error('[MissionStats] Error getting startup stats:', err)
        return { success: false, error: 'Failed to load stats' }
    }
}

// =============================================
// PARTNER: Get My Stats for a Mission
// =============================================

export async function getMissionStatsForPartner(missionId: string): Promise<{
    success: boolean
    stats?: MissionStatsForPartner
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const partner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return { success: false, error: 'Partner not found' }
        }

        const mission = await prisma.mission.findUnique({
            where: { id: missionId }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        const linkIds = await getLinkIdsForMission(missionId)

        // Get my commissions for this mission's links
        const myCommissions = linkIds.length > 0 ? await prisma.commission.findMany({
            where: {
                partner_id: partner.id,
                link_id: { in: linkIds }
            }
        }) : []

        const myRevenue = myCommissions.reduce((sum, c) => sum + c.net_amount, 0)
        const myCommission = myCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

        // Get all commissions for ranking
        const allCommissions = linkIds.length > 0 ? await prisma.commission.findMany({
            where: { link_id: { in: linkIds } },
            select: { partner_id: true, net_amount: true }
        }) : []

        const partnerTotals = new Map<string, number>()
        for (const c of allCommissions) {
            partnerTotals.set(c.partner_id, (partnerTotals.get(c.partner_id) || 0) + c.net_amount)
        }

        const sorted = Array.from(partnerTotals.entries())
            .sort((a, b) => b[1] - a[1])
        const myRank = sorted.findIndex(([pid]) => pid === partner.id) + 1

        const enrollments = await prisma.missionEnrollment.count({
            where: { mission_id: missionId, status: 'APPROVED' }
        })

        return {
            success: true,
            stats: {
                mission_id: missionId,
                mission_title: mission.title,
                my_revenue: myRevenue,
                my_commission: myCommission,
                my_leads: 0,
                my_clicks: 0,
                my_rank: myRank || enrollments,
                total_partners: enrollments
            }
        }
    } catch (err) {
        console.error('[MissionStats] Error getting partner stats:', err)
        return { success: false, error: 'Failed to load stats' }
    }
}

// =============================================
// PARTNER: Get Activity Log for a Mission
// =============================================

export async function getPartnerActivityLog(missionId: string): Promise<{
    success: boolean
    entries?: ActivityLogEntry[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const partner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return { success: false, error: 'Partner not found' }
        }

        const linkIds = await getLinkIdsForMission(missionId)

        const commissions = linkIds.length > 0 ? await prisma.commission.findMany({
            where: {
                partner_id: partner.id,
                link_id: { in: linkIds }
            },
            orderBy: { created_at: 'desc' },
            take: 50
        }) : []

        const entries: ActivityLogEntry[] = commissions.map(c => ({
            id: c.id,
            type: 'sale' as const,
            timestamp: c.created_at,
            details: `Vente - ${c.sale_id.slice(0, 8)}...`,
            amount: c.net_amount,
            commission: c.commission_amount
        }))

        return {
            success: true,
            entries: entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        }
    } catch (err) {
        console.error('[MissionStats] Error getting activity log:', err)
        return { success: false, error: 'Failed to load activity' }
    }
}

