'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import {
    validateApiKey as validateKey,
    generatePublicKey,
    generateSecretKey,
    getWorkspaceApiKeys
} from '@/lib/api-keys'
import {
    getActiveWorkspaceForUser,
    setActiveWorkspaceId
} from '@/lib/workspace-context'

// =============================================
// API KEY ACTIONS (Workspace-scoped)
// =============================================

/**
 * Get or create API key for the current user's active workspace
 * For existing users without a workspace, creates a default one
 */
export async function getOrCreateApiKey(): Promise<{
    success: boolean
    publicKey?: string
    secretKey?: string  // Only returned if new key was created!
    workspaceName?: string
    isNewWorkspace?: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Get workspace for user
        const activeWorkspace = await getActiveWorkspaceForUser()

        if (!activeWorkspace) {
            return { success: false, error: 'Please create a workspace via /onboarding' }
        }

        // Get API keys for this workspace
        const apiKeys = await getWorkspaceApiKeys(activeWorkspace.workspaceId)

        if (apiKeys.length === 0) {
            // Create a new API key pair
            const publicKey = generatePublicKey()
            const { key: newSecretKey, hash: secretHash } = generateSecretKey()

            await prisma.apiKey.create({
                data: {
                    workspace_id: activeWorkspace.workspaceId,
                    name: 'Default Key',
                    public_key: publicKey,
                    secret_hash: secretHash,
                }
            })

            console.log('[ApiKey] ✅ Created new key for workspace:', activeWorkspace.workspaceId)

            return {
                success: true,
                publicKey,
                secretKey: newSecretKey,
                workspaceName: activeWorkspace.workspaceName,
            }
        }

        // Return existing key
        return {
            success: true,
            publicKey: apiKeys[0].public_key,
            workspaceName: activeWorkspace.workspaceName,
        }

    } catch (error) {
        console.error('[ApiKey] ❌ Error:', error)
        return { success: false, error: 'Failed to get API key' }
    }
}

/**
 * Regenerate API key (creates new secret, invalidates old)
 * Returns new secret key ONCE - cannot be recovered
 */
export async function regenerateApiKey(): Promise<{
    success: boolean
    publicKey?: string
    secretKey?: string  // New secret, shown once!
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const activeWorkspace = await getActiveWorkspaceForUser()
        if (!activeWorkspace) {
            return { success: false, error: 'No active workspace' }
        }

        // Get current API key
        const existingKey = await prisma.apiKey.findFirst({
            where: { workspace_id: activeWorkspace.workspaceId }
        })

        // Generate new keys
        const newPublicKey = generatePublicKey()
        const { key: newSecretKey, hash: secretHash } = generateSecretKey()

        if (existingKey) {
            // Update existing key
            await prisma.apiKey.update({
                where: { id: existingKey.id },
                data: {
                    public_key: newPublicKey,
                    secret_hash: secretHash,
                    created_at: new Date(),
                }
            })
        } else {
            // Create new if none exists
            await prisma.apiKey.create({
                data: {
                    workspace_id: activeWorkspace.workspaceId,
                    name: 'Default Key',
                    public_key: newPublicKey,
                    secret_hash: secretHash,
                }
            })
        }

        console.log('[ApiKey] 🔄 Regenerated key for workspace:', activeWorkspace.workspaceId)

        return {
            success: true,
            publicKey: newPublicKey,
            secretKey: newSecretKey,
        }

    } catch (error) {
        console.error('[ApiKey] ❌ Error:', error)
        return { success: false, error: 'Failed to regenerate API key' }
    }
}

// =============================================
// WORKSPACE ACTIONS
// =============================================

/**
 * Switch the active workspace
 */
export async function switchWorkspace(workspaceId: string): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Verify user has access to this workspace
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
        return { success: true }

    } catch (error) {
        console.error('[Workspace] ❌ Switch error:', error)
        return { success: false, error: 'Failed to switch workspace' }
    }
}

// =============================================
// API KEY VALIDATION (for API routes)
// =============================================

/**
 * Validate a public key and return the workspace_id
 * Used by the Track API to authenticate requests
 */
export async function validateApiKey(publicKey: string): Promise<{
    valid: boolean
    workspaceId?: string
}> {
    return validateKey(publicKey)
}

