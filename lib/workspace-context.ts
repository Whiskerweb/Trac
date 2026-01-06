/**
 * Workspace Context Management
 * 
 * Handles active workspace selection via cookies.
 * Each user can belong to multiple workspaces but has one "active" at a time.
 */

import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

const WORKSPACE_COOKIE = 'trac_active_ws'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// =============================================
// ACTIVE WORKSPACE MANAGEMENT
// =============================================

/**
 * Get the active workspace ID from cookie
 */
export async function getActiveWorkspaceId(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(WORKSPACE_COOKIE)?.value || null
}

/**
 * Set the active workspace ID in cookie
 */
export async function setActiveWorkspaceId(workspaceId: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
    })
}

/**
 * Clear the active workspace cookie
 */
export async function clearActiveWorkspace(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(WORKSPACE_COOKIE)
}

// =============================================
// WORKSPACE ACCESS VALIDATION
// =============================================

/**
 * Get active workspace for current user, or create default if none exists
 * This is the main entry point for workspace context in pages/actions
 */
export async function getActiveWorkspaceForUser(): Promise<{
    workspaceId: string
    workspaceName: string
    role: 'OWNER' | 'MEMBER'
} | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Check if user has an active workspace set
    let activeWorkspaceId = await getActiveWorkspaceId()

    if (activeWorkspaceId) {
        // Validate that user still has access to this workspace
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspace_id_user_id: {
                    workspace_id: activeWorkspaceId,
                    user_id: user.id
                }
            },
            include: {
                Workspace: true
            }
        })

        if (membership) {
            return {
                workspaceId: membership.workspace_id,
                workspaceName: membership.workspace.name,
                role: membership.role
            }
        }

        // User lost access, clear cookie
        await clearActiveWorkspace()
    }

    // No active workspace or lost access - try to find user's first workspace
    const firstMembership = await prisma.workspaceMember.findFirst({
        where: { user_id: user.id },
        include: { workspace: true },
        orderBy: { created_at: 'asc' }
    })

    if (firstMembership) {
        // Set this as active
        await setActiveWorkspaceId(firstMembership.workspace_id)
        return {
            workspaceId: firstMembership.workspace_id,
            workspaceName: firstMembership.workspace.name,
            role: firstMembership.role
        }
    }

    // User has no workspaces - they need to create one
    return null
}

/**
 * Get all workspaces the current user has access to
 */
export async function getWorkspacesForUser(): Promise<Array<{
    id: string
    name: string
    slug: string
    role: 'OWNER' | 'MEMBER'
    isActive: boolean
}>> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return []
    }

    const activeWorkspaceId = await getActiveWorkspaceId()

    const memberships = await prisma.workspaceMember.findMany({
        where: { user_id: user.id },
        include: { workspace: true },
        orderBy: { created_at: 'asc' }
    })

    return memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        isActive: m.workspace.id === activeWorkspaceId
    }))
}

// =============================================
// WORKSPACE CREATION
// =============================================

/**
 * Create a new workspace and set user as owner
 * Also creates initial API key pair
 */
export async function createWorkspace(
    name: string,
    slug: string
): Promise<{
    success: boolean
    workspace?: { id: string; name: string; slug: string }
    secretKey?: string  // Only returned once!
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

        // Create workspace with owner membership in a transaction
        const { generatePublicKey, generateSecretKey } = await import('@/lib/api-keys')
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

        return {
            success: true,
            workspace: {
                id: workspace.id,
                name: workspace.name,
                slug: workspace.slug
            },
            secretKey // Return once for user to save!
        }
    } catch (error) {
        console.error('[Workspace] ❌ Creation error:', error)
        return { success: false, error: 'Failed to create workspace' }
    }
}

/**
 * Get or create a default workspace for existing users (migration helper)
 */
export async function getOrCreateDefaultWorkspace(): Promise<{
    workspaceId: string
    isNew: boolean
    secretKey?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error('Not authenticated')
    }

    // Check if user already has a workspace
    const existing = await prisma.workspaceMember.findFirst({
        where: { user_id: user.id },
        include: { workspace: true }
    })

    if (existing) {
        await setActiveWorkspaceId(existing.workspace_id)
        return { workspaceId: existing.workspace_id, isNew: false }
    }

    // Create default workspace
    const name = user.email?.split('@')[0] || 'My Workspace'
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')

    // Ensure unique slug
    let slug = baseSlug
    let counter = 0
    while (await prisma.workspace.findUnique({ where: { slug } })) {
        counter++
        slug = `${baseSlug}-${counter}`
    }

    const result = await createWorkspace(name, slug)

    if (!result.success || !result.workspace) {
        throw new Error(result.error || 'Failed to create default workspace')
    }

    return {
        workspaceId: result.workspace.id,
        isNew: true,
        secretKey: result.secretKey
    }
}
