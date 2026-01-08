'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

// =============================================
// USER ROLE DETECTION (Biface Architecture)
// =============================================

export interface UserRoles {
    userId: string
    email: string
    hasWorkspace: boolean
    hasPartner: boolean
    pendingClaims: number
    primaryRole: 'startup' | 'partner' | 'none'
    workspaces: {
        id: string
        name: string
        slug: string
    }[]
    partners: {
        id: string
        programId: string
        programName: string
        status: 'PENDING' | 'APPROVED' | 'BANNED'
    }[]
}

/**
 * Detect all roles a user has in the system
 * 
 * Used to determine routing after authentication:
 * - If hasWorkspace && hasPartner → Show choice page
 * - If hasWorkspace only → Redirect to /dashboard
 * - If hasPartner only → Redirect to /partner
 * - If neither → Redirect to /onboarding
 */
export async function getUserRoles(userId?: string): Promise<UserRoles | null> {
    // Get current user if not provided
    let resolvedUserId = userId
    let email = ''

    if (!resolvedUserId) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return null

        resolvedUserId = user.id
        email = user.email || ''
    }

    try {
        // Fetch workspaces (as owner or member)
        const workspaceMemberships = await prisma.workspaceMember.findMany({
            where: { user_id: resolvedUserId },
            include: {
                Workspace: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        // Also check owned workspaces (owner_id)
        const ownedWorkspaces = await prisma.workspace.findMany({
            where: { owner_id: resolvedUserId },
            select: { id: true, name: true, slug: true }
        })

        // Merge and deduplicate
        const workspaceMap = new Map<string, { id: string; name: string; slug: string }>()
        for (const ws of ownedWorkspaces) {
            workspaceMap.set(ws.id, ws)
        }
        for (const membership of workspaceMemberships) {
            workspaceMap.set(membership.Workspace.id, membership.Workspace)
        }
        const workspaces = Array.from(workspaceMap.values())

        // Fetch partner records (linked to this user)
        const partners = await prisma.partner.findMany({
            where: { user_id: resolvedUserId },
            include: {
                Program: {
                    select: { id: true, name: true }
                }
            }
        })

        // Count pending shadow partners (unlinked but matching email)
        let pendingClaims = 0
        if (email) {
            pendingClaims = await prisma.partner.count({
                where: {
                    email: email.toLowerCase(),
                    user_id: null
                }
            })
        }

        const hasWorkspace = workspaces.length > 0
        const hasPartner = partners.length > 0

        // Determine primary role
        let primaryRole: 'startup' | 'partner' | 'none' = 'none'
        if (hasWorkspace && hasPartner) {
            // Dual identity - default to startup (can be overridden by preference)
            primaryRole = 'startup'
        } else if (hasWorkspace) {
            primaryRole = 'startup'
        } else if (hasPartner) {
            primaryRole = 'partner'
        }

        return {
            userId: resolvedUserId,
            email,
            hasWorkspace,
            hasPartner,
            pendingClaims,
            primaryRole,
            workspaces,
            partners: partners.map(p => ({
                id: p.id,
                programId: p.Program?.id || 'global',
                programName: p.Program?.name || 'Global Partner',
                status: p.status
            }))
        }

    } catch (error) {
        console.error('[Roles] ❌ Failed to get user roles:', error)
        return null
    }
}

/**
 * Check if user has any shadow partners waiting to be claimed
 */
export async function hasPendingClaims(email: string): Promise<boolean> {
    const count = await prisma.partner.count({
        where: {
            email: email.toLowerCase(),
            user_id: null
        }
    })
    return count > 0
}
