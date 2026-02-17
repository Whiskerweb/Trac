'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { createClient } from '@/utils/supabase/server'

// =============================================
// STARTUP PROFILE - SERVER ACTIONS
// =============================================

export interface StartupProfileData {
    name: string
    description: string | null
    logoUrl: string | null
    websiteUrl: string | null
    industry: string | null
    companySize: string | null
    foundedYear: string | null
    headquarters: string | null
    twitterUrl: string | null
    linkedinUrl: string | null
    instagramUrl: string | null
    youtubeUrl: string | null
    tiktokUrl: string | null
    githubUrl: string | null
    pitchDeckUrl: string | null
    docUrl: string | null
}

/**
 * Get the startup profile for the current workspace
 */
export async function getStartupProfile(): Promise<{
    success: boolean
    profile?: StartupProfileData
    error?: string
}> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Not authenticated' }
        }

        const ws = await prisma.workspace.findUnique({
            where: { id: workspace.workspaceId },
            include: { Profile: true }
        })

        if (!ws) {
            return { success: false, error: 'Workspace not found' }
        }

        const profile = ws.Profile

        return {
            success: true,
            profile: {
                name: ws.name,
                description: profile?.description || null,
                logoUrl: profile?.logo_url || null,
                websiteUrl: profile?.website_url || null,
                industry: profile?.industry || null,
                companySize: profile?.company_size || null,
                foundedYear: profile?.founded_year || null,
                headquarters: profile?.headquarters || null,
                twitterUrl: profile?.twitter_url || null,
                linkedinUrl: profile?.linkedin_url || null,
                instagramUrl: profile?.instagram_url || null,
                youtubeUrl: profile?.youtube_url || null,
                tiktokUrl: profile?.tiktok_url || null,
                githubUrl: profile?.github_url || null,
                pitchDeckUrl: profile?.pitch_deck_url || null,
                docUrl: profile?.doc_url || null,
            }
        }
    } catch (error) {
        console.error('[StartupProfile] Error fetching profile:', error)
        return { success: false, error: 'Error loading profile' }
    }
}

/**
 * Update the startup profile for the current workspace
 */
export async function updateStartupProfile(input: {
    name?: string
    description?: string | null
    logoUrl?: string | null
    websiteUrl?: string | null
    industry?: string | null
    companySize?: string | null
    foundedYear?: string | null
    headquarters?: string | null
    twitterUrl?: string | null
    linkedinUrl?: string | null
    instagramUrl?: string | null
    youtubeUrl?: string | null
    tiktokUrl?: string | null
    githubUrl?: string | null
    pitchDeckUrl?: string | null
    docUrl?: string | null
}): Promise<{
    success: boolean
    error?: string
}> {
    try {
        console.log('[StartupProfile] Input received:', JSON.stringify(input))

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            console.log('[StartupProfile] No workspace found')
            return { success: false, error: 'Not authenticated' }
        }

        console.log('[StartupProfile] Workspace:', workspace.workspaceId)

        // Update workspace name if provided
        if (input.name && input.name.trim()) {
            await prisma.workspace.update({
                where: { id: workspace.workspaceId },
                data: { name: input.name.trim() }
            })
            console.log('[StartupProfile] Workspace name updated:', input.name.trim())
        }

        // Build profile data conditionally (only update fields that were provided)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileData: any = {}

        if (input.description !== undefined) profileData.description = input.description
        if (input.logoUrl !== undefined) profileData.logo_url = input.logoUrl
        if (input.websiteUrl !== undefined) profileData.website_url = input.websiteUrl
        if (input.industry !== undefined) profileData.industry = input.industry
        if (input.companySize !== undefined) profileData.company_size = input.companySize
        if (input.foundedYear !== undefined) profileData.founded_year = input.foundedYear
        if (input.headquarters !== undefined) profileData.headquarters = input.headquarters
        if (input.twitterUrl !== undefined) profileData.twitter_url = input.twitterUrl
        if (input.linkedinUrl !== undefined) profileData.linkedin_url = input.linkedinUrl
        if (input.instagramUrl !== undefined) profileData.instagram_url = input.instagramUrl
        if (input.youtubeUrl !== undefined) profileData.youtube_url = input.youtubeUrl
        if (input.tiktokUrl !== undefined) profileData.tiktok_url = input.tiktokUrl
        if (input.githubUrl !== undefined) profileData.github_url = input.githubUrl
        if (input.pitchDeckUrl !== undefined) profileData.pitch_deck_url = input.pitchDeckUrl
        if (input.docUrl !== undefined) profileData.doc_url = input.docUrl

        console.log('[StartupProfile] Profile data to save:', JSON.stringify(profileData))

        // Upsert workspace profile
        const result = await prisma.workspaceProfile.upsert({
            where: { workspace_id: workspace.workspaceId },
            create: {
                workspace_id: workspace.workspaceId,
                ...profileData,
            },
            update: profileData,
        })

        console.log('[StartupProfile] Upsert result id:', result.id)

        return { success: true }
    } catch (error) {
        console.error('[StartupProfile] Error updating profile:', error)
        return { success: false, error: 'Error saving profile' }
    }
}

// =============================================
// STARTUP ONBOARDING STATUS
// =============================================

export interface StartupOnboardingStatus {
    isComplete: boolean
    steps: {
        profile: boolean   // logo_url + description + industry filled
        mission: boolean   // at least 1 mission created
        webhook: boolean   // at least 1 WebhookEndpoint
        seller: boolean    // at least 1 MissionEnrollment APPROVED
    }
}

/**
 * Get onboarding completion status for the current workspace
 */
export async function getStartupOnboardingStatus(): Promise<{
    success: boolean
    status?: StartupOnboardingStatus
    error?: string
}> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Not authenticated' }
        }

        const wsId = workspace.workspaceId

        const [profileData, missionCount, webhookCount, enrollmentCount] = await Promise.all([
            prisma.workspaceProfile.findUnique({
                where: { workspace_id: wsId },
                select: { logo_url: true, description: true, industry: true }
            }),
            prisma.mission.count({
                where: { workspace_id: wsId }
            }),
            prisma.webhookEndpoint.count({
                where: { workspace_id: wsId }
            }),
            prisma.missionEnrollment.count({
                where: {
                    Mission: { workspace_id: wsId },
                    status: 'APPROVED'
                }
            }),
        ])

        const profileComplete = !!(profileData?.logo_url && profileData?.description && profileData?.industry)

        const steps = {
            profile: profileComplete,
            mission: missionCount > 0,
            webhook: webhookCount > 0,
            seller: enrollmentCount > 0,
        }

        return {
            success: true,
            status: {
                isComplete: Object.values(steps).every(Boolean),
                steps,
            }
        }
    } catch (error) {
        console.error('[StartupOnboarding] Error:', error)
        return { success: false, error: 'Error loading onboarding status' }
    }
}

/**
 * Get a startup's public profile by workspace ID (for sellers viewing a startup)
 */
export async function getPublicStartupProfile(workspaceId: string): Promise<{
    success: boolean
    profile?: StartupProfileData
    error?: string
}> {
    try {
        // Auth check - must be a logged-in user
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const ws = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { Profile: true }
        })

        if (!ws) {
            return { success: false, error: 'Startup not found' }
        }

        const profile = ws.Profile

        return {
            success: true,
            profile: {
                name: ws.name,
                description: profile?.description || null,
                logoUrl: profile?.logo_url || null,
                websiteUrl: profile?.website_url || null,
                industry: profile?.industry || null,
                companySize: profile?.company_size || null,
                foundedYear: profile?.founded_year || null,
                headquarters: profile?.headquarters || null,
                twitterUrl: profile?.twitter_url || null,
                linkedinUrl: profile?.linkedin_url || null,
                instagramUrl: profile?.instagram_url || null,
                youtubeUrl: profile?.youtube_url || null,
                tiktokUrl: profile?.tiktok_url || null,
                githubUrl: profile?.github_url || null,
                pitchDeckUrl: profile?.pitch_deck_url || null,
                docUrl: profile?.doc_url || null,
            }
        }
    } catch (error) {
        console.error('[StartupProfile] Error fetching public profile:', error)
        return { success: false, error: 'Error loading profile' }
    }
}
