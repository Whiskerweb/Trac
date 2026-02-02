/**
 * Admin Payouts API
 *
 * GET /api/admin/payouts - Get all payouts/transactions overview
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all commissions grouped by status
        const commissionsByStatus = await prisma.commission.groupBy({
            by: ['status'],
            _count: true,
            _sum: { commission_amount: true, platform_fee: true }
        })

        // Get recent commissions with seller and startup info
        const recentCommissions = await prisma.commission.findMany({
            orderBy: { created_at: 'desc' },
            take: 50,
            include: {
                Seller: {
                    select: { id: true, email: true, name: true, payout_method: true }
                }
            }
        })

        // Get workspace info for commissions
        const workspaceIds = [...new Set(recentCommissions.map(c => c.program_id).filter(Boolean))]
        const workspaces = await prisma.workspace.findMany({
            where: { id: { in: workspaceIds as string[] } },
            select: { id: true, name: true }
        })
        const workspaceMap = new Map(workspaces.map(w => [w.id, w]))

        // Format commissions
        const formattedCommissions = recentCommissions.map(c => ({
            id: c.id,
            sellerId: c.seller_id,
            sellerEmail: c.Seller?.email || 'Unknown',
            sellerName: c.Seller?.name || null,
            payoutMethod: c.Seller?.payout_method || 'UNKNOWN',
            startupName: c.program_id ? workspaceMap.get(c.program_id)?.name || 'Unknown' : null,
            grossAmount: c.gross_amount,
            netAmount: c.net_amount,
            commissionAmount: c.commission_amount,
            platformFee: c.platform_fee,
            status: c.status,
            startupPaymentStatus: c.startup_payment_status,
            createdAt: c.created_at.toISOString(),
            maturedAt: c.matured_at?.toISOString() || null,
            paidAt: c.paid_at?.toISOString() || null,
        }))

        // Calculate totals
        let totalPending = 0, totalProceed = 0, totalComplete = 0
        let totalPlatformFees = 0, totalCommissions = 0
        let countPending = 0, countProceed = 0, countComplete = 0

        for (const stat of commissionsByStatus) {
            const amount = stat._sum.commission_amount || 0
            const fees = stat._sum.platform_fee || 0
            totalPlatformFees += fees
            totalCommissions += stat._count

            if (stat.status === 'PENDING') {
                totalPending = amount
                countPending = stat._count
            } else if (stat.status === 'PROCEED') {
                totalProceed = amount
                countProceed = stat._count
            } else if (stat.status === 'COMPLETE') {
                totalComplete = amount
                countComplete = stat._count
            }
        }

        // Get startup payments
        const startupPayments = await prisma.startupPayment.findMany({
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
                Workspace: { select: { name: true } }
            }
        })

        const formattedPayments = startupPayments.map(p => ({
            id: p.id,
            workspaceName: p.Workspace?.name || 'Unknown',
            totalAmount: p.total_amount,
            sellerTotal: p.partner_total,
            platformTotal: p.platform_total,
            commissionCount: p.commission_count,
            status: p.status,
            stripePaymentId: p.stripe_payment_id,
            createdAt: p.created_at.toISOString(),
        }))

        return NextResponse.json({
            success: true,
            summary: {
                totalCommissions,
                totalPlatformFees,
                pending: { count: countPending, amount: totalPending },
                proceed: { count: countProceed, amount: totalProceed },
                complete: { count: countComplete, amount: totalComplete },
            },
            commissions: formattedCommissions,
            startupPayments: formattedPayments,
        })

    } catch (error) {
        console.error('[AdminPayouts] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
