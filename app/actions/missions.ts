'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

// Mission status type (mirrors Prisma enum)
type MissionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

// =============================================
// MISSION MANAGEMENT - Server Actions
// =============================================

interface CreateMissionInput {
    title: string
    description: string
    target_url: string
    reward: string
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
                workspace_id: user.id,
                title: data.title.trim(),
                description: data.description?.trim() || '',
                target_url: data.target_url.trim(),
                reward: data.reward.trim(),
                status: 'ACTIVE' as const,
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
    }[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        const missions = await prisma.mission.findMany({
            where: { workspace_id: user.id },
            include: {
                _count: {
                    select: { enrollments: true }
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
                _count: m._count,
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

    try {
        // Verify ownership
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: user.id }
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

    try {
        // Verify ownership
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: user.id }
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

    try {
        const mission = await prisma.mission.findFirst({
            where: {
                id: missionId,
                workspace_id: user.id  // SECURITY: Only owner can view details
            },
            include: {
                enrollments: {
                    include: {
                        link: true
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!mission) {
            return { success: false, error: 'Mission not found or access denied' }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

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
                enrollments: mission.enrollments.map(e => ({
                    id: e.id,
                    user_id: e.user_id,
                    status: e.status,
                    created_at: e.created_at,
                    link: e.link ? {
                        id: e.link.id,
                        slug: e.link.slug,
                        clicks: e.link.clicks,
                        full_url: `${baseUrl}/s/${e.link.slug}`
                    } : null
                }))
            }
        }

    } catch (error) {
        console.error('[Mission] ❌ Error fetching details:', error)
        return { success: false, error: 'Failed to fetch mission details' }
    }
}
