'use server'

import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Get portal settings for the active workspace
 */
export async function getPortalSettings() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: ws.workspaceId },
            select: {
                slug: true,
                portal_enabled: true,
                portal_welcome_text: true,
                portal_primary_color: true,
                portal_headline: true,
                Domain: {
                    where: { verified: true },
                    take: 1,
                    select: { name: true },
                },
                Mission: {
                    where: {
                        status: 'ACTIVE',
                        visibility: { in: ['PUBLIC', 'PRIVATE'] },
                        organization_id: null,
                    },
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        portal_visible: true,
                    },
                },
            },
        })

        if (!workspace) return { success: false, error: 'Workspace not found' }

        return {
            success: true,
            data: {
                slug: workspace.slug,
                portal_enabled: workspace.portal_enabled,
                portal_welcome_text: workspace.portal_welcome_text,
                portal_primary_color: workspace.portal_primary_color,
                portal_headline: workspace.portal_headline,
                customDomain: workspace.Domain[0]?.name || null,
                missions: workspace.Mission,
            },
        }
    } catch (error) {
        console.error('[Portal Settings] getPortalSettings error:', error)
        return { success: false, error: 'Failed to load settings' }
    }
}

/**
 * Toggle portal on/off
 */
export async function togglePortal(enabled: boolean) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_enabled: enabled },
        })

        // When enabling portal, auto-set portal_visible=true on eligible missions
        if (enabled) {
            await prisma.mission.updateMany({
                where: {
                    workspace_id: ws.workspaceId,
                    status: 'ACTIVE',
                    visibility: { in: ['PUBLIC', 'PRIVATE'] },
                    organization_id: null,
                    portal_visible: false,
                },
                data: { portal_visible: true },
            })
        }

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] togglePortal error:', error)
        return { success: false, error: 'Failed to update portal' }
    }
}

/**
 * Update portal welcome text
 */
export async function updatePortalWelcomeText(text: string) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_welcome_text: text || null },
        })

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] updatePortalWelcomeText error:', error)
        return { success: false, error: 'Failed to update welcome text' }
    }
}

/**
 * Update portal headline (short punchy title on landing)
 */
export async function updatePortalHeadline(text: string) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    if (text.length > 80) {
        return { success: false, error: 'Headline must be 80 characters or less' }
    }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_headline: text || null },
        })

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] updatePortalHeadline error:', error)
        return { success: false, error: 'Failed to update headline' }
    }
}

/**
 * Update portal primary color (hex)
 */
export async function updatePortalPrimaryColor(color: string) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    // Validate hex color
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return { success: false, error: 'Invalid color format (must be #RRGGBB)' }
    }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_primary_color: color },
        })

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] updatePortalPrimaryColor error:', error)
        return { success: false, error: 'Failed to update color' }
    }
}

/**
 * Toggle mission visibility on portal
 */
export async function toggleMissionPortalVisibility(missionId: string, visible: boolean) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        // Verify mission belongs to this workspace
        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                workspace_id: ws.workspaceId,
            },
        })

        if (!mission) return { success: false, error: 'Mission not found' }

        await prisma.mission.update({
            where: { id: missionId },
            data: { portal_visible: visible },
        })

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] toggleMissionPortalVisibility error:', error)
        return { success: false, error: 'Failed to update mission visibility' }
    }
}

/**
 * Get portal overview stats: total affiliates, commissions, revenue
 */
export async function getPortalOverview() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        // Get portal-visible mission IDs
        const portalMissions = await prisma.mission.findMany({
            where: {
                workspace_id: ws.workspaceId,
                portal_visible: true,
            },
            select: { id: true },
        })

        const missionIds = portalMissions.map(m => m.id)

        if (missionIds.length === 0) {
            return {
                success: true,
                data: { totalAffiliates: 0, totalCommissions: 0, totalRevenue: 0 },
            }
        }

        const [enrollmentCount, commissionAgg] = await Promise.all([
            prisma.missionEnrollment.count({
                where: {
                    mission_id: { in: missionIds },
                    status: 'APPROVED',
                },
            }),
            prisma.commission.aggregate({
                where: {
                    program_id: ws.workspaceId,
                    org_parent_commission_id: null,
                    referral_generation: null,
                },
                _count: { id: true },
                _sum: { commission_amount: true },
            }),
        ])

        return {
            success: true,
            data: {
                totalAffiliates: enrollmentCount,
                totalCommissions: commissionAgg._count.id,
                totalRevenue: commissionAgg._sum.commission_amount || 0,
            },
        }
    } catch (error) {
        console.error('[Portal Settings] getPortalOverview error:', error)
        return { success: false, error: 'Failed to load overview' }
    }
}
