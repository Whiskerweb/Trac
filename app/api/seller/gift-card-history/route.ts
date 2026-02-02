/**
 * Gift Card Redemptions History API
 *
 * GET /api/seller/gift-card-history - Get gift card redemptions history
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getGiftCardRedemptions } from '@/lib/payout-service'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Find seller by user_id
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id }
        })

        if (!seller) {
            return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
        }

        const redemptions = await getGiftCardRedemptions(seller.id)

        return NextResponse.json({
            success: true,
            redemptions
        })
    } catch (error) {
        console.error('[GiftCardHistory] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
