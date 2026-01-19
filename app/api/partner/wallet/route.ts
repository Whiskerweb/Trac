/**
 * Partner Wallet API
 * 
 * GET /api/partner/wallet - Get wallet data with balances and payout settings
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getPartnerWallet } from '@/lib/payout-service'

export async function GET() {
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

        const wallet = await getPartnerWallet(partner.id)

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            wallet
        })
    } catch (error) {
        console.error('[PartnerWallet] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
