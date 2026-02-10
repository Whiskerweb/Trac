'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { getCurrentUser } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

// =============================================
// GET MY SELLERS (Sellers who joined our missions)
// =============================================

export interface MySeller {
    id: string
    name: string
    avatar: string
    avatarUrl?: string
    status: 'active' | 'pending' | 'inactive'
    activityType: string
    missionsCount: number
    totalClicks: number
    totalSales: number
    commissionEarned: number
    joinedAt: Date
    lastActivity: Date
}

export interface GetMySellersResponse {
    success: boolean
    sellers?: MySeller[]
    stats?: {
        total: number
        active: number
        totalClicks: number
        totalCommissions: number
    }
    error?: string
}

export async function getMySellers(): Promise<GetMySellersResponse> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get enrollments for this workspace with ShortLink to get affiliate_id
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                Mission: {
                    workspace_id: workspace.workspaceId
                }
            },
            include: {
                ShortLink: true,
                Mission: true
            }
        })

        // Collect unique user_ids from enrollments
        const userIds = [...new Set(enrollments.map(e => e.user_id))]

        // Also get affiliate_ids from ShortLinks
        // NOTE: ShortLink.affiliate_id stores Supabase user.id (not Seller.id)
        // So we need to match Seller.user_id, not Seller.id
        const affiliateUserIds = [...new Set(
            enrollments
                .map(e => e.ShortLink?.affiliate_id)
                .filter((id): id is string => !!id)
        )]

        // Merge all user IDs for lookup
        const allUserIds = [...new Set([...userIds, ...affiliateUserIds])]

        // Get all Sellers that match either:
        // 1. Their user_id is in our enrollment user_ids OR ShortLink affiliate_ids
        // 2. They have commissions with our workspace
        const sellers = await prisma.seller.findMany({
            where: {
                OR: [
                    { user_id: { in: allUserIds.length > 0 ? allUserIds : ['__none__'] } },
                    { Commissions: { some: { program_id: workspace.workspaceId } } }
                ]
            },
            include: {
                Commissions: {
                    where: {
                        program_id: workspace.workspaceId
                    }
                },
                Profile: true
            }
        })

        // Deduplicate sellers by user_id (same user can have multiple Seller records
        // with different program_id due to @@unique([program_id, email]) constraint)
        const sellersByUserId = new Map<string, typeof sellers[0]>()
        for (const seller of sellers) {
            const key = seller.user_id || seller.id
            const existing = sellersByUserId.get(key)
            if (!existing) {
                sellersByUserId.set(key, seller)
            } else {
                // Keep the one with the most data (name set, most commissions, etc.)
                const existingCommissions = existing.Commissions.length
                const currentCommissions = seller.Commissions.length
                // Prefer: has name > more commissions > global seller (program_id=null)
                const existingHasName = existing.name && existing.name.trim().length > 0
                const currentHasName = seller.name && seller.name.trim().length > 0
                if (
                    (!existingHasName && currentHasName) ||
                    (currentCommissions > existingCommissions) ||
                    (!existing.program_id && seller.program_id)
                ) {
                    // Merge commissions from both records
                    seller.Commissions = [...existing.Commissions, ...seller.Commissions]
                    sellersByUserId.set(key, seller)
                } else {
                    // Keep existing but merge commissions
                    existing.Commissions = [...existing.Commissions, ...seller.Commissions]
                }
            }
        }
        const dedupedSellers = Array.from(sellersByUserId.values())

        // Query Tinybird for real clicks by link_id
        const tbClicksByLinkId = new Map<string, number>()
        const myLinkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)

        if (myLinkIds.length > 0) {
            try {
                const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
                const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN
                if (TINYBIRD_TOKEN) {
                    const linkIdList = myLinkIds.map(id => `'${id}'`).join(',')
                    const query = `SELECT link_id, count() as clicks FROM clicks WHERE link_id IN (${linkIdList}) GROUP BY link_id`
                    const res = await fetch(
                        `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(query)}`,
                        { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                    )
                    if (res.ok) {
                        const text = await res.text()
                        for (const line of text.trim().split('\n').filter(l => l.trim())) {
                            const [linkId, clicks] = line.split('\t')
                            if (linkId) {
                                tbClicksByLinkId.set(linkId, parseInt(clicks) || 0)
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[getMySellers] Tinybird clicks query failed:', e)
            }
        }

        // Build enrollment stats map by user_id
        // NOTE: Both enrollment.user_id AND ShortLink.affiliate_id are Supabase user IDs
        // So we merge them into a single map keyed by user_id
        const enrollmentStatsByUserId = new Map<string, {
            missionsCount: number
            totalClicks: number
            firstEnrollment: Date
            lastActivity: Date
            hasApprovedEnrollment: boolean
        }>()

        for (const enrollment of enrollments) {
            // Both are user IDs - merge them
            const userIdFromEnrollment = enrollment.user_id
            const userIdFromLink = enrollment.ShortLink?.affiliate_id
            const clicks = enrollment.ShortLink
                ? (tbClicksByLinkId.get(enrollment.ShortLink.id) || 0)
                : 0
            const isApproved = enrollment.status === 'APPROVED'

            // Add stats for enrollment.user_id
            const addStats = (userId: string) => {
                const existing = enrollmentStatsByUserId.get(userId)
                if (existing) {
                    existing.missionsCount += 1
                    existing.totalClicks += clicks
                    if (enrollment.created_at < existing.firstEnrollment) {
                        existing.firstEnrollment = enrollment.created_at
                    }
                    if (enrollment.created_at > existing.lastActivity) {
                        existing.lastActivity = enrollment.created_at
                    }
                    if (isApproved) {
                        existing.hasApprovedEnrollment = true
                    }
                } else {
                    enrollmentStatsByUserId.set(userId, {
                        missionsCount: 1,
                        totalClicks: clicks,
                        firstEnrollment: enrollment.created_at,
                        lastActivity: enrollment.created_at,
                        hasApprovedEnrollment: isApproved
                    })
                }
            }

            // Add stats for enrollment.user_id
            addStats(userIdFromEnrollment)

            // If ShortLink.affiliate_id is different, also track it
            // (This handles edge cases where they might differ)
            if (userIdFromLink && userIdFromLink !== userIdFromEnrollment) {
                addStats(userIdFromLink)
            }
        }

        // Build seller list
        const mySellers: MySeller[] = []

        for (const seller of dedupedSellers) {
            // Get stats by seller.user_id (all enrollment data is keyed by user_id now)
            const stats = seller.user_id ? enrollmentStatsByUserId.get(seller.user_id) : null

            const hasCommissions = seller.Commissions.length > 0

            // Only include if they have enrollments or commissions with us
            if (!stats && !hasCommissions) continue

            const totalSales = seller.Commissions.length
            const commissionEarned = seller.Commissions.reduce((sum, c) => sum + c.commission_amount, 0)

            // Determine status based on activity
            let status: 'active' | 'pending' | 'inactive' = 'inactive'
            if (stats?.hasApprovedEnrollment || hasCommissions) {
                // Check if active in last 30 days
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                const lastActivity = stats?.lastActivity || seller.created_at

                if (lastActivity > thirtyDaysAgo) {
                    status = 'active'
                } else {
                    status = 'inactive'
                }
            } else if (seller.status === 'PENDING') {
                status = 'pending'
            }

            // Get initials for avatar
            const name = seller.name || 'Seller'
            const initials = name.split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()

            // Map activity type to label
            const activityTypeLabels: Record<string, string> = {
                'CONTENT_CREATOR': 'Content creator',
                'SALES_REP': 'Commercial',
                'INFLUENCER': 'Influenceur',
                'MARKETER': 'Marketeur',
                'BLOGGER': 'Blogueur',
                'DEVELOPER': 'Developer',
                'CONSULTANT': 'Consultant',
                'OTHER': 'Autre'
            }

            mySellers.push({
                id: seller.id,
                name: seller.name || 'Seller',
                avatar: initials,
                avatarUrl: seller.Profile?.avatar_url || undefined,
                status,
                activityType: seller.Profile?.activity_type
                    ? activityTypeLabels[seller.Profile.activity_type] || seller.Profile.activity_type
                    : '-',
                missionsCount: stats?.missionsCount || 0,
                totalClicks: stats?.totalClicks || 0,
                totalSales,
                commissionEarned,
                joinedAt: stats?.firstEnrollment || seller.created_at,
                lastActivity: stats?.lastActivity || seller.created_at
            })
        }

        // Sort by commission earned (most valuable first), then by clicks
        mySellers.sort((a, b) => {
            if (b.commissionEarned !== a.commissionEarned) {
                return b.commissionEarned - a.commissionEarned
            }
            return b.totalClicks - a.totalClicks
        })

        // Calculate global stats
        const globalStats = {
            total: mySellers.length,
            active: mySellers.filter(s => s.status === 'active').length,
            totalClicks: mySellers.reduce((sum, s) => sum + s.totalClicks, 0),
            totalCommissions: mySellers.reduce((sum, s) => sum + s.commissionEarned, 0)
        }

        return {
            success: true,
            sellers: mySellers,
            stats: globalStats
        }
    } catch (error) {
        console.error('Error fetching my sellers:', error)
        return { success: false, error: 'Failed to load' }
    }
}

// =============================================
// GET ALL PLATFORM SELLERS (Marketplace)
// =============================================

/**
 * Helper function to check if a seller profile is complete
 * Used to filter sellers in the "All Sellers" page
 */
function isSellerProfileComplete(seller: any): boolean {
    if (!seller.name || seller.name.trim().length === 0) return false
    if (!seller.Profile?.bio || seller.Profile.bio.trim().length < 50) return false
    if (!seller.Profile?.country) return false
    if (!seller.Profile?.profile_type) return false

    const industryInterests = seller.Profile?.industry_interests
    if (!Array.isArray(industryInterests) || industryInterests.length === 0) return false

    if (!seller.Profile?.monthly_traffic) return false

    const earningPreferences = seller.Profile?.earning_preferences as any
    const hasEarningPref = earningPreferences && typeof earningPreferences === 'object' &&
        Object.values(earningPreferences).some(v => v === true)
    if (!hasEarningPref) return false

    const salesChannels = seller.Profile?.sales_channels as any
    const hasSalesChannel = salesChannels && typeof salesChannels === 'object' &&
        Object.values(salesChannels).some(v => v === true)
    if (!hasSalesChannel) return false

    return true
}

export async function getAllPlatformSellers(filters?: {
    countries?: string[]
    industries?: string[]
    activityTypes?: string[]
    earningPrefs?: string[]
    search?: string
}) {
    try {
        // Build where clause dynamically based on filters
        const whereClause: any = {
            status: { in: ['APPROVED', 'PENDING'] }, // Include both for filtering
            ...(filters?.search && {
                name: { contains: filters.search, mode: 'insensitive' }
            })
        }

        // Get Sellers from the Seller table (not Users)
        const sellers = await prisma.seller.findMany({
            where: whereClause,
            include: {
                Commissions: true,
                Profile: true
            },
            take: 50
        })

        // Deduplicate sellers by user_id (compound unique on [program_id, email] allows duplicates)
        const sellerMapAll = new Map<string, typeof sellers[0]>()
        for (const seller of sellers) {
            const key = seller.user_id || seller.id
            const existing = sellerMapAll.get(key)
            if (!existing) {
                sellerMapAll.set(key, seller)
            } else {
                // Prefer the record with a Profile, or with more commissions
                const currentHasProfile = !!seller.Profile
                const existingHasProfile = !!existing.Profile
                if ((!existingHasProfile && currentHasProfile) || seller.Commissions.length > existing.Commissions.length) {
                    seller.Commissions = [...existing.Commissions, ...seller.Commissions]
                    sellerMapAll.set(key, seller)
                } else {
                    existing.Commissions = [...existing.Commissions, ...seller.Commissions]
                }
            }
        }
        const uniqueSellers = Array.from(sellerMapAll.values())

        // Filter sellers with complete profiles ONLY and apply additional filters
        let completeSellers = uniqueSellers.filter(seller => isSellerProfileComplete(seller))

        // Apply profile-based filters
        if (filters?.countries && filters.countries.length > 0) {
            completeSellers = completeSellers.filter(seller =>
                seller.Profile?.country && filters.countries!.includes(seller.Profile.country)
            )
        }

        if (filters?.industries && filters.industries.length > 0) {
            completeSellers = completeSellers.filter(seller => {
                const interests = seller.Profile?.industry_interests
                if (!interests || !Array.isArray(interests)) return false
                return interests.some(i => filters.industries!.includes(i as string))
            })
        }

        if (filters?.activityTypes && filters.activityTypes.length > 0) {
            completeSellers = completeSellers.filter(seller =>
                seller.Profile?.activity_type && filters.activityTypes!.includes(seller.Profile.activity_type)
            )
        }

        // Get enrollments to calculate real clicks
        const sellerUserIds = completeSellers
            .map(s => s.user_id)
            .filter((id): id is string => !!id)

        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: { in: sellerUserIds }
            },
            include: {
                ShortLink: true
            }
        })

        // Query Tinybird for real clicks by link_id (reliable for old+new clicks)
        const tinybirdClicksByLinkId = new Map<string, number>()
        const allLinkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)

        if (allLinkIds.length > 0) {
            try {
                const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
                const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN
                if (TINYBIRD_TOKEN) {
                    const linkIdList = allLinkIds.map(id => `'${id}'`).join(',')
                    const query = `SELECT link_id, count() as clicks FROM clicks WHERE link_id IN (${linkIdList}) GROUP BY link_id`
                    const res = await fetch(
                        `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(query)}`,
                        { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                    )
                    if (res.ok) {
                        const text = await res.text()
                        for (const line of text.trim().split('\n').filter(l => l.trim())) {
                            const [linkId, clicks] = line.split('\t')
                            if (linkId) {
                                tinybirdClicksByLinkId.set(linkId, parseInt(clicks) || 0)
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[getAllPlatformSellers] Tinybird clicks query failed:', e)
            }
        }

        // Build clicks map by user_id using Tinybird data
        const clicksByUserId = new Map<string, number>()
        const missionsByUserId = new Map<string, number>()

        enrollments.forEach(enrollment => {
            const linkClicks = enrollment.ShortLink
                ? (tinybirdClicksByLinkId.get(enrollment.ShortLink.id) || 0)
                : 0
            const existing = clicksByUserId.get(enrollment.user_id) || 0
            clicksByUserId.set(enrollment.user_id, existing + linkClicks)

            if (enrollment.status === 'APPROVED') {
                const missions = missionsByUserId.get(enrollment.user_id) || 0
                missionsByUserId.set(enrollment.user_id, missions + 1)
            }
        })

        // Transform
        const formattedSellers = completeSellers.map(seller => {
            const totalClicks = seller.user_id ? (clicksByUserId.get(seller.user_id) || 0) : 0
            const totalSales = seller.Commissions.length
            const totalEarnings = seller.Commissions.reduce((sum, c) => sum + c.commission_amount, 0)
            const totalPayout = seller.Commissions
                .filter(c => c.status === 'COMPLETE')
                .reduce((sum, c) => sum + c.commission_amount, 0)
            const activeMissions = seller.user_id ? (missionsByUserId.get(seller.user_id) || 0) : 0

            // Map Prisma status to expected format
            const statusMap = {
                'APPROVED': 'active',
                'PENDING': 'pending',
                'BANNED': 'inactive'
            } as const

            // Format activity type for display
            const activityTypeLabels: Record<string, string> = {
                'CONTENT_CREATOR': 'Content creator',
                'SALES_REP': 'Commercial',
                'INFLUENCER': 'Influenceur',
                'MARKETER': 'Marketeur',
                'BLOGGER': 'Blogueur',
                'DEVELOPER': 'Developer',
                'CONSULTANT': 'Consultant',
                'OTHER': 'Autre'
            }

            return {
                id: seller.id,
                name: seller.name || 'Sans nom',
                avatar: (seller.name || 'SA').slice(0, 2).toUpperCase(),
                avatarUrl: seller.Profile?.avatar_url,
                status: statusMap[seller.status] || 'pending',
                activityType: seller.Profile?.activity_type
                    ? activityTypeLabels[seller.Profile.activity_type]
                    : '-',
                country: seller.Profile?.country,
                globalStats: {
                    totalClicks,
                    totalSales,
                    totalEarnings,
                    totalPayout,
                    conversionRate: totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0,
                    activeMissions
                }
            }
        })

        // Sort by CA DESC (default)
        formattedSellers.sort((a, b) => b.globalStats.totalEarnings - a.globalStats.totalEarnings)

        return { success: true, sellers: formattedSellers }
    } catch (error) {
        console.error('Error fetching platform sellers:', error)
        return { success: false, error: 'Failed to load' }
    }
}

// =============================================
// GET SELLER PROFILE DETAILS
// =============================================

export async function getSellerProfile(sellerId: string) {
    try {
        console.log('[getSellerProfile] Loading seller:', sellerId)

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            console.log('[getSellerProfile] No workspace found')
            return { success: false, error: 'Not authenticated' }
        }

        console.log('[getSellerProfile] Workspace:', workspace.workspaceId)

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                Commissions: true,
                Profile: true
            }
        })

        if (!seller) {
            console.log('[getSellerProfile] Seller not found:', sellerId)
            return { success: false, error: 'Seller not found' }
        }

        console.log('[getSellerProfile] Seller found:', seller.id, 'user_id:', seller.user_id)

        // Get missions this seller has joined with our workspace
        // Only query if seller has a user_id (not a shadow seller)
        const enrollments = seller.user_id ? await prisma.missionEnrollment.findMany({
            where: {
                user_id: seller.user_id,
                Mission: {
                    workspace_id: workspace.workspaceId
                }
            },
            include: {
                Mission: true,
                ShortLink: true
            }
        }) : []

        console.log('[getSellerProfile] Found', enrollments.length, 'enrollments')

        // Get real clicks from Tinybird by link_id (reliable for both old and new clicks)
        const clicksByLinkId = new Map<string, number>()
        const linkIds = enrollments
            .filter(e => e.ShortLink)
            .map(e => e.ShortLink!.id)

        if (linkIds.length > 0) {
            try {
                const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
                const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN
                if (TINYBIRD_TOKEN) {
                    const linkIdList = linkIds.map(id => `'${id}'`).join(',')
                    const query = `SELECT link_id, count() as clicks FROM clicks WHERE link_id IN (${linkIdList}) GROUP BY link_id`
                    const res = await fetch(
                        `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(query)}`,
                        { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                    )
                    if (res.ok) {
                        const text = await res.text()
                        for (const line of text.trim().split('\n').filter(l => l.trim())) {
                            const [linkId, clicks] = line.split('\t')
                            if (linkId) {
                                clicksByLinkId.set(linkId, parseInt(clicks) || 0)
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[getSellerProfile] Tinybird clicks query failed:', e)
            }
        }

        const totalClicksForWorkspace = Array.from(clicksByLinkId.values()).reduce((sum, c) => sum + c, 0)

        // Calculate stats for OUR workspace
        const ourCommissions = seller.Commissions.filter(c => c.program_id === workspace.workspaceId)
        const ourStats = {
            missionsJoined: enrollments.length,
            totalClicks: totalClicksForWorkspace,
            totalSales: ourCommissions.length,
            totalEarnings: ourCommissions.reduce((sum, c) => sum + c.commission_amount, 0),
            conversionRate: 0
        }

        // Calculate GLOBAL stats (all workspaces)
        const globalStats = {
            totalClicks: totalClicksForWorkspace,
            totalSales: seller.Commissions.length,
            totalEarnings: seller.Commissions.reduce((sum, c) => sum + c.commission_amount, 0),
            conversionRate: 0,
            activeMissions: enrollments.filter(e => e.status === 'APPROVED').length
        }

        // Build missions array with real Tinybird clicks per link
        const missions = enrollments.map(enrollment => {
            const linkClicks = enrollment.ShortLink
                ? (clicksByLinkId.get(enrollment.ShortLink.id) || 0)
                : 0
            return {
                id: enrollment.Mission.id,
                name: enrollment.Mission.title,
                clicks: linkClicks,
                sales: 0,
                earnings: 0,
                status: enrollment.status === 'APPROVED' ? 'active' : 'pending'
            }
        })

        // Map Prisma status to expected format
        const statusMap = {
            'APPROVED': 'active',
            'PENDING': 'pending',
            'BANNED': 'inactive'
        } as const

        // Parse JSON fields safely
        const industryInterests = seller.Profile?.industry_interests
            ? (Array.isArray(seller.Profile.industry_interests)
                ? seller.Profile.industry_interests as string[]
                : [])
            : []

        const earningPreferences = seller.Profile?.earning_preferences
            ? (typeof seller.Profile.earning_preferences === 'object' && seller.Profile.earning_preferences !== null
                ? seller.Profile.earning_preferences as Record<string, boolean>
                : {})
            : {}

        const salesChannels = seller.Profile?.sales_channels
            ? (typeof seller.Profile.sales_channels === 'object' && seller.Profile.sales_channels !== null
                ? seller.Profile.sales_channels as Record<string, boolean>
                : {})
            : {}

        return {
            success: true,
            seller: {
                id: seller.id,
                name: seller.name || 'Sans nom',
                email: seller.email,
                avatar: (seller.name || 'SA').slice(0, 2).toUpperCase(),
                status: statusMap[seller.status as keyof typeof statusMap] || 'pending',
                sellerSince: seller.created_at,
                bio: seller.Profile?.bio || null,
                country: seller.Profile?.country || null,
                profileType: seller.Profile?.profile_type || null,
                socials: {
                    twitter: seller.Profile?.twitter_url || null,
                    instagram: seller.Profile?.instagram_url || null,
                    youtube: seller.Profile?.youtube_url || null,
                    tiktok: seller.Profile?.tiktok_url || null,
                    website: seller.Profile?.website_url || null,
                    linkedin: seller.Profile?.linkedin_url || null
                },
                avatarUrl: seller.Profile?.avatar_url || null,
                portfolioUrl: seller.Profile?.portfolio_url || null,
                cvUrl: seller.Profile?.cv_url || null,
                industryInterests,
                monthlyTraffic: seller.Profile?.monthly_traffic || null,
                earningPreferences,
                salesChannels,
                globalStats,
                ourStats,
                missions
            }
        }
    } catch (error) {
        console.error('[getSellerProfile] ❌ Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load'
        }
    }
}

// =============================================
// CREATE GLOBAL SELLER
// =============================================

export async function createGlobalSeller(data: {
    userId: string
    email: string
    name: string
}) {
    try {
        // Check if seller already exists
        const existingSeller = await prisma.seller.findUnique({
            where: { tenant_id: data.userId }
        })

        if (existingSeller) {
            return { success: true, sellerId: existingSeller.id }
        }

        // Check referral cookie
        let referredBy: string | null = null
        try {
            const cookieStore = await cookies()
            const refCode = cookieStore.get('trac_ref')?.value
            if (refCode) {
                const referrer = await prisma.seller.findUnique({
                    where: { referral_code: refCode },
                    select: { id: true }
                })
                if (referrer) {
                    referredBy = referrer.id
                    console.log(`[Seller] Referral detected: ${refCode} → referrer ${referrer.id}`)
                }
            }
        } catch { /* cookie read may fail in some contexts */ }

        // Create new seller with referral code
        const seller = await prisma.seller.create({
            data: {
                tenant_id: data.userId,
                user_id: data.userId,
                email: data.email,
                name: data.name,
                status: 'APPROVED',
                referral_code: nanoid(8),
                referred_by: referredBy,
                referred_at: referredBy ? new Date() : null,
            }
        })

        return { success: true, sellerId: seller.id }
    } catch (error) {
        console.error('Error creating global seller:', error)
        return { success: false, error: 'Failed to create seller profile' }
    }
}

// =============================================
// CLAIM SHADOW SELLERS
// =============================================

export async function claimSellers(userId: string, email: string) {
    try {
        // Find shadow sellers by email that don't have a user_id yet
        const shadowSellers = await prisma.seller.findMany({
            where: {
                email: email,
                user_id: null
            }
        })

        if (shadowSellers.length === 0) {
            return { success: true, claimed: 0 }
        }

        // Claim them
        await prisma.seller.updateMany({
            where: {
                email: email,
                user_id: null
            },
            data: {
                user_id: userId
            }
        })

        return { success: true, claimed: shadowSellers.length }
    } catch (error) {
        console.error('Error claiming sellers:', error)
        return { success: false, error: 'Failed to claim sellers' }
    }
}

// =============================================
// GET SELLER BY USER ID (For Analytics Token)
// =============================================

export async function getSellerByUserId(userId: string) {
    const seller = await prisma.seller.findFirst({
        where: { user_id: userId },
        select: { id: true, name: true, email: true }
    })
    return seller
}

// =============================================
// GET SELLER DASHBOARD (For Portal Homepage)
// =============================================

export async function getSellerDashboard() {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return { error: 'Not authenticated' }

        // Find the seller for this user
        const seller = await prisma.seller.findFirst({
            where: { user_id: currentUser.userId },
            include: {
                Commissions: {
                    orderBy: { created_at: 'desc' },
                    take: 5
                }
            }
        })

        if (!seller) {
            return {
                seller: {
                    id: currentUser.userId,
                    name: currentUser.email.split('@')[0],
                },
                stats: {
                    totalClicks: 0,
                    totalEarnings: 0,
                    totalSales: 0,
                    conversionRate: 0,
                    activeMissions: 0
                },
                recentActivity: []
            }
        }

        const totalEarnings = seller.Commissions.reduce((sum, c) => sum + c.commission_amount, 0)

        return {
            seller: {
                id: seller.id,
                name: seller.name || currentUser.email.split('@')[0],
            },
            stats: {
                totalClicks: 0,
                totalEarnings,
                totalSales: seller.Commissions.length,
                conversionRate: 0,
                activeMissions: 0
            },
            recentActivity: seller.Commissions.map(c => ({
                id: c.id,
                mission: 'Commission',
                date: c.created_at,
                amount: c.commission_amount
            }))
        }
    } catch (error) {
        console.error('Error fetching seller dashboard:', error)
        return { error: 'Dashboard load error' }
    }
}

// =============================================
// GET SELLER COMMISSIONS (For Portal Earnings)
// =============================================

export async function getSellerCommissions() {
    return {
        commissions: [],
        summary: {
            pending: 0,
            available: 0,
            paid: 0
        }
    }
}

// =============================================
// GET MY SELLER PROFILE (For /seller/profile)
// =============================================

export interface MySellerProfileData {
    // Basic info
    name: string
    email: string

    // Profile data
    bio?: string | null
    country?: string | null
    profileType?: 'INDIVIDUAL' | 'COMPANY' | null

    // Social links
    websiteUrl?: string | null
    youtubeUrl?: string | null
    twitterUrl?: string | null
    linkedinUrl?: string | null
    instagramUrl?: string | null
    tiktokUrl?: string | null

    // Media & Documents
    avatarUrl?: string | null
    portfolioUrl?: string | null
    cvUrl?: string | null

    // Expertise
    industryInterests?: string[]
    monthlyTraffic?: string | null
    activityType?: 'CONTENT_CREATOR' | 'SALES_REP' | 'INFLUENCER' | 'MARKETER' | 'BLOGGER' | 'DEVELOPER' | 'CONSULTANT' | 'OTHER' | null
    earningPreferences?: {
        revShare: boolean
        cpc: boolean
        cpl: boolean
        oneTime: boolean
    }
    salesChannels?: {
        blogs: boolean
        newsletters: boolean
        socialMedia: boolean
        events: boolean
        companyReferrals: boolean
    }

    // Stripe Connect status
    hasStripeConnect: boolean
    payoutMethod?: 'STRIPE_CONNECT' | 'PAYPAL' | 'IBAN' | 'PLATFORM'

    // Profile score (0-100)
    profileScore: number
}

export async function getMySellerProfile(): Promise<{
    success: boolean
    profile?: MySellerProfileData
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Fetch all seller records for this user (there can be multiple due to
        // @@unique([program_id, email]) allowing duplicates with different program_id)
        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId },
            include: {
                Profile: true
            }
        })

        if (sellers.length === 0) {
            return { success: false, error: 'Seller not found' }
        }

        // Prefer the seller that has a Profile, otherwise pick the global one (program_id=null)
        const seller = sellers.find(s => s.Profile) || sellers.find(s => !s.program_id) || sellers[0]

        // Parse JSON fields safely
        const industryInterests = seller.Profile?.industry_interests
            ? (Array.isArray(seller.Profile.industry_interests)
                ? seller.Profile.industry_interests as string[]
                : [])
            : undefined

        const earningPreferences = seller.Profile?.earning_preferences
            ? (typeof seller.Profile.earning_preferences === 'object' && seller.Profile.earning_preferences !== null
                ? seller.Profile.earning_preferences as { revShare: boolean; cpc: boolean; cpl: boolean; oneTime: boolean }
                : undefined)
            : undefined

        const salesChannels = seller.Profile?.sales_channels
            ? (typeof seller.Profile.sales_channels === 'object' && seller.Profile.sales_channels !== null
                ? seller.Profile.sales_channels as { blogs: boolean; newsletters: boolean; socialMedia: boolean; events: boolean; companyReferrals: boolean }
                : undefined)
            : undefined

        return {
            success: true,
            profile: {
                name: seller.name || '',
                email: seller.email,
                bio: seller.Profile?.bio || null,
                country: seller.Profile?.country || null,
                profileType: seller.Profile?.profile_type || null,
                websiteUrl: seller.Profile?.website_url || null,
                youtubeUrl: seller.Profile?.youtube_url || null,
                twitterUrl: seller.Profile?.twitter_url || null,
                linkedinUrl: seller.Profile?.linkedin_url || null,
                instagramUrl: seller.Profile?.instagram_url || null,
                tiktokUrl: seller.Profile?.tiktok_url || null,
                avatarUrl: seller.Profile?.avatar_url || null,
                portfolioUrl: seller.Profile?.portfolio_url || null,
                cvUrl: seller.Profile?.cv_url || null,
                industryInterests,
                monthlyTraffic: seller.Profile?.monthly_traffic || null,
                activityType: seller.Profile?.activity_type || null,
                earningPreferences,
                salesChannels,
                // Stripe Connect status
                hasStripeConnect: !!seller.stripe_connect_id && !!seller.payouts_enabled_at,
                payoutMethod: seller.payout_method as 'STRIPE_CONNECT' | 'PAYPAL' | 'IBAN' | 'PLATFORM',
                // Profile score
                profileScore: seller.Profile?.profile_score || 0
            }
        }
    } catch (error) {
        console.error('Error fetching seller profile:', error)
        return { success: false, error: 'Failed to load profile' }
    }
}

// =============================================
// UPDATE MY SELLER PROFILE (For /seller/profile)
// =============================================

export interface UpdateSellerProfileInput {
    // Basic info
    name?: string

    // Profile data
    bio?: string
    country?: string
    profileType?: 'INDIVIDUAL' | 'COMPANY'

    // Social links
    websiteUrl?: string
    youtubeUrl?: string
    twitterUrl?: string
    linkedinUrl?: string
    instagramUrl?: string
    tiktokUrl?: string

    // Media & Documents
    avatarUrl?: string
    portfolioUrl?: string
    cvUrl?: string

    // Expertise
    industryInterests?: string[]
    monthlyTraffic?: string
    activityType?: 'CONTENT_CREATOR' | 'SALES_REP' | 'INFLUENCER' | 'MARKETER' | 'BLOGGER' | 'DEVELOPER' | 'CONSULTANT' | 'OTHER'
    earningPreferences?: {
        revShare: boolean
        cpc: boolean
        cpl: boolean
        oneTime: boolean
    }
    salesChannels?: {
        blogs: boolean
        newsletters: boolean
        socialMedia: boolean
        events: boolean
        companyReferrals: boolean
    }
}

export async function updateMySellerProfile(input: UpdateSellerProfileInput): Promise<{
    success: boolean
    error?: string
}> {
    try {
        console.log('🔵 [updateMySellerProfile] Input received:', input)

        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Fetch all seller records for this user (multiple possible due to compound unique)
        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId },
            include: { Profile: true }
        })

        if (sellers.length === 0) {
            return { success: false, error: 'Seller not found' }
        }

        // Always use the same seller: prefer one with Profile, then global (program_id=null)
        const seller = sellers.find(s => s.Profile) || sellers.find(s => !s.program_id) || sellers[0]

        console.log('🔵 [updateMySellerProfile] Seller found:', seller.id)

        // Update Seller.name on ALL seller records for this user (keeps name consistent)
        if (input.name) {
            await prisma.seller.updateMany({
                where: { user_id: currentUser.userId },
                data: { name: input.name }
            })
        }

        // Prepare SellerProfile data (use snake_case as per Prisma schema)
        const profileData: any = {}

        if (input.bio !== undefined) profileData.bio = input.bio
        if (input.country !== undefined) profileData.country = input.country
        if (input.profileType !== undefined) profileData.profile_type = input.profileType

        if (input.websiteUrl !== undefined) profileData.website_url = input.websiteUrl
        if (input.youtubeUrl !== undefined) profileData.youtube_url = input.youtubeUrl
        if (input.twitterUrl !== undefined) profileData.twitter_url = input.twitterUrl
        if (input.linkedinUrl !== undefined) profileData.linkedin_url = input.linkedinUrl
        if (input.instagramUrl !== undefined) profileData.instagram_url = input.instagramUrl
        if (input.tiktokUrl !== undefined) profileData.tiktok_url = input.tiktokUrl

        if (input.avatarUrl !== undefined) profileData.avatar_url = input.avatarUrl
        if (input.portfolioUrl !== undefined) profileData.portfolio_url = input.portfolioUrl
        if (input.cvUrl !== undefined) profileData.cv_url = input.cvUrl

        if (input.monthlyTraffic !== undefined) profileData.monthly_traffic = input.monthlyTraffic
        if (input.activityType !== undefined) profileData.activity_type = input.activityType

        // JSON fields
        if (input.industryInterests !== undefined) {
            profileData.industry_interests = input.industryInterests
        }
        if (input.earningPreferences !== undefined) {
            profileData.earning_preferences = input.earningPreferences
        }
        if (input.salesChannels !== undefined) {
            profileData.sales_channels = input.salesChannels
        }

        console.log('🔵 [updateMySellerProfile] Profile data to save:', profileData)
        console.log('🔵 [updateMySellerProfile] Media fields:', {
            avatar_url: profileData.avatar_url,
            portfolio_url: profileData.portfolio_url,
            cv_url: profileData.cv_url
        })

        // Upsert SellerProfile
        const result = await prisma.sellerProfile.upsert({
            where: { seller_id: seller.id },
            create: {
                seller_id: seller.id,
                ...profileData
            },
            update: profileData
        })

        console.log('✅ [updateMySellerProfile] Profile saved successfully:', result.id)

        return { success: true }
    } catch (error) {
        console.error('Error updating seller profile:', error)
        return { success: false, error: 'Failed to update profile' }
    }
}

// =============================================
// CHECK PROFILE COMPLETION STATUS
// =============================================

export interface ProfileCompletionStatus {
    isComplete: boolean
    missingFields: string[]
    completionPercentage: number
}

/**
 * Checks if a seller's profile is complete
 * Required fields:
 * - name
 * - bio (min 50 chars)
 * - country
 * - profileType
 * - industryInterests (at least 1)
 * - monthlyTraffic
 * - earningPreferences (at least 1)
 * - salesChannels (at least 1)
 */
export async function getProfileCompletionStatus(): Promise<{
    success: boolean
    status?: ProfileCompletionStatus
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: currentUser.userId },
            include: { Profile: true }
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        const missingFields: string[] = []
        let completedFields = 0
        const totalRequiredFields = 6

        // 1. Check country
        if (seller.Profile?.country && seller.Profile.country.trim().length > 0) {
            completedFields++
        } else {
            missingFields.push('Country')
        }

        // 2. Check social media (at least one)
        const hasSocialMedia = !!(
            seller.Profile?.website_url?.trim() ||
            seller.Profile?.youtube_url?.trim() ||
            seller.Profile?.twitter_url?.trim() ||
            seller.Profile?.linkedin_url?.trim() ||
            seller.Profile?.instagram_url?.trim() ||
            seller.Profile?.tiktok_url?.trim()
        )
        if (hasSocialMedia) {
            completedFields++
        } else {
            missingFields.push('Social media')
        }

        // 3. Check description (min 10 chars)
        if (seller.Profile?.bio && seller.Profile.bio.trim().length > 10) {
            completedFields++
        } else {
            missingFields.push('Description')
        }

        // 4. Check industryInterests (at least 1)
        const industryInterests = seller.Profile?.industry_interests
        const hasIndustries = Array.isArray(industryInterests) && industryInterests.length > 0
        if (hasIndustries) {
            completedFields++
        } else {
            missingFields.push('Industries')
        }

        // 5. Check activityType
        if (seller.Profile?.activity_type) {
            completedFields++
        } else {
            missingFields.push('Activity')
        }

        // 6. Check how you work (earning preferences OR sales channels)
        const earningPreferences = seller.Profile?.earning_preferences as any
        const salesChannels = seller.Profile?.sales_channels as any
        const hasEarningPref = earningPreferences && typeof earningPreferences === 'object' &&
            Object.values(earningPreferences).some(v => v === true)
        const hasSalesChannel = salesChannels && typeof salesChannels === 'object' &&
            Object.values(salesChannels).some(v => v === true)
        if (hasEarningPref || hasSalesChannel) {
            completedFields++
        } else {
            missingFields.push('Work style')
        }

        const completionPercentage = Math.round((completedFields / totalRequiredFields) * 100)
        const isComplete = missingFields.length === 0

        return {
            success: true,
            status: {
                isComplete,
                missingFields,
                completionPercentage
            }
        }
    } catch (error) {
        console.error('Error checking profile completion:', error)
        return { success: false, error: 'Profile verification failed' }
    }
}

// =============================================
// UPDATE PAYOUT METHOD
// =============================================

export async function updatePayoutMethod(
    sellerId: string,
    method: 'STRIPE_CONNECT' | 'PAYPAL' | 'IBAN' | 'PLATFORM'
): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.seller.update({
            where: { id: sellerId },
            data: { payout_method: method }
        })

        console.log(`[Sellers] Updated payout method for seller ${sellerId}: ${method}`)

        return { success: true }
    } catch (error) {
        console.error('Error updating payout method:', error)
        return { success: false, error: 'Failed to update' }
    }
}

// =============================================
// STRIPE CONNECT MANAGEMENT
// =============================================

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export interface StripeAccountInfo {
    connected: boolean
    accountId?: string
    email?: string
    payoutsEnabled: boolean
    chargesEnabled: boolean
    detailsSubmitted: boolean
    connectedAt?: Date
    // Requirements info
    requiresAction: boolean
    pendingVerification: boolean
    disabledReason?: string
}

/**
 * Get detailed Stripe Connect account information for the current seller
 */
export async function getMyStripeAccountInfo(): Promise<{
    success: boolean
    account?: StripeAccountInfo
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get seller with Stripe info
        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId }
        })

        if (sellers.length === 0) {
            return { success: false, error: 'Seller not found' }
        }

        // Get the seller with stripe_connect_id (prefer global seller)
        const seller = sellers.find(s => s.stripe_connect_id) || sellers.find(s => !s.program_id) || sellers[0]

        if (!seller.stripe_connect_id) {
            return {
                success: true,
                account: {
                    connected: false,
                    payoutsEnabled: false,
                    chargesEnabled: false,
                    detailsSubmitted: false,
                    requiresAction: false,
                    pendingVerification: false
                }
            }
        }

        // Fetch account details from Stripe
        const stripeAccount = await stripe.accounts.retrieve(seller.stripe_connect_id)

        // Check if there are any requirements
        const hasCurrentlyDue = (stripeAccount.requirements?.currently_due?.length || 0) > 0
        const hasPastDue = (stripeAccount.requirements?.past_due?.length || 0) > 0
        const hasPendingVerification = (stripeAccount.requirements?.pending_verification?.length || 0) > 0

        return {
            success: true,
            account: {
                connected: true,
                accountId: seller.stripe_connect_id,
                email: stripeAccount.email || undefined,
                payoutsEnabled: stripeAccount.payouts_enabled === true,
                chargesEnabled: stripeAccount.charges_enabled === true,
                detailsSubmitted: stripeAccount.details_submitted === true,
                connectedAt: seller.payouts_enabled_at || undefined,
                requiresAction: hasCurrentlyDue || hasPastDue,
                pendingVerification: hasPendingVerification,
                disabledReason: stripeAccount.requirements?.disabled_reason || undefined
            }
        }
    } catch (error) {
        console.error('[Stripe] Error fetching account info:', error)
        return { success: false, error: 'Failed to fetch Stripe account' }
    }
}

/**
 * Get a fresh onboarding/dashboard link for the Stripe account
 */
export async function getStripeAccountLink(type: 'onboarding' | 'dashboard'): Promise<{
    success: boolean
    url?: string
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId }
        })

        const seller = sellers.find(s => s.stripe_connect_id)

        if (!seller?.stripe_connect_id) {
            return { success: false, error: 'No Stripe account connected' }
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        if (type === 'dashboard') {
            // Create login link for Stripe Express Dashboard
            const loginLink = await stripe.accounts.createLoginLink(seller.stripe_connect_id)
            return { success: true, url: loginLink.url }
        } else {
            // Create onboarding link to complete setup
            const accountLink = await stripe.accountLinks.create({
                account: seller.stripe_connect_id,
                refresh_url: `${appUrl}/seller/settings?tab=account&stripe=refresh`,
                return_url: `${appUrl}/seller/settings?tab=account&stripe=success`,
                type: 'account_onboarding',
            })
            return { success: true, url: accountLink.url }
        }
    } catch (error) {
        console.error('[Stripe] Error creating account link:', error)
        return { success: false, error: 'Failed to create link' }
    }
}

/**
 * Disconnect Stripe account (removes the link, keeps wallet balance)
 */
export async function disconnectStripeAccount(): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId }
        })

        const seller = sellers.find(s => s.stripe_connect_id)

        if (!seller?.stripe_connect_id) {
            return { success: false, error: 'No Stripe account connected' }
        }

        // Update all seller records for this user to remove Stripe connection
        await prisma.seller.updateMany({
            where: { user_id: currentUser.userId },
            data: {
                stripe_connect_id: null,
                payouts_enabled_at: null,
                payout_method: 'PLATFORM' // Fallback to wallet
            }
        })

        console.log(`[Stripe] Disconnected Stripe account for user ${currentUser.userId}`)

        return { success: true }
    } catch (error) {
        console.error('[Stripe] Error disconnecting account:', error)
        return { success: false, error: 'Failed to disconnect' }
    }
}

/**
 * Create a new Stripe Connect account (replaces existing if any)
 */
export async function createNewStripeAccount(): Promise<{
    success: boolean
    onboardingUrl?: string
    error?: string
}> {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const sellers = await prisma.seller.findMany({
            where: { user_id: currentUser.userId },
            include: { Profile: true }
        })

        if (sellers.length === 0) {
            return { success: false, error: 'Seller not found' }
        }

        // Get the primary seller (prefer one with profile)
        const seller = sellers.find(s => s.Profile) || sellers.find(s => !s.program_id) || sellers[0]
        const country = seller.Profile?.country || 'FR'

        // Create new Express account
        const account = await stripe.accounts.create({
            type: 'express',
            email: seller.email,
            country,
            capabilities: {
                transfers: { requested: true },
            },
            metadata: {
                seller_id: seller.id,
                user_id: currentUser.userId,
            },
        })

        // Update all seller records for this user
        await prisma.seller.updateMany({
            where: { user_id: currentUser.userId },
            data: {
                stripe_connect_id: account.id,
                payout_method: 'STRIPE_CONNECT',
                payouts_enabled_at: null // Will be set when onboarding completes
            }
        })

        // Create onboarding link
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${appUrl}/seller/settings?tab=account&stripe=refresh`,
            return_url: `${appUrl}/seller/settings?tab=account&stripe=success`,
            type: 'account_onboarding',
        })

        console.log(`[Stripe] Created new account ${account.id} for user ${currentUser.userId}`)

        return { success: true, onboardingUrl: accountLink.url }
    } catch (error) {
        console.error('[Stripe] Error creating new account:', error)
        return { success: false, error: 'Failed to create account' }
    }
}

// =============================================
// REFERRAL / PARRAINAGE
// =============================================

/**
 * Get the current seller's referral data (code, link, stats).
 * Lazily generates a referral_code if the seller doesn't have one.
 */
export async function getMyReferralData(page: number = 1) {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        let seller = await prisma.seller.findFirst({
            where: { user_id: user.userId },
            select: {
                id: true,
                referral_code: true,
                referred_by: true,
                referred_at: true,
                Referrer: { select: { id: true, name: true, email: true } },
            }
        })

        if (!seller) return { success: false, error: 'No seller found' }

        // Lazy-generate referral code for existing sellers
        if (!seller.referral_code) {
            const code = nanoid(8)
            await prisma.seller.update({
                where: { id: seller.id },
                data: { referral_code: code }
            })
            seller = { ...seller, referral_code: code }
        }

        // Count direct referrals (gen 1)
        const referralCount = await prisma.seller.count({
            where: { referred_by: seller.id }
        })

        // Get referral earnings (all commissions with referral_generation != null for this seller)
        const referralEarnings = await prisma.commission.aggregate({
            where: {
                seller_id: seller.id,
                referral_generation: { not: null },
            },
            _sum: { commission_amount: true },
            _count: true,
        })

        // Earnings by generation (3 parallel queries)
        const [gen1Agg, gen2Agg, gen3Agg] = await Promise.all([
            prisma.commission.aggregate({
                where: { seller_id: seller.id, referral_generation: 1 },
                _sum: { commission_amount: true },
                _count: true,
            }),
            prisma.commission.aggregate({
                where: { seller_id: seller.id, referral_generation: 2 },
                _sum: { commission_amount: true },
                _count: true,
            }),
            prisma.commission.aggregate({
                where: { seller_id: seller.id, referral_generation: 3 },
                _sum: { commission_amount: true },
                _count: true,
            }),
        ])

        // Count referred sellers per generation
        const gen1SellerIds = await prisma.seller.findMany({
            where: { referred_by: seller.id },
            select: { id: true },
        })
        const gen1Ids = gen1SellerIds.map(s => s.id)

        let gen2ReferredCount = 0
        let gen3ReferredCount = 0
        if (gen1Ids.length > 0) {
            const gen2Sellers = await prisma.seller.findMany({
                where: { referred_by: { in: gen1Ids } },
                select: { id: true },
            })
            gen2ReferredCount = gen2Sellers.length
            const gen2Ids = gen2Sellers.map(s => s.id)
            if (gen2Ids.length > 0) {
                gen3ReferredCount = await prisma.seller.count({
                    where: { referred_by: { in: gen2Ids } },
                })
            }
        }

        // Earnings per referred seller — fetch gen1 commissions, then resolve source seller IDs
        const gen1Commissions = await prisma.commission.findMany({
            where: { seller_id: seller.id, referral_generation: 1 },
            select: {
                commission_amount: true,
                referral_source_commission_id: true,
            }
        })

        // Batch-lookup the source commissions to get their seller_id
        const sourceIds = gen1Commissions
            .map(c => c.referral_source_commission_id)
            .filter((id): id is string => id !== null)
        const sourceCommissions = sourceIds.length > 0
            ? await prisma.commission.findMany({
                where: { id: { in: sourceIds } },
                select: { id: true, seller_id: true },
            })
            : []
        const sourceToSeller: Record<string, string> = {}
        for (const sc of sourceCommissions) {
            sourceToSeller[sc.id] = sc.seller_id
        }

        const earningsByReferral: Record<string, number> = {}
        for (const c of gen1Commissions) {
            const srcSellerId = c.referral_source_commission_id ? sourceToSeller[c.referral_source_commission_id] : null
            if (srcSellerId) {
                earningsByReferral[srcSellerId] = (earningsByReferral[srcSellerId] || 0) + c.commission_amount
            }
        }

        // Paginated referred sellers list
        const perPage = 20
        const safePage = Math.max(1, Math.floor(page))
        const totalReferredSellers = referralCount
        const totalPages = Math.max(1, Math.ceil(totalReferredSellers / perPage))

        const referredSellers = await prisma.seller.findMany({
            where: { referred_by: seller.id },
            select: {
                id: true,
                name: true,
                email: true,
                created_at: true,
                status: true,
                _count: { select: { Commissions: { where: { referral_generation: null, org_parent_commission_id: null } } } }
            },
            orderBy: { created_at: 'desc' },
            take: perPage,
            skip: (safePage - 1) * perPage,
        })

        return {
            success: true,
            referralCode: seller.referral_code,
            referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/r/${seller.referral_code}`,
            referredBy: seller.Referrer ? { name: seller.Referrer.name, email: seller.Referrer.email } : null,
            referredAt: seller.referred_at,
            stats: {
                totalReferred: referralCount,
                totalEarnings: referralEarnings._sum.commission_amount || 0,
                totalCommissions: referralEarnings._count,
            },
            earningsByGeneration: {
                gen1: { count: gen1Agg._count, amount: gen1Agg._sum.commission_amount || 0, referredCount: gen1Ids.length },
                gen2: { count: gen2Agg._count, amount: gen2Agg._sum.commission_amount || 0, referredCount: gen2ReferredCount },
                gen3: { count: gen3Agg._count, amount: gen3Agg._sum.commission_amount || 0, referredCount: gen3ReferredCount },
            },
            referredSellers: referredSellers.map(s => ({
                id: s.id,
                name: s.name,
                email: s.email,
                joinedAt: s.created_at,
                status: s.status,
                salesCount: s._count.Commissions,
                earningsFromThem: earningsByReferral[s.id] || 0,
            })),
            pagination: {
                page: safePage,
                totalPages,
                total: totalReferredSellers,
            },
        }
    } catch (error) {
        console.error('[Referral] Failed to get referral data:', error)
        return { success: false, error: 'Failed to load referral data' }
    }
}
