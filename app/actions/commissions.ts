'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// GET WORKSPACE COMMISSION STATS (For Startup Dashboard)
// =============================================

export interface CommissionStats {
    // Total commissions paid to partners
    totalCommissionsPaid: number
    // Total platform fees (15%)
    totalPlatformFees: number
    // Pending commissions (not yet matured)
    pendingCommissions: number
    // Due commissions (ready to pay)
    dueCommissions: number
    // Commission breakdown by partner
    partnerBreakdown: Array<{
        partnerId: string
        partnerName: string | null
        partnerEmail: string
        totalEarned: number
        status: 'PENDING' | 'APPROVED' | 'BANNED'
    }>
    // Recent commissions
    recentCommissions: Array<{
        id: string
        partnerEmail: string
        amount: number
        platformFee: number
        status: string
        createdAt: Date
    }>
}

export async function getWorkspaceCommissionStats(): Promise<{
    success: boolean
    stats?: CommissionStats
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
        // Get all commissions for this workspace (program)
        const commissions = await prisma.commission.findMany({
            where: { program_id: workspace.workspaceId },
            include: {
                Partner: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        status: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' },
            take: 100
        })

        // Calculate totals
        const totalCommissionsPaid = commissions
            .filter(c => c.status === 'COMPLETE')
            .reduce((sum, c) => sum + c.commission_amount, 0)

        const totalPlatformFees = commissions
            .filter(c => c.status === 'COMPLETE')
            .reduce((sum, c) => sum + c.platform_fee, 0)

        const pendingCommissions = commissions
            .filter(c => c.status === 'PENDING')
            .reduce((sum, c) => sum + c.commission_amount, 0)

        const dueCommissions = commissions
            .filter(c => c.status === 'PROCEED')
            .reduce((sum, c) => sum + c.commission_amount, 0)

        // Partner breakdown
        const partnerMap = new Map<string, {
            partnerId: string
            partnerName: string | null
            partnerEmail: string
            totalEarned: number
            status: 'PENDING' | 'APPROVED' | 'BANNED'
        }>()

        for (const c of commissions) {
            if (c.Partner) {
                const existing = partnerMap.get(c.partner_id)
                if (existing) {
                    existing.totalEarned += c.commission_amount
                } else {
                    partnerMap.set(c.partner_id, {
                        partnerId: c.partner_id,
                        partnerName: c.Partner.name,
                        partnerEmail: c.Partner.email,
                        totalEarned: c.commission_amount,
                        status: c.Partner.status as 'PENDING' | 'APPROVED' | 'BANNED'
                    })
                }
            }
        }

        // Recent commissions (last 10)
        const recentCommissions = commissions.slice(0, 10).map(c => ({
            id: c.id,
            partnerEmail: c.Partner?.email || 'Unknown',
            amount: c.commission_amount,
            platformFee: c.platform_fee,
            status: c.status,
            createdAt: c.created_at
        }))

        return {
            success: true,
            stats: {
                totalCommissionsPaid,
                totalPlatformFees,
                pendingCommissions,
                dueCommissions,
                partnerBreakdown: Array.from(partnerMap.values())
                    .sort((a, b) => b.totalEarned - a.totalEarned),
                recentCommissions
            }
        }
    } catch (error) {
        console.error('[getWorkspaceCommissionStats] Error:', error)
        return { success: false, error: 'Failed to fetch commission stats' }
    }
}

// =============================================
// GET PENDING GIFT CARD REQUESTS (For Admin)
// =============================================

export async function getPendingGiftCardRequests(): Promise<{
    success: boolean
    requests?: Array<{
        id: string
        partnerEmail: string
        cardType: string
        amount: number
        status: string
        createdAt: Date
    }>
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
        // Get partners for this workspace
        const partners = await prisma.partner.findMany({
            where: { program_id: workspace.workspaceId },
            select: { id: true, email: true }
        })

        const partnerIds = partners.map(p => p.id)
        const partnerEmailMap = new Map(partners.map(p => [p.id, p.email]))

        // Get pending gift card requests
        const requests = await prisma.giftCardRedemption.findMany({
            where: {
                partner_id: { in: partnerIds },
                status: { in: ['PENDING', 'PROCESSING'] }
            },
            orderBy: { created_at: 'desc' }
        })

        return {
            success: true,
            requests: requests.map(r => ({
                id: r.id,
                partnerEmail: partnerEmailMap.get(r.partner_id) || 'Unknown',
                cardType: r.card_type,
                amount: r.amount,
                status: r.status,
                createdAt: r.created_at
            }))
        }
    } catch (error) {
        console.error('[getPendingGiftCardRequests] Error:', error)
        return { success: false, error: 'Failed to fetch requests' }
    }
}

// =============================================
// FULFILL GIFT CARD (Admin Action)
// =============================================

export async function fulfillGiftCard(
    requestId: string,
    cardCode: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        await prisma.giftCardRedemption.update({
            where: { id: requestId },
            data: {
                card_code: cardCode,
                status: 'DELIVERED',
                fulfilled_at: new Date()
            }
        })

        console.log('[fulfillGiftCard] ✅ Gift card fulfilled:', requestId)
        return { success: true }
    } catch (error) {
        console.error('[fulfillGiftCard] Error:', error)
        return { success: false, error: 'Failed to fulfill request' }
    }
}
