'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { MissionVisibility, RequestStatus } from '@/lib/generated/prisma/client'

// =============================================
// PARTNER MARKETPLACE - Server Actions
// =============================================

interface MarketplaceFilters {
    industry?: string
    gainType?: string
    search?: string
}

/**
 * Get all PUBLIC and PRIVATE missions for the marketplace
 * INVITE_ONLY missions are hidden unless partner is invited
 */
export async function getMarketplaceMissions(filters?: MarketplaceFilters) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Build where clause
        const where: any = {
            status: 'ACTIVE',
            visibility: {
                in: ['PUBLIC', 'PRIVATE'] as MissionVisibility[]
            }
        }

        if (filters?.industry) {
            where.industry = filters.industry
        }

        if (filters?.gainType) {
            where.gain_type = filters.gainType
        }

        if (filters?.search) {
            where.OR = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } }
            ]
        }

        const missions = await prisma.mission.findMany({
            where,
            orderBy: { created_at: 'desc' },
            include: {
                Workspace: {
                    select: {
                        name: true,
                        slug: true,
                        Profile: {
                            select: {
                                logo_url: true,
                                industry: true,
                                description: true,
                                website_url: true
                            }
                        }
                    }
                },
                Contents: {
                    take: 1,
                    orderBy: { order: 'asc' }
                },
                _count: {
                    select: {
                        MissionEnrollment: true
                    }
                }
            }
        })

        // If user is logged in, check enrollment status for each mission
        let enrollmentMap: Record<string, { status: string; linkSlug?: string }> = {}
        let requestMap: Record<string, { status: RequestStatus }> = {}

        if (user) {
            // Get partner ID
            const partner = await prisma.seller.findFirst({
                where: { user_id: user.id }
            })

            if (partner) {
                // Get enrollments
                const enrollments = await prisma.missionEnrollment.findMany({
                    where: {
                        user_id: user.id,
                        mission_id: { in: missions.map(m => m.id) }
                    },
                    include: {
                        ShortLink: true
                    }
                })

                for (const e of enrollments) {
                    enrollmentMap[e.mission_id] = {
                        status: e.status,
                        linkSlug: e.ShortLink?.slug
                    }
                }

                // Get program requests
                const requests = await prisma.programRequest.findMany({
                    where: {
                        seller_id: partner.id,
                        mission_id: { in: missions.map(m => m.id) }
                    }
                })

                for (const r of requests) {
                    requestMap[r.mission_id] = { status: r.status }
                }
            }
        }

        return {
            success: true,
            missions: missions.map(m => ({
                id: m.id,
                title: m.title,
                description: m.description,
                target_url: m.target_url,
                reward: m.reward,
                visibility: m.visibility,
                industry: m.industry,
                gain_type: m.gain_type,
                // Startup info
                startup: {
                    name: m.Workspace.name,
                    slug: m.Workspace.slug,
                    logo_url: m.Workspace.Profile?.logo_url || null,
                    industry: m.Workspace.Profile?.industry || null,
                    description: m.Workspace.Profile?.description || null,
                    website_url: m.Workspace.Profile?.website_url || null,
                },
                // Legacy (keep for backwards compat)
                workspace_name: m.Workspace.name,
                has_resources: m.Contents.length > 0,
                partners_count: m._count.MissionEnrollment,
                enrollment: enrollmentMap[m.id] || null,
                request: requestMap[m.id] || null
            }))
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get missions:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Apply to a PRIVATE mission
 */
export async function applyToMission(missionId: string, message?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get partner
        const partner = await prisma.seller.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return { success: false, error: 'Partner profile not found' }
        }

        // Check mission exists and is PRIVATE
        const mission = await prisma.mission.findUnique({
            where: { id: missionId }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        if (mission.visibility !== 'PRIVATE') {
            return { success: false, error: 'This mission does not require application' }
        }

        // Create or update request
        const request = await prisma.programRequest.upsert({
            where: {
                seller_id_mission_id: {
                    seller_id: partner.id,
                    mission_id: missionId
                }
            },
            create: {
                seller_id: partner.id,
                mission_id: missionId,
                message: message,
                status: 'PENDING'
            },
            update: {
                message: message,
                status: 'PENDING',
                reviewed_at: null
            }
        })

        return {
            success: true,
            request: {
                id: request.id,
                status: request.status
            }
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to apply:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get mission details with resources for enrolled partners
 */
export async function getMissionWithResources(missionId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            include: {
                Workspace: {
                    select: {
                        name: true,
                        slug: true,
                        Domain: {
                            where: { verified: true },
                            take: 1
                        }
                    }
                },
                Contents: {
                    orderBy: { order: 'asc' }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        // Check enrollment/access
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED'
            },
            include: {
                ShortLink: true
            }
        })

        // For INVITE_ONLY, must be enrolled
        if (mission.visibility === 'INVITE_ONLY' && !enrollment) {
            return { success: false, error: 'ACCESS_DENIED' }
        }

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                visibility: mission.visibility,
                industry: mission.industry,
                gain_type: mission.gain_type,
                workspace_name: mission.Workspace.name
            },
            resources: mission.Contents.map(c => ({
                id: c.id,
                type: c.type,
                url: c.url,
                title: c.title,
                description: c.description
            })),
            enrollment: enrollment ? (() => {
                // Build proper tracking URL with custom domain
                const customDomain = mission.Workspace.Domain?.[0]?.name
                const baseUrl = customDomain
                    ? `https://${customDomain}`
                    : process.env.NEXT_PUBLIC_APP_URL

                return {
                    id: enrollment.id,
                    status: enrollment.status,
                    link_slug: enrollment.ShortLink?.slug,
                    link_url: enrollment.ShortLink ? `${baseUrl}/s/${enrollment.ShortLink.slug}` : null
                }
            })() : null
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get mission:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get program requests for current user's workspace (server action safe for client components)
 */
export async function getMyProgramRequests() {
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }
    return getProgramRequests(workspace.workspaceId)
}

/**
 * Get program requests for startup dashboard
 */
export async function getProgramRequests(workspaceId: string) {
    try {
        const requests = await prisma.programRequest.findMany({
            where: {
                Mission: {
                    workspace_id: workspaceId
                },
                status: 'PENDING'
            },
            include: {
                Seller: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                Mission: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return {
            success: true,
            requests: requests.map(r => ({
                id: r.id,
                seller_id: r.Seller.id,
                seller_email: r.Seller.email,
                seller_name: r.Seller.name,
                mission_id: r.Mission.id,
                mission_title: r.Mission.title,
                message: r.message,
                created_at: r.created_at
            }))
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get requests:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Approve a program request
 * Creates enrollment + ShortLink + Redis entry for the seller
 */
export async function approveProgramRequest(requestId: string): Promise<{
    success: boolean
    enrollment?: {
        id: string
        link_url: string
    }
    error?: string
}> {
    try {
        const request = await prisma.programRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewed_at: new Date()
            },
            include: {
                Seller: true,
                Mission: {
                    include: {
                        Workspace: {
                            include: {
                                Domain: {
                                    where: { verified: true },
                                    take: 1
                                }
                            }
                        }
                    }
                }
            }
        })

        // Must have user_id to create enrollment with tracking link
        if (!request.Seller.user_id) {
            console.log('[Marketplace] ⚠️ Seller has no user_id, cannot create tracking link')
            return { success: true } // Approved but no link (shadow seller)
        }

        // 1. Get custom domain if available
        const customDomain = request.Mission.Workspace.Domain?.[0]?.name || null
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

        // 2. Generate semantic slug: mission-slug/affiliate-code
        const missionSlug = request.Mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = request.Seller.user_id.slice(0, 8)
        const fullSlug = `${missionSlug}/${affiliateCode}`

        // 3. Create ShortLink
        const shortLink = await prisma.shortLink.create({
            data: {
                slug: fullSlug,
                original_url: request.Mission.target_url,
                workspace_id: request.Mission.workspace_id,
                affiliate_id: request.Seller.user_id,
                clicks: 0,
            }
        })

        // 4. Add to Redis for fast lookups
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            sellerId: shortLink.affiliate_id,
        }, customDomain || undefined)

        // 5. Create or update enrollment with link
        const enrollment = await prisma.missionEnrollment.upsert({
            where: {
                mission_id_user_id: {
                    mission_id: request.mission_id,
                    user_id: request.Seller.user_id
                }
            },
            create: {
                mission_id: request.mission_id,
                user_id: request.Seller.user_id,
                status: 'APPROVED',
                link_id: shortLink.id
            },
            update: {
                status: 'APPROVED',
                link_id: shortLink.id
            }
        })

        const linkUrl = `${baseUrl}/s/${fullSlug}`
        console.log(`[Marketplace] ✅ Approved request: seller=${request.Seller.id}, mission=${request.mission_id}, link=${linkUrl}`)

        return {
            success: true,
            enrollment: {
                id: enrollment.id,
                link_url: linkUrl
            }
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to approve request:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Reject a program request
 */
export async function rejectProgramRequest(requestId: string) {
    try {
        await prisma.programRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                reviewed_at: new Date()
            }
        })

        return { success: true }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to reject request:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get enriched pending requests for a specific mission
 * Includes seller profile and stats (revenue, sales count)
 */
export interface EnrichedProgramRequest {
    id: string
    seller_id: string
    seller_email: string
    seller_name: string | null
    seller_avatar: string | null
    seller_bio: string | null
    message: string | null
    created_at: Date
    stats: {
        total_revenue: number
        total_sales: number
        total_clicks: number
    }
}

export async function getMissionPendingRequests(missionId: string): Promise<{
    success: boolean
    requests?: EnrichedProgramRequest[]
    error?: string
}> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'No active workspace' }
        }

        // Get pending requests for this specific mission
        const requests = await prisma.programRequest.findMany({
            where: {
                mission_id: missionId,
                status: 'PENDING',
                Mission: {
                    workspace_id: workspace.workspaceId
                }
            },
            include: {
                Seller: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        Profile: {
                            select: {
                                avatar_url: true,
                                bio: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Get seller IDs to fetch their stats
        const sellerIds = requests.map(r => r.Seller.id)

        // Get commissions for these sellers across all programs (to show their overall performance)
        const commissions = sellerIds.length > 0 ? await prisma.commission.findMany({
            where: {
                seller_id: { in: sellerIds },
                status: { in: ['PROCEED', 'COMPLETE'] }
            },
            select: {
                seller_id: true,
                net_amount: true
            }
        }) : []

        // Get clicks from their ShortLinks
        const shortLinks = sellerIds.length > 0 ? await prisma.shortLink.findMany({
            where: {
                affiliate_id: { in: sellerIds.map(id => {
                    // Get user_id from seller - need to query
                    return id
                }) }
            },
            select: {
                affiliate_id: true,
                clicks: true
            }
        }) : []

        // Also need to get user_ids from sellers to match with shortlinks
        const sellers = sellerIds.length > 0 ? await prisma.seller.findMany({
            where: { id: { in: sellerIds } },
            select: { id: true, user_id: true }
        }) : []

        const sellerUserMap = new Map(sellers.map(s => [s.id, s.user_id]))

        // Get clicks for each seller's user_id
        const userIds = sellers.filter(s => s.user_id).map(s => s.user_id!)
        const allShortLinks = userIds.length > 0 ? await prisma.shortLink.findMany({
            where: {
                affiliate_id: { in: userIds }
            },
            select: {
                affiliate_id: true,
                clicks: true
            }
        }) : []

        // Build stats map per seller
        const statsMap = new Map<string, { revenue: number; sales: number; clicks: number }>()

        for (const c of commissions) {
            const existing = statsMap.get(c.seller_id) || { revenue: 0, sales: 0, clicks: 0 }
            existing.revenue += c.net_amount
            existing.sales += 1
            statsMap.set(c.seller_id, existing)
        }

        // Add clicks per seller
        for (const sl of allShortLinks) {
            // Find which seller this belongs to
            for (const [sellerId, userId] of sellerUserMap.entries()) {
                if (userId === sl.affiliate_id) {
                    const existing = statsMap.get(sellerId) || { revenue: 0, sales: 0, clicks: 0 }
                    existing.clicks += sl.clicks
                    statsMap.set(sellerId, existing)
                    break
                }
            }
        }

        // Map to response format
        const enrichedRequests: EnrichedProgramRequest[] = requests.map(r => ({
            id: r.id,
            seller_id: r.Seller.id,
            seller_email: r.Seller.email,
            seller_name: r.Seller.name,
            seller_avatar: r.Seller.Profile?.avatar_url || null,
            seller_bio: r.Seller.Profile?.bio || null,
            message: r.message,
            created_at: r.created_at,
            stats: {
                total_revenue: statsMap.get(r.Seller.id)?.revenue || 0,
                total_sales: statsMap.get(r.Seller.id)?.sales || 0,
                total_clicks: statsMap.get(r.Seller.id)?.clicks || 0
            }
        }))

        return {
            success: true,
            requests: enrichedRequests
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get mission pending requests:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
