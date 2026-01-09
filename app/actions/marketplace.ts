'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

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
    custom_domain: string | null  // ✅ CNAME domain for preview URLs
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
        // Get all active missions with workspace domains
        const missions = await prisma.mission.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
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
        })

        // Get user's enrollments WITH link data
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: user.id },
            include: {
                ShortLink: true
            }
        })

        // Map enrollments by mission_id
        const enrollmentMap = new Map(
            enrollments.map(e => [e.mission_id, e])
        )

        // Collect all link IDs for affiliate stats
        const linkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)

        // Fetch REAL stats from Tinybird
        const statsMap = await getAffiliateStatsFromTinybird(linkIds)

        // Build base URL (fallback)
        const defaultBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Merge missions with enrollment data and REAL stats
        const result: MissionWithEnrollment[] = missions.map(mission => {
            const enrollment = enrollmentMap.get(mission.id)
            const linkId = enrollment?.ShortLink?.id
            const customDomain = mission.Workspace?.Domain?.[0]?.name || null

            // Build URL with custom domain if available
            const baseUrl = customDomain
                ? `https://${customDomain}`
                : defaultBaseUrl

            // Get real stats from Tinybird (or defaults)
            const realStats = linkId ? statsMap.get(linkId) : null
            const stats: AffiliateStats = realStats || {
                clicks: enrollment?.ShortLink?.clicks || 0,
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
                custom_domain: customDomain,  // ✅ Pass to UI
                enrollment: enrollment ? {
                    id: enrollment.id,
                    status: enrollment.status,
                    link: enrollment.ShortLink ? {
                        id: enrollment.ShortLink.id,
                        slug: enrollment.ShortLink.slug,
                        full_url: `${baseUrl}/s/${enrollment.ShortLink.slug}`  // ✅ Use custom domain
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
 * Join a mission - Creates enrollment + Short Link with CNAME-AWARE ATTRIBUTION
 * 
 * Link Structure: https://[CUSTOM_DOMAIN]/s/[MISSION_SLUG]/[AFFILIATE_CODE]
 */
export async function joinMission(missionId: string): Promise<{
    success: boolean
    enrollment?: {
        id: string
        link_url: string
        has_custom_domain: boolean
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

        // 3. 🌐 CNAME LOGIC: Fetch verified domain for workspace
        const verifiedDomain = await prisma.domain.findFirst({
            where: {
                workspace_id: mission.workspace_id,
                verified: true
            }
        })
        const customDomain = verifiedDomain?.name || null

        // 4. 📝 Generate SEMANTIC slug: mission-slug/affiliate-code
        const missionSlug = mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = user.id.slice(0, 8) // Short unique code
        const fullSlug = `${missionSlug}/${affiliateCode}`

        // 5. AUTO-PARTNER CHECK (One-Click Join)
        // Ensure user has a Partner record before creating link
        await prisma.partner.upsert({
            where: {
                // Ideally we'd use user_id unique constraint, but schema has unique on [program_id, email]
                // For global partners (program_id=null), we check email + null program
                program_id_email: {
                    email: user.email!,
                    program_id: "global" // Using a dummy value that won't match, as we don't rely on this upsert for global partners
                }
            },
            create: {
                // WE WON'T USE THIS BLOCK directly, see below
                email: user.email!,
                tenant_id: "temp"
            },
            update: {}
        }).catch(() => { }) // Ignore standard upsert, we use custom logic below

        // CORRECT LOGIC: Check for ANY partner record for this user
        const existingPartner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!existingPartner) {
            console.log('[Marketplace] 👤 Creating Global Partner for new affiliate:', user.email)
            // Use the action logic directly to ensure consistency
            const { createGlobalPartner } = await import('@/app/actions/partners')
            await createGlobalPartner({
                userId: user.id,
                email: user.email!,
                name: user.user_metadata?.full_name
            })
        }

        // 5. Create the ShortLink with DUAL ATTRIBUTION
        const shortLink = await prisma.shortLink.create({
            data: {
                slug: fullSlug,
                original_url: mission.target_url,
                workspace_id: mission.workspace_id, // Startup owner
                affiliate_id: user.id,               // Affiliate owner
                clicks: 0,
            }
        })

        // 6. ✅ REDIS with CUSTOM DOMAIN: shortlink:[domain]:[slug]
        const { setLinkInRedis, buildLinkKey } = await import('@/lib/redis')

        // 🔍 PRE-WRITE DEBUG LOG
        const redisKey = buildLinkKey(shortLink.slug, customDomain || undefined)
        console.log('========================================')
        console.log('[Marketplace] 💾 REDIS WRITE ATTEMPT')
        console.log('[Marketplace] Redis Key will be:', redisKey)
        console.log('[Marketplace] Custom Domain:', customDomain || '(none - using default)')
        console.log('========================================')

        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            affiliateId: shortLink.affiliate_id,
        }, customDomain || undefined)  // ✅ Pass custom domain!

        console.log('[Marketplace] 🔗 Created link:', shortLink.slug)
        console.log('[Marketplace] 🌐 Domain:', customDomain || 'default')
        console.log('[Marketplace] 🔐 Attribution: Startup', mission.workspace_id, '→ Affiliate', user.id)

        // 7. Create MissionEnrollment linked to the ShortLink
        const enrollment = await prisma.missionEnrollment.create({
            data: {
                mission_id: missionId,
                user_id: user.id,
                status: 'APPROVED',
                link_id: shortLink.id,
            }
        })

        console.log('[Marketplace] ✅ Enrollment created:', enrollment.id)

        // 8. Build full URL with CUSTOM DOMAIN if available
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
        const linkUrl = `${baseUrl}/s/${fullSlug}`

        // 9. Force refresh of Partner pages to show new program
        revalidatePath('/partner')
        revalidatePath('/partner/marketplace')

        return {
            success: true,
            enrollment: {
                id: enrollment.id,
                link_url: linkUrl,
                has_custom_domain: !!customDomain,
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
                Mission: true,
                ShortLink: true,
            },
            orderBy: { created_at: 'desc' }
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        return {
            success: true,
            enrollments: enrollments.map(e => ({
                id: e.id,
                mission: {
                    id: e.Mission.id,
                    title: e.Mission.title,
                    reward: e.Mission.reward,
                },
                link: e.ShortLink ? {
                    slug: e.ShortLink.slug,
                    full_url: `${baseUrl}/s/${e.ShortLink.slug}`,
                    clicks: e.ShortLink.clicks,
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
