/**
 * Seller Wallet API
 *
 * GET /api/seller/wallet - Get wallet data with balances and payout settings
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getSellerWallet } from '@/lib/payout-service'

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

        const wallet = await getSellerWallet(seller.id)

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            wallet
        })
    } catch (error) {
        console.error('[SellerWallet] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
