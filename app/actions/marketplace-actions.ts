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

        // Build where clause with proper AND/OR structure
        const where: any = {
            status: 'ACTIVE',
            visibility: {
                in: ['PUBLIC', 'PRIVATE'] as MissionVisibility[]
            }
        }

        // Collect AND conditions
        const andConditions: any[] = []

        // Industry filter (stored in WorkspaceProfile)
        if (filters?.industry) {
            andConditions.push({
                Workspace: {
                    Profile: {
                        industry: filters.industry
                    }
                }
            })
        }

        if (filters?.gainType) {
            where.gain_type = filters.gainType
        }

        // Search in mission title, description AND startup name
        if (filters?.search) {
            andConditions.push({
                OR: [
                    { title: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                    { Workspace: { name: { contains: filters.search, mode: 'insensitive' } } }
                ]
            })
        }

        // Apply AND conditions if any
        if (andConditions.length > 0) {
            where.AND = andConditions
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
                        MissionEnrollment: { where: { status: { not: 'ARCHIVED' } } }
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
                // Get enrollments (exclude ARCHIVED so quitted missions show as joinable)
                const enrollments = await prisma.missionEnrollment.findMany({
                    where: {
                        user_id: user.id,
                        mission_id: { in: missions.map(m => m.id) },
                        group_mission_id: null,
                        status: { not: 'ARCHIVED' }
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
                // Multi-commission fields
                lead_enabled: m.lead_enabled,
                lead_reward_amount: m.lead_reward_amount,
                sale_enabled: m.sale_enabled,
                sale_reward_amount: m.sale_reward_amount,
                sale_reward_structure: m.sale_reward_structure,
                recurring_enabled: m.recurring_enabled,
                recurring_reward_amount: m.recurring_reward_amount,
                recurring_reward_structure: m.recurring_reward_structure,
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

        // Check enrollment/access (solo only — exclude group enrollments)
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED',
                group_mission_id: null
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
 * Get full mission details for the marketplace detail page
 * Includes startup info, commission details, enrollment status, and resources (conditionally)
 */
export async function getMissionDetailForMarketplace(missionId: string) {
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
                        id: true,
                        name: true,
                        slug: true,
                        Profile: {
                            select: {
                                logo_url: true,
                                description: true,
                                industry: true,
                                website_url: true,
                                twitter_url: true,
                                linkedin_url: true,
                                founded_year: true,
                                company_size: true,
                                headquarters: true,
                            }
                        },
                        Domain: {
                            where: { verified: true },
                            take: 1
                        }
                    }
                },
                Contents: {
                    orderBy: { order: 'asc' }
                },
                _count: {
                    select: {
                        MissionEnrollment: true
                    }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        // For INVITE_ONLY missions not visible in marketplace
        if (mission.visibility === 'INVITE_ONLY') {
            return { success: false, error: 'ACCESS_DENIED' }
        }

        // Check enrollment status (solo only — exclude group enrollments)
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: {
                mission_id: missionId,
                user_id: user.id,
                group_mission_id: null
            },
            include: {
                ShortLink: true
            }
        })

        // Check if there's a pending request (for PRIVATE missions)
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id }
        })

        let pendingRequest = null
        if (seller && mission.visibility === 'PRIVATE') {
            pendingRequest = await prisma.programRequest.findFirst({
                where: {
                    seller_id: seller.id,
                    mission_id: missionId,
                    status: 'PENDING'
                }
            })
        }

        const isEnrolled = enrollment?.status === 'APPROVED'
        const customDomain = mission.Workspace.Domain?.[0]?.name
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : process.env.NEXT_PUBLIC_APP_URL

        // Only show resources if enrolled (for any visibility) or if PUBLIC
        const canSeeResources = isEnrolled || mission.visibility === 'PUBLIC'

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                reward_type: mission.reward_type,
                reward_structure: mission.reward_structure,
                visibility: mission.visibility,
                partners_count: mission._count.MissionEnrollment,
                created_at: mission.created_at,
                // Multi-commission fields
                lead_enabled: mission.lead_enabled,
                lead_reward_amount: mission.lead_reward_amount,
                sale_enabled: mission.sale_enabled,
                sale_reward_amount: mission.sale_reward_amount,
                sale_reward_structure: mission.sale_reward_structure,
                recurring_enabled: mission.recurring_enabled,
                recurring_reward_amount: mission.recurring_reward_amount,
                recurring_reward_structure: mission.recurring_reward_structure,
            },
            startup: {
                id: mission.Workspace.id,
                name: mission.Workspace.name,
                slug: mission.Workspace.slug,
                logo_url: mission.Workspace.Profile?.logo_url || null,
                description: mission.Workspace.Profile?.description || null,
                industry: mission.Workspace.Profile?.industry || null,
                website_url: mission.Workspace.Profile?.website_url || null,
                twitter_url: mission.Workspace.Profile?.twitter_url || null,
                linkedin_url: mission.Workspace.Profile?.linkedin_url || null,
                founded_year: mission.Workspace.Profile?.founded_year || null,
                company_size: mission.Workspace.Profile?.company_size || null,
                headquarters: mission.Workspace.Profile?.headquarters || null,
            },
            resources: canSeeResources ? mission.Contents.map(c => ({
                id: c.id,
                type: c.type,
                url: c.url,
                title: c.title,
                description: c.description
            })) : [],
            enrollment: enrollment ? {
                id: enrollment.id,
                status: enrollment.status,
                link_slug: enrollment.ShortLink?.slug || null,
                link_url: enrollment.ShortLink ? `${baseUrl}/s/${enrollment.ShortLink.slug}` : null
            } : null,
            pendingRequest: pendingRequest ? {
                id: pendingRequest.id,
                status: pendingRequest.status,
                created_at: pendingRequest.created_at
            } : null,
            canSeeResources,
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get mission detail:', error)
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

        // 5. Create or update solo enrollment with link
        const existingSolo = await prisma.missionEnrollment.findFirst({
            where: { mission_id: request.mission_id, user_id: request.Seller.user_id, group_mission_id: null }
        })
        const enrollment = existingSolo
            ? await prisma.missionEnrollment.update({
                where: { id: existingSolo.id },
                data: { status: 'APPROVED', link_id: shortLink.id }
            })
            : await prisma.missionEnrollment.create({
                data: {
                    mission_id: request.mission_id,
                    user_id: request.Seller.user_id,
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

// =============================================
// TINYBIRD HELPERS FOR ENROLLED MISSION STATS
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Get stats for a specific link from Tinybird
 */
async function getLinkStats(linkId: string): Promise<{ clicks: number; leads: number; sales: number; revenue: number }> {
    const stats = { clicks: 0, leads: 0, sales: 0, revenue: 0 }

    if (!linkId || !TINYBIRD_TOKEN || !isValidUUID(linkId)) {
        return stats
    }

    try {
        // Clicks
        const clicksQuery = `SELECT count() as clicks FROM clicks WHERE link_id = '${linkId}'`
        const clicksRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (clicksRes.ok) {
            const text = await clicksRes.text()
            stats.clicks = parseInt(text.trim()) || 0
        }

        // Leads
        const leadsQuery = `SELECT count() as leads FROM leads WHERE link_id = '${linkId}'`
        const leadsRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (leadsRes.ok) {
            const text = await leadsRes.text()
            stats.leads = parseInt(text.trim()) || 0
        }

        // Sales
        const salesQuery = `SELECT count() as sales, sum(amount) as revenue FROM sales WHERE link_id = '${linkId}'`
        const salesRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (salesRes.ok) {
            const text = await salesRes.text()
            const [sales, revenue] = text.trim().split('\t')
            stats.sales = parseInt(sales) || 0
            stats.revenue = parseInt(revenue) || 0
        }
    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching link stats:', error)
    }

    return stats
}

/**
 * Get timeseries data for a specific link from Tinybird
 */
export async function getLinkTimeseries(linkId: string, days: number = 30): Promise<Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>> {
    const timeseries: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }> = []

    if (!linkId || !TINYBIRD_TOKEN || !isValidUUID(linkId)) {
        return timeseries
    }

    try {
        // Calculate date range
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - days)
        const dateFromStr = dateFrom.toISOString().split('T')[0]

        // Initialize map for all dates in range
        const dateMap = new Map<string, { clicks: number; leads: number; sales: number; revenue: number }>()
        for (let i = 0; i <= days; i++) {
            const d = new Date()
            d.setDate(d.getDate() - (days - i))
            const dateStr = d.toISOString().split('T')[0]
            dateMap.set(dateStr, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
        }

        // Clicks timeseries
        const clicksQuery = `
            SELECT toDate(timestamp) as date, count() as clicks
            FROM clicks
            WHERE link_id = '${linkId}' AND timestamp >= '${dateFromStr}'
            GROUP BY date ORDER BY date
        `
        const clicksRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (clicksRes.ok) {
            const text = await clicksRes.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, clicks] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.clicks = parseInt(clicks) || 0
                }
            }
        }

        // Leads timeseries
        const leadsQuery = `
            SELECT toDate(timestamp) as date, count() as leads
            FROM leads
            WHERE link_id = '${linkId}' AND timestamp >= '${dateFromStr}'
            GROUP BY date ORDER BY date
        `
        const leadsRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (leadsRes.ok) {
            const text = await leadsRes.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, leads] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.leads = parseInt(leads) || 0
                }
            }
        }

        // Sales timeseries
        const salesQuery = `
            SELECT toDate(timestamp) as date, count() as sales, sum(amount) as revenue
            FROM sales
            WHERE link_id = '${linkId}' AND timestamp >= '${dateFromStr}'
            GROUP BY date ORDER BY date
        `
        const salesRes = await fetch(`${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` }
        })
        if (salesRes.ok) {
            const text = await salesRes.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, sales, revenue] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.sales = parseInt(sales) || 0
                    dateMap.get(date)!.revenue = parseInt(revenue) || 0
                }
            }
        }

        // Convert to sorted array
        const sortedDates = Array.from(dateMap.keys()).sort()
        for (const date of sortedDates) {
            timeseries.push({ date, ...dateMap.get(date)! })
        }

    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching link timeseries:', error)
    }

    return timeseries
}

// =============================================
// ENROLLED MISSION DETAIL FOR SELLER PROGRAM PAGE
// =============================================

/**
 * Get full details for an enrolled mission - for /seller/programs/[missionId]
 * Includes startup info, seller's personal stats, timeseries for chart, and resources
 */
export async function getEnrolledMissionDetail(missionId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check enrollment exists and is approved
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED'
            },
            include: {
                ShortLink: true,
                Mission: {
                    include: {
                        Workspace: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                Profile: {
                                    select: {
                                        logo_url: true,
                                        description: true,
                                        industry: true,
                                        website_url: true,
                                        pitch_deck_url: true,
                                        doc_url: true,
                                    }
                                },
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
                }
            }
        })

        if (!enrollment) {
            return { success: false, error: 'NOT_ENROLLED' }
        }

        const mission = enrollment.Mission
        const linkId = enrollment.ShortLink?.id

        // Get stats and timeseries from Tinybird
        const stats = linkId ? await getLinkStats(linkId) : { clicks: 0, leads: 0, sales: 0, revenue: 0 }
        const timeseries = linkId ? await getLinkTimeseries(linkId, 30) : []

        // Build tracking URL
        const customDomain = mission.Workspace.Domain?.[0]?.name
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : process.env.NEXT_PUBLIC_APP_URL

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                visibility: mission.visibility,
                // Multi-commission fields
                lead_enabled: mission.lead_enabled,
                lead_reward_amount: mission.lead_reward_amount,
                sale_enabled: mission.sale_enabled,
                sale_reward_amount: mission.sale_reward_amount,
                sale_reward_structure: mission.sale_reward_structure,
                recurring_enabled: mission.recurring_enabled,
                recurring_reward_amount: mission.recurring_reward_amount,
                recurring_reward_structure: mission.recurring_reward_structure,
            },
            startup: {
                id: mission.Workspace.id,
                name: mission.Workspace.name,
                slug: mission.Workspace.slug,
                logo_url: mission.Workspace.Profile?.logo_url || null,
                description: mission.Workspace.Profile?.description || null,
                industry: mission.Workspace.Profile?.industry || null,
                website_url: mission.Workspace.Profile?.website_url || null,
                pitch_deck_url: mission.Workspace.Profile?.pitch_deck_url || null,
                doc_url: mission.Workspace.Profile?.doc_url || null,
            },
            enrollment: {
                id: enrollment.id,
                status: enrollment.status,
                link_slug: enrollment.ShortLink?.slug || null,
                link_url: enrollment.ShortLink ? `${baseUrl}/s/${enrollment.ShortLink.slug}` : null,
                created_at: enrollment.created_at,
                isSoloEnrollment: !enrollment.group_mission_id && !enrollment.organization_mission_id,
            },
            stats,
            timeseries,
            resources: mission.Contents.map(c => ({
                id: c.id,
                type: c.type,
                url: c.url,
                title: c.title,
                description: c.description
            }))
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Failed to get enrolled mission detail:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}
