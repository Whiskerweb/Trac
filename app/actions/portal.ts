'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { joinMission } from '@/app/actions/marketplace'

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

async function fetchLinkStats(linkId: string): Promise<{ clicks: number; leads: number; sales: number; revenue: number }> {
    const stats = { clicks: 0, leads: 0, sales: 0, revenue: 0 }
    if (!linkId || !TINYBIRD_TOKEN || !isValidUUID(linkId)) return stats

    try {
        const clicksQuery = `SELECT count() as clicks FROM clicks WHERE link_id = '${linkId}'`
        const clicksRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (clicksRes.ok) {
            const text = await clicksRes.text()
            stats.clicks = parseInt(text.trim()) || 0
        }

        const leadsQuery = `SELECT count() as leads FROM leads WHERE link_id = '${linkId}'`
        const leadsRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (leadsRes.ok) {
            const text = await leadsRes.text()
            stats.leads = parseInt(text.trim()) || 0
        }

        const salesQuery = `SELECT count() as sales, sum(amount) as revenue FROM sales WHERE link_id = '${linkId}'`
        const salesRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (salesRes.ok) {
            const text = await salesRes.text()
            const [sales, revenue] = text.trim().split('\t')
            stats.sales = parseInt(sales) || 0
            stats.revenue = parseInt(revenue) || 0
        }
    } catch (error) {
        console.error('[Portal] fetchLinkStats error:', error)
    }

    return stats
}

// =============================================
// PORTAL — PUBLIC DATA (no auth required)
// =============================================

/**
 * Fetch workspace + profile + active PUBLIC/PRIVATE portal_visible missions for portal landing
 */
export async function getPortalData(workspaceSlug: string) {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
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
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        })

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
    return joinMission(missionId)
}

/**
 * Check if current user has any enrollments in this workspace's missions
 */
export async function getPortalUserStatus(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { authenticated: false, enrolled: false, enrolledMissionIds: [] as string[] }
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        })

        if (!workspace) {
            return { authenticated: true, enrolled: false, enrolledMissionIds: [] as string[] }
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
            enrolledMissionIds: enrollments.map(e => e.mission_id),
            userName: user.user_metadata?.full_name || user.email || '',
        }
    } catch {
        return { authenticated: true, enrolled: false, enrolledMissionIds: [] as string[] }
    }
}

// =============================================
// PORTAL — FULL DASHBOARD (multi-mission)
// =============================================

/**
 * Full multi-mission dashboard: auto-enroll in all PUBLIC portal_visible missions,
 * workspace branding, enrollments, available missions, balance
 */
export async function getPortalFullDashboard(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
            include: {
                Profile: true,
                Domain: { where: { verified: true }, take: 1 },
            },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        // Get all existing enrollments for this workspace
        let enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: { workspace_id: workspace.id },
            },
            include: {
                Mission: {
                    select: {
                        id: true, title: true, description: true,
                        sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                        lead_enabled: true, lead_reward_amount: true,
                        recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                        recurring_duration_months: true,
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

        // Auto-enroll in ALL portal_visible PUBLIC missions if no enrollments yet
        if (enrollments.length === 0) {
            const publicMissions = await prisma.mission.findMany({
                where: {
                    workspace_id: workspace.id,
                    status: 'ACTIVE',
                    visibility: 'PUBLIC',
                    organization_id: null,
                    portal_visible: true,
                },
                orderBy: { created_at: 'asc' },
                select: { id: true },
            })

            for (const mission of publicMissions) {
                await joinMission(mission.id)
            }

            // Re-fetch enrollments
            if (publicMissions.length > 0) {
                enrollments = await prisma.missionEnrollment.findMany({
                    where: {
                        user_id: user.id,
                        status: 'APPROVED',
                        Mission: { workspace_id: workspace.id },
                    },
                    include: {
                        Mission: {
                            select: {
                                id: true, title: true, description: true,
                                sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                                lead_enabled: true, lead_reward_amount: true,
                                recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                                recurring_duration_months: true,
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

        // Get available missions (portal_visible but not enrolled)
        const enrolledMissionIds = enrollments.map(e => e.Mission.id)
        const availableMissions = await prisma.mission.findMany({
            where: {
                workspace_id: workspace.id,
                status: 'ACTIVE',
                visibility: { in: ['PUBLIC', 'PRIVATE'] },
                organization_id: null,
                portal_visible: true,
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
            },
        })

        // Get commission balance breakdown
        const commissions = await prisma.commission.groupBy({
            by: ['status'],
            where: {
                seller_id: seller.id,
                program_id: workspace.id,
                org_parent_commission_id: null,
                referral_generation: null,
            },
            _sum: { commission_amount: true },
            _count: { id: true },
        })

        let pendingAmount = 0, proceedAmount = 0, completeAmount = 0
        for (const group of commissions) {
            if (group.status === 'PENDING') pendingAmount = group._sum.commission_amount || 0
            else if (group.status === 'PROCEED') proceedAmount = group._sum.commission_amount || 0
            else if (group.status === 'COMPLETE') completeAmount = group._sum.commission_amount || 0
        }

        // Build link URL
        const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
        const baseUrl = workspace.Domain[0] ? `https://${workspace.Domain[0].name}` : defaultUrl

        return {
            success: true,
            data: {
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    slug: workspace.slug,
                    portal_primary_color: workspace.portal_primary_color,
                    portal_headline: workspace.portal_headline,
                },
                profile: workspace.Profile ? {
                    logo_url: workspace.Profile.logo_url,
                    description: workspace.Profile.description,
                } : null,
                enrollments: enrollments.map(e => ({
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
                    company_name: e.Mission.company_name,
                    logo_url: e.Mission.logo_url,
                })),
                availableMissions,
                balance: {
                    pending: pendingAmount,
                    available: proceedAmount,
                    paid: completeAmount,
                },
                sellerName: user.user_metadata?.full_name || user.email || '',
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalFullDashboard error:', error)
        return { success: false, error: 'Failed to load dashboard' }
    }
}

/**
 * Get stats for a specific mission (portal mission detail)
 */
export async function getPortalMissionStats(workspaceSlug: string, missionId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        // Get enrollment + link for this mission
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: {
                user_id: user.id,
                mission_id: missionId,
                status: 'APPROVED',
            },
            include: {
                Mission: {
                    select: {
                        id: true, title: true, description: true,
                        sale_enabled: true, sale_reward_amount: true, sale_reward_structure: true,
                        lead_enabled: true, lead_reward_amount: true,
                        recurring_enabled: true, recurring_reward_amount: true, recurring_reward_structure: true,
                        recurring_duration_months: true,
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

        if (!enrollment) {
            return { success: false, error: 'Not enrolled in this mission' }
        }

        // Fetch link stats from Tinybird
        const linkId = enrollment.ShortLink?.id || ''
        const stats = await fetchLinkStats(linkId)

        // Build link URL
        const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
        const domain = await prisma.domain.findFirst({
            where: { workspace_id: workspace.id, verified: true },
        })
        const baseUrl = domain ? `https://${domain.name}` : defaultUrl
        const linkUrl = enrollment.ShortLink ? `${baseUrl}/s/${enrollment.ShortLink.slug}` : null

        return {
            success: true,
            data: {
                mission: enrollment.Mission,
                linkUrl,
                linkSlug: enrollment.ShortLink?.slug || null,
                stats,
                contents: enrollment.Mission.Contents,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalMissionStats error:', error)
        return { success: false, error: 'Failed to load mission stats' }
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
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        const perPage = 20
        const skip = (page - 1) * perPage

        const where: Record<string, unknown> = {
            seller_id: seller.id,
            program_id: workspace.id,
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
                program_id: workspace.id,
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

/**
 * Get payout info for portal dashboard
 */
export async function getPortalPayoutInfo(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        const sellerBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: seller.id },
        })

        // Get recent completed commissions for this workspace
        const recentPayouts = await prisma.commission.findMany({
            where: {
                seller_id: seller.id,
                program_id: workspace.id,
                status: 'COMPLETE',
                org_parent_commission_id: null,
                referral_generation: null,
            },
            orderBy: { matured_at: 'desc' },
            take: 10,
            select: {
                id: true,
                commission_amount: true,
                commission_source: true,
                matured_at: true,
                recurring_month: true,
            },
        })

        const balance = sellerBalance

        return {
            success: true,
            data: {
                balance: balance ? {
                    balance: balance.balance,
                    pending: balance.pending,
                    due: balance.due,
                    paid_total: balance.paid_total,
                } : { balance: 0, pending: 0, due: 0, paid_total: 0 },
                payoutMethod: seller.payout_method || 'STRIPE_CONNECT',
                stripeConnected: !!seller.stripe_connect_id,
                recentPayouts: recentPayouts.map(p => ({
                    id: p.id,
                    amount: p.commission_amount,
                    source: p.commission_source,
                    paidAt: p.matured_at?.toISOString() || null,
                    recurringMonth: p.recurring_month,
                })),
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalPayoutInfo error:', error)
        return { success: false, error: 'Failed to load payout info' }
    }
}

/**
 * Get assets/resources for portal dashboard
 */
export async function getPortalAssets(workspaceSlug: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
            include: {
                Profile: {
                    select: {
                        pitch_deck_url: true,
                        doc_url: true,
                    },
                },
            },
        })

        if (!workspace || !workspace.portal_enabled) {
            return { success: false, error: 'Portal not available' }
        }

        // Get mission contents from enrolled missions
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: { workspace_id: workspace.id },
            },
            include: {
                Mission: {
                    select: {
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

        const contents = enrollments.flatMap(e => e.Mission.Contents)

        return {
            success: true,
            data: {
                contents,
                pitchDeckUrl: workspace.Profile?.pitch_deck_url || null,
                docUrl: workspace.Profile?.doc_url || null,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalAssets error:', error)
        return { success: false, error: 'Failed to load assets' }
    }
}
