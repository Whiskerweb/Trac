'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/lib/admin'

// =============================================
// ADMIN: Organization Management
// =============================================

async function requireAdminUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAdmin(user.email)) {
        throw new Error('Unauthorized')
    }
    return user
}

/**
 * Get all organizations with counts (admin view)
 */
export async function getAllOrgs(filter?: 'PENDING' | 'ACTIVE' | 'SUSPENDED') {
    try {
        await requireAdminUser()

        const where = filter ? { status: filter as any } : {}

        const organizations = await prisma.organization.findMany({
            where,
            include: {
                Leader: { select: { id: true, name: true, email: true, status: true } },
                _count: {
                    select: {
                        Members: { where: { status: 'ACTIVE' } },
                        Missions: { where: { status: 'ACCEPTED' } },
                    }
                },
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, organizations }
    } catch (error) {
        console.error('[Admin Org] Failed to get orgs:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get pending organization applications
 */
export async function getOrgApplications() {
    try {
        await requireAdminUser()

        const applications = await prisma.organization.findMany({
            where: { status: 'PENDING' },
            include: {
                Leader: {
                    select: {
                        id: true, name: true, email: true, status: true,
                        stripe_connect_id: true, onboarding_step: true
                    }
                },
            },
            orderBy: { created_at: 'asc' }
        })

        return { success: true, applications }
    } catch (error) {
        console.error('[Admin Org] Failed to get applications:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Approve an organization application → ACTIVE
 */
export async function approveOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'PENDING') {
            return { success: false, error: 'Organization is not pending approval' }
        }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'ACTIVE' }
        })

        console.log(`[Admin Org] ✅ Approved org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to approve org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Suspend an organization → SUSPENDED
 */
export async function suspendOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org) return { success: false, error: 'Organization not found' }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'SUSPENDED' }
        })

        console.log(`[Admin Org] ⚠️ Suspended org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to suspend org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Reactivate a suspended organization → ACTIVE
 */
export async function reactivateOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'SUSPENDED') {
            return { success: false, error: 'Organization is not suspended' }
        }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'ACTIVE' }
        })

        console.log(`[Admin Org] ✅ Reactivated org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to reactivate org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get full admin detail of an organization
 */
export async function getOrgAdminDetail(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                Leader: {
                    select: {
                        id: true, name: true, email: true, status: true,
                        stripe_connect_id: true, payout_method: true,
                    }
                },
                Members: {
                    include: {
                        Seller: { select: { id: true, name: true, email: true, status: true } }
                    },
                    orderBy: { created_at: 'desc' }
                },
                Missions: {
                    include: {
                        Mission: { select: { id: true, title: true, status: true, workspace_id: true } }
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!org) return { success: false, error: 'Organization not found' }

        return { success: true, organization: org }
    } catch (error) {
        console.error('[Admin Org] Failed to get org detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
