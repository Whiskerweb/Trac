'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import {
    getActiveWorkspaceForUser,
    getOrCreateDefaultWorkspace,
    getWorkspacesForUser,
    setActiveWorkspaceId
} from '@/lib/workspace-context'
import { generatePublicKey, generateSecretKey } from '@/lib/api-keys'
import { nanoid } from 'nanoid'

// =============================================
// WORKSPACE SERVER ACTIONS
// =============================================

/**
 * Create a new workspace
 * This is the server action version for use in client components
 */
export async function createWorkspaceAction(
    name: string,
    slug: string
): Promise<{
    success: boolean
    workspace?: { id: string; name: string; slug: string }
    secretKey?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
        return { success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
    }

    try {
        // Check if slug is taken
        const existing = await prisma.workspace.findUnique({
            where: { slug }
        })

        if (existing) {
            return { success: false, error: 'This slug is already taken' }
        }

        // Generate API keys
        const publicKey = generatePublicKey()
        const { key: secretKey, hash: secretHash } = generateSecretKey()

        const workspace = await prisma.$transaction(async (tx) => {
            // Create workspace
            const ws = await tx.workspace.create({
                data: {
                    name,
                    slug,
                    owner_id: user.id,
                }
            })

            // Add user as owner
            await tx.workspaceMember.create({
                data: {
                    workspace_id: ws.id,
                    user_id: user.id,
                    role: 'OWNER'
                }
            })

            // Create initial API key
            await tx.apiKey.create({
                data: {
                    workspace_id: ws.id,
                    name: 'Default Key',
                    public_key: publicKey,
                    secret_hash: secretHash,
                }
            })

            return ws
        })

        // Set as active workspace
        await setActiveWorkspaceId(workspace.id)

        console.log('[Workspace] ✅ Created:', workspace.name, 'for user:', user.id)

        revalidatePath('/dashboard')

        return {
            success: true,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug
            },
            secretKey
        }
    } catch (error) {
        console.error('[Workspace] ❌ Creation error:', error)
        return { success: false, error: 'Failed to create workspace' }
    }
}

/**
 * Switch active workspace
 */
export async function switchWorkspaceAction(workspaceId: string): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Verify user has access
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspace_id_user_id: {
                    workspace_id: workspaceId,
                    user_id: user.id
                }
            }
        })

        if (!membership) {
            return { success: false, error: 'Access denied' }
        }

        await setActiveWorkspaceId(workspaceId)
        revalidatePath('/dashboard')

        return { success: true }
    } catch (error) {
        console.error('[Workspace] ❌ Switch error:', error)
        return { success: false, error: 'Failed to switch workspace' }
    }
}

/**
 * Get active workspace info for the current user
 * If no workspace exists, creates a default one
 */
export async function getActiveWorkspaceAction(): Promise<{
    success: boolean
    workspace?: {
        id: string
        name: string
        slug: string
        role: 'OWNER' | 'MEMBER'
    }
    secretKey?: string
    isNew?: boolean
    error?: string
}> {
    try {
        let workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            // Create default workspace for new users
            const result = await getOrCreateDefaultWorkspace()
            workspace = await getActiveWorkspaceForUser()

            if (!workspace) {
                return { success: false, error: 'Failed to create workspace' }
            }

            // Fetch slug
            const ws = await prisma.workspace.findUnique({
                where: { id: workspace.workspaceId }
            })

            return {
                success: true,
                workspace: {
                    id: workspace.workspaceId,
                    name: workspace.workspaceName,
                    slug: ws?.slug || '',
                    role: workspace.role
                },
                secretKey: result.secretKey,
                isNew: result.isNew
            }
        }

        // Fetch slug for existing workspace
        const ws = await prisma.workspace.findUnique({
            where: { id: workspace.workspaceId }
        })

        return {
            success: true,
            workspace: {
                id: workspace.workspaceId,
                name: workspace.workspaceName,
                slug: ws?.slug || '',
                role: workspace.role
            }
        }
    } catch (error) {
        console.error('[Workspace] ❌ getActive error:', error)
        return { success: false, error: 'Failed to get workspace' }
    }
}

/**
 * Get all workspaces for the current user
 */
export async function getAllWorkspacesAction(): Promise<{
    success: boolean
    workspaces?: Array<{
        id: string
        name: string
        slug: string
        role: 'OWNER' | 'MEMBER'
        isActive: boolean
    }>
    error?: string
}> {
    try {
        const workspaces = await getWorkspacesForUser()
        return { success: true, workspaces }
    } catch (error) {
        console.error('[Workspace] ❌ getAll error:', error)
        return { success: false, error: 'Failed to get workspaces' }
    }
}
