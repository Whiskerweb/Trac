/**
 * Gift Card Redemption API
 *
 * POST /api/seller/redeem-gift-card - Request a gift card from platform balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { requestGiftCard } from '@/lib/payout-service'

export async function POST(request: NextRequest) {
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

        // Get request body
        const body = await request.json()
        const { cardType, amount } = body

        // Validate card type
        const validTypes = ['amazon', 'itunes', 'steam', 'paypal_gift', 'fnac', 'google_play', 'netflix', 'spotify']
        if (!validTypes.includes(cardType)) {
            return NextResponse.json(
                { error: 'Invalid card type' },
                { status: 400 }
            )
        }

        // Validate amount
        if (!amount || amount < 1000) {
            return NextResponse.json(
                { error: 'Minimum amount is 10€' },
                { status: 400 }
            )
        }

        // Request gift card
        const result = await requestGiftCard({
            sellerId: seller.id,
            cardType,
            amount
        })

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            redemptionId: result.redemptionId,
            message: 'Gift card requested. You will receive it within 24-48 hours.'
        })
    } catch (error) {
        console.error('[RedeemGiftCard] POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
