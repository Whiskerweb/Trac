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
