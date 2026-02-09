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
export async function getAllOrgs(filter?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED') {
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

// =============================================
// SUPPORT MESSAGING HELPER
// =============================================

const SUPPORT_WORKSPACE_SLUG = 'traaaction-support'

/**
 * Get or create the "Traaaction Support" workspace used for platform notifications.
 * This workspace has no real owner — it only serves as a sender identity in conversations.
 */
async function getOrCreateSupportWorkspace(): Promise<string> {
    const existing = await prisma.workspace.findUnique({
        where: { slug: SUPPORT_WORKSPACE_SLUG }
    })
    if (existing) return existing.id

    const ws = await prisma.workspace.create({
        data: {
            name: 'Traaaction Support',
            slug: SUPPORT_WORKSPACE_SLUG,
            owner_id: 'system',
        }
    })
    return ws.id
}

/**
 * Send a support/system message to a seller.
 * Creates or reuses a conversation between "Traaaction Support" workspace and the seller.
 */
async function sendSupportMessage(sellerId: string, content: string) {
    const workspaceId = await getOrCreateSupportWorkspace()

    // Upsert conversation
    const conversation = await prisma.conversation.upsert({
        where: {
            workspace_id_seller_id: {
                workspace_id: workspaceId,
                seller_id: sellerId,
            }
        },
        create: {
            workspace_id: workspaceId,
            seller_id: sellerId,
            last_message: content.slice(0, 100),
            last_at: new Date(),
            unread_partner: 1,
        },
        update: {
            last_message: content.slice(0, 100),
            last_at: new Date(),
            unread_partner: { increment: 1 },
        }
    })

    // Create message
    await prisma.message.create({
        data: {
            conversation_id: conversation.id,
            sender_type: 'STARTUP',
            content,
        }
    })

    console.log(`[Admin] Sent support message to seller ${sellerId}`)
}

// =============================================
// ADMIN: Reject Organization
// =============================================

/**
 * Reject a pending organization application → REJECTED + notify seller
 */
export async function rejectOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { Leader: { select: { id: true, name: true } } }
        })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'PENDING') {
            return { success: false, error: 'Organization is not pending' }
        }

        // Update status
        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'REJECTED' }
        })

        // Send notification to the leader
        const message = `Bonjour${org.Leader?.name ? ` ${org.Leader.name}` : ''},\n\nNous avons examiné votre demande de création de l'organisation "${org.name}" et malheureusement, celle-ci n'a pas été approuvée.\n\nCela peut être dû à un manque de détails dans votre candidature ou à des critères qui ne correspondent pas à nos exigences actuelles.\n\nN'hésitez pas à soumettre une nouvelle demande avec plus de détails sur votre projet et votre équipe.\n\n— L'équipe Traaaction`

        await sendSupportMessage(org.leader_id, message)

        console.log(`[Admin Org] Rejected org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to reject org:', error)
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
