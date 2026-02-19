'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { joinMission } from '@/app/actions/marketplace'

// =============================================
// HELPERS
// =============================================

/** Find workspace by slug or portal_subdomain (for subdomain routing) */
async function findPortalWorkspace(slugOrSubdomain: string) {
    return prisma.workspace.findFirst({
        where: {
            OR: [
                { slug: slugOrSubdomain },
                { portal_subdomain: slugOrSubdomain },
            ],
        },
    })
}

// =============================================
// HELPERS — Portal link IDs (scoped to portal_exclusive missions)
// =============================================

async function getPortalLinkIds(userId: string, workspaceId: string): Promise<string[]> {
    const enrollments = await prisma.missionEnrollment.findMany({
        where: {
            user_id: userId,
            status: 'APPROVED',
            Mission: { workspace_id: workspaceId, portal_exclusive: true },
        },
        select: { ShortLink: { select: { id: true } } },
    })
    return enrollments.map(e => e.ShortLink?.id).filter((id): id is string => !!id)
}

// =============================================
// HELPERS — DB-based stats (replaces Tinybird)
// =============================================

async function getDBLinkStats(linkId: string, sellerId: string) {
    const [link, commissions, leadCount] = await Promise.all([
        prisma.shortLink.findUnique({
            where: { id: linkId },
            select: { clicks: true },
        }),
        prisma.commission.aggregate({
            where: {
                link_id: linkId,
                seller_id: sellerId,
                org_parent_commission_id: null,
                referral_generation: null,
            },
            _count: { id: true },
            _sum: { commission_amount: true },
        }),
        prisma.leadEvent.count({ where: { link_id: linkId } }),
    ])
    return {
        clicks: link?.clicks || 0,
        leads: leadCount,
        sales: commissions._count.id,
        revenue: commissions._sum.commission_amount || 0,
    }
}

// =============================================
// PORTAL — PUBLIC DATA (no auth required)
// =============================================

/**
 * Fetch workspace + profile + active PUBLIC/PRIVATE portal_visible missions for portal landing
 */
export async function getPortalData(workspaceSlug: string) {
    try {
        const workspace = await prisma.workspace.findFirst({
            where: { OR: [{ slug: workspaceSlug }, { portal_subdomain: workspaceSlug }] },
            include: {
                Profile: true,
                Domain: {
                    where: { verified: true },
                    take: 1,
                },
            },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const missions = await prisma.mission.findMany({
            where: {
                workspace_id: workspace.id,
                status: 'ACTIVE',
                visibility: { in: ['PUBLIC', 'PRIVATE'] },
                organization_id: null,
                portal_visible: true,
            },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                company_name: true,
                logo_url: true,
                visibility: true,
                sale_enabled: true,
                sale_reward_amount: true,
                sale_reward_structure: true,
                lead_enabled: true,
                lead_reward_amount: true,
                recurring_enabled: true,
                recurring_reward_amount: true,
                recurring_reward_structure: true,
                recurring_duration_months: true,
                referral_enabled: true,
                referral_gen1_rate: true,
                referral_gen2_rate: true,
                referral_gen3_rate: true,
            },
        })

        return {
            success: true,
            data: {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    slug: workspace.slug,
                    portal_welcome_text: workspace.portal_welcome_text,
                    portal_primary_color: workspace.portal_primary_color,
                    portal_headline: workspace.portal_headline,
                    portal_logo_url: workspace.portal_logo_url,
                },
                profile: workspace.Profile ? {
                    logo_url: workspace.Profile.logo_url,
                    description: workspace.Profile.description,
                    website_url: workspace.Profile.website_url,
                    industry: workspace.Profile.industry,
                    twitter_url: workspace.Profile.twitter_url,
                    linkedin_url: workspace.Profile.linkedin_url,
                } : null,
                customDomain: workspace.Domain[0]?.name || null,
                missions,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalData error:', error)
        return { success: false, error: 'Failed to load portal' }
    }
}

/**
 * Fetch detail for a single mission (portal mission page)
 */
export async function getPortalMission(workspaceSlug: string, missionId: string) {
    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                workspace_id: workspace.id,
                status: 'ACTIVE',
                visibility: { in: ['PUBLIC', 'PRIVATE'] },
                organization_id: null,
                portal_visible: true,
            },
            include: {
                Contents: {
                    orderBy: { order: 'asc' },
                },
            },
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        return {
            success: true,
            data: {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    slug: workspace.slug,
                    portal_welcome_text: workspace.portal_welcome_text,
                },
                mission: {
                    id: mission.id,
                    title: mission.title,
                    description: mission.description,
                    company_name: mission.company_name,
                    logo_url: mission.logo_url,
                    visibility: mission.visibility,
                    sale_enabled: mission.sale_enabled,
                    sale_reward_amount: mission.sale_reward_amount,
                    sale_reward_structure: mission.sale_reward_structure,
                    lead_enabled: mission.lead_enabled,
                    lead_reward_amount: mission.lead_reward_amount,
                    recurring_enabled: mission.recurring_enabled,
                    recurring_reward_amount: mission.recurring_reward_amount,
                    recurring_reward_structure: mission.recurring_reward_structure,
                    recurring_duration_months: mission.recurring_duration_months,
                    contents: mission.Contents.map(c => ({
                        id: c.id,
                        type: c.type,
                        url: c.url,
                        title: c.title,
                        description: c.description,
                    })),
                },
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalMission error:', error)
        return { success: false, error: 'Failed to load mission' }
    }
}

// =============================================
// PORTAL — AUTHENTICATED ACTIONS
// =============================================

/**
 * Join a mission via the portal — wraps existing joinMission()
 */
export async function portalJoinMission(missionId: string) {
    return joinMission(missionId, { portalBypass: true })
}

/**
 * Check if current user has any enrollments in this workspace's missions
 */
export async function getPortalUserStatus(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { authenticated: false, enrolled: false, hasSeller: false, enrolledMissionIds: [] as string[] }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true },
        })

        if (!workspace) {
            return { authenticated: true, enrolled: false, hasSeller: !!seller, enrolledMissionIds: [] as string[] }
        }

        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: { in: ['APPROVED', 'PENDING'] },
                Mission: { workspace_id: workspace.id },
            },
            select: { mission_id: true },
        })

        return {
            authenticated: true,
            enrolled: enrollments.length > 0,
            hasSeller: !!seller,
            enrolledMissionIds: enrollments.map(e => e.mission_id),
            userName: user.user_metadata?.full_name || user.email || '',
        }
    } catch {
        return { authenticated: true, enrolled: false, hasSeller: false, enrolledMissionIds: [] as string[] }
    }
}

// =============================================
// PORTAL — FULL DASHBOARD (multi-mission, enriched)
// =============================================

/**
 * Full multi-mission dashboard: auto-enroll in all PUBLIC portal_visible missions,
 * workspace branding, enrollments with stats, recent commissions, balance, payout info
 */
export async function getPortalFullDashboard(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await prisma.workspace.findFirst({
            where: { OR: [{ slug: workspaceSlug }, { portal_subdomain: workspaceSlug }] },
            include: {
                Profile: true,
                Domain: { where: { verified: true }, take: 1 },
            },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        let seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        if (!seller) {
            const { createGlobalSeller } = await import('@/app/actions/sellers')
            await createGlobalSeller({
                userId: user.id,
                email: user.email || '',
                name: user.user_metadata?.full_name || user.email || '',
            })
            seller = await prisma.seller.findFirst({
                where: { user_id: user.id },
            })
            if (!seller) {
                return { success: false, error: 'Seller creation failed' }
            }
        }

        // Get all existing enrollments for this workspace (portal_exclusive only)
        let enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: { workspace_id: workspace.id, portal_exclusive: true },
            },
            include: {
                Mission: {
                    select: {
                        id: true, title: true, description: true,
                        sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                        lead_enabled: true, lead_reward_amount: true,
                        recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                        recurring_duration_months: true,
                        referral_enabled: true, referral_gen1_rate: true, referral_gen2_rate: true, referral_gen3_rate: true,
                        company_name: true, logo_url: true,
                        Contents: {
                            orderBy: { order: 'asc' },
                            select: { id: true, type: true, url: true, title: true, description: true },
                        },
                    },
                },
                ShortLink: {
                    select: { id: true, slug: true, clicks: true },
                },
            },
        })

        // Auto-enroll in ALL portal_exclusive PUBLIC missions if no enrollments yet
        if (enrollments.length === 0) {
            const publicMissions = await prisma.mission.findMany({
                where: {
                    workspace_id: workspace.id,
                    status: 'ACTIVE',
                    visibility: 'PUBLIC',
                    organization_id: null,
                    portal_visible: true,
                    portal_exclusive: true,
                },
                orderBy: { created_at: 'asc' },
                select: { id: true },
            })

            for (const mission of publicMissions) {
                try {
                    await joinMission(mission.id, { portalBypass: true })
                } catch (e) {
                    console.error(`[Portal] Auto-enroll failed ${mission.id}:`, e)
                }
            }

            // Re-fetch enrollments
            if (publicMissions.length > 0) {
                enrollments = await prisma.missionEnrollment.findMany({
                    where: {
                        user_id: user.id,
                        status: 'APPROVED',
                        Mission: { workspace_id: workspace.id, portal_exclusive: true },
                    },
                    include: {
                        Mission: {
                            select: {
                                id: true, title: true, description: true,
                                sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                                lead_enabled: true, lead_reward_amount: true,
                                recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                                recurring_duration_months: true,
                                referral_enabled: true, referral_gen1_rate: true, referral_gen2_rate: true, referral_gen3_rate: true,
                                company_name: true, logo_url: true,
                                Contents: {
                                    orderBy: { order: 'asc' },
                                    select: { id: true, type: true, url: true, title: true, description: true },
                                },
                            },
                        },
                        ShortLink: {
                            select: { id: true, slug: true, clicks: true },
                        },
                    },
                })
            }
        }

        // Get available missions (portal_exclusive but not enrolled)
        const enrolledMissionIds = enrollments.map(e => e.Mission.id)
        const availableMissions = await prisma.mission.findMany({
            where: {
                workspace_id: workspace.id,
                status: 'ACTIVE',
                visibility: { in: ['PUBLIC', 'PRIVATE'] },
                organization_id: null,
                portal_visible: true,
                portal_exclusive: true,
                id: { notIn: enrolledMissionIds.length > 0 ? enrolledMissionIds : ['__none__'] },
            },
            orderBy: { created_at: 'desc' },
            select: {
                id: true, title: true, description: true,
                visibility: true,
                sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                lead_enabled: true, lead_reward_amount: true,
                recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                recurring_duration_months: true,
                referral_enabled: true, referral_gen1_rate: true, referral_gen2_rate: true, referral_gen3_rate: true,
            },
        })

        // Get commission balance breakdown (scoped to portal_exclusive links)
        const portalLinkIds = enrollments
            .map(e => e.ShortLink?.id)
            .filter((id): id is string => !!id)

        const commissionsByStatus = await prisma.commission.groupBy({
            by: ['status'],
            where: {
                seller_id: seller.id,
                link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                org_parent_commission_id: null,
                referral_generation: null,
            },
            _sum: { commission_amount: true },
            _count: { id: true },
        })

        let pendingAmount = 0, proceedAmount = 0, completeAmount = 0
        for (const group of commissionsByStatus) {
            if (group.status === 'PENDING') pendingAmount = group._sum.commission_amount || 0
            else if (group.status === 'PROCEED') proceedAmount = group._sum.commission_amount || 0
            else if (group.status === 'COMPLETE') completeAmount = group._sum.commission_amount || 0
        }

        // Build link URL
        const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
        const baseUrl = workspace.Domain[0] ? `https://${workspace.Domain[0].name}` : defaultUrl

        // Fetch per-enrollment stats in parallel
        const enrollmentStats = await Promise.all(
            enrollments.map(async (e) => {
                if (e.ShortLink?.id) {
                    return getDBLinkStats(e.ShortLink.id, seller!.id)
                }
                return { clicks: 0, leads: 0, sales: 0, revenue: 0 }
            })
        )

        // Fetch 10 recent commissions (scoped to portal_exclusive links)
        const recentCommissions = await prisma.commission.findMany({
            where: {
                seller_id: seller.id,
                link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                org_parent_commission_id: null,
                referral_generation: null,
            },
            orderBy: { created_at: 'desc' },
            take: 10,
            select: {
                id: true,
                commission_amount: true,
                status: true,
                commission_source: true,
                created_at: true,
                matured_at: true,
                hold_days: true,
                recurring_month: true,
                commission_rate: true,
            },
        })

        // Get seller balance + payout info
        const sellerBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: seller.id },
        })

        return {
            success: true,
            data: {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    slug: workspace.slug,
                    portal_primary_color: workspace.portal_primary_color,
                    portal_headline: workspace.portal_headline,
                    portal_logo_url: workspace.portal_logo_url,
                },
                profile: workspace.Profile ? {
                    logo_url: workspace.Profile.logo_url,
                    description: workspace.Profile.description,
                } : null,
                enrollments: enrollments.map((e, i) => ({
                    id: e.id,
                    missionId: e.Mission.id,
                    missionTitle: e.Mission.title,
                    missionDescription: e.Mission.description,
                    linkSlug: e.ShortLink?.slug || null,
                    linkUrl: e.ShortLink ? `${baseUrl}/s/${e.ShortLink.slug}` : null,
                    linkId: e.ShortLink?.id || null,
                    clicks: e.ShortLink?.clicks || 0,
                    contents: e.Mission.Contents,
                    sale_enabled: e.Mission.sale_enabled,
                    sale_reward_amount: e.Mission.sale_reward_amount,
                    sale_reward_structure: e.Mission.sale_reward_structure,
                    lead_enabled: e.Mission.lead_enabled,
                    lead_reward_amount: e.Mission.lead_reward_amount,
                    recurring_enabled: e.Mission.recurring_enabled,
                    recurring_reward_amount: e.Mission.recurring_reward_amount,
                    recurring_reward_structure: e.Mission.recurring_reward_structure,
                    recurring_duration_months: e.Mission.recurring_duration_months,
                    referral_enabled: e.Mission.referral_enabled,
                    referral_gen1_rate: e.Mission.referral_gen1_rate,
                    referral_gen2_rate: e.Mission.referral_gen2_rate,
                    referral_gen3_rate: e.Mission.referral_gen3_rate,
                    company_name: e.Mission.company_name,
                    logo_url: e.Mission.logo_url,
                    stats: enrollmentStats[i],
                })),
                availableMissions,
                balance: {
                    pending: pendingAmount,
                    available: proceedAmount,
                    paid: completeAmount,
                },
                recentCommissions: recentCommissions.map(c => ({
                    id: c.id,
                    amount: c.commission_amount,
                    status: c.status,
                    source: c.commission_source,
                    createdAt: c.created_at.toISOString(),
                    maturedAt: c.matured_at?.toISOString() || null,
                    holdDays: c.hold_days,
                    recurringMonth: c.recurring_month,
                    rate: c.commission_rate,
                })),
                payout: {
                    method: seller.payout_method || 'STRIPE_CONNECT',
                    stripeConnected: !!seller.stripe_connect_id,
                    balance: sellerBalance?.balance || 0,
                    pending: sellerBalance?.pending || 0,
                    due: sellerBalance?.due || 0,
                    paidTotal: sellerBalance?.paid_total || 0,
                },
                sellerName: user.user_metadata?.full_name || user.email || '',
                sellerId: seller.id,
                referralCode: seller.referral_code || '',
                referralConfig: {
                    enabled: workspace.portal_referral_enabled,
                    gen1Rate: workspace.portal_referral_gen1_rate,
                    gen2Rate: workspace.portal_referral_gen2_rate,
                    gen3Rate: workspace.portal_referral_gen3_rate,
                },
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalFullDashboard error:', error)
        return { success: false, error: 'Failed to load dashboard' }
    }
}

/**
 * Get paginated commissions for portal dashboard
 */
export async function getPortalCommissions(
    workspaceSlug: string,
    page: number = 1,
    statusFilter?: string
) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        const portalLinkIds = await getPortalLinkIds(user.id, workspace.id)

        const perPage = 20
        const skip = (page - 1) * perPage

        const where: Record<string, unknown> = {
            seller_id: seller.id,
            link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
            org_parent_commission_id: null,
            referral_generation: null,
        }

        if (statusFilter && statusFilter !== 'ALL') {
            where.status = statusFilter
        }

        const [commissions, total] = await Promise.all([
            prisma.commission.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip,
                take: perPage,
                select: {
                    id: true,
                    commission_amount: true,
                    status: true,
                    commission_source: true,
                    created_at: true,
                    matured_at: true,
                    hold_days: true,
                    recurring_month: true,
                    commission_rate: true,
                },
            }),
            prisma.commission.count({ where }),
        ])

        // Get totals by status
        const totals = await prisma.commission.groupBy({
            by: ['status'],
            where: {
                seller_id: seller.id,
                link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                org_parent_commission_id: null,
                referral_generation: null,
            },
            _sum: { commission_amount: true },
            _count: { id: true },
        })

        const statusTotals = { PENDING: 0, PROCEED: 0, COMPLETE: 0 }
        for (const g of totals) {
            if (g.status in statusTotals) {
                statusTotals[g.status as keyof typeof statusTotals] = g._sum.commission_amount || 0
            }
        }

        return {
            success: true,
            data: {
                commissions: commissions.map(c => ({
                    id: c.id,
                    amount: c.commission_amount,
                    status: c.status,
                    source: c.commission_source,
                    createdAt: c.created_at.toISOString(),
                    maturedAt: c.matured_at?.toISOString() || null,
                    holdDays: c.hold_days,
                    recurringMonth: c.recurring_month,
                    rate: c.commission_rate,
                })),
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
                statusTotals,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalCommissions error:', error)
        return { success: false, error: 'Failed to load commissions' }
    }
}

// =============================================
// PORTAL — REFERRALS (scoped to portal workspace)
// =============================================

/**
 * Get referred sellers who are enrolled in this workspace's missions
 */
export async function getPortalReferrals(
    workspaceSlug: string,
    page: number = 1,
    search?: string
) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true, referral_code: true },
        })

        if (!seller) return { success: false, error: 'Seller not found' }

        // Build search filter
        const searchFilter = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ],
        } : {}

        // Get Gen1 referred sellers via PortalReferral (workspace-scoped)
        const perPage = 20
        const skip = (page - 1) * perPage

        // Find portal referrals where this seller is the referrer
        const portalRefs = await prisma.portalReferral.findMany({
            where: { workspace_id: workspace.id, referrer_seller_id: seller.id },
            select: { referred_seller_id: true },
        })
        const referredIds = portalRefs.map(r => r.referred_seller_id)

        let referrals: { id: string; name: string | null; email: string; status: string; created_at: Date; _count: { Commissions: number } }[] = []
        let total = 0

        if (referredIds.length > 0) {
            const [r, t] = await Promise.all([
                prisma.seller.findMany({
                    where: {
                        id: { in: referredIds },
                        ...searchFilter,
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        created_at: true,
                        _count: {
                            select: {
                                Commissions: {
                                    where: {
                                        program_id: workspace.id,
                                        referral_generation: null,
                                        org_parent_commission_id: null,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: perPage,
                }),
                prisma.seller.count({
                    where: { id: { in: referredIds }, ...searchFilter },
                }),
            ])
            referrals = r as typeof referrals
            total = t
        }

        // Count sub-referrals for each referred seller (portal-scoped)
        const subRefCounts: Record<string, number> = {}
        if (referredIds.length > 0) {
            const subRefs = await prisma.portalReferral.groupBy({
                by: ['referrer_seller_id'],
                where: {
                    workspace_id: workspace.id,
                    referrer_seller_id: { in: referredIds },
                },
                _count: true,
            })
            for (const sr of subRefs) {
                subRefCounts[sr.referrer_seller_id] = sr._count
            }
        }

        // Get earnings per generation (portal referral commissions only)
        const earningsByGen = await prisma.commission.groupBy({
            by: ['referral_generation'],
            where: {
                seller_id: seller.id,
                referral_generation: { not: null },
                portal_referral: true,
                program_id: workspace.id,
            },
            _sum: { commission_amount: true },
            _count: { id: true },
        })

        const genStats = { gen1: { amount: 0, count: 0 }, gen2: { amount: 0, count: 0 }, gen3: { amount: 0, count: 0 } }
        for (const g of earningsByGen) {
            if (g.referral_generation === 1) { genStats.gen1 = { amount: g._sum.commission_amount || 0, count: g._count.id } }
            else if (g.referral_generation === 2) { genStats.gen2 = { amount: g._sum.commission_amount || 0, count: g._count.id } }
            else if (g.referral_generation === 3) { genStats.gen3 = { amount: g._sum.commission_amount || 0, count: g._count.id } }
        }

        // Get earnings from each referral (portal only)
        const referralIds = referrals.map(r => r.id)
        let earningsByReferral: Record<string, number> = {}
        if (referralIds.length > 0) {
            const refCommissions = await prisma.commission.findMany({
                where: {
                    seller_id: seller.id,
                    referral_generation: 1,
                    portal_referral: true,
                    program_id: workspace.id,
                },
                select: { commission_amount: true, referral_source_commission_id: true },
            })
            const sourceIds = refCommissions
                .map(c => c.referral_source_commission_id)
                .filter((id): id is string => id !== null)
            if (sourceIds.length > 0) {
                const sourceCommissions = await prisma.commission.findMany({
                    where: { id: { in: sourceIds } },
                    select: { id: true, seller_id: true },
                })
                const sourceToSeller: Record<string, string> = {}
                for (const sc of sourceCommissions) { sourceToSeller[sc.id] = sc.seller_id }
                for (const c of refCommissions) {
                    const srcSellerId = c.referral_source_commission_id ? sourceToSeller[c.referral_source_commission_id] : null
                    if (srcSellerId) { earningsByReferral[srcSellerId] = (earningsByReferral[srcSellerId] || 0) + c.commission_amount }
                }
            }
        }

        const totalEarnings = genStats.gen1.amount + genStats.gen2.amount + genStats.gen3.amount

        // Load workspace referral config for display
        const referralConfig = {
            enabled: workspace.portal_referral_enabled,
            gen1Rate: workspace.portal_referral_gen1_rate,
            gen2Rate: workspace.portal_referral_gen2_rate,
            gen3Rate: workspace.portal_referral_gen3_rate,
        }

        return {
            success: true,
            data: {
                referrals: referrals.map(r => ({
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    status: r.status,
                    joinedAt: r.created_at.toISOString(),
                    salesCount: r._count.Commissions,
                    totalEarnings: earningsByReferral[r.id] || 0,
                    subReferralCount: subRefCounts[r.id] || 0,
                })),
                stats: {
                    totalReferred: total,
                    totalEarnings,
                    genStats,
                },
                referralConfig,
                pagination: {
                    page,
                    totalPages: Math.ceil(total / perPage),
                    total,
                },
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalReferrals error:', error)
        return { success: false, error: 'Failed to load referrals' }
    }
}

// =============================================
// PORTAL — SUB-AFFILIATE TREE
// =============================================

/**
 * Get children of parentSellerId (scoped to portal workspace)
 */
export async function getPortalSubTree(
    workspaceSlug: string,
    parentSellerId: string,
    parentGeneration: number
) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const currentSeller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true },
        })

        if (!currentSeller) return { success: false, error: 'Seller not found' }

        // Security: validate parentSellerId is in the user's portal referral tree
        if (parentGeneration === 1) {
            // parentSellerId should be referred by currentSeller (in this workspace)
            const ref = await prisma.portalReferral.findUnique({
                where: {
                    workspace_id_referred_seller_id: {
                        workspace_id: workspace.id,
                        referred_seller_id: parentSellerId,
                    }
                },
            })
            if (!ref || ref.referrer_seller_id !== currentSeller.id) {
                return { success: false, error: 'Unauthorized' }
            }
        } else if (parentGeneration === 2) {
            // parentSellerId's referrer should be referred by currentSeller
            const ref = await prisma.portalReferral.findUnique({
                where: {
                    workspace_id_referred_seller_id: {
                        workspace_id: workspace.id,
                        referred_seller_id: parentSellerId,
                    }
                },
            })
            if (!ref) return { success: false, error: 'Unauthorized' }
            const parentRef = await prisma.portalReferral.findUnique({
                where: {
                    workspace_id_referred_seller_id: {
                        workspace_id: workspace.id,
                        referred_seller_id: ref.referrer_seller_id,
                    }
                },
            })
            if (!parentRef || parentRef.referrer_seller_id !== currentSeller.id) {
                return { success: false, error: 'Unauthorized' }
            }
        } else {
            return { success: false, error: 'Invalid generation' }
        }

        // Find children via PortalReferral (workspace-scoped)
        const childRefs = await prisma.portalReferral.findMany({
            where: { workspace_id: workspace.id, referrer_seller_id: parentSellerId },
            select: { referred_seller_id: true },
        })
        const childIds = childRefs.map(r => r.referred_seller_id)

        const children = childIds.length > 0 ? await prisma.seller.findMany({
            where: { id: { in: childIds } },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
                status: true,
                _count: {
                    select: {
                        Commissions: {
                            where: {
                                program_id: workspace.id,
                                referral_generation: null,
                                org_parent_commission_id: null,
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        }) : []

        // For Gen2 children, check sub-referrals via PortalReferral
        let subCountMap: Record<string, number> = {}
        if (parentGeneration === 1 && childIds.length > 0) {
            const subCounts = await prisma.portalReferral.groupBy({
                by: ['referrer_seller_id'],
                where: {
                    workspace_id: workspace.id,
                    referrer_seller_id: { in: childIds },
                },
                _count: true,
            })
            for (const sc of subCounts) {
                subCountMap[sc.referrer_seller_id] = sc._count
            }
        }

        // Calculate earnings from each child (portal referral commissions)
        const nextGen = parentGeneration + 1
        const refCommissions = await prisma.commission.findMany({
            where: {
                seller_id: currentSeller.id,
                referral_generation: nextGen,
                portal_referral: true,
                program_id: workspace.id,
            },
            select: { commission_amount: true, referral_source_commission_id: true },
        })

        const sourceIds = refCommissions
            .map(c => c.referral_source_commission_id)
            .filter((id): id is string => id !== null)
        const sourceCommissions = sourceIds.length > 0
            ? await prisma.commission.findMany({
                where: { id: { in: sourceIds } },
                select: { id: true, seller_id: true },
            })
            : []
        const sourceToSeller: Record<string, string> = {}
        for (const sc of sourceCommissions) { sourceToSeller[sc.id] = sc.seller_id }
        const earningsByChild: Record<string, number> = {}
        for (const c of refCommissions) {
            const srcSellerId = c.referral_source_commission_id ? sourceToSeller[c.referral_source_commission_id] : null
            if (srcSellerId) { earningsByChild[srcSellerId] = (earningsByChild[srcSellerId] || 0) + c.commission_amount }
        }

        return {
            success: true,
            data: children.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                joinedAt: c.created_at.toISOString(),
                status: c.status,
                salesCount: c._count.Commissions,
                earnings: earningsByChild[c.id] || 0,
                hasSubReferrals: parentGeneration === 1 ? (subCountMap[c.id] || 0) > 0 : false,
                subReferralCount: parentGeneration === 1 ? (subCountMap[c.id] || 0) : 0,
            })),
        }
    } catch (error) {
        console.error('[Portal] getPortalSubTree error:', error)
        return { success: false, error: 'Failed to load sub-tree' }
    }
}

// =============================================
// PORTAL — PAYOUTS
// =============================================

/**
 * Get seller payout data (balance, method, stripe status, recent payouts)
 */
export async function getPortalPayoutData(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: {
                id: true,
                payout_method: true,
                stripe_connect_id: true,
                paypal_email: true,
                iban: true,
            },
        })

        if (!seller) return { success: false, error: 'Seller not found' }

        const portalLinkIds = await getPortalLinkIds(user.id, workspace.id)

        const sellerBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: seller.id },
        })

        // Commission totals scoped to portal_exclusive links
        const commissionsByStatus = await prisma.commission.groupBy({
            by: ['status'],
            where: {
                seller_id: seller.id,
                link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                org_parent_commission_id: null,
                referral_generation: null,
            },
            _sum: { commission_amount: true },
        })

        let pendingAmount = 0, proceedAmount = 0, completeAmount = 0
        for (const group of commissionsByStatus) {
            if (group.status === 'PENDING') pendingAmount = group._sum.commission_amount || 0
            else if (group.status === 'PROCEED') proceedAmount = group._sum.commission_amount || 0
            else if (group.status === 'COMPLETE') completeAmount = group._sum.commission_amount || 0
        }

        return {
            success: true,
            data: {
                balance: {
                    available: proceedAmount,
                    pending: pendingAmount,
                    paid: completeAmount,
                    total: sellerBalance?.balance || 0,
                },
                payout: {
                    method: seller.payout_method || 'STRIPE_CONNECT',
                    stripeConnected: !!seller.stripe_connect_id,
                    paypalEmail: seller.paypal_email,
                    iban: seller.iban,
                },
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalPayoutData error:', error)
        return { success: false, error: 'Failed to load payout data' }
    }
}

// =============================================
// PORTAL — ASSETS
// =============================================

/**
 * Get aggregated MissionContent from all enrolled missions
 */
export async function getPortalAssets(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: { workspace_id: workspace.id, portal_exclusive: true },
            },
            include: {
                Mission: {
                    select: {
                        id: true,
                        title: true,
                        Contents: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                type: true,
                                url: true,
                                title: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        })

        const missionAssets = enrollments
            .filter(e => e.Mission.Contents.length > 0)
            .map(e => ({
                missionId: e.Mission.id,
                missionTitle: e.Mission.title,
                contents: e.Mission.Contents,
            }))

        return { success: true, data: { missions: missionAssets } }
    } catch (error) {
        console.error('[Portal] getPortalAssets error:', error)
        return { success: false, error: 'Failed to load assets' }
    }
}

// =============================================
// PORTAL — REPORTS (DB-based analytics)
// =============================================

/**
 * Get DB-based analytics for portal dashboard
 */
export async function getPortalReports(
    workspaceSlug: string,
    period: '7d' | '30d' | '90d' | 'all' = '30d'
) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await findPortalWorkspace(workspaceSlug)

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true },
        })

        if (!seller) return { success: false, error: 'Seller not found' }

        // Date filter
        const now = new Date()
        let dateFilter: Date | undefined
        if (period === '7d') dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        else if (period === '30d') dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        else if (period === '90d') dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

        const dateWhere = dateFilter ? { created_at: { gte: dateFilter } } : {}

        // Get enrolled links for clicks (portal_exclusive only)
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: { workspace_id: workspace.id, portal_exclusive: true },
            },
            select: { ShortLink: { select: { id: true, clicks: true } } },
        })

        const portalLinkIds = enrollments.map(e => e.ShortLink?.id).filter((id): id is string => !!id)
        const totalClicks = enrollments.reduce((sum, e) => sum + (e.ShortLink?.clicks || 0), 0)

        // Commission stats (scoped to portal_exclusive links)
        const [commissionAgg, leadCount] = await Promise.all([
            prisma.commission.aggregate({
                where: {
                    seller_id: seller.id,
                    link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                    org_parent_commission_id: null,
                    referral_generation: null,
                    ...dateWhere,
                },
                _count: { id: true },
                _sum: { commission_amount: true, net_amount: true },
            }),
            prisma.leadEvent.count({
                where: {
                    link_id: { in: enrollments.map(e => e.ShortLink?.id).filter((id): id is string => !!id) },
                    ...dateWhere,
                },
            }),
        ])

        // Daily aggregates for chart (last N days based on period)
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

        const dailyCommissions = await prisma.commission.groupBy({
            by: ['created_at'],
            where: {
                seller_id: seller.id,
                link_id: { in: portalLinkIds.length > 0 ? portalLinkIds : ['__none__'] },
                org_parent_commission_id: null,
                referral_generation: null,
                created_at: { gte: startDate },
            },
            _sum: { commission_amount: true },
            _count: { id: true },
        })

        // Aggregate by day
        const dailyMap: Record<string, { sales: number; commission: number }> = {}
        for (const d of dailyCommissions) {
            const dayKey = d.created_at.toISOString().split('T')[0]
            if (!dailyMap[dayKey]) dailyMap[dayKey] = { sales: 0, commission: 0 }
            dailyMap[dayKey].sales += d._count.id
            dailyMap[dayKey].commission += d._sum.commission_amount || 0
        }

        // Fill in all days
        const timeseries: { date: string; sales: number; commission: number }[] = []
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const key = d.toISOString().split('T')[0]
            timeseries.push({
                date: key,
                sales: dailyMap[key]?.sales || 0,
                commission: dailyMap[key]?.commission || 0,
            })
        }

        return {
            success: true,
            data: {
                totalClicks,
                totalSales: commissionAgg._count.id,
                totalLeads: leadCount,
                totalRevenue: commissionAgg._sum.net_amount || 0,
                totalCommission: commissionAgg._sum.commission_amount || 0,
                timeseries,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalReports error:', error)
        return { success: false, error: 'Failed to load reports' }
    }
}
