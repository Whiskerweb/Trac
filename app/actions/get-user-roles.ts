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
    hasSeller: boolean
    pendingClaims: number
    primaryRole: 'startup' | 'seller' | 'none'
    workspaces: {
        id: string
        name: string
        slug: string
    }[]
    sellers: {
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
 * - If hasWorkspace && hasSeller → Show choice page
 * - If hasWorkspace only → Redirect to /dashboard
 * - If hasSeller only → Redirect to /seller
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

        // Fetch seller records (linked to this user)
        const sellers = await prisma.seller.findMany({
            where: { user_id: resolvedUserId },
            include: {
                Program: {
                    select: { id: true, name: true }
                }
            }
        })

        // Count pending shadow sellers (unlinked but matching email)
        let pendingClaims = 0
        if (email) {
            pendingClaims = await prisma.seller.count({
                where: {
                    email: email.toLowerCase(),
                    user_id: null
                }
            })
        }

        const hasWorkspace = workspaces.length > 0
        const hasSeller = sellers.length > 0

        // Determine primary role
        let primaryRole: 'startup' | 'seller' | 'none' = 'none'
        if (hasWorkspace && hasSeller) {
            // Dual identity - default to startup (can be overridden by preference)
            primaryRole = 'startup'
        } else if (hasWorkspace) {
            primaryRole = 'startup'
        } else if (hasSeller) {
            primaryRole = 'seller'
        }

        return {
            userId: resolvedUserId,
            email,
            hasWorkspace,
            hasSeller,
            pendingClaims,
            primaryRole,
            workspaces,
            sellers: sellers.map(p => ({
                id: p.id,
                programId: p.Program?.id || 'global',
                programName: p.Program?.name || 'Global Seller',
                status: p.status
            }))
        }

    } catch (error) {
        console.error('[Roles] ❌ Failed to get user roles:', error)
        return null
    }
}

/**
 * Check if user has any shadow sellers waiting to be claimed
 */
export async function hasPendingClaims(email: string): Promise<boolean> {
    const count = await prisma.seller.count({
        where: {
            email: email.toLowerCase(),
            user_id: null
        }
    })
    return count > 0
}
