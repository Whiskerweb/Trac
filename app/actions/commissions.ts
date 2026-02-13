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
                Seller: {
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
            if (c.Seller) {
                const existing = partnerMap.get(c.seller_id)
                if (existing) {
                    existing.totalEarned += c.commission_amount
                } else {
                    partnerMap.set(c.seller_id, {
                        partnerId: c.seller_id,
                        partnerName: c.Seller.name,
                        partnerEmail: c.Seller.email,
                        totalEarned: c.commission_amount,
                        status: c.Seller.status as 'PENDING' | 'APPROVED' | 'BANNED'
                    })
                }
            }
        }

        // Recent commissions (last 10)
        const recentCommissions = commissions.slice(0, 10).map(c => ({
            id: c.id,
            partnerEmail: c.Seller?.email || 'Unknown',
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
// GET WORKSPACE COMMISSIONS (For Startup Dashboard - Full List)
// =============================================

export interface CommissionItem {
    id: string
    partnerId: string
    partnerName: string
    partnerEmail: string
    missionId: string | null
    missionName: string
    rewardType: 'SALE' | 'LEAD' | 'RECURRING' | null  // Type of commission (from Commission.commission_source)
    saleId: string
    grossAmount: number
    taxAmount: number
    netAmount: number
    commissionAmount: number
    platformFee: number
    commissionRate: string
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    startupPaymentStatus: 'UNPAID' | 'PAID'
    createdAt: Date
    maturedAt: Date | null
    paidAt: Date | null
}

export interface GetCommissionsResponse {
    success: boolean
    commissions?: CommissionItem[]
    stats?: {
        total: number
        pending: number
        proceed: number
        complete: number
        platformFees: number
    }
    pagination?: {
        total: number
        page: number
        perPage: number
        totalPages: number
    }
    error?: string
}

export async function getWorkspaceCommissions(
    page: number = 1,
    perPage: number = 50,
    statusFilter?: 'PENDING' | 'PROCEED' | 'COMPLETE'
): Promise<GetCommissionsResponse> {
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
        // Build where clause
        const whereClause: {
            program_id: string
            status?: 'PENDING' | 'PROCEED' | 'COMPLETE'
        } = {
            program_id: workspace.workspaceId
        }

        if (statusFilter) {
            whereClause.status = statusFilter
        }

        // Get commissions with pagination
        const [commissions, totalCount] = await Promise.all([
            prisma.commission.findMany({
                where: whereClause,
                include: {
                    Seller: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage
            }),
            prisma.commission.count({ where: whereClause })
        ])

        // Get unique link_ids to fetch mission info
        const linkIds = [...new Set(
            commissions
                .map(c => c.link_id)
                .filter((id): id is string => id !== null)
        )]

        // Lookup missions via ShortLink → MissionEnrollment → Mission
        const shortLinks = linkIds.length > 0
            ? await prisma.shortLink.findMany({
                where: { id: { in: linkIds } },
                include: {
                    MissionEnrollment: {
                        include: {
                            Mission: {
                                select: {
                                    id: true,
                                    title: true,
                                    reward_type: true
                                }
                            }
                        }
                    }
                }
            })
            : []

        // Create a map for quick lookup: link_id → mission info
        const missionMap = new Map(
            shortLinks.map(sl => [
                sl.id,
                sl.MissionEnrollment?.Mission || null
            ])
        )

        // Get stats (all commissions, no pagination)
        const allCommissions = await prisma.commission.findMany({
            where: { program_id: workspace.workspaceId },
            select: {
                commission_amount: true,
                platform_fee: true,
                status: true,
            }
        })

        const stats = {
            total: allCommissions.reduce((sum, c) => sum + c.commission_amount, 0),
            pending: allCommissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commission_amount, 0),
            proceed: allCommissions.filter(c => c.status === 'PROCEED').reduce((sum, c) => sum + c.commission_amount, 0),
            complete: allCommissions.filter(c => c.status === 'COMPLETE').reduce((sum, c) => sum + c.commission_amount, 0),
            platformFees: allCommissions.reduce((sum, c) => sum + c.platform_fee, 0),
        }

        // Map to response format
        const mappedCommissions: CommissionItem[] = commissions.map(c => {
            // Get mission info from missionMap (via link_id)
            const mission = c.link_id ? missionMap.get(c.link_id) : null
            const missionName = mission?.title || 'Direct Sale'
            const missionId = mission?.id || null
            // Use commission_source (actual source of this commission) instead of mission.reward_type
            // This correctly shows LEAD for lead commissions and SALE for sale commissions
            // even on missions that have both types enabled
            const rewardType = (c.commission_source as 'SALE' | 'LEAD' | 'RECURRING') || null

            return {
                id: c.id,
                partnerId: c.seller_id,
                partnerName: c.Seller?.name || c.Seller?.email || 'Unknown',
                partnerEmail: c.Seller?.email || 'Unknown',
                missionId,
                missionName,
                rewardType,
                saleId: c.sale_id,
                grossAmount: c.gross_amount,
                taxAmount: c.tax_amount,
                netAmount: c.net_amount,
                commissionAmount: c.commission_amount,
                platformFee: c.platform_fee,
                commissionRate: c.commission_rate,
                status: c.status as 'PENDING' | 'PROCEED' | 'COMPLETE',
                startupPaymentStatus: c.startup_payment_status as 'UNPAID' | 'PAID',
                createdAt: c.created_at,
                maturedAt: c.matured_at,
                paidAt: c.paid_at,
            }
        })

        return {
            success: true,
            commissions: mappedCommissions,
            stats,
            pagination: {
                total: totalCount,
                page,
                perPage,
                totalPages: Math.ceil(totalCount / perPage)
            }
        }
    } catch (error) {
        console.error('[getWorkspaceCommissions] Error:', error)
        return { success: false, error: 'Failed to fetch commissions' }
    }
}

// =============================================
// GET COMMISSION DETAIL (For Startup Dashboard)
// =============================================

export interface CommissionDetail {
    // Core
    id: string
    saleId: string
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    commissionSource: 'SALE' | 'LEAD' | 'RECURRING' | null

    // Financial
    grossAmount: number
    netAmount: number
    stripeFee: number
    taxAmount: number
    commissionAmount: number
    platformFee: number
    commissionRate: string
    commissionType: string | null
    currency: string

    // Seller
    seller: {
        id: string
        name: string | null
        email: string
        avatar: string | null
        country: string | null
        profileType: string | null
        status: string
    }

    // Mission
    mission: {
        id: string
        title: string
        status: string
        reward: string
    } | null

    // Recurring
    subscriptionId: string | null
    recurringMonth: number | null
    recurringMax: number | null

    // Lifecycle
    holdDays: number
    maturedAt: Date | null
    paidAt: Date | null
    createdAt: Date

    // Startup payment
    startupPaymentStatus: string | null

    // Org
    orgInfo: { name: string; isLeaderCut: boolean } | null

    // Group
    groupInfo: { name: string; id: string } | null

    // Referral
    referralInfo: { generation: number; sourceCommissionId: string } | null

    // Link
    linkSlug: string | null
    linkClicks: number | null
}

export async function getCommissionDetail(commissionId: string): Promise<{
    success: boolean
    commission?: CommissionDetail
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
        const commission = await prisma.commission.findFirst({
            where: {
                id: commissionId,
                program_id: workspace.workspaceId
            },
            include: {
                Seller: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        Profile: {
                            select: {
                                avatar_url: true,
                                country: true,
                                profile_type: true,
                            }
                        }
                    }
                }
            }
        })

        if (!commission) {
            return { success: false, error: 'Commission not found' }
        }

        // Fetch mission info via link_id → ShortLink → MissionEnrollment → Mission
        let mission: { id: string; title: string; status: string; reward: string } | null = null
        let linkSlug: string | null = null
        let linkClicks: number | null = null

        if (commission.link_id) {
            const shortLink = await prisma.shortLink.findUnique({
                where: { id: commission.link_id },
                include: {
                    MissionEnrollment: {
                        include: {
                            Mission: {
                                select: { id: true, title: true, status: true, reward: true }
                            }
                        }
                    }
                }
            })

            if (shortLink) {
                linkSlug = shortLink.slug
                linkClicks = shortLink.clicks
                if (shortLink.MissionEnrollment?.Mission) {
                    mission = shortLink.MissionEnrollment.Mission
                }
            }
        }

        // Determine org info
        let orgInfo: { name: string; isLeaderCut: boolean } | null = null
        if (commission.organization_mission_id) {
            const orgMission = await prisma.organizationMission.findUnique({
                where: { id: commission.organization_mission_id },
                include: { Organization: { select: { name: true } } }
            })
            if (orgMission) {
                orgInfo = {
                    name: orgMission.Organization.name,
                    isLeaderCut: !!commission.org_parent_commission_id || commission.sale_id.endsWith(':orgcut')
                }
            }
        }

        // Determine group info
        let groupInfo: { name: string; id: string } | null = null
        if (commission.group_id) {
            const group = await prisma.sellerGroup.findUnique({
                where: { id: commission.group_id },
                select: { id: true, name: true }
            })
            if (group) {
                groupInfo = { name: group.name, id: group.id }
            }
        }

        // Determine referral info
        let referralInfo: { generation: number; sourceCommissionId: string } | null = null
        if (commission.referral_generation && commission.referral_source_commission_id) {
            referralInfo = {
                generation: commission.referral_generation,
                sourceCommissionId: commission.referral_source_commission_id
            }
        }

        return {
            success: true,
            commission: {
                id: commission.id,
                saleId: commission.sale_id,
                status: commission.status as 'PENDING' | 'PROCEED' | 'COMPLETE',
                commissionSource: (commission.commission_source as 'SALE' | 'LEAD' | 'RECURRING') || null,

                grossAmount: commission.gross_amount,
                netAmount: commission.net_amount,
                stripeFee: commission.stripe_fee,
                taxAmount: commission.tax_amount,
                commissionAmount: commission.commission_amount,
                platformFee: commission.platform_fee,
                commissionRate: commission.commission_rate,
                commissionType: commission.commission_type,
                currency: commission.currency,

                seller: {
                    id: commission.Seller?.id || commission.seller_id,
                    name: commission.Seller?.name || null,
                    email: commission.Seller?.email || 'Unknown',
                    avatar: commission.Seller?.Profile?.avatar_url || null,
                    country: commission.Seller?.Profile?.country || null,
                    profileType: commission.Seller?.Profile?.profile_type || null,
                    status: commission.Seller?.status || 'PENDING',
                },

                mission,

                subscriptionId: commission.subscription_id,
                recurringMonth: commission.recurring_month,
                recurringMax: commission.recurring_max,

                holdDays: commission.hold_days,
                maturedAt: commission.matured_at,
                paidAt: commission.paid_at,
                createdAt: commission.created_at,

                startupPaymentStatus: commission.startup_payment_status,

                orgInfo,
                groupInfo,
                referralInfo,

                linkSlug,
                linkClicks,
            }
        }
    } catch (error) {
        console.error('[getCommissionDetail] Error:', error)
        return { success: false, error: 'Failed to fetch commission detail' }
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
        // Get sellers for this workspace
        const sellers = await prisma.seller.findMany({
            where: { program_id: workspace.workspaceId },
            select: { id: true, email: true }
        })

        const sellerIds = sellers.map(p => p.id)
        const sellerEmailMap = new Map(sellers.map(p => [p.id, p.email]))

        // Get pending gift card requests
        const requests = await prisma.giftCardRedemption.findMany({
            where: {
                seller_id: { in: sellerIds },
                status: { in: ['PENDING', 'PROCESSING'] }
            },
            orderBy: { created_at: 'desc' }
        })

        return {
            success: true,
            requests: requests.map(r => ({
                id: r.id,
                partnerEmail: sellerEmailMap.get(r.seller_id) || 'Unknown',
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
