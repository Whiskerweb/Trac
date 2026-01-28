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
                        slug: true
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
                seller_email: r.Seller.email,
                seller_name: r.Seller.name,
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
 */
export async function approveProgramRequest(requestId: string) {
    try {
        const request = await prisma.programRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewed_at: new Date()
            },
            include: {
                Seller: true,
                Mission: true
            }
        })

        // Auto-create enrollment for approved request (only if seller has user_id)
        // Shadow sellers (no account yet) won't have user_id
        if (request.Seller.user_id) {
            await prisma.missionEnrollment.upsert({
                where: {
                    mission_id_user_id: {
                        mission_id: request.mission_id,
                        user_id: request.Seller.user_id
                    }
                },
                create: {
                    mission_id: request.mission_id,
                    user_id: request.Seller.user_id,
                    status: 'APPROVED'
                },
                update: {
                    status: 'APPROVED'
                }
            })
        }

        return { success: true }

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
