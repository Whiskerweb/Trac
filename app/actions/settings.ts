'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

/**
 * Get or create API key for the current user
 * Returns the public key in format: pk_trac_<nanoid>
 */
export async function getOrCreateApiKey(): Promise<{
    success: boolean
    publicKey?: string
    error?: string
}> {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Check if user already has an API key
        let apiKey = await prisma.apiKey.findUnique({
            where: { workspace_id: user.id }
        })

        // Create one if not exists
        if (!apiKey) {
            const publicKey = `pk_trac_${nanoid(24)}`

            apiKey = await prisma.apiKey.create({
                data: {
                    workspace_id: user.id,
                    public_key: publicKey,
                }
            })

            console.log('[ApiKey] ✅ Created new key for:', user.id)
        }

        return {
            success: true,
            publicKey: apiKey.public_key,
        }

    } catch (error) {
        console.error('[ApiKey] ❌ Error:', error)
        return { success: false, error: 'Failed to get API key' }
    }
}

/**
 * Regenerate API key (creates a new one, invalidates old)
 */
export async function regenerateApiKey(): Promise<{
    success: boolean
    publicKey?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const newPublicKey = `pk_trac_${nanoid(24)}`

        const apiKey = await prisma.apiKey.upsert({
            where: { workspace_id: user.id },
            update: {
                public_key: newPublicKey,
                created_at: new Date(),
            },
            create: {
                workspace_id: user.id,
                public_key: newPublicKey,
            }
        })

        console.log('[ApiKey] 🔄 Regenerated key for:', user.id)

        return {
            success: true,
            publicKey: apiKey.public_key,
        }

    } catch (error) {
        console.error('[ApiKey] ❌ Error:', error)
        return { success: false, error: 'Failed to regenerate API key' }
    }
}

/**
 * Validate a public key and return the workspace_id
 * Used by the Track API to authenticate requests
 */
export async function validateApiKey(publicKey: string): Promise<{
    valid: boolean
    workspaceId?: string
}> {
    if (!publicKey || !publicKey.startsWith('pk_trac_')) {
        return { valid: false }
    }

    try {
        const apiKey = await prisma.apiKey.findUnique({
            where: { public_key: publicKey }
        })

        if (!apiKey) {
            return { valid: false }
        }

        // Update last_used_at
        await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { last_used_at: new Date() }
        })

        return {
            valid: true,
            workspaceId: apiKey.workspace_id,
        }

    } catch (error) {
        console.error('[ApiKey] ❌ Validation error:', error)
        return { valid: false }
    }
}
