'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// NOTIFICATION CENTER — SERVER ACTIONS
// =============================================

export interface NotificationItem {
    id: string
    label: string
    sublabel?: string
    href: string
}

export interface NotificationSummary {
    totalCount: number
    categories: {
        messages: { count: number; items: NotificationItem[] }
        sellers: { count: number; items: NotificationItem[] }
        commissions: { count: number; totalAmount: number; items: NotificationItem[] }
    }
}

/**
 * Get notification summary for startup dashboard
 */
export async function getNotificationSummary(): Promise<{
    success: boolean
    summary?: NotificationSummary
    error?: string
}> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Not authenticated' }
        }

        const wsId = workspace.workspaceId

        // Get mission IDs for this workspace first
        const missions = await prisma.mission.findMany({
            where: { workspace_id: wsId },
            select: { id: true },
        })
        const missionIds = missions.map(m => m.id)

        const [conversations, pendingEnrollments, unpaidCommissions] = await Promise.all([
            // Unread conversations
            prisma.conversation.findMany({
                where: { workspace_id: wsId, unread_startup: { gt: 0 } },
                include: {
                    Seller: { select: { name: true, email: true } }
                },
                orderBy: { last_at: 'desc' },
                take: 5,
            }),
            // Pending enrollment requests
            prisma.missionEnrollment.findMany({
                where: {
                    mission_id: { in: missionIds },
                    status: 'PENDING',
                },
                include: {
                    Mission: { select: { title: true } },
                },
                orderBy: { created_at: 'desc' },
                take: 5,
            }),
            // Unpaid PROCEED commissions
            missionIds.length > 0
                ? prisma.commission.findMany({
                    where: {
                        program_id: { in: missionIds },
                        status: 'PROCEED',
                        startup_payment_status: 'UNPAID',
                    },
                    include: {
                        Seller: { select: { id: true, name: true } },
                    },
                    orderBy: { matured_at: 'desc' },
                })
                : Promise.resolve([]),
        ])

        // Build message items
        const messageItems: NotificationItem[] = conversations.map(c => ({
            id: c.id,
            label: c.Seller.name || c.Seller.email,
            sublabel: c.last_message?.slice(0, 60) || undefined,
            href: '/dashboard/messages',
        }))

        // Build seller request items
        const sellerItems: NotificationItem[] = pendingEnrollments.map(e => ({
            id: e.id,
            label: e.Mission.title,
            sublabel: 'Pending enrollment',
            href: '/dashboard/sellers',
        }))

        // Group commissions by seller
        const sellerCommGroups = new Map<string, { name: string; total: number; count: number }>()
        let totalUnpaidAmount = 0
        for (const c of unpaidCommissions) {
            const sid = c.Seller?.id || 'unknown'
            const existing = sellerCommGroups.get(sid)
            const amount = c.commission_amount || 0
            totalUnpaidAmount += amount
            if (existing) {
                existing.total += amount
                existing.count += 1
            } else {
                sellerCommGroups.set(sid, {
                    name: c.Seller?.name || 'Seller',
                    total: amount,
                    count: 1,
                })
            }
        }

        const commissionItems: NotificationItem[] = Array.from(sellerCommGroups.entries())
            .slice(0, 5)
            .map(([sid, group]) => ({
                id: sid,
                label: group.name,
                sublabel: `${group.count} commissions - ${(group.total / 100).toFixed(2)}€`,
                href: '/dashboard/commissions',
            }))

        const totalCount =
            conversations.length +
            pendingEnrollments.length +
            (unpaidCommissions.length > 0 ? sellerCommGroups.size : 0)

        return {
            success: true,
            summary: {
                totalCount,
                categories: {
                    messages: { count: conversations.length, items: messageItems },
                    sellers: { count: pendingEnrollments.length, items: sellerItems },
                    commissions: { count: unpaidCommissions.length, totalAmount: totalUnpaidAmount, items: commissionItems },
                },
            },
        }
    } catch (error) {
        console.error('[Notifications] Error:', error)
        return { success: false, error: 'Error loading notifications' }
    }
}
