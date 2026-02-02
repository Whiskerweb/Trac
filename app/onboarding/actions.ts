'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { setActiveWorkspaceId } from '@/lib/workspace-context'

// =============================================
// VALIDATION
// =============================================

const createWorkspaceSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters'),
    slug: z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(30, 'Slug cannot exceed 30 characters')
        .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
})

// =============================================
// CHECK SLUG AVAILABILITY
// =============================================

export async function checkSlugAvailability(slug: string): Promise<{
    available: boolean
    error?: string
}> {
    if (!slug || slug.length < 3) {
        return { available: false, error: 'Slug must be at least 3 characters' }
    }

    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
        return { available: false, error: 'Invalid characters' }
    }

    // Reserved slugs
    const reserved = ['app', 'api', 'admin', 'dashboard', 'login', 'signup', 'onboarding', 'settings', 'www', 'blog', 'help', 'support', 'status', 'docs']
    if (reserved.includes(slug)) {
        return { available: false, error: 'This slug is reserved' }
    }

    try {
        const existing = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true }
        })

        return { available: !existing }
    } catch (err) {
        console.error('[Onboarding] ❌ Slug check error:', err)
        return { available: false, error: 'Verification error' }
    }
}

// =============================================
// CREATE WORKSPACE
// =============================================

export async function createWorkspaceOnboarding(formData: FormData): Promise<{
    success: boolean
    slug?: string
    error?: string
    redirectTo?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const name = String(formData.get('name') || '').trim()
    const slug = String(formData.get('slug') || '').toLowerCase().trim()

    // Validate
    const validation = createWorkspaceSchema.safeParse({ name, slug })
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message }
    }

    // Check availability
    const availability = await checkSlugAvailability(slug)
    if (!availability.available) {
        return { success: false, error: availability.error || 'This slug is already taken' }
    }

    try {
        // Import key generators
        const { generatePublicKey, generateSecretKey } = await import('@/lib/api-keys')
        const publicKey = generatePublicKey()
        const { hash: secretHash } = generateSecretKey()

        // Create workspace with owner membership in transaction
        const workspace = await prisma.$transaction(async (tx) => {
            const ws = await tx.workspace.create({
                data: {
                    name,
                    slug,
                    owner_id: user.id,
                }
            })

            await tx.workspaceMember.create({
                data: {
                    workspace_id: ws.id,
                    user_id: user.id,
                    role: 'OWNER'
                }
            })

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

        console.log('[Onboarding] ✅ Workspace created:', workspace.name, 'by user:', user.id)

        revalidatePath('/dashboard')

        return { success: true, slug: workspace.slug, redirectTo: '/dashboard/domains?setup=true' }
    } catch (err) {
        console.error('[Onboarding] ❌ Workspace creation error:', err)
        return { success: false, error: 'Error creating workspace' }
    }
}
