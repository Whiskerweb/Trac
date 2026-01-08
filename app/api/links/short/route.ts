import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

// Redis for caching shortlinks
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * GET /api/links/short
 * Get all short links for the authenticated user's active workspace
 */
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ success: false, links: [] }, { status: 200 })
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()

    if (!workspace) {
        return NextResponse.json({ success: false, links: [], code: 'NO_WORKSPACE' }, { status: 200 })
    }

    const links = await prisma.shortLink.findMany({
        where: { workspace_id: workspace.workspaceId },
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            slug: true,
            original_url: true,
            clicks: true,
            created_at: true,
        }
    })

    // Transform to match frontend expectations
    const formattedLinks = links.map(link => ({
        id: link.id,
        slug: link.slug,
        destination: link.original_url,
        clicks: link.clicks,
        created_at: link.created_at,
    }))

    return NextResponse.json({ success: true, links: formattedLinks })
}

/**
 * POST /api/links/short
 * Create a new short link
 * 
 * Supports both:
 * 1. Session-based auth (Supabase user)
 * 2. API key auth with links:write scope
 */
export async function POST(request: NextRequest) {
    // Try API key auth first
    const authHeader = request.headers.get('authorization')

    if (authHeader) {
        // API Key flow - use scope middleware
        const { requireScopes } = await import('@/lib/api-middleware')
        const ctx = await requireScopes(request, ['links:write'])

        if (!ctx.valid) {
            return NextResponse.json(
                { success: false, error: ctx.error },
                { status: ctx.workspaceId ? 403 : 401 }
            )
        }

        // Use workspace from API key
        const body = await request.json()
        const { destination, slug: customSlug } = body

        if (!destination) {
            return NextResponse.json({ success: false, error: 'Destination URL is required' }, { status: 400 })
        }

        // Validate URL format
        try {
            new URL(destination)
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
        }

        // Generate or validate slug
        const slug = customSlug || generateSlug()

        // Check if slug already exists
        const existing = await prisma.shortLink.findUnique({ where: { slug } })
        if (existing) {
            return NextResponse.json({ success: false, error: 'Slug already exists' }, { status: 409 })
        }

        // Create the short link with workspace from API key
        const link = await prisma.shortLink.create({
            data: {
                slug,
                original_url: destination,
                workspace_id: ctx.workspaceId!,
                clicks: 0,
            },
            select: {
                id: true,
                slug: true,
                original_url: true,
                clicks: true,
                created_at: true,
            }
        })

        // Cache in Redis
        const domain = 'localhost'
        await redis.set(`shortlink:${domain}:${slug}`, JSON.stringify({
            url: destination,
            linkId: link.id,
            workspaceId: ctx.workspaceId!,
        }), { ex: 60 * 60 * 24 * 30 })

        console.log(`[API] ✅ Created shortlink via API key: /s/${slug}`)

        return NextResponse.json({
            success: true,
            link: {
                id: link.id,
                slug: link.slug,
                destination: link.original_url,
                clicks: link.clicks,
                created_at: link.created_at,
            }
        })
    }

    // Session-based auth fallback
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return NextResponse.json({ success: false, error: 'No workspace. Complete onboarding first.', code: 'NO_WORKSPACE' }, { status: 400 })
    }

    const body = await request.json()
    const { destination, slug: customSlug } = body

    if (!destination) {
        return NextResponse.json({ success: false, error: 'Destination URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
        new URL(destination)
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
    }

    // Generate or validate slug
    const slug = customSlug || generateSlug()

    // Check if slug already exists
    const existing = await prisma.shortLink.findUnique({
        where: { slug }
    })

    if (existing) {
        return NextResponse.json({ success: false, error: 'Slug already exists' }, { status: 409 })
    }

    // Create the short link
    const link = await prisma.shortLink.create({
        data: {
            slug,
            original_url: destination,
            workspace_id: workspace.workspaceId,
            clicks: 0,
        },
        select: {
            id: true,
            slug: true,
            original_url: true,
            clicks: true,
            created_at: true,
        }
    })

    // Cache in Redis for fast edge lookups
    const domain = 'localhost' // Will be dynamic in production
    await redis.set(`shortlink:${domain}:${slug}`, JSON.stringify({
        url: destination,
        linkId: link.id,
        workspaceId: workspace.workspaceId,
    }), { ex: 60 * 60 * 24 * 30 }) // 30 days

    console.log(`[API] ✅ Created shortlink: /s/${slug} → ${destination}`)

    return NextResponse.json({
        success: true,
        link: {
            id: link.id,
            slug: link.slug,
            destination: link.original_url,
            clicks: link.clicks,
            created_at: link.created_at,
        }
    })
}

/**
 * DELETE /api/links/short
 * Delete a short link
 */
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ success: false, error: 'Link ID required' }, { status: 400 })
    }

    // Get workspace to verify ownership
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return NextResponse.json({ success: false, error: 'No workspace' }, { status: 400 })
    }

    // Find and delete the link (only if it belongs to this workspace)
    const link = await prisma.shortLink.findFirst({
        where: { id, workspace_id: workspace.workspaceId }
    })

    if (!link) {
        return NextResponse.json({ success: false, error: 'Link not found' }, { status: 404 })
    }

    await prisma.shortLink.delete({ where: { id } })

    // Remove from Redis cache
    const domain = 'localhost'
    await redis.del(`shortlink:${domain}:${link.slug}`)

    console.log(`[API] 🗑️ Deleted shortlink: /s/${link.slug}`)

    return NextResponse.json({ success: true })
}

/**
 * Generate a random 6-character slug
 */
function generateSlug(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let slug = ''
    for (let i = 0; i < 6; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return slug
}
