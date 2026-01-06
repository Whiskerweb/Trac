'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

/**
 * Create a new short link
 */
export async function createShortLink(formData: FormData) {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()

    if (!workspace) {
        return { success: false, error: 'Veuillez creer un workspace via /onboarding' }
    }

    // Get form data
    const originalUrl = formData.get('url') as string
    let slug = formData.get('slug') as string | null

    // Validate URL
    if (!originalUrl) {
        return { success: false, error: 'URL is required' }
    }

    try {
        new URL(originalUrl)
    } catch {
        return { success: false, error: 'Invalid URL format' }
    }

    // Generate slug if not provided
    if (!slug || slug.trim() === '') {
        slug = nanoid(6)
    } else {
        slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    }

    // Check if slug already exists
    const existing = await prisma.shortLink.findUnique({
        where: { slug }
    })

    if (existing) {
        return { success: false, error: 'This slug is already taken' }
    }

    // Create the short link with workspace_id
    try {
        const link = await prisma.shortLink.create({
            data: {
                slug,
                original_url: originalUrl,
                workspace_id: workspace.workspaceId,  // Use actual workspace!
            }
        })

        // ✅ DUAL WRITE: Sync to Redis for low-latency lookups
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(link.slug, {
            url: link.original_url,
            linkId: link.id,
            workspaceId: link.workspace_id,
            affiliateId: null,
        })

        console.log('[ShortLink] ✅ Created:', link.slug, 'for workspace:', workspace.workspaceId)

        revalidatePath('/dashboard')

        return {
            success: true,
            link: {
                id: link.id,
                slug: link.slug,
                original_url: link.original_url,
                short_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/s/${link.slug}`,
            }
        }
    } catch (error) {
        console.error('[ShortLink] ❌ Error:', error)
        return { success: false, error: 'Failed to create link' }
    }
}

/**
 * Get all short links for the current user's active workspace
 */
export async function getMyShortLinks() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return []
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()

    if (!workspace) {
        return []  // No workspace = no links
    }

    const links = await prisma.shortLink.findMany({
        where: { workspace_id: workspace.workspaceId },
        orderBy: { created_at: 'desc' }
    })

    return links
}

/**
 * Delete a short link
 */
export async function deleteShortLink(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()

    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    // Verify ownership (link belongs to user's active workspace)
    const link = await prisma.shortLink.findUnique({
        where: { id }
    })

    if (!link || link.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Link not found or access denied' }
    }

    await prisma.shortLink.delete({
        where: { id }
    })

    // ✅ DUAL DELETE: Remove from Redis
    const { deleteLinkFromRedis } = await import('@/lib/redis')
    await deleteLinkFromRedis(link.slug)

    revalidatePath('/dashboard')
    return { success: true }
}
