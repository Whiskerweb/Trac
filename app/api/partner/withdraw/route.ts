/**
 * Partner Withdraw API
 * 
 * POST /api/partner/withdraw - Request payout of due balance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { dispatchPayout } from '@/lib/payout-service'

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

        // Get partner balance
        const balance = await prisma.partnerBalance.findUnique({
            where: { partner_id: partner.id }
        })

        if (!balance || balance.due <= 0) {
            return NextResponse.json(
                { error: 'No due balance to withdraw' },
                { status: 400 }
            )
        }

        // Get commission IDs that are ready for payout
        const commissions = await prisma.commission.findMany({
            where: {
                partner_id: partner.id,
                status: 'PROCEED'
            },
            select: { id: true }
        })

        if (commissions.length === 0) {
            return NextResponse.json(
                { error: 'No matured commissions available' },
                { status: 400 }
            )
        }

        // Dispatch payout based on partner's method
        const result = await dispatchPayout({
            partnerId: partner.id,
            amount: balance.due,
            commissionIds: commissions.map(c => c.id)
        })

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Payout failed' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            method: result.method,
            transferId: result.transferId,
            amount: balance.due,
            amountFormatted: `${(balance.due / 100).toFixed(2)}€`
        })
    } catch (error) {
        console.error('[PartnerWithdraw] POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
