'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

// =============================================
// MARKETPLACE - Server Actions
// =============================================

interface AffiliateStats {
    clicks: number
    sales: number
    revenue: number
}

interface MissionWithEnrollment {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    workspace_id: string
    created_at: Date
    // User's enrollment status
    enrollment: {
        id: string
        status: string
        link: {
            id: string
            slug: string
            full_url: string
        } | null
        stats: AffiliateStats
    } | null
}

/**
 * Get all ACTIVE missions with user's enrollment status and stats
 */
export async function getAllMissions(): Promise<{
    success: boolean
    missions?: MissionWithEnrollment[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Get all active missions
        const missions = await prisma.mission.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' }
        })

        // Get user's enrollments WITH link data for clicks
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: user.id },
            include: {
                link: true
            }
        })

        // Map enrollments by mission_id for quick lookup
        const enrollmentMap = new Map(
            enrollments.map(e => [e.mission_id, e])
        )

        // Build base URL for short links
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Merge missions with enrollment data and stats
        const result: MissionWithEnrollment[] = missions.map(mission => {
            const enrollment = enrollmentMap.get(mission.id)

            // Calculate stats from link clicks (sales/revenue mocked for now)
            const clicks = enrollment?.link?.clicks || 0
            // TODO: Fetch from Tinybird when integrated
            const stats: AffiliateStats = {
                clicks,
                sales: 0,  // Will come from Tinybird
                revenue: 0, // Will come from Tinybird
            }

            return {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                workspace_id: mission.workspace_id,
                created_at: mission.created_at,
                enrollment: enrollment ? {
                    id: enrollment.id,
                    status: enrollment.status,
                    link: enrollment.link ? {
                        id: enrollment.link.id,
                        slug: enrollment.link.slug,
                        full_url: `${baseUrl}/s/${enrollment.link.slug}`
                    } : null,
                    stats
                } : null
            }
        })

        return { success: true, missions: result }

    } catch (error) {
        console.error('[Marketplace] ❌ Error fetching missions:', error)
        return { success: false, error: 'Failed to fetch missions' }
    }
}

/**
 * Join a mission - Creates enrollment + Short Link
 */
export async function joinMission(missionId: string): Promise<{
    success: boolean
    enrollment?: {
        id: string
        link_url: string
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // 1. Verify mission exists and is active
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, status: 'ACTIVE' }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found or inactive' }
        }

        // 2. Check if already enrolled
        const existingEnrollment = await prisma.missionEnrollment.findFirst({
            where: { mission_id: missionId, user_id: user.id }
        })

        if (existingEnrollment) {
            return { success: false, error: 'Already enrolled in this mission' }
        }

        // 3. Generate unique short link slug
        const slug = nanoid(7)

        // 4. Create the ShortLink with DUAL ATTRIBUTION
        const shortLink = await prisma.shortLink.create({
            data: {
                slug,
                original_url: mission.target_url,
                workspace_id: mission.workspace_id, // Startup owner (for API/analytics)
                affiliate_id: user.id,               // Affiliate owner (for commission tracking)
                clicks: 0,
            }
        })

        console.log('[Marketplace] 🔗 Created link:', shortLink.slug, '→', mission.target_url)

        // 5. Create MissionEnrollment linked to the ShortLink
        const enrollment = await prisma.missionEnrollment.create({
            data: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED', // MVP: Auto-approve
                link_id: shortLink.id,
            }
        })

        console.log('[Marketplace] ✅ Enrollment created:', enrollment.id)

        // Build full URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const linkUrl = `${baseUrl}/s/${slug}`

        return {
            success: true,
            enrollment: {
                id: enrollment.id,
                link_url: linkUrl,
            }
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Error joining mission:', error)
        return { success: false, error: 'Failed to join mission' }
    }
}

/**
 * Get user's enrollments with performance stats
 */
export async function getMyEnrollments(): Promise<{
    success: boolean
    enrollments?: {
        id: string
        mission: {
            id: string
            title: string
            reward: string
        }
        link: {
            slug: string
            full_url: string
            clicks: number
        } | null
        status: string
        created_at: Date
    }[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: user.id },
            include: {
                mission: true,
                link: true,
            },
            orderBy: { created_at: 'desc' }
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        return {
            success: true,
            enrollments: enrollments.map(e => ({
                id: e.id,
                mission: {
                    id: e.mission.id,
                    title: e.mission.title,
                    reward: e.mission.reward,
                },
                link: e.link ? {
                    slug: e.link.slug,
                    full_url: `${baseUrl}/s/${e.link.slug}`,
                    clicks: e.link.clicks,
                } : null,
                status: e.status,
                created_at: e.created_at,
            }))
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Error fetching enrollments:', error)
        return { success: false, error: 'Failed to fetch enrollments' }
    }
}
