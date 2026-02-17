'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { joinMission } from '@/app/actions/marketplace'

// =============================================
// PORTAL — PUBLIC DATA (no auth required)
// =============================================

/**
 * Fetch workspace + profile + active PUBLIC/PRIVATE missions for portal landing
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
                organization_id: null, // Exclude org-exclusive missions
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
 * Mini-dashboard: seller's enrollments + stats for a specific workspace
 */
export async function getPortalDashboard(workspaceSlug: string) {
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

        // Get seller's enrollments for this workspace's missions
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.id,
                status: 'APPROVED',
                Mission: {
                    workspace_id: workspace.id,
                },
            },
            include: {
                Mission: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        sale_enabled: true,
                        sale_reward_amount: true,
                        sale_reward_structure: true,
                        lead_enabled: true,
                        lead_reward_amount: true,
                        recurring_enabled: true,
                        recurring_reward_amount: true,
                        recurring_reward_structure: true,
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
                ShortLink: {
                    select: {
                        id: true,
                        slug: true,
                        clicks: true,
                        original_url: true,
                    },
                },
            },
        })

        // Get commissions for this seller in this workspace
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
        })

        let commissionStats = { pendingCount: 0, pendingAmount: 0, earnedTotal: 0 }

        if (seller) {
            const commissions = await prisma.commission.groupBy({
                by: ['status'],
                where: {
                    seller_id: seller.id,
                    program_id: workspace.id,
                },
                _sum: { commission_amount: true },
                _count: { id: true },
            })

            for (const group of commissions) {
                if (group.status === 'PENDING') {
                    commissionStats.pendingCount = group._count.id
                    commissionStats.pendingAmount = group._sum.commission_amount || 0
                } else if (group.status === 'PROCEED' || group.status === 'COMPLETE') {
                    commissionStats.earnedTotal += (group._sum.commission_amount || 0)
                }
            }
        }

        // Build custom domain base URL
        const verifiedDomain = await prisma.domain.findFirst({
            where: { workspace_id: workspace.id, verified: true },
        })

        const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
        const baseUrl = verifiedDomain ? `https://${verifiedDomain.name}` : defaultUrl

        return {
            success: true,
            data: {
                enrollments: enrollments.map(e => ({
                    id: e.id,
                    missionId: e.Mission.id,
                    missionTitle: e.Mission.title,
                    missionDescription: e.Mission.description,
                    linkSlug: e.ShortLink?.slug || null,
                    linkUrl: e.ShortLink ? `${baseUrl}/s/${e.ShortLink.slug}` : null,
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
                })),
                commissionStats,
            },
        }
    } catch (error) {
        console.error('[Portal] getPortalDashboard error:', error)
        return { success: false, error: 'Failed to load dashboard' }
    }
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
