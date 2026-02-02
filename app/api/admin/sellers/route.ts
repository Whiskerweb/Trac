/**
 * Admin Sellers API
 *
 * GET /api/admin/sellers - List all sellers with stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all sellers with their balances and commission stats
        const sellers = await prisma.seller.findMany({
            include: {
                Profile: true,
                _count: {
                    select: {
                        Commissions: true,
                        GiftCardRedemptions: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Get all seller balances
        const sellerIds = sellers.map(s => s.id)
        const balances = await prisma.sellerBalance.findMany({
            where: { seller_id: { in: sellerIds } }
        })
        const balanceMap = new Map(balances.map(b => [b.seller_id, b]))

        // Get commission aggregates per seller
        const commissionStats = await prisma.commission.groupBy({
            by: ['seller_id', 'status'],
            _sum: { commission_amount: true },
            _count: true
        })

        // Build stats map
        const statsMap = new Map<string, {
            pending: number
            proceed: number
            complete: number
            totalCommissions: number
            totalEarned: number
        }>()

        for (const stat of commissionStats) {
            const existing = statsMap.get(stat.seller_id) || {
                pending: 0, proceed: 0, complete: 0, totalCommissions: 0, totalEarned: 0
            }
            const amount = stat._sum.commission_amount || 0

            if (stat.status === 'PENDING') existing.pending = amount
            else if (stat.status === 'PROCEED') existing.proceed = amount
            else if (stat.status === 'COMPLETE') existing.complete = amount

            existing.totalCommissions += stat._count
            existing.totalEarned += amount
            statsMap.set(stat.seller_id, existing)
        }

        // Format response
        const formattedSellers = sellers.map(seller => {
            const stats = statsMap.get(seller.id) || {
                pending: 0, proceed: 0, complete: 0, totalCommissions: 0, totalEarned: 0
            }
            const balance = balanceMap.get(seller.id)

            return {
                id: seller.id,
                email: seller.email,
                name: seller.name,
                status: seller.status,
                payoutMethod: seller.payout_method,
                hasStripeConnect: !!seller.stripe_connect_id,
                payoutsEnabled: !!seller.payouts_enabled_at,
                createdAt: seller.created_at.toISOString(),

                // Profile
                bio: seller.Profile?.bio || null,
                profileScore: seller.Profile?.profile_score || 0,

                // Balance
                balance: balance?.balance || 0,
                pending: stats.pending,
                due: stats.proceed,
                paidTotal: stats.complete,
                totalEarned: stats.totalEarned,

                // Counts
                totalCommissions: stats.totalCommissions,
                giftCardCount: seller._count.GiftCardRedemptions,
            }
        })

        // Summary stats
        const summary = {
            totalSellers: sellers.length,
            platformSellers: sellers.filter(s => s.payout_method === 'PLATFORM').length,
            stripeConnectSellers: sellers.filter(s => s.payout_method === 'STRIPE_CONNECT').length,
            totalBalance: formattedSellers.reduce((sum, s) => sum + s.balance, 0),
            totalPending: formattedSellers.reduce((sum, s) => sum + s.pending, 0),
            totalPaid: formattedSellers.reduce((sum, s) => sum + s.paidTotal, 0),
        }

        return NextResponse.json({
            success: true,
            sellers: formattedSellers,
            summary
        })

    } catch (error) {
        console.error('[AdminSellers] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
