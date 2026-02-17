'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { CampaignStatus } from '@/lib/generated/prisma/client'

// =============================================
// MARKETING CAMPAIGNS — Server Actions
// =============================================

interface CreateCampaignInput {
    name: string
    description?: string
    color?: string
    status?: CampaignStatus
    start_date?: string
    end_date?: string
}

export async function createMarketingCampaign(input: CreateCampaignInput) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    if (!input.name?.trim()) return { success: false, error: 'Name is required' }

    try {
        const campaign = await prisma.marketingCampaign.create({
            data: {
                name: input.name.trim(),
                description: input.description?.trim() || null,
                color: input.color || null,
                status: input.status || 'ACTIVE',
                start_date: input.start_date ? new Date(input.start_date) : null,
                end_date: input.end_date ? new Date(input.end_date) : null,
                workspace_id: workspace.workspaceId,
            },
        })

        revalidatePath('/dashboard/marketing')
        return { success: true, data: campaign }
    } catch {
        return { success: false, error: 'Campaign name already exists' }
    }
}

interface UpdateCampaignInput {
    name?: string
    description?: string
    color?: string
    status?: CampaignStatus
    start_date?: string | null
    end_date?: string | null
}

export async function updateMarketingCampaign(id: string, input: UpdateCampaignInput) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    const campaign = await prisma.marketingCampaign.findUnique({ where: { id } })
    if (!campaign || campaign.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Campaign not found' }
    }

    const data: Record<string, unknown> = {}
    if (input.name !== undefined) data.name = input.name.trim()
    if (input.description !== undefined) data.description = input.description?.trim() || null
    if (input.color !== undefined) data.color = input.color || null
    if (input.status !== undefined) data.status = input.status
    if (input.start_date !== undefined) data.start_date = input.start_date ? new Date(input.start_date) : null
    if (input.end_date !== undefined) data.end_date = input.end_date ? new Date(input.end_date) : null

    try {
        const updated = await prisma.marketingCampaign.update({ where: { id }, data })

        // If name changed, cascade update the denormalized campaign string on links
        if (input.name !== undefined && input.name.trim() !== campaign.name) {
            await prisma.shortLink.updateMany({
                where: { campaign_id: id },
                data: { campaign: input.name.trim() },
            })
        }

        revalidatePath('/dashboard/marketing')
        return { success: true, data: updated }
    } catch {
        return { success: false, error: 'Campaign name already exists' }
    }
}

export async function deleteMarketingCampaign(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No active workspace' }

    const campaign = await prisma.marketingCampaign.findUnique({ where: { id } })
    if (!campaign || campaign.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Campaign not found' }
    }

    // Clear campaign_id and campaign string on all linked links
    await prisma.shortLink.updateMany({
        where: { campaign_id: id },
        data: { campaign_id: null, campaign: null },
    })

    await prisma.marketingCampaign.delete({ where: { id } })

    revalidatePath('/dashboard/marketing')
    return { success: true }
}

export async function getMarketingCampaignList() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated', data: [] }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace', data: [] }

    const campaigns = await prisma.marketingCampaign.findMany({
        where: { workspace_id: workspace.workspaceId },
        include: {
            _count: { select: { links: true } },
            links: { select: { clicks: true } },
        },
        orderBy: { created_at: 'desc' },
    })

    return {
        success: true,
        data: campaigns.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            color: c.color,
            status: c.status,
            start_date: c.start_date,
            end_date: c.end_date,
            created_at: c.created_at,
            linkCount: c._count.links,
            totalClicks: c.links.reduce((sum, l) => sum + l.clicks, 0),
        })),
    }
}

export async function getMarketingCampaign(id: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Not authenticated' }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) return { success: false, error: 'No workspace' }

    const campaign = await prisma.marketingCampaign.findUnique({
        where: { id },
        include: {
            _count: { select: { links: true } },
            links: { select: { clicks: true } },
        },
    })

    if (!campaign || campaign.workspace_id !== workspace.workspaceId) {
        return { success: false, error: 'Campaign not found' }
    }

    return {
        success: true,
        data: {
            ...campaign,
            linkCount: campaign._count.links,
            totalClicks: campaign.links.reduce((sum, l) => sum + l.clicks, 0),
        },
    }
}
