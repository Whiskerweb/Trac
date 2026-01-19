/**
 * Gift Card Redemption API
 * 
 * POST /api/partner/redeem-gift-card - Request a gift card from platform balance
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

        // Find partner by user_id
        const partner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
        }

        // Get request body
        const body = await request.json()
        const { cardType, amount } = body

        // Validate card type
        const validTypes = ['amazon', 'itunes', 'steam', 'paypal_gift']
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
            partnerId: partner.id,
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
