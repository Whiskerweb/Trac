'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Check if endpoint already exists
        let endpoint = await prisma.webhookEndpoint.findUnique({
            where: { workspace_id: user.id }
        })

        // Create if not exists
        if (!endpoint) {
            const endpointId = `whk_${nanoid(16)}`

            endpoint = await prisma.webhookEndpoint.create({
                data: {
                    id: endpointId,
                    workspace_id: user.id,
                    description: 'Stripe Webhook',
                }
            })

            console.log('[Webhook] ✅ Created endpoint:', endpointId)
        }

        // Build webhook URL (will be replaced with actual domain in production)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const webhookUrl = `${baseUrl}/api/webhooks/${endpoint.id}`

        return {
            success: true,
            endpointId: endpoint.id,
            webhookUrl,
            secret: endpoint.secret,
        }

    } catch (error) {
        console.error('[Webhook] ❌ Error:', error)
        return { success: false, error: 'Failed to create webhook endpoint' }
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
        await prisma.webhookEndpoint.update({
            where: { workspace_id: user.id },
            data: { secret }
        })

        console.log('[Webhook] 🔐 Secret updated for workspace:', user.id)

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
        const endpoint = await prisma.webhookEndpoint.findUnique({
            where: { workspace_id: user.id }
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
        await prisma.webhookEndpoint.delete({
            where: { workspace_id: user.id }
        })

        console.log('[Webhook] 🗑️ Endpoint deleted for workspace:', user.id)

        return { success: true }

    } catch (error) {
        console.error('[Webhook] ❌ Error:', error)
        return { success: false, error: 'Failed to delete webhook endpoint' }
    }
}
