'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// WEBHOOK ENDPOINT MANAGEMENT
// =============================================

/**
 * Create or get existing webhook endpoint for workspace
 * Returns the endpoint ID for building the webhook URL
 */
export async function getOrCreateWebhookEndpoint(): Promise<{
    success: boolean
    endpointId?: string
    webhookUrl?: string
    secret?: string | null
    error?: string
}> {
    console.log('[Webhook] Starting getOrCreateWebhookEndpoint...')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        console.log('[Webhook] ❌ Auth failed:', authError?.message || 'No user')
        return { success: false, error: 'Not authenticated' }
    }

    console.log('[Webhook] ✅ User authenticated:', user.email)

    try {
        // Get the active workspace for this user
        console.log('[Webhook] Getting active workspace...')
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            console.log('[Webhook] ❌ No workspace found for user')
            return { success: false, error: 'No active workspace. Please complete onboarding.' }
        }

        const workspaceId = workspace.workspaceId
        console.log('[Webhook] ✅ Workspace found:', workspaceId, workspace.workspaceName)

        // Check if endpoint already exists for this workspace
        console.log('[Webhook] Checking for existing endpoint...')
        let endpoint = await prisma.webhookEndpoint.findFirst({
            where: { workspace_id: workspaceId }
        })

        // Create if not exists
        if (!endpoint) {
            const endpointId = `whk_${nanoid(16)}`
            console.log('[Webhook] Creating new endpoint:', endpointId)

            endpoint = await prisma.webhookEndpoint.create({
                data: {
                    id: endpointId,
                    workspace_id: workspaceId,
                    description: 'Stripe Webhook',
                }
            })

            console.log('[Webhook] ✅ Created endpoint:', endpointId, 'for workspace:', workspaceId)
        } else {
            console.log('[Webhook] ℹ️ Existing endpoint found:', endpoint.id)
        }

        // Build webhook URL (will be replaced with actual domain in production)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const webhookUrl = `${baseUrl}/api/webhooks/${endpoint.id}`

        console.log('[Webhook] ✅ Returning URL:', webhookUrl)

        return {
            success: true,
            endpointId: endpoint.id,
            webhookUrl,
            secret: endpoint.secret,
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('[Webhook] ❌ Error:', errorMessage, error)
        return { success: false, error: `Webhook creation failed: ${errorMessage}` }
    }
}

/**
 * Update webhook secret (whsec_... from Stripe)
 */
export async function updateWebhookSecret(secret: string): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Validate secret format
    if (!secret.startsWith('whsec_')) {
        return { success: false, error: 'Invalid secret format. Must start with whsec_' }
    }

    try {
        // Get the active workspace
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'No active workspace' }
        }

        // Find the endpoint first
        const endpoint = await prisma.webhookEndpoint.findFirst({
            where: { workspace_id: workspace.workspaceId }
        })

        if (!endpoint) {
            return { success: false, error: 'No webhook endpoint found' }
        }

        await prisma.webhookEndpoint.update({
            where: { id: endpoint.id },
            data: { secret }
        })

        console.log('[Webhook] 🔐 Secret updated for workspace:', workspace.workspaceId)

        return { success: true }

    } catch (error) {
        console.error('[Webhook] ❌ Error updating secret:', error)
        return { success: false, error: 'Failed to update webhook secret' }
    }
}

/**
 * Get webhook configuration for display
 */
export async function getWebhookConfig(): Promise<{
    success: boolean
    config?: {
        endpointId: string
        webhookUrl: string
        hasSecret: boolean
        description: string | null
        createdAt: Date
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Get the active workspace
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: true, config: undefined }
        }

        const endpoint = await prisma.webhookEndpoint.findFirst({
            where: { workspace_id: workspace.workspaceId }
        })

        if (!endpoint) {
            return { success: true, config: undefined }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const webhookUrl = `${baseUrl}/api/webhooks/${endpoint.id}`

        return {
            success: true,
            config: {
                endpointId: endpoint.id,
                webhookUrl,
                hasSecret: !!endpoint.secret,
                description: endpoint.description,
                createdAt: endpoint.created_at,
            }
        }

    } catch (error) {
        console.error('[Webhook] ❌ Error:', error)
        return { success: false, error: 'Failed to get webhook config' }
    }
}

/**
 * Delete webhook endpoint
 */
export async function deleteWebhookEndpoint(): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const endpoint = await prisma.webhookEndpoint.findFirst({
            where: { workspace_id: user.id }
        })

        if (!endpoint) {
            return { success: false, error: 'No webhook endpoint found' }
        }

        await prisma.webhookEndpoint.delete({
            where: { id: endpoint.id }
        })

        console.log('[Webhook] 🗑️ Endpoint deleted for workspace:', user.id)

        return { success: true }

    } catch (error) {
        console.error('[Webhook] ❌ Error:', error)
        return { success: false, error: 'Failed to delete webhook endpoint' }
    }
}
