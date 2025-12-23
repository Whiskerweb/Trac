'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

// =============================================
// TINYBIRD CONFIGURATION
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

// =============================================
// TYPES
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

// =============================================
// TINYBIRD INTEGRATION
// =============================================

/**
 * Fetch affiliate stats from Tinybird for given link IDs
 * Returns clicks, sales count, and revenue for each link (properly attributed)
 */
async function getAffiliateStatsFromTinybird(linkIds: string[]): Promise<Map<string, AffiliateStats>> {
    const statsMap = new Map<string, AffiliateStats>()

    if (linkIds.length === 0 || !TINYBIRD_TOKEN) {
        return statsMap
    }

    // Initialize all links with zero stats
    linkIds.forEach(id => {
        statsMap.set(id, { clicks: 0, sales: 0, revenue: 0 })
    })

    try {
        const linkIdList = linkIds.map(id => `'${id}'`).join(',')

        // 1. GET CLICKS by link_id
        const clicksQuery = `SELECT link_id, count() as clicks FROM clicks WHERE link_id IN (${linkIdList}) GROUP BY link_id`
        const clicksResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (clicksResponse.ok) {
            const clicksText = await clicksResponse.text()
            const lines = clicksText.trim().split('\n')
            for (const line of lines) {
                const [link_id, clicks] = line.split('\t')
                if (link_id && statsMap.has(link_id)) {
                    statsMap.get(link_id)!.clicks = parseInt(clicks) || 0
                }
            }
        }

        // 2. Build click_id -> link_id map
        const clickToLinkQuery = `SELECT click_id, link_id FROM clicks WHERE link_id IN (${linkIdList})`
        const clickToLinkResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clickToLinkQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        const clickToLinkMap = new Map<string, string>()

        if (clickToLinkResponse.ok) {
            const text = await clickToLinkResponse.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [click_id, link_id] = line.split('\t')
                if (click_id && link_id) {
                    clickToLinkMap.set(click_id, link_id)
                }
            }
        }

        // 3. GET SALES and attribute to links
        if (clickToLinkMap.size > 0) {
            const clickIdList = Array.from(clickToLinkMap.keys()).map(id => `'${id}'`).join(',')
            const salesQuery = `SELECT click_id, amount FROM sales WHERE click_id IN (${clickIdList})`

            const salesResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (salesResponse.ok) {
                const salesText = await salesResponse.text()
                for (const line of salesText.trim().split('\n').filter(l => l.trim())) {
                    const [click_id, amount] = line.split('\t')
                    const link_id = clickToLinkMap.get(click_id)

                    if (link_id && statsMap.has(link_id)) {
                        const stats = statsMap.get(link_id)!
                        stats.sales += 1
                        stats.revenue += (parseInt(amount) || 0) / 100
                    }
                }
            }
        }

        console.log('[Marketplace] 📊 Fetched stats for', linkIds.length, 'links')

    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching Tinybird stats:', error)
    }

    return statsMap
}

// =============================================
// SECURITY HELPERS
// =============================================

/**
 * Validate UUID format to prevent SQL injection
 */
function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// =============================================
// SERVER ACTIONS
// =============================================

/**
 * Get all ACTIVE missions with user's enrollment status and REAL stats from Tinybird
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

    // Security: Validate user ID format
    if (!isValidUUID(user.id)) {
        console.error('[Marketplace] ⚠️ Invalid user ID format')
        return { success: false, error: 'Invalid user ID' }
    }

    try {
        // Get all active missions
        const missions = await prisma.mission.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' }
        })

        // Get user's enrollments WITH link data
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: user.id },
            include: {
                link: true
            }
        })

        // Map enrollments by mission_id
        const enrollmentMap = new Map(
            enrollments.map(e => [e.mission_id, e])
        )

        // Collect all link IDs for affiliate stats
        const linkIds = enrollments
            .filter(e => e.link)
            .map(e => e.link!.id)

        // Fetch REAL stats from Tinybird
        const statsMap = await getAffiliateStatsFromTinybird(linkIds)

        // Build base URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Merge missions with enrollment data and REAL stats
        const result: MissionWithEnrollment[] = missions.map(mission => {
            const enrollment = enrollmentMap.get(mission.id)
            const linkId = enrollment?.link?.id

            // Get real stats from Tinybird (or defaults)
            const realStats = linkId ? statsMap.get(linkId) : null
            const stats: AffiliateStats = realStats || {
                clicks: enrollment?.link?.clicks || 0,
                sales: 0,
                revenue: 0,
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
 * Join a mission - Creates enrollment + Short Link with DUAL ATTRIBUTION
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

    // Security: Validate IDs
    if (!isValidUUID(user.id) || !isValidUUID(missionId)) {
        return { success: false, error: 'Invalid ID format' }
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
                workspace_id: mission.workspace_id, // Startup owner
                affiliate_id: user.id,               // Affiliate owner
                clicks: 0,
            }
        })

        // ✅ DUAL WRITE: Sync to Redis for low-latency lookups
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            affiliateId: shortLink.affiliate_id,
        })

        console.log('[Marketplace] 🔗 Created link:', shortLink.slug, '→', mission.target_url)
        console.log('[Marketplace] 🔐 Attribution: Startup', mission.workspace_id, '→ Affiliate', user.id)

        // 5. Create MissionEnrollment linked to the ShortLink
        const enrollment = await prisma.missionEnrollment.create({
            data: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED',
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
