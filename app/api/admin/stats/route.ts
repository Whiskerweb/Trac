/**
 * Admin Stats API
 *
 * GET /api/admin/stats - Get platform-wide statistics
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

        // Check admin access
        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get stats in parallel
        const [
            pendingGiftCards,
            totalSellers,
            platformSellers,
            totalCommissions,
            pendingCommissions
        ] = await Promise.all([
            // Pending gift cards
            prisma.giftCardRedemption.aggregate({
                where: { status: 'PENDING' },
                _count: true,
                _sum: { amount: true }
            }),
            // Total sellers
            prisma.seller.count(),
            // Platform sellers (no Stripe Connect)
            prisma.seller.count({
                where: { payout_method: 'PLATFORM' }
            }),
            // Total commissions
            prisma.commission.count(),
            // Pending commissions
            prisma.commission.count({
                where: { status: 'PENDING' }
            })
        ])

        return NextResponse.json({
            success: true,
            stats: {
                pendingGiftCards: pendingGiftCards._count,
                pendingGiftCardsAmount: pendingGiftCards._sum.amount || 0,
                totalSellers,
                platformSellers,
                totalCommissions,
                pendingCommissions
            }
        })

    } catch (error) {
        console.error('[AdminStats] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
