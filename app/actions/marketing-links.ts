'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// MARKETING LINKS — Server Actions
// =============================================

const DEFAULT_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function getShortLinkBase(workspaceId: string): Promise<string> {
    const domain = await prisma.domain.findFirst({
        where: { workspace_id: workspaceId, verified: true },
        select: { name: true },
    })
    return domain ? `https://${domain.name}` : DEFAULT_BASE
}

function buildShortUrl(base: string, slug: string): string {
    return `${base}/s/${slug}`
}

interface MarketingLinkInput {
    url: string
    slug?: string
    channel?: string
    campaign?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    domain?: string
    og_title?: string
    og_description?: string
    og_image?: string
    tagIds?: string[]
}

/**
 * Create a new marketing link (no affiliate)
 */
export async function createMarketingLink(input: MarketingLinkInput) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    // Validate URL
    if (!input.url) {
        return { success: false, error: 'URL is required' }
    }

    try {
        new URL(input.url)
    } catch {
        return { success: false, error: 'Invalid URL format' }
    }

    // Generate or sanitize slug
    let slug = input.slug?.trim()
    if (!slug) {
        slug = nanoid(8)
    } else {
        slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    }

    // Check uniqueness
    const existing = await prisma.shortLink.findUnique({ where: { slug } })
    if (existing) {
        return { success: false, error: 'This slug is already taken' }
    }

    // Build target URL with UTMs
    let targetUrl = input.url
    const utmParams: Record<string, string | undefined> = {
        utm_source: input.utm_source,
        utm_medium: input.utm_medium,
        utm_campaign: input.utm_campaign,
        utm_term: input.utm_term,
        utm_content: input.utm_content,
    }
    const url = new URL(targetUrl)
    for (const [key, value] of Object.entries(utmParams)) {
        if (value) url.searchParams.set(key, value)
    }
    targetUrl = url.toString()

    try {
        const link = await prisma.shortLink.create({
            data: {
                slug,
                original_url: targetUrl,
                workspace_id: workspace.workspaceId,
                affiliate_id: null,
                link_type: 'marketing',
                channel: input.channel || null,
                campaign: input.campaign || null,
                utm_source: input.utm_source || null,
                utm_medium: input.utm_medium || null,
                utm_campaign: input.utm_campaign || null,
                utm_term: input.utm_term || null,
                utm_content: input.utm_content || null,
                og_title: input.og_title || null,
                og_description: input.og_description || null,
                og_image: input.og_image || null,
                ...(input.tagIds?.length ? {
                    tags: { connect: input.tagIds.map(id => ({ id })) }
                } : {}),
            }
        })

        // Dual-write to Redis
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(link.slug, {
            url: link.original_url,
            linkId: link.id,
            workspaceId: link.workspace_id,
            sellerId: null,
            ogTitle: input.og_title || null,
            ogDescription: input.og_description || null,
            ogImage: input.og_image || null,
        }, input.domain)

        console.log('[Marketing] ✅ Created link:', link.slug, 'channel:', input.channel)

        revalidatePath('/dashboard/marketing')

        const base = input.domain ? `https://${input.domain}` : await getShortLinkBase(workspace.workspaceId)
        return {
            success: true,
            data: {
                id: link.id,
                slug: link.slug,
                original_url: link.original_url,
                short_url: buildShortUrl(base, link.slug),
                channel: link.channel,
                campaign: link.campaign,
            }
        }
    } catch (error) {
        console.error('[Marketing] ❌ Error creating link:', error)
        return { success: false, error: 'Failed to create link' }
    }
}

/**
 * Get all marketing links for current workspace
 */
export async function getMarketingLinks(filters?: {
    channel?: string
    campaign?: string
    search?: string
    tagIds?: string[]
}) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const where: Record<string, unknown> = {
        workspace_id: workspace.workspaceId,
        link_type: 'marketing',
    }

    if (filters?.channel) where.channel = filters.channel
    if (filters?.campaign) where.campaign = filters.campaign
    if (filters?.search) {
        where.OR = [
            { slug: { contains: filters.search, mode: 'insensitive' } },
            { original_url: { contains: filters.search, mode: 'insensitive' } },
            { campaign: { contains: filters.search, mode: 'insensitive' } },
        ]
    }
    if (filters?.tagIds?.length) {
        where.tags = { some: { id: { in: filters.tagIds } } }
    }

    const links = await prisma.shortLink.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { tags: { select: { id: true, name: true, color: true } } },
    })

    const base = await getShortLinkBase(workspace.workspaceId)
    return {
        success: true,
        data: links.map(l => ({
            ...l,
            short_url: buildShortUrl(base, l.slug),
        })),
    }
}

/**
 * Get a single marketing link by ID
 */
export async function getMarketingLink(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const link = await prisma.shortLink.findUnique({
        where: { id },
        include: { tags: { select: { id: true, name: true, color: true } } },
    })

    if (!link || link.workspace_id !== workspace.workspaceId || link.link_type !== 'marketing') {
        return { success: false, error: 'Link not found' }
    }

    const base = await getShortLinkBase(workspace.workspaceId)
    return {
        success: true,
        data: {
            ...link,
            short_url: buildShortUrl(base, link.slug),
        },
    }
}

/**
 * Update a marketing link
 */
export async function updateMarketingLink(id: string, input: Partial<MarketingLinkInput>) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const link = await prisma.shortLink.findUnique({ where: { id } })
    if (!link || link.workspace_id !== workspace.workspaceId || link.link_type !== 'marketing') {
        return { success: false, error: 'Link not found' }
    }

    const data: Record<string, unknown> = {}
    if (input.channel !== undefined) data.channel = input.channel || null
    if (input.campaign !== undefined) data.campaign = input.campaign || null
    if (input.utm_source !== undefined) data.utm_source = input.utm_source || null
    if (input.utm_medium !== undefined) data.utm_medium = input.utm_medium || null
    if (input.utm_campaign !== undefined) data.utm_campaign = input.utm_campaign || null
    if (input.utm_term !== undefined) data.utm_term = input.utm_term || null
    if (input.utm_content !== undefined) data.utm_content = input.utm_content || null
    if (input.og_title !== undefined) data.og_title = input.og_title || null
    if (input.og_description !== undefined) data.og_description = input.og_description || null
    if (input.og_image !== undefined) data.og_image = input.og_image || null

    const updated = await prisma.shortLink.update({ where: { id }, data })

    // Re-sync Redis with updated data
    const { setLinkInRedis } = await import('@/lib/redis')
    await setLinkInRedis(updated.slug, {
        url: updated.original_url,
        linkId: updated.id,
        workspaceId: updated.workspace_id,
        sellerId: updated.affiliate_id || null,
        ogTitle: updated.og_title || null,
        ogDescription: updated.og_description || null,
        ogImage: updated.og_image || null,
    }, input.domain)

    revalidatePath('/dashboard/marketing')
    return { success: true, data: updated }
}

/**
 * Delete a marketing link
 */
export async function deleteMarketingLink(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const link = await prisma.shortLink.findUnique({ where: { id } })
    if (!link || link.workspace_id !== workspace.workspaceId || link.link_type !== 'marketing') {
        return { success: false, error: 'Link not found' }
    }

    await prisma.shortLink.delete({ where: { id } })

    // Cleanup Redis
    const { deleteLinkFromRedis } = await import('@/lib/redis')
    await deleteLinkFromRedis(link.slug)

    revalidatePath('/dashboard/marketing')
    return { success: true }
}

/**
 * Get campaigns (grouped) for current workspace
 */
export async function getMarketingCampaigns() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const links = await prisma.shortLink.findMany({
        where: {
            workspace_id: workspace.workspaceId,
            link_type: 'marketing',
            campaign: { not: null },
        },
        select: {
            campaign: true,
            channel: true,
            clicks: true,
        },
    })

    // Group by campaign
    const campaignMap = new Map<string, { name: string; linkCount: number; totalClicks: number; channels: Set<string> }>()
    for (const link of links) {
        if (!link.campaign) continue
        const existing = campaignMap.get(link.campaign)
        if (existing) {
            existing.linkCount++
            existing.totalClicks += link.clicks
            if (link.channel) existing.channels.add(link.channel)
        } else {
            const channels = new Set<string>()
            if (link.channel) channels.add(link.channel)
            campaignMap.set(link.campaign, {
                name: link.campaign,
                linkCount: 1,
                totalClicks: link.clicks,
                channels,
            })
        }
    }

    return {
        success: true,
        data: Array.from(campaignMap.values()).map(c => ({
            ...c,
            channels: Array.from(c.channels),
        })),
    }
}

/**
 * Get channel stats for current workspace
 */
export async function getMarketingChannelStats() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const links = await prisma.shortLink.findMany({
        where: {
            workspace_id: workspace.workspaceId,
            link_type: 'marketing',
        },
        select: {
            channel: true,
            clicks: true,
            created_at: true,
        },
    })

    // Group by channel
    const channelMap = new Map<string, { channel: string; linkCount: number; totalClicks: number }>()
    for (const link of links) {
        const ch = link.channel || 'other'
        const existing = channelMap.get(ch)
        if (existing) {
            existing.linkCount++
            existing.totalClicks += link.clicks
        } else {
            channelMap.set(ch, { channel: ch, linkCount: 1, totalClicks: link.clicks })
        }
    }

    return {
        success: true,
        data: Array.from(channelMap.values()),
    }
}

// =============================================
// MARKETING TAGS — CRUD + Assignment
// =============================================

/**
 * Create a new marketing tag
 */
export async function createMarketingTag(name: string, color: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    if (!name.trim()) return { success: false, error: 'Name is required' }

    try {
        const tag = await prisma.marketingTag.create({
            data: {
                name: name.trim(),
                color,
                workspace_id: workspace.workspaceId,
            },
        })
        revalidatePath('/dashboard/marketing')
        return { success: true, data: tag }
    } catch {
        return { success: false, error: 'Tag name already exists' }
    }
}

/**
 * Update a marketing tag (name and/or color)
 */
export async function updateMarketingTag(id: string, data: { name?: string; color?: string }) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const tag = await prisma.marketingTag.findUnique({ where: { id } })
    if (!tag || tag.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Tag not found' }
    }

    const updateData: Record<string, string> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.color !== undefined) updateData.color = data.color

    try {
        const updated = await prisma.marketingTag.update({ where: { id }, data: updateData })
        revalidatePath('/dashboard/marketing')
        return { success: true, data: updated }
    } catch {
        return { success: false, error: 'Tag name already exists' }
    }
}

/**
 * Delete a marketing tag
 */
export async function deleteMarketingTag(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const tag = await prisma.marketingTag.findUnique({ where: { id } })
    if (!tag || tag.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Tag not found' }
    }

    await prisma.marketingTag.delete({ where: { id } })
    revalidatePath('/dashboard/marketing')
    return { success: true }
}

/**
 * Get all marketing tags for current workspace (with link count)
 */
export async function getMarketingTags() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const tags = await prisma.marketingTag.findMany({
        where: { workspace_id: workspace.workspaceId },
        include: { _count: { select: { links: true } } },
        orderBy: { created_at: 'asc' },
    })

    return {
        success: true,
        data: tags.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color,
            linkCount: t._count.links,
        })),
    }
}

/**
 * Set tags on a link (replaces all existing tags)
 */
export async function setLinkTags(linkId: string, tagIds: string[]) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const link = await prisma.shortLink.findUnique({ where: { id: linkId } })
    if (!link || link.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Link not found' }
    }

    await prisma.shortLink.update({
        where: { id: linkId },
        data: {
            tags: {
                set: tagIds.map(id => ({ id })),
            },
        },
    })

    revalidatePath('/dashboard/marketing')
    return { success: true }
}

/**
 * Get marketing overview stats
 */
export async function getMarketingOverview() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const links = await prisma.shortLink.findMany({
        where: {
            workspace_id: workspace.workspaceId,
            link_type: 'marketing',
        },
        orderBy: { clicks: 'desc' },
    })

    const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)
    const totalLinks = links.length

    // Top channel
    const channelClicks = new Map<string, number>()
    for (const link of links) {
        const ch = link.channel || 'other'
        channelClicks.set(ch, (channelClicks.get(ch) || 0) + link.clicks)
    }
    let topChannel = 'none'
    let topChannelClicks = 0
    for (const [ch, clicks] of channelClicks) {
        if (clicks > topChannelClicks) {
            topChannel = ch
            topChannelClicks = clicks
        }
    }

    // Best link
    const bestLink = links[0] || null

    // Top 10 performing links
    const base = await getShortLinkBase(workspace.workspaceId)
    const topLinks = links.slice(0, 10).map(l => ({
        ...l,
        short_url: buildShortUrl(base, l.slug),
    }))

    return {
        success: true,
        data: {
            totalClicks,
            totalLinks,
            topChannel,
            topChannelClicks,
            bestLink: bestLink ? {
                ...bestLink,
                short_url: buildShortUrl(base, bestLink.slug),
            } : null,
            topLinks,
        },
    }
}
