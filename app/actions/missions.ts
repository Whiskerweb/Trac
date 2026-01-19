'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// Mission status type (mirrors Prisma enum)
type MissionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
type RewardType = 'SALE' | 'LEAD'
type CommissionStructure = 'ONE_OFF' | 'RECURRING'
type RewardStructure = 'FLAT' | 'PERCENTAGE'

// =============================================
// WIZARD DATA TYPE
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
                    select: { MissionEnrollment: true }
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
                visibility: m.visibility as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
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
 * Delete a mission
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
        // Verify ownership
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: workspace.workspaceId } // ✅ FIXED
        })

        if (!mission) {
            return { success: false, error: 'Mission not found' }
        }

        await prisma.mission.delete({
            where: { id: missionId }
        })

        console.log('[Mission] 🗑️ Deleted:', missionId)

        return { success: true }

    } catch (error) {
        console.error('[Mission] ❌ Error deleting:', error)
        return { success: false, error: 'Failed to delete mission' }
    }
}

/**
 * Get mission details with all enrollments (for mission owner)
 */
export async function getMissionDetails(missionId: string): Promise<{
    success: boolean
    mission?: {
        id: string
        title: string
        description: string
        target_url: string
        reward: string
        status: MissionStatus
        created_at: Date
        enrollments: {
            id: string
            user_id: string
            status: string
            created_at: Date
            link: {
                id: string
                slug: string
                clicks: number
                full_url: string
            } | null
        }[]
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

        return {
            success: true,
            mission: {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                target_url: mission.target_url,
                reward: mission.reward,
                status: mission.status,
                created_at: mission.created_at,
                enrollments: mission.MissionEnrollment.map(e => ({
                    id: e.id,
                    user_id: e.user_id,
                    status: e.status,
                    created_at: e.created_at,
                    link: e.ShortLink ? {
                        id: e.ShortLink.id,
                        slug: e.ShortLink.slug,
                        clicks: e.ShortLink.clicks,
                        full_url: `${baseUrl}/s/${e.ShortLink.slug}`
                    } : null
                }))
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
