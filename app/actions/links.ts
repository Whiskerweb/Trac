'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

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

    // Create the short link
    try {
        const link = await prisma.shortLink.create({
            data: {
                slug,
                original_url: originalUrl,
                workspace_id: user.id,
            }
        })

        console.log('[ShortLink] ✅ Created:', link.slug, 'for user:', user.id)

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
 * Get all short links for the current user
 */
export async function getMyShortLinks() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return []
    }

    const links = await prisma.shortLink.findMany({
        where: { workspace_id: user.id },
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

    // Verify ownership
    const link = await prisma.shortLink.findUnique({
        where: { id }
    })

    if (!link || link.workspace_id !== user.id) {
        return { success: false, error: 'Link not found' }
    }

    await prisma.shortLink.delete({
        where: { id }
    })

    revalidatePath('/dashboard')
    return { success: true }
}
