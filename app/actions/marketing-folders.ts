'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// MARKETING FOLDERS — Server Actions
// =============================================

interface CreateFolderInput {
    name: string
    color?: string
    parent_id?: string
}

export async function createMarketingFolder(input: CreateFolderInput) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    if (!input.name?.trim()) return { success: false, error: 'Name is required' }

    // Validate max 2 levels: if parent_id is set, parent must not have a parent
    if (input.parent_id) {
        const parent = await prisma.marketingFolder.findUnique({
            where: { id: input.parent_id },
            select: { parent_id: true, workspace_id: true },
        })
        if (!parent || parent.workspace_id !== workspace.workspaceId) {
            return { success: false, error: 'Parent folder not found' }
        }
        if (parent.parent_id) {
            return { success: false, error: 'Maximum folder depth is 2 levels' }
        }
    }

    // Auto-position: get max position among siblings
    const maxPos = await prisma.marketingFolder.aggregate({
        where: {
            workspace_id: workspace.workspaceId,
            parent_id: input.parent_id || null,
        },
        _max: { position: true },
    })

    try {
        const folder = await prisma.marketingFolder.create({
            data: {
                name: input.name.trim(),
                color: input.color || null,
                position: (maxPos._max.position ?? -1) + 1,
                workspace_id: workspace.workspaceId,
                parent_id: input.parent_id || null,
            },
        })

        revalidatePath('/dashboard/marketing')
        return { success: true, data: folder }
    } catch {
        return { success: false, error: 'Folder name already exists in this location' }
    }
}

export async function updateMarketingFolder(id: string, input: { name?: string; color?: string }) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    const folder = await prisma.marketingFolder.findUnique({ where: { id } })
    if (!folder || folder.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Folder not found' }
    }

    const data: Record<string, unknown> = {}
    if (input.name !== undefined) data.name = input.name.trim()
    if (input.color !== undefined) data.color = input.color || null

    try {
        const updated = await prisma.marketingFolder.update({ where: { id }, data })
        revalidatePath('/dashboard/marketing')
        return { success: true, data: updated }
    } catch {
        return { success: false, error: 'Folder name already exists' }
    }
}

export async function deleteMarketingFolder(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    const folder = await prisma.marketingFolder.findUnique({ where: { id } })
    if (!folder || folder.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Folder not found' }
    }

    // Unlink all links in this folder and its children
    await prisma.shortLink.updateMany({
        where: { folder_id: id },
        data: { folder_id: null },
    })

    // Unlink links in child folders
    const children = await prisma.marketingFolder.findMany({
        where: { parent_id: id },
        select: { id: true },
    })
    if (children.length > 0) {
        await prisma.shortLink.updateMany({
            where: { folder_id: { in: children.map(c => c.id) } },
            data: { folder_id: null },
        })
    }

    // Delete folder (cascade deletes children via onDelete: Cascade)
    await prisma.marketingFolder.delete({ where: { id } })

    revalidatePath('/dashboard/marketing')
    return { success: true }
}

export async function getMarketingFolderTree() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const folders = await prisma.marketingFolder.findMany({
        where: { workspace_id: workspace.workspaceId },
        include: {
            _count: { select: { links: true } },
            Children: {
                include: { _count: { select: { links: true } } },
                orderBy: { position: 'asc' },
            },
        },
        orderBy: { position: 'asc' },
    })

    // Return only root folders with nested children
    const roots = folders
        .filter(f => !f.parent_id)
        .map(f => ({
            id: f.id,
            name: f.name,
            color: f.color,
            parent_id: f.parent_id,
            position: f.position,
            linkCount: f._count.links,
            children: f.Children.map(c => ({
                id: c.id,
                name: c.name,
                color: c.color,
                parent_id: c.parent_id,
                position: c.position,
                linkCount: c._count.links,
                children: [],
            })),
        }))

    return { success: true, data: roots }
}
