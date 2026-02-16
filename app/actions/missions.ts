'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { nanoid } from 'nanoid'

// Mission status type (mirrors Prisma enum)
type MissionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
type RewardType = 'SALE' | 'LEAD'
type CommissionStructure = 'ONE_OFF' | 'RECURRING'
type RewardStructure = 'FLAT' | 'PERCENTAGE'

// =============================================
// WIZARD DATA TYPE (Legacy V1)
// =============================================

interface WizardData {
    // Step 1: Getting Started
    companyName: string
    logoUrl: string
    targetUrl: string
    customDomain: string

    // Step 2: Configure Rewards
    rewardType: RewardType
    commissionStructure: CommissionStructure
    recurringDuration: number
    rewardStructure: RewardStructure
    rewardAmount: number

    // Step 3: Help & Support
    contactEmail: string
    helpCenterUrl: string
}

// =============================================
// WIZARD DATA TYPE V2 (Multi-Commission)
// =============================================

type CountryFilterType = 'ALL' | 'INCLUDE' | 'EXCLUDE'
type MissionVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'

interface WizardDataV2 {
    // Step 1: Basic Info
    title: string
    description: string
    photoUrl: string | null
    targetUrl: string
    visibility: MissionVisibility  // ✅ NEW: Access type (PUBLIC, PRIVATE, INVITE_ONLY)

    // Step 2: Multi-Commission Configuration
    lead: {
        enabled: boolean
        amount: number  // Fixed amount in EUR (e.g., 5 = 5€)
    }
    sale: {
        enabled: boolean
        structure: RewardStructure  // FLAT or PERCENTAGE
        amount: number  // EUR or %
    }
    recurring: {
        enabled: boolean
        structure: RewardStructure  // FLAT or PERCENTAGE
        amount: number  // EUR or %
        duration: number | null  // Months, null = Lifetime
    }

    // Step 3: Resources & Filters
    contactEmail: string | null
    helpCenterUrl: string | null
    documents: Array<{
        title: string
        url: string
        type: string  // PDF, LINK, etc.
    }>
    countryFilter: {
        type: CountryFilterType
        countries: string[]  // ISO 3166-1 alpha-2 codes
    }
}

// =============================================
// CREATE MISSION FROM WIZARD
// =============================================

/**
 * Create a mission from the full wizard flow
 */
export async function createMissionFromWizard(data: WizardData): Promise<{
    success: boolean
    mission?: { id: string }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    // Validate required fields
    if (!data.companyName?.trim()) {
        return { success: false, error: 'Company name is required' }
    }
    if (!data.targetUrl?.trim()) {
        return { success: false, error: 'Website URL is required' }
    }
    if (data.rewardAmount <= 0) {
        return { success: false, error: 'Reward amount must be greater than 0' }
    }

    try {
        // For LEAD, force FLAT structure
        const effectiveRewardStructure = data.rewardType === 'LEAD' ? 'FLAT' : data.rewardStructure

        // Build reward display string
        const rewardDisplay = effectiveRewardStructure === 'FLAT'
            ? `${data.rewardAmount}€`
            : `${data.rewardAmount}%`

        // Handle recurring duration: 0 = Lifetime = stored as null
        const recurringDuration = data.commissionStructure === 'RECURRING'
            ? (data.recurringDuration === 0 ? null : data.recurringDuration)
            : null

        const mission = await prisma.mission.create({
            data: {
                workspace_id: workspace.workspaceId,
                title: data.companyName.trim(),
                description: `Partner program for ${data.companyName}`,
                target_url: data.targetUrl.trim(),
                reward: rewardDisplay,
                status: 'ACTIVE',
                visibility: 'PUBLIC',

                // Reward configuration
                reward_type: data.rewardType,
                commission_structure: data.rewardType === 'LEAD' ? 'ONE_OFF' : data.commissionStructure,
                reward_structure: effectiveRewardStructure,
                reward_amount: data.rewardAmount,
                recurring_duration: recurringDuration,

                // Branding
                company_name: data.companyName.trim(),
                logo_url: data.logoUrl || null,

                // Support
                contact_email: data.contactEmail || null,
                help_center_url: data.helpCenterUrl || null,
            }
        })

        console.log('[Mission] ✅ Created from wizard:', mission.id, mission.title)

        return {
            success: true,
            mission: { id: mission.id }
        }

    } catch (error) {
        console.error('[Mission] ❌ Error creating from wizard:', error)
        return { success: false, error: 'Failed to create mission' }
    }
}

// =============================================
// CREATE MISSION FROM WIZARD V2 (Multi-Commission)
// =============================================

/**
 * Create a mission from the new wizard flow with multi-commission support
 * Supports Lead + Sale + Recurring commissions simultaneously
 */
export async function createMissionFromWizardV2(data: WizardDataV2): Promise<{
    success: boolean
    mission?: { id: string }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    // === VALIDATION ===

    // At least one commission type must be enabled
    if (!data.lead.enabled && !data.sale.enabled && !data.recurring.enabled) {
        return { success: false, error: 'At least one commission type must be enabled' }
    }

    // Validate title
    if (!data.title?.trim()) {
        return { success: false, error: 'Mission title is required' }
    }

    // Validate target URL
    if (!data.targetUrl?.trim()) {
        return { success: false, error: 'Target URL is required' }
    }

    // Validate lead amount if enabled
    if (data.lead.enabled && data.lead.amount <= 0) {
        return { success: false, error: 'Lead reward amount must be greater than 0' }
    }

    // Validate sale amount if enabled
    if (data.sale.enabled && data.sale.amount <= 0) {
        return { success: false, error: 'Sale reward amount must be greater than 0' }
    }

    // Validate recurring amount if enabled
    if (data.recurring.enabled && data.recurring.amount <= 0) {
        return { success: false, error: 'Recurring reward amount must be greater than 0' }
    }

    // Validate country filter
    if (
        (data.countryFilter.type === 'INCLUDE' || data.countryFilter.type === 'EXCLUDE') &&
        data.countryFilter.countries.length === 0
    ) {
        return { success: false, error: 'Country filter requires at least one country' }
    }

    try {
        // Build display reward string (for legacy compatibility)
        // Priority: Sale > Lead > Recurring
        let rewardDisplay = ''
        if (data.sale.enabled) {
            rewardDisplay = data.sale.structure === 'FLAT'
                ? `${data.sale.amount}€`
                : `${data.sale.amount}%`
        } else if (data.lead.enabled) {
            rewardDisplay = `${data.lead.amount}€`
        } else if (data.recurring.enabled) {
            rewardDisplay = data.recurring.structure === 'FLAT'
                ? `${data.recurring.amount}€`
                : `${data.recurring.amount}%`
        }

        // Determine legacy reward_type for backward compatibility
        // Priority: SALE > LEAD (recurring uses SALE)
        const legacyRewardType: RewardType = data.sale.enabled || data.recurring.enabled ? 'SALE' : 'LEAD'

        // Determine legacy commission_structure
        const legacyCommissionStructure: CommissionStructure = data.recurring.enabled ? 'RECURRING' : 'ONE_OFF'

        // Generate invite code for INVITE_ONLY missions
        const inviteCode = data.visibility === 'INVITE_ONLY' ? nanoid(12) : null

        // Create mission with new multi-commission fields
        const mission = await prisma.mission.create({
            data: {
                workspace_id: workspace.workspaceId,
                title: data.title.trim(),
                description: data.description?.trim() || '',
                target_url: data.targetUrl.trim(),
                reward: rewardDisplay,
                status: 'ACTIVE',
                visibility: data.visibility,  // ✅ Use selected visibility
                invite_code: inviteCode,       // ✅ Set invite code for INVITE_ONLY

                // === LEGACY FIELDS (for backward compatibility) ===
                reward_type: legacyRewardType,
                commission_structure: legacyCommissionStructure,
                reward_structure: data.sale.enabled
                    ? data.sale.structure
                    : (data.recurring.enabled ? data.recurring.structure : 'FLAT'),
                reward_amount: data.sale.enabled
                    ? data.sale.amount
                    : (data.lead.enabled ? data.lead.amount : data.recurring.amount),
                recurring_duration: data.recurring.enabled
                    ? (data.recurring.duration === 0 ? null : data.recurring.duration)
                    : null,

                // === NEW MULTI-COMMISSION FIELDS ===
                // Lead Commission
                lead_enabled: data.lead.enabled,
                lead_reward_amount: data.lead.enabled ? data.lead.amount : null,

                // Sale Commission
                sale_enabled: data.sale.enabled,
                sale_reward_amount: data.sale.enabled ? data.sale.amount : null,
                sale_reward_structure: data.sale.enabled ? data.sale.structure : null,

                // Recurring Commission
                recurring_enabled: data.recurring.enabled,
                recurring_reward_amount: data.recurring.enabled ? data.recurring.amount : null,
                recurring_reward_structure: data.recurring.enabled ? data.recurring.structure : null,
                recurring_duration_months: data.recurring.enabled
                    ? (data.recurring.duration === 0 ? null : data.recurring.duration)
                    : null,

                // === COUNTRY FILTERING ===
                country_filter_type: data.countryFilter.type,
                country_filter_list: data.countryFilter.countries,

                // === BRANDING ===
                company_name: data.title.trim(),
                logo_url: data.photoUrl || null,

                // === SUPPORT ===
                contact_email: data.contactEmail || null,
                help_center_url: data.helpCenterUrl || null,
            }
        })

        // Add documents as MissionContent (PDFs)
        if (data.documents.length > 0) {
            await prisma.missionContent.createMany({
                data: data.documents.map((doc, index) => ({
                    mission_id: mission.id,
                    type: doc.type === 'PDF' ? 'PDF' : 'LINK',
                    url: doc.url,
                    title: doc.title,
                    order: index + 1
                }))
            })
        }

        console.log('[Mission] ✅ Created from wizard V2:', mission.id, mission.title, {
            lead: data.lead.enabled,
            sale: data.sale.enabled,
            recurring: data.recurring.enabled,
            countryFilter: data.countryFilter.type,
            documents: data.documents.length
        })

        return {
            success: true,
            mission: { id: mission.id }
        }

    } catch (error) {
        console.error('[Mission] ❌ Error creating from wizard V2:', error)
        // Return actual error message for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { success: false, error: `Failed to create mission: ${errorMessage}` }
    }
}

// =============================================
// MISSION MANAGEMENT - Server Actions
// =============================================

interface CreateMissionInput {
    title: string
    description: string
    target_url: string
    reward: string
    visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    industry?: string
    gain_type?: string
}

/**
 * Create a new affiliate mission
 */
export async function createMission(data: CreateMissionInput): Promise<{
    success: boolean
    mission?: {
        id: string
        title: string
        status: MissionStatus
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace. Please complete onboarding.' }
    }

    // Validate required fields
    if (!data.title?.trim()) {
        return { success: false, error: 'Title is required' }
    }
    if (!data.target_url?.trim()) {
        return { success: false, error: 'Target URL is required' }
    }
    if (!data.reward?.trim()) {
        return { success: false, error: 'Reward is required' }
    }

    try {
        const mission = await prisma.mission.create({
            data: {
                workspace_id: workspace.workspaceId,  // ✅ FIXED: Use actual workspace ID
                title: data.title.trim(),
                description: data.description?.trim() || '',
                target_url: data.target_url.trim(),
                reward: data.reward.trim(),
                status: 'ACTIVE' as const,
                visibility: data.visibility || 'PUBLIC',
                industry: data.industry || null,
                gain_type: data.gain_type || null,
            }
        })

        console.log('[Mission] ✅ Created:', mission.id, mission.title)

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                status: mission.status,
            }
        }

    } catch (error) {
        console.error('[Mission] ❌ Error creating:', error)
        return { success: false, error: 'Failed to create mission' }
    }
}

/**
 * Get all missions for the current workspace
 */
export async function getWorkspaceMissions(): Promise<{
    success: boolean
    missions?: {
        id: string
        title: string
        description: string
        target_url: string
        reward: string
        status: MissionStatus
        created_at: Date
        _count: { enrollments: number }
        visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
        organization_id: string | null
    }[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        const missions = await prisma.mission.findMany({
            where: { workspace_id: workspace.workspaceId }, // ✅ FIXED: Use workspace ID
            include: {
                _count: {
                    select: { MissionEnrollment: { where: { status: { not: 'ARCHIVED' } } } }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return {
            success: true,
            missions: missions.map(m => ({
                id: m.id,
                title: m.title,
                description: m.description,
                target_url: m.target_url,
                reward: m.reward,
                status: m.status,
                created_at: m.created_at,
                _count: { enrollments: m._count.MissionEnrollment },
                visibility: m.visibility as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
                organization_id: m.organization_id,
            }))
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching:', error)
        return { success: false, error: 'Failed to fetch missions' }
    }
}

/**
 * Update mission status
 */
export async function updateMissionStatus(
    missionId: string,
    status: MissionStatus
): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Verify ownership
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: workspace.workspaceId } // ✅ FIXED
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        await prisma.mission.update({
            where: { id: missionId },
            data: { status }
        })

        console.log('[Mission] 🔄 Status updated:', missionId, status)

        return { success: true }

    } catch (error) {
        console.error('[Mission] ❌ Error updating status:', error)
        return { success: false, error: 'Failed to update mission' }
    }
}

/**
 * Archive a mission (soft-delete)
 * Sets mission status to ARCHIVED, archives enrollments, removes ShortLinks from Redis
 */
export async function deleteMission(missionId: string): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Verify ownership and fetch enrollments with their ShortLinks
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: workspace.workspaceId },
            include: {
                MissionEnrollment: {
                    where: { status: 'APPROVED' },
                    include: {
                        ShortLink: { select: { slug: true } }
                    }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        // 1. Archive mission
        await prisma.mission.update({
            where: { id: missionId },
            data: { status: 'ARCHIVED' }
        })

        // 2. Archive all APPROVED enrollments
        await prisma.missionEnrollment.updateMany({
            where: { mission_id: missionId, status: 'APPROVED' },
            data: { status: 'ARCHIVED' }
        })

        // 3. Remove ShortLinks from Redis (no more new clicks)
        const { deleteLinkFromRedis } = await import('@/lib/redis')
        for (const enrollment of mission.MissionEnrollment) {
            if (enrollment.ShortLink?.slug) {
                await deleteLinkFromRedis(enrollment.ShortLink.slug)
            }
        }

        // 4. Cancel ACCEPTED OrganizationMissions tied to this mission
        await prisma.organizationMission.updateMany({
            where: { mission_id: missionId, status: 'ACCEPTED' },
            data: { status: 'CANCELLED' }
        })

        // 5. Delete GroupMissions tied to this mission
        await prisma.groupMission.deleteMany({
            where: { mission_id: missionId }
        })

        console.log('[Mission] 📦 Archived:', missionId, `(${mission.MissionEnrollment.length} enrollments archived)`)

        return { success: true }

    } catch (error) {
        console.error('[Mission] ❌ Error archiving:', error)
        return { success: false, error: 'Failed to archive mission' }
    }
}

/**
 * Get mission details with all enrollments (for mission owner)
 */
export interface EnrollmentWithStats {
    id: string
    user_id: string
    status: string
    created_at: Date
    enrollmentType: 'SOLO' | 'GROUP' | 'ORG'
    groupName?: string | null
    orgName?: string | null
    seller: {
        name: string | null
        email: string
        avatar: string | null
    } | null
    link: {
        id: string
        slug: string
        clicks: number
        full_url: string
    } | null
    stats: {
        revenue: number      // in cents
        sales: number
        clicks: number
    }
}

export async function getMissionDetails(missionId: string): Promise<{
    success: boolean
    mission?: {
        id: string
        title: string
        description: string
        target_url: string
        reward: string
        status: MissionStatus
        visibility: MissionVisibility
        invite_code: string | null
        invite_url: string | null
        created_at: Date
        enrollments: EnrollmentWithStats[]
    }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Get active workspace
    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                workspace_id: workspace.workspaceId
            },
            include: {
                Workspace: {
                    include: {
                        Domain: {
                            where: { verified: true },
                            take: 1
                        }
                    }
                },
                MissionEnrollment: {
                    include: {
                        ShortLink: true
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found or access denied' }
        }

        // Use custom domain if available, otherwise fallback to app URL
        const customDomain = mission.Workspace.Domain?.[0]?.name
        const baseUrl = customDomain
            ? `https://${customDomain}`
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

        // Build invite URL for INVITE_ONLY missions
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const inviteUrl = mission.invite_code
            ? `${appUrl}/invite/${mission.invite_code}`
            : null

        // Get seller info for all enrolled users
        const userIds = mission.MissionEnrollment.map(e => e.user_id)
        const sellers = userIds.length > 0
            ? await prisma.seller.findMany({
                where: { user_id: { in: userIds } },
                select: {
                    user_id: true,
                    name: true,
                    email: true,
                    Profile: {
                        select: { avatar_url: true }
                    }
                }
            })
            : []
        const sellerMap = new Map(sellers.map(s => [s.user_id, s]))

        // Get commission stats for each link
        const linkIds = mission.MissionEnrollment
            .map(e => e.link_id)
            .filter((id): id is string => id !== null)

        const commissions = linkIds.length > 0
            ? await prisma.commission.findMany({
                where: { link_id: { in: linkIds } },
                select: {
                    link_id: true,
                    gross_amount: true
                }
            })
            : []

        // Build stats map per link
        const linkStatsMap = new Map<string, { revenue: number; sales: number }>()
        for (const c of commissions) {
            if (c.link_id) {
                const existing = linkStatsMap.get(c.link_id) || { revenue: 0, sales: 0 }
                existing.revenue += c.gross_amount
                existing.sales += 1
                linkStatsMap.set(c.link_id, existing)
            }
        }

        // Fetch group info for group-enrolled missions
        const groupMissionIds = mission.MissionEnrollment
            .map(e => e.group_mission_id)
            .filter((id): id is string => !!id)

        const groupMissionsMap = new Map<string, string>()
        if (groupMissionIds.length > 0) {
            const groupMissions = await prisma.groupMission.findMany({
                where: { id: { in: groupMissionIds } },
                include: { Group: { select: { name: true } } },
            })
            for (const gm of groupMissions) {
                groupMissionsMap.set(gm.id, gm.Group.name)
            }
        }

        // Fetch org info for org-enrolled missions
        const orgMissionIds = mission.MissionEnrollment
            .map(e => e.organization_mission_id)
            .filter((id): id is string => !!id)

        const orgMissionsMap = new Map<string, string>()
        if (orgMissionIds.length > 0) {
            const orgMissions = await prisma.organizationMission.findMany({
                where: { id: { in: orgMissionIds } },
                include: { Organization: { select: { name: true } } },
            })
            for (const om of orgMissions) {
                orgMissionsMap.set(om.id, om.Organization.name)
            }
        }

        // Map enrollments with seller info and stats
        const enrollmentsWithStats: EnrollmentWithStats[] = mission.MissionEnrollment.map(e => {
            const seller = sellerMap.get(e.user_id)
            const linkStats = e.link_id ? linkStatsMap.get(e.link_id) : null

            return {
                id: e.id,
                user_id: e.user_id,
                status: e.status,
                created_at: e.created_at,
                enrollmentType: e.group_mission_id ? 'GROUP' as const : e.organization_mission_id ? 'ORG' as const : 'SOLO' as const,
                groupName: e.group_mission_id ? groupMissionsMap.get(e.group_mission_id) || null : null,
                orgName: e.organization_mission_id ? orgMissionsMap.get(e.organization_mission_id) || null : null,
                seller: seller ? {
                    name: seller.name,
                    email: seller.email,
                    avatar: seller.Profile?.avatar_url || null
                } : null,
                link: e.ShortLink ? {
                    id: e.ShortLink.id,
                    slug: e.ShortLink.slug,
                    clicks: e.ShortLink.clicks,
                    full_url: `${baseUrl}/s/${e.ShortLink.slug}`
                } : null,
                stats: {
                    revenue: linkStats?.revenue || 0,
                    sales: linkStats?.sales || 0,
                    clicks: e.ShortLink?.clicks || 0
                }
            }
        })

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                status: mission.status,
                visibility: mission.visibility as MissionVisibility,
                invite_code: mission.invite_code,
                invite_url: inviteUrl,
                created_at: mission.created_at,
                enrollments: enrollmentsWithStats
            }
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching details:', error)
        return { success: false, error: 'Failed to fetch mission details' }
    }
}


// =============================================
// MISSION CONTENT MANAGEMENT
// =============================================

type ContentType = 'YOUTUBE' | 'PDF' | 'LINK' | 'TEXT'

interface AddContentInput {
    missionId: string
    type: ContentType
    url?: string
    title: string
    description?: string
    order?: number
}

/**
 * Add content/resource to a mission
 */
export async function addMissionContent(data: AddContentInput): Promise<{
    success: boolean
    content?: { id: string }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Verify mission ownership
        const mission = await prisma.mission.findFirst({
            where: { id: data.missionId, workspace_id: workspace.workspaceId }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        // Get current max order
        const maxOrder = await prisma.missionContent.aggregate({
            where: { mission_id: data.missionId },
            _max: { order: true }
        })

        const content = await prisma.missionContent.create({
            data: {
                mission_id: data.missionId,
                type: data.type,
                url: data.url || null,
                title: data.title,
                description: data.description || null,
                order: data.order ?? ((maxOrder._max.order || 0) + 1)
            }
        })

        console.log('[Mission] ✅ Content added:', content.id)
        return { success: true, content: { id: content.id } }

    } catch (error) {
        console.error('[Mission] ❌ Error adding content:', error)
        return { success: false, error: 'Failed to add content' }
    }
}

/**
 * Get all content for a mission
 */
export async function getMissionContents(missionId: string): Promise<{
    success: boolean
    contents?: Array<{
        id: string
        type: ContentType
        url: string | null
        title: string
        description: string | null
        order: number
    }>
    error?: string
}> {
    try {
        const contents = await prisma.missionContent.findMany({
            where: { mission_id: missionId },
            orderBy: { order: 'asc' }
        })

        return {
            success: true,
            contents: contents.map(c => ({
                id: c.id,
                type: c.type as ContentType,
                url: c.url,
                title: c.title,
                description: c.description,
                order: c.order
            }))
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching contents:', error)
        return { success: false, error: 'Failed to fetch contents' }
    }
}

/**
 * Delete mission content
 */
export async function deleteMissionContent(contentId: string): Promise<{
    success: boolean
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Verify ownership via mission
        const content = await prisma.missionContent.findUnique({
            where: { id: contentId },
            include: { Mission: true }
        })

        if (!content || content.Mission.workspace_id !== workspace.workspaceId) {
            return { success: false, error: 'Content not found' }
        }

        await prisma.missionContent.delete({
            where: { id: contentId }
        })

        console.log('[Mission] 🗑️ Content deleted:', contentId)
        return { success: true }

    } catch (error) {
        console.error('[Mission] ❌ Error deleting content:', error)
        return { success: false, error: 'Failed to delete content' }
    }
}

// =============================================
// GET MISSIONS WITH FULL STATS
// For startup dashboard - includes clicks, revenue, commissions
// =============================================

export interface MissionWithStats {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    status: MissionStatus
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    invite_code: string | null
    created_at: Date
    // Stats
    stats: {
        sellers: number           // Total enrolled sellers
        activeSellers: number     // Sellers with APPROVED status
        clicks: number            // Total clicks from all short links
        sales: number             // Number of commissions (conversions)
        revenue: number           // Total gross revenue in cents
        commissions: number       // Total commissions to pay in cents
    }
    // Recent enrollments (last 5)
    recentEnrollments: Array<{
        id: string
        user_id: string
        status: string
        created_at: Date
        seller_name: string | null
        seller_email: string | null
    }>
}

export interface MissionsWithStatsResponse {
    success: boolean
    missions?: MissionWithStats[]
    globalStats?: {
        totalMissions: number
        activeMissions: number
        totalSellers: number
        totalClicks: number
        totalRevenue: number
        totalCommissions: number
    }
    error?: string
}

/**
 * Get all missions for workspace with full stats
 * Includes clicks, revenue, commissions per mission
 */
export async function getMissionsWithFullStats(): Promise<MissionsWithStatsResponse> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Get all missions with enrollments and their short links
        const missions = await prisma.mission.findMany({
            where: { workspace_id: workspace.workspaceId },
            include: {
                MissionEnrollment: {
                    include: {
                        ShortLink: {
                            select: {
                                id: true,
                                clicks: true
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Extract link_ids and user_ids from enrollments for parallel queries
        const allLinkIds = missions.flatMap(m =>
            m.MissionEnrollment.map(e => e.link_id).filter(Boolean)
        ) as string[]
        const uniqueUserIds = [...new Set(missions.flatMap(m => m.MissionEnrollment.map(e => e.user_id)))]

        // Parallel: aggregate commissions by link_id (DB-side) + fetch seller info
        const [commissionStats, sellers] = await Promise.all([
            allLinkIds.length > 0
                ? prisma.commission.groupBy({
                    by: ['link_id'],
                    where: { link_id: { in: allLinkIds } },
                    _count: { id: true },
                    _sum: { gross_amount: true, commission_amount: true }
                })
                : Promise.resolve([]),
            uniqueUserIds.length > 0
                ? prisma.seller.findMany({
                    where: { user_id: { in: uniqueUserIds } },
                    select: { user_id: true, name: true, email: true }
                })
                : Promise.resolve([])
        ])

        // Build map of link_id -> aggregated commission stats
        const commissionsByLink = new Map(
            commissionStats.map(s => [s.link_id!, {
                count: s._count.id,
                grossTotal: s._sum.gross_amount || 0,
                commissionTotal: s._sum.commission_amount || 0
            }])
        )

        const sellerMap = new Map(sellers.map(s => [s.user_id, { name: s.name, email: s.email }]))

        // Map missions with stats
        const missionsWithStats: MissionWithStats[] = missions.map(mission => {
            // Calculate stats from enrollments
            const enrollments = mission.MissionEnrollment
            const totalSellers = enrollments.length
            const activeSellers = enrollments.filter(e => e.status === 'APPROVED').length

            // Sum clicks from all short links
            const totalClicks = enrollments.reduce((sum, e) => sum + (e.ShortLink?.clicks || 0), 0)

            // Get commission stats for this mission's links
            let salesCount = 0
            let revenueTotal = 0
            let commissionTotal = 0

            for (const enrollment of enrollments) {
                if (enrollment.link_id) {
                    const linkStats = commissionsByLink.get(enrollment.link_id)
                    if (linkStats) {
                        salesCount += linkStats.count
                        revenueTotal += linkStats.grossTotal
                        commissionTotal += linkStats.commissionTotal
                    }
                }
            }

            // Get recent enrollments with seller info
            const recentEnrollments = enrollments.slice(0, 5).map(e => {
                const sellerInfo = sellerMap.get(e.user_id)
                return {
                    id: e.id,
                    user_id: e.user_id,
                    status: e.status,
                    created_at: e.created_at,
                    seller_name: sellerInfo?.name || null,
                    seller_email: sellerInfo?.email || null
                }
            })

            return {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                status: mission.status,
                visibility: mission.visibility as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',
                invite_code: mission.invite_code,
                created_at: mission.created_at,
                stats: {
                    sellers: totalSellers,
                    activeSellers,
                    clicks: totalClicks,
                    sales: salesCount,
                    revenue: revenueTotal,
                    commissions: commissionTotal
                },
                recentEnrollments
            }
        })

        // Calculate global stats
        const globalStats = {
            totalMissions: missions.length,
            activeMissions: missions.filter(m => m.status === 'ACTIVE').length,
            totalSellers: missionsWithStats.reduce((sum, m) => sum + m.stats.sellers, 0),
            totalClicks: missionsWithStats.reduce((sum, m) => sum + m.stats.clicks, 0),
            totalRevenue: missionsWithStats.reduce((sum, m) => sum + m.stats.revenue, 0),
            totalCommissions: missionsWithStats.reduce((sum, m) => sum + m.stats.commissions, 0)
        }

        return {
            success: true,
            missions: missionsWithStats,
            globalStats
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching missions with stats:', error)
        return { success: false, error: 'Failed to fetch missions' }
    }
}

// =============================================
// GET RECENT MISSION ACTIVITY
// Returns recent events across all missions for the activity feed
// =============================================

export interface ActivityItem {
    id: string
    type: 'enrollment' | 'request' | 'sale' | 'click'
    timestamp: Date
    missionId: string
    missionTitle: string
    description: string
    metadata?: {
        sellerName?: string
        sellerEmail?: string
        amount?: number
        status?: string
    }
}

export async function getRecentMissionActivity(limit: number = 20): Promise<{
    success: boolean
    activities?: ActivityItem[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Round 1: Fetch enrollments and commissions in parallel (independent queries)
        const [recentEnrollments, recentCommissions] = await Promise.all([
            prisma.missionEnrollment.findMany({
                where: {
                    Mission: { workspace_id: workspace.workspaceId }
                },
                include: {
                    Mission: { select: { id: true, title: true } }
                },
                orderBy: { created_at: 'desc' },
                take: limit
            }),
            prisma.commission.findMany({
                where: { program_id: workspace.workspaceId },
                include: {
                    Seller: { select: { name: true, email: true } }
                },
                orderBy: { created_at: 'desc' },
                take: limit
            })
        ])

        // Round 2: Fetch sellers and link->mission mapping in parallel (depend on round 1 results)
        const userIds = recentEnrollments.map(e => e.user_id)
        const linkIds = recentCommissions.map(c => c.link_id).filter((id): id is string => id !== null)

        const [sellers, links] = await Promise.all([
            userIds.length > 0
                ? prisma.seller.findMany({
                    where: { user_id: { in: userIds } },
                    select: { user_id: true, name: true, email: true }
                })
                : Promise.resolve([]),
            linkIds.length > 0
                ? prisma.shortLink.findMany({
                    where: { id: { in: linkIds } },
                    include: {
                        MissionEnrollment: {
                            include: {
                                Mission: { select: { id: true, title: true } }
                            }
                        }
                    }
                })
                : Promise.resolve([])
        ])

        const sellerMap = new Map(sellers.map(s => [s.user_id, s]))
        const linkMissionMap = new Map<string, { id: string; title: string }>()
        for (const link of links) {
            if (link.MissionEnrollment?.Mission) {
                linkMissionMap.set(link.id, link.MissionEnrollment.Mission)
            }
        }

        // Build activities list
        const activities: ActivityItem[] = []

        // Add enrollments
        for (const enrollment of recentEnrollments) {
            const seller = sellerMap.get(enrollment.user_id)
            activities.push({
                id: `enrollment-${enrollment.id}`,
                type: 'enrollment',
                timestamp: enrollment.created_at,
                missionId: enrollment.Mission.id,
                missionTitle: enrollment.Mission.title,
                description: enrollment.status === 'APPROVED'
                    ? `${seller?.name || seller?.email || 'Un seller'} a rejoint`
                    : `${seller?.name || seller?.email || 'Un seller'} attend approbation`,
                metadata: {
                    sellerName: seller?.name || undefined,
                    sellerEmail: seller?.email,
                    status: enrollment.status
                }
            })
        }

        // Add sales/commissions
        for (const commission of recentCommissions) {
            const mission = commission.link_id ? linkMissionMap.get(commission.link_id) : null
            activities.push({
                id: `sale-${commission.id}`,
                type: 'sale',
                timestamp: commission.created_at,
                missionId: mission?.id || 'unknown',
                missionTitle: mission?.title || 'Vente directe',
                description: `Vente de ${(commission.gross_amount / 100).toFixed(2)}€`,
                metadata: {
                    sellerName: commission.Seller?.name || undefined,
                    sellerEmail: commission.Seller?.email,
                    amount: commission.gross_amount
                }
            })
        }

        // Sort by timestamp descending
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        return {
            success: true,
            activities: activities.slice(0, limit)
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching activity:', error)
        return { success: false, error: 'Failed to fetch activity' }
    }
}
