'use server'

import { prisma } from '@/lib/db'
import { setManyLinksInRedis, RedisLinkData } from '@/lib/redis'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/lib/admin'

// =============================================
// ADMIN SERVER ACTIONS
// =============================================

async function requireAdminUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAdmin(user.email)) {
        throw new Error('Unauthorized')
    }
    return user
}

/**
 * Synchronize all ShortLinks from PostgreSQL to Redis
 * This is a one-time migration action or can be used to repair Redis data
 * 
 * @returns Number of links synchronized
 */
export async function syncLinksToRedis(): Promise<{
    success: boolean
    count?: number
    error?: string
}> {
    console.log('[Admin] 🔄 Starting Redis sync...')

    try {
        // 1. Fetch ALL ShortLinks from PostgreSQL
        const shortLinks = await prisma.shortLink.findMany({
            select: {
                id: true,
                slug: true,
                original_url: true,
                workspace_id: true,
                affiliate_id: true,
            }
        })

        console.log(`[Admin] 📊 Found ${shortLinks.length} ShortLinks in PostgreSQL`)

        if (shortLinks.length === 0) {
            return { success: true, count: 0 }
        }

        // 2. Transform to Redis format
        const linksToSync = shortLinks.map(link => ({
            slug: link.slug,
            data: {
                url: link.original_url,
                linkId: link.id,
                workspaceId: link.workspace_id,
                affiliateId: link.affiliate_id,
            } as RedisLinkData
        }))

        // 3. Batch insert to Redis using pipeline
        const count = await setManyLinksInRedis(linksToSync)

        console.log(`[Admin] ✅ Synced ${count} links to Redis`)

        return { success: true, count }

    } catch (error) {
        console.error('[Admin] ❌ Sync failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// =============================================
// ADMIN: Mission Management
// =============================================

/**
 * Get all missions across all workspaces (admin view)
 */
export async function adminGetAllMissions(filter?: string) {
    try {
        await requireAdminUser()

        const where: any = {}
        if (filter && filter !== 'all') {
            where.status = filter
        }

        const missions = await prisma.mission.findMany({
            where,
            include: {
                Workspace: { select: { id: true, name: true, slug: true } },
                _count: {
                    select: {
                        MissionEnrollment: true,
                        OrganizationMissions: true,
                        GroupMissions: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, missions }
    } catch (error) {
        console.error('[Admin] Failed to get missions:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Hard delete a mission (admin only)
 * - Removes ShortLinks from Redis
 * - Deletes GroupMissions and OrganizationMissions
 * - Prisma CASCADE handles: MissionContent, MissionEnrollment, ProgramRequest
 */
export async function adminDeleteMission(missionId: string) {
    try {
        await requireAdminUser()

        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            include: {
                MissionEnrollment: {
                    include: { ShortLink: { select: { slug: true } } }
                }
            }
        })

        if (!mission) return { success: false, error: 'Mission not found' }

        // 1. Remove ShortLinks from Redis
        const { deleteLinkFromRedis } = await import('@/lib/redis')
        for (const enrollment of mission.MissionEnrollment) {
            if (enrollment.ShortLink?.slug) {
                await deleteLinkFromRedis(enrollment.ShortLink.slug)
            }
        }

        // 2. Delete GroupMissions (no cascade from Mission side)
        await prisma.groupMission.deleteMany({
            where: { mission_id: missionId }
        })

        // 3. Delete OrganizationMissions
        await prisma.organizationMission.deleteMany({
            where: { mission_id: missionId }
        })

        // 4. Hard delete mission (CASCADE: MissionContent, MissionEnrollment, ProgramRequest)
        await prisma.mission.delete({
            where: { id: missionId }
        })

        console.log(`[Admin] Deleted mission ${missionId} (${mission.title})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin] Failed to delete mission:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
