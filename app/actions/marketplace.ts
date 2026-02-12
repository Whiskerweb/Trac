'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { IS_MOCK_MODE } from '@/lib/config/constants'
import { MOCK_ENROLLMENTS, MOCK_GLOBAL_STATS } from '@/lib/mock/data'

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
    leads: number
    sales: number
    revenue: number
}

type MissionVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'

interface MissionWithEnrollment {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    workspace_id: string
    created_at: Date
    visibility: MissionVisibility  // ✅ Visibility type for UI handling
    custom_domain: string | null   // ✅ CNAME domain for preview URLs
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
        statsMap.set(id, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
    })

    // SECURITY: Filter to only valid UUIDs to prevent SQL injection
    const validLinkIds = linkIds.filter(id => isValidUUID(id))
    if (validLinkIds.length === 0) {
        return statsMap
    }

    try {
        const linkIdList = validLinkIds.map(id => `'${id}'`).join(',')

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

        // 2. GET LEADS by link_id (leads table has link_id column)
        const leadsQuery = `SELECT link_id, count() as leads FROM leads WHERE link_id IN (${linkIdList}) GROUP BY link_id`
        const leadsResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (leadsResponse.ok) {
            const leadsText = await leadsResponse.text()
            for (const line of leadsText.trim().split('\n').filter(l => l.trim())) {
                const [link_id, leads] = line.split('\t')
                if (link_id && statsMap.has(link_id)) {
                    statsMap.get(link_id)!.leads = parseInt(leads) || 0
                }
            }
        }

        // 3. GET SALES directly by link_id (sales table has link_id column!)
        const salesQuery = `SELECT link_id, count() as sales, sum(amount) as revenue FROM sales WHERE link_id IN (${linkIdList}) GROUP BY link_id`
        const salesResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (salesResponse.ok) {
            const salesText = await salesResponse.text()
            for (const line of salesText.trim().split('\n').filter(l => l.trim())) {
                const [link_id, sales, revenue] = line.split('\t')
                if (link_id && statsMap.has(link_id)) {
                    const stats = statsMap.get(link_id)!
                    stats.sales = parseInt(sales) || 0
                    stats.revenue = parseInt(revenue) || 0 // Keep in cents
                }
            }
        }

        console.log('[Marketplace] 📊 Fetched stats for', linkIds.length, 'links')

    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching Tinybird stats:', error)
    }

    return statsMap
}

/**
 * Get TOTAL affiliate stats by user_id
 *
 * Strategy: Query Tinybird by link_id (always reliable) rather than affiliate_id
 * (which was null for clicks tracked during the Partner→Seller migration period).
 *
 * Steps:
 * 1. Get all ShortLink IDs belonging to this user from Prisma
 * 2. Query Tinybird clicks/sales by link_id IN (...)
 * 3. Also try affiliate_id query as fallback for any clicks not tied to a link
 */
export async function getAffiliateStatsByUserId(userId: string): Promise<AffiliateStats> {
    const stats: AffiliateStats = { clicks: 0, leads: 0, sales: 0, revenue: 0 }

    if (!userId || !TINYBIRD_TOKEN) {
        return stats
    }

    // SECURITY: Validate UUID format to prevent SQL injection
    if (!isValidUUID(userId)) {
        console.warn('[Marketplace] ⚠️ Invalid userId format, rejecting:', userId.slice(0, 20))
        return stats
    }

    try {
        // Step 1: Get all link IDs for this user from Prisma
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: userId },
            include: { ShortLink: true }
        })

        const linkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)
            .filter(id => isValidUUID(id))

        if (linkIds.length > 0) {
            const linkIdList = linkIds.map(id => `'${id}'`).join(',')

            // 1. GET TOTAL CLICKS by link_id
            const clicksQuery = `SELECT count() as clicks FROM clicks WHERE link_id IN (${linkIdList})`
            const clicksResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (clicksResponse.ok) {
                const text = await clicksResponse.text()
                stats.clicks = parseInt(text.trim()) || 0
            }

            // 2. GET TOTAL LEADS by link_id (same as clicks/sales - most reliable)
            const leadsQuery = `SELECT count() as leads FROM leads WHERE link_id IN (${linkIdList})`
            const leadsResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (leadsResponse.ok) {
                const text = await leadsResponse.text()
                stats.leads = parseInt(text.trim()) || 0
            }

            // 3. GET TOTAL SALES by link_id
            const salesQuery = `SELECT count() as sales, sum(amount) as revenue FROM sales WHERE link_id IN (${linkIdList})`
            const salesResponse = await fetch(
                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
            )

            if (salesResponse.ok) {
                const text = await salesResponse.text()
                const [sales, revenue] = text.trim().split('\t')
                stats.sales = parseInt(sales) || 0
                stats.revenue = parseInt(revenue) || 0
            }
        }


        console.log(`[Marketplace] 📊 Total stats for affiliate ${userId} (${linkIds.length} links): ${stats.clicks} clicks, ${stats.leads} leads, ${stats.sales} sales, ${stats.revenue}€`)

    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching affiliate stats:', error)
    }

    return stats
}

/**
 * Get global stats for the current authenticated partner
 * Wrapper that handles auth and calls getAffiliateStatsByUserId
 */
export async function getMyGlobalStats(): Promise<{
    success: boolean
    stats?: AffiliateStats
    userId?: string
    error?: string
}> {
    // Mock mode: return fake data for UX testing
    if (IS_MOCK_MODE) {
        return {
            success: true,
            stats: MOCK_GLOBAL_STATS,
            userId: 'mock-user-id'
        }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const stats = await getAffiliateStatsByUserId(user.id)
        return { success: true, stats, userId: user.id }
    } catch (error) {
        console.error('[Marketplace] ❌ Error getting global stats:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

/**
 * Get global stats WITH timeseries for the seller dashboard chart
 * Returns both aggregate totals and daily timeseries for the last 30 days
 */
export async function getMyGlobalStatsWithTimeseries(days: number = 30): Promise<{
    success: boolean
    stats?: AffiliateStats
    timeseries?: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>
    userId?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Get aggregate stats
        const stats = await getAffiliateStatsByUserId(user.id)

        // Get timeseries data
        const timeseries = await getAffiliateTimeseriesByUserId(user.id, days)

        return { success: true, stats, timeseries, userId: user.id }
    } catch (error) {
        console.error('[Marketplace] ❌ Error getting global stats with timeseries:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}

/**
 * Fetch daily timeseries data for a seller from Tinybird
 */
async function getAffiliateTimeseriesByUserId(
    userId: string,
    days: number = 30
): Promise<Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>> {
    const timeseries: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }> = []

    if (!userId || !TINYBIRD_TOKEN) {
        return timeseries
    }

    // SECURITY: Validate UUID format
    if (!isValidUUID(userId)) {
        return timeseries
    }

    try {
        // Get all link IDs for this user
        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: userId },
            include: { ShortLink: true }
        })

        const linkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)
            .filter(id => isValidUUID(id))

        if (linkIds.length === 0) {
            return timeseries
        }

        const linkIdList = linkIds.map(id => `'${id}'`).join(',')

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

        // 1. GET CLICKS TIMESERIES
        const clicksQuery = `
            SELECT toDate(timestamp) as date, count() as clicks
            FROM clicks
            WHERE link_id IN (${linkIdList})
            AND timestamp >= '${dateFromStr}'
            GROUP BY date
            ORDER BY date
        `
        const clicksResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(clicksQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (clicksResponse.ok) {
            const text = await clicksResponse.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, clicks] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.clicks = parseInt(clicks) || 0
                }
            }
        }

        // 2. GET LEADS TIMESERIES
        const leadsQuery = `
            SELECT toDate(timestamp) as date, count() as leads
            FROM leads
            WHERE link_id IN (${linkIdList})
            AND timestamp >= '${dateFromStr}'
            GROUP BY date
            ORDER BY date
        `
        const leadsResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(leadsQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (leadsResponse.ok) {
            const text = await leadsResponse.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, leads] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.leads = parseInt(leads) || 0
                }
            }
        }

        // 3. GET SALES TIMESERIES
        const salesQuery = `
            SELECT toDate(timestamp) as date, count() as sales, sum(amount) as revenue
            FROM sales
            WHERE link_id IN (${linkIdList})
            AND timestamp >= '${dateFromStr}'
            GROUP BY date
            ORDER BY date
        `
        const salesResponse = await fetch(
            `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(salesQuery)}`,
            { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
        )

        if (salesResponse.ok) {
            const text = await salesResponse.text()
            for (const line of text.trim().split('\n').filter(l => l.trim())) {
                const [date, sales, revenue] = line.split('\t')
                if (date && dateMap.has(date)) {
                    dateMap.get(date)!.sales = parseInt(sales) || 0
                    dateMap.get(date)!.revenue = parseInt(revenue) || 0
                }
            }
        }

        // Convert map to sorted array
        const sortedDates = Array.from(dateMap.keys()).sort()
        for (const date of sortedDates) {
            const data = dateMap.get(date)!
            timeseries.push({ date, ...data })
        }

        console.log(`[Marketplace] 📈 Timeseries for ${userId}: ${timeseries.length} days`)

    } catch (error) {
        console.error('[Marketplace] ⚠️ Error fetching timeseries:', error)
    }

    return timeseries
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
// COUNTRY FILTERING HELPERS
// =============================================

type CountryFilterType = 'ALL' | 'INCLUDE' | 'EXCLUDE'

/**
 * Check if a seller is eligible for a mission based on country filtering
 *
 * @param missionFilterType - The mission's country filter type (ALL, INCLUDE, EXCLUDE)
 * @param missionCountries - Array of ISO 3166-1 alpha-2 country codes
 * @param sellerCountry - The seller's country code (e.g., 'FR', 'DE')
 * @returns true if seller is eligible, false otherwise
 */
function isSellerEligibleForMission(
    missionFilterType: CountryFilterType,
    missionCountries: string[],
    sellerCountry: string | null
): boolean {
    // If no filter, all sellers are eligible
    if (missionFilterType === 'ALL') {
        return true
    }

    // If seller has no country set, we can't filter - default to allowing access
    // This ensures sellers who haven't set their country can still see missions
    if (!sellerCountry) {
        return true
    }

    const normalizedSellerCountry = sellerCountry.toUpperCase()
    const normalizedMissionCountries = missionCountries.map(c => c.toUpperCase())

    if (missionFilterType === 'INCLUDE') {
        // Only sellers from these countries can see the mission
        return normalizedMissionCountries.includes(normalizedSellerCountry)
    }

    if (missionFilterType === 'EXCLUDE') {
        // All sellers except those from these countries can see the mission
        return !normalizedMissionCountries.includes(normalizedSellerCountry)
    }

    return true
}

// =============================================
// SERVER ACTIONS
// =============================================

/**
 * Get all ACTIVE missions with user's enrollment status and REAL stats from Tinybird
 * Filters missions based on country eligibility
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
        // Get seller's country for filtering (from SellerProfile via Profile relation)
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            include: {
                Profile: {
                    select: { country: true }
                }
            }
        })
        const sellerCountry = seller?.Profile?.country || null

        // Get all active PUBLIC and PRIVATE missions
        // INVITE_ONLY missions are NOT shown in marketplace (they require invitation link)
        const allMissions = await prisma.mission.findMany({
            where: {
                status: 'ACTIVE',
                visibility: {
                    in: ['PUBLIC', 'PRIVATE']
                }
            },
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

        // Filter missions based on country eligibility
        const missions = allMissions.filter(mission => {
            const filterType = (mission.country_filter_type || 'ALL') as CountryFilterType
            const filterCountries = mission.country_filter_list || []
            return isSellerEligibleForMission(filterType, filterCountries, sellerCountry)
        })

        console.log(`[Marketplace] 🌍 Filtered ${allMissions.length} missions to ${missions.length} for seller country: ${sellerCountry || 'not set'}`)

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
                leads: 0,
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
                visibility: mission.visibility as MissionVisibility,  // ✅ Visibility for UI
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
 * Join a mission - Handles visibility-based access:
 * - PUBLIC: Direct enrollment with Short Link
 * - PRIVATE: Creates a ProgramRequest (needs approval)
 * - INVITE_ONLY: Rejected (must use /invite/[code] route)
 *
 * Link Structure: https://[CUSTOM_DOMAIN]/s/[MISSION_SLUG]/[AFFILIATE_CODE]
 */
export async function joinMission(missionId: string): Promise<{
    success: boolean
    type?: 'enrolled' | 'requested'  // ✅ Distinguish between direct join and request
    enrollment?: {
        id: string
        link_url: string
        has_custom_domain: boolean
    }
    request?: {
        id: string
        status: string
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

        // 1b. Check visibility - INVITE_ONLY requires invite link
        if (mission.visibility === 'INVITE_ONLY') {
            console.log(`[Marketplace] ⛔ Mission ${missionId} is INVITE_ONLY - cannot join directly`)
            return { success: false, error: 'This mission requires an invitation link' }
        }

        // 1c. Check country eligibility (from SellerProfile via Profile relation)
        const sellerWithProfile = await prisma.seller.findFirst({
            where: { user_id: user.id },
            include: {
                Profile: {
                    select: { country: true }
                }
            }
        })
        const sellerCountry = sellerWithProfile?.Profile?.country || null

        const filterType = (mission.country_filter_type || 'ALL') as CountryFilterType
        const filterCountries = mission.country_filter_list || []

        if (!isSellerEligibleForMission(filterType, filterCountries, sellerCountry)) {
            console.log(`[Marketplace] ⛔ Seller from ${sellerCountry} not eligible for mission ${missionId} (filter: ${filterType})`)
            return { success: false, error: 'This mission is not available in your country' }
        }

        // 2. Check if already enrolled solo (group enrollment is separate)
        const existingEnrollment = await prisma.missionEnrollment.findFirst({
            where: { mission_id: missionId, user_id: user.id, group_mission_id: null }
        })

        if (existingEnrollment) {
            return { success: false, error: 'Already enrolled in this mission' }
        }

        // ==============================================
        // PRIVATE MISSIONS: Create request instead of enrollment
        // ==============================================
        if (mission.visibility === 'PRIVATE') {
            // Get or create seller (need seller ID for request, not full profile)
            let sellerId = sellerWithProfile?.id
            if (!sellerId) {
                console.log('[Marketplace] 👤 Creating Global Seller for private request:', user.email)
                const { createGlobalSeller } = await import('@/app/actions/sellers')
                await createGlobalSeller({
                    userId: user.id,
                    email: user.email!,
                    name: user.user_metadata?.full_name
                })
                const newSeller = await prisma.seller.findFirst({
                    where: { user_id: user.id }
                })
                sellerId = newSeller?.id
            }

            if (!sellerId) {
                return { success: false, error: 'Failed to create seller profile' }
            }

            // Check for existing request
            const existingRequest = await prisma.programRequest.findFirst({
                where: { seller_id: sellerId, mission_id: missionId }
            })

            if (existingRequest) {
                if (existingRequest.status === 'PENDING') {
                    return { success: false, error: 'Request already pending' }
                } else if (existingRequest.status === 'REJECTED') {
                    return { success: false, error: 'Your previous request was rejected' }
                }
            }

            // Create new request
            const request = await prisma.programRequest.create({
                data: {
                    seller_id: sellerId,
                    mission_id: missionId,
                    status: 'PENDING'
                }
            })

            console.log(`[Marketplace] 📝 Created request for PRIVATE mission: seller=${sellerId}, mission=${missionId}`)

            revalidatePath('/seller')
            revalidatePath('/seller/marketplace')

            return {
                success: true,
                type: 'requested',
                request: {
                    id: request.id,
                    status: request.status
                }
            }
        }

        // ==============================================
        // PUBLIC MISSIONS: Direct enrollment
        // ==============================================

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
        await prisma.seller.upsert({
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
        const existingPartner = await prisma.seller.findFirst({
            where: { user_id: user.id }
        })

        if (!existingPartner) {
            console.log('[Marketplace] 👤 Creating Global Partner for new affiliate:', user.email)
            // Use the action logic directly to ensure consistency
            const { createGlobalSeller } = await import('@/app/actions/sellers')
            await createGlobalSeller({
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
            sellerId: shortLink.affiliate_id,
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

        // 9. Force refresh of Seller pages to show new program
        revalidatePath('/seller')
        revalidatePath('/seller/marketplace')

        return {
            success: true,
            type: 'enrolled',  // ✅ PUBLIC = direct enrollment
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
 * Join a mission with the seller's group.
 * Creates GroupMission + enrolls all active members.
 */
export async function joinMissionWithGroup(missionId: string): Promise<{
    success: boolean
    error?: string
}> {
    const { enrollGroupInMission } = await import('@/app/actions/group-actions')
    return enrollGroupInMission(missionId)
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
        startup: {
            name: string
            logo_url: string | null
            industry: string | null
        }
        link: {
            slug: string
            full_url: string
            clicks: number
            leads: number
            sales: number
            revenue: number
        } | null
        organization?: {
            id: string
            name: string
            memberReward: string | null
        } | null
        group?: {
            id: string
            name: string
            creatorId: string
        } | null
        status: string
        created_at: Date
    }[]
    sellerId?: string | null
    error?: string
}> {
    // Mock mode: return fake enrollments for UX testing
    if (IS_MOCK_MODE) {
        return {
            success: true,
            enrollments: MOCK_ENROLLMENTS
        }
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Fetch seller ID for group creator comparison
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true },
        })

        const enrollments = await prisma.missionEnrollment.findMany({
            where: { user_id: user.id },
            include: {
                Mission: {
                    include: {
                        Workspace: {
                            include: {
                                Domain: {
                                    where: { verified: true },
                                    take: 1
                                },
                                Profile: true  // Include startup profile (logo, industry, etc.)
                            }
                        }
                    }
                },
                ShortLink: true,
            },
            orderBy: { created_at: 'desc' }
        })

        // Get link IDs for Tinybird stats lookup
        const linkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)

        // Fetch real stats from Tinybird
        const tinybirdStats = await getAffiliateStatsFromTinybird(linkIds)

        // Fetch organization info for org-enrolled missions
        const orgMissionIds = enrollments
            .map(e => e.organization_mission_id)
            .filter((id): id is string => !!id)

        const orgMissionsMap = new Map<string, { id: string; name: string; memberReward: string | null }>()
        if (orgMissionIds.length > 0) {
            const orgMissions = await prisma.organizationMission.findMany({
                where: { id: { in: orgMissionIds } },
                include: { Organization: { select: { id: true, name: true } } },
            })
            for (const om of orgMissions) {
                orgMissionsMap.set(om.id, {
                    id: om.Organization.id,
                    name: om.Organization.name,
                    memberReward: om.member_reward,
                })
            }
        }

        // Fetch group info for group-enrolled missions
        const groupMissionIds = enrollments
            .map(e => e.group_mission_id)
            .filter((id): id is string => !!id)

        const groupMissionsMap = new Map<string, { id: string; name: string; creatorId: string }>()
        if (groupMissionIds.length > 0) {
            const groupMissions = await prisma.groupMission.findMany({
                where: { id: { in: groupMissionIds } },
                include: { Group: { select: { id: true, name: true, creator_id: true } } },
            })
            for (const gm of groupMissions) {
                groupMissionsMap.set(gm.id, {
                    id: gm.Group.id,
                    name: gm.Group.name,
                    creatorId: gm.Group.creator_id,
                })
            }
        }

        return {
            success: true,
            sellerId: seller?.id || null,
            enrollments: enrollments.map(e => {
                // Get custom domain for this mission's workspace
                const customDomain = e.Mission.Workspace.Domain?.[0]?.name
                const baseUrl = customDomain
                    ? `https://${customDomain}`
                    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

                // Get stats from Tinybird (or fallback to 0)
                const stats = e.ShortLink ? tinybirdStats.get(e.ShortLink.id) : null

                // Get organization info if enrolled via org
                const orgInfo = e.organization_mission_id
                    ? orgMissionsMap.get(e.organization_mission_id) || null
                    : null

                return {
                    id: e.id,
                    mission: {
                        id: e.Mission.id,
                        title: e.Mission.title,
                        reward: e.Mission.reward,
                    },
                    startup: {
                        name: e.Mission.Workspace.name,
                        logo_url: e.Mission.Workspace.Profile?.logo_url || null,
                        industry: e.Mission.Workspace.Profile?.industry || null,
                    },
                    link: e.ShortLink ? {
                        slug: e.ShortLink.slug,
                        full_url: `${baseUrl}/s/${e.ShortLink.slug}`,
                        clicks: stats?.clicks || 0,
                        leads: stats?.leads || 0,
                        sales: stats?.sales || 0,
                        revenue: stats?.revenue || 0,
                    } : null,
                    organization: orgInfo,
                    group: e.group_mission_id
                        ? groupMissionsMap.get(e.group_mission_id) || null
                        : null,
                    status: e.status,
                    created_at: e.created_at,
                }
            })
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Error fetching enrollments:', error)
        return { success: false, error: 'Failed to fetch enrollments' }
    }
}

// =============================================
// INVITE-ONLY MISSION ACCESS
// =============================================

/**
 * Join an INVITE_ONLY mission using an invite code
 * This bypasses normal visibility checks since the user has the invite link
 */
export async function joinMissionByInviteCode(inviteCode: string): Promise<{
    success: boolean
    enrollment?: {
        id: string
        link_url: string
        has_custom_domain: boolean
    }
    mission?: {
        id: string
        title: string
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Security: Validate invite code format (alphanumeric, reasonable length)
    if (!inviteCode || inviteCode.length < 6 || inviteCode.length > 32 || !/^[a-zA-Z0-9]+$/.test(inviteCode)) {
        return { success: false, error: 'Invalid invitation code' }
    }

    try {
        // 1. Find mission by invite code
        const mission = await prisma.mission.findFirst({
            where: {
                invite_code: inviteCode,
                status: 'ACTIVE'
            }
        })

        if (!mission) {
            console.log(`[Marketplace] ⛔ Invalid invite code: ${inviteCode}`)
            return { success: false, error: 'Invalid or expired invitation code' }
        }

        // 2. Check country eligibility (even for invited users)
        const sellerWithProfile = await prisma.seller.findFirst({
            where: { user_id: user.id },
            include: {
                Profile: {
                    select: { country: true }
                }
            }
        })
        const sellerCountry = sellerWithProfile?.Profile?.country || null

        const filterType = (mission.country_filter_type || 'ALL') as CountryFilterType
        const filterCountries = mission.country_filter_list || []

        if (!isSellerEligibleForMission(filterType, filterCountries, sellerCountry)) {
            console.log(`[Marketplace] ⛔ Seller from ${sellerCountry} not eligible for invited mission ${mission.id}`)
            return { success: false, error: 'This mission is not available in your country' }
        }

        // 3. Check if already enrolled solo (group enrollment is separate)
        const existingEnrollment = await prisma.missionEnrollment.findFirst({
            where: { mission_id: mission.id, user_id: user.id, group_mission_id: null }
        })

        if (existingEnrollment) {
            return { success: false, error: 'Already enrolled in this mission' }
        }

        // 4. Get custom domain
        const verifiedDomain = await prisma.domain.findFirst({
            where: {
                workspace_id: mission.workspace_id,
                verified: true
            }
        })
        const customDomain = verifiedDomain?.name || null

        // 5. Generate semantic slug
        const missionSlug = mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = user.id.slice(0, 8)
        const fullSlug = `${missionSlug}/${affiliateCode}`

        // 6. Ensure seller exists
        if (!sellerWithProfile) {
            console.log('[Marketplace] 👤 Creating Global Seller for invited user:', user.email)
            const { createGlobalSeller } = await import('@/app/actions/sellers')
            await createGlobalSeller({
                userId: user.id,
                email: user.email!,
                name: user.user_metadata?.full_name
            })
        }

        // 7. Create ShortLink
        const shortLink = await prisma.shortLink.create({
            data: {
                slug: fullSlug,
                original_url: mission.target_url,
                workspace_id: mission.workspace_id,
                affiliate_id: user.id,
                clicks: 0,
            }
        })

        // 8. Add to Redis
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            sellerId: shortLink.affiliate_id,
        }, customDomain || undefined)

        // 9. Create enrollment
        const enrollment = await prisma.missionEnrollment.create({
            data: {
                mission_id: mission.id,
                user_id: user.id,
                status: 'APPROVED',
                link_id: shortLink.id,
            }
        })

        console.log(`[Marketplace] ✅ Enrolled via invite code: seller=${user.id}, mission=${mission.id}`)

        // 10. Build full URL
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
        const linkUrl = `${baseUrl}/s/${fullSlug}`

        // 11. Revalidate
        revalidatePath('/seller')
        revalidatePath('/seller/marketplace')

        return {
            success: true,
            enrollment: {
                id: enrollment.id,
                link_url: linkUrl,
                has_custom_domain: !!customDomain,
            },
            mission: {
                id: mission.id,
                title: mission.title
            }
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Error joining via invite code:', error)
        return { success: false, error: 'Failed to join mission' }
    }
}

/**
 * Get mission details by invite code (for preview before joining)
 */
export async function getMissionByInviteCode(inviteCode: string): Promise<{
    success: boolean
    mission?: {
        id: string
        title: string
        description: string
        reward: string
        visibility: MissionVisibility
        workspace_name: string
    }
    isEnrolled?: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Validate invite code format
    if (!inviteCode || inviteCode.length < 6 || inviteCode.length > 32 || !/^[a-zA-Z0-9]+$/.test(inviteCode)) {
        return { success: false, error: 'Invalid invitation code' }
    }

    try {
        const mission = await prisma.mission.findFirst({
            where: {
                invite_code: inviteCode,
                status: 'ACTIVE'
            },
            include: {
                Workspace: {
                    select: { name: true }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Invalid or expired invitation code' }
        }

        // Check if user is already enrolled solo (group enrollment is separate)
        let isEnrolled = false
        if (user) {
            const existingEnrollment = await prisma.missionEnrollment.findFirst({
                where: { mission_id: mission.id, user_id: user.id, group_mission_id: null }
            })
            isEnrolled = !!existingEnrollment
        }

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                reward: mission.reward,
                visibility: mission.visibility as MissionVisibility,
                workspace_name: mission.Workspace.name
            },
            isEnrolled
        }

    } catch (error) {
        console.error('[Marketplace] ❌ Error fetching mission by invite code:', error)
        return { success: false, error: 'Failed to fetch mission' }
    }
}
