/**
 * Partner Payout Method API
 * 
 * GET: Get current payout method and balance
 * PUT: Update payout method preference
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

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

        // Get balance
        const balance = await prisma.partnerBalance.findUnique({
            where: { partner_id: partner.id }
        })

        // Check Stripe Connect status
        let stripeStatus = 'not_connected'
        if (partner.stripe_connect_id) {
            stripeStatus = partner.payouts_enabled_at ? 'active' : 'pending'
        }

        return NextResponse.json({
            success: true,
            payoutMethod: partner.payout_method,
            stripeStatus,
            stripeConnectId: partner.stripe_connect_id,
            paypalEmail: partner.paypal_email,
            balance: {
                pending: balance?.pending || 0,
                due: balance?.due || 0,
                total: balance?.paid_total || 0
            }
        })
    } catch (err) {
        console.error('[PayoutMethod] GET error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { payoutMethod, paypalEmail, iban, bic } = body

        // Validate payout method
        const validMethods = ['STRIPE_CONNECT', 'PAYPAL', 'IBAN', 'PLATFORM']
        if (!validMethods.includes(payoutMethod)) {
            return NextResponse.json({ error: 'Invalid payout method' }, { status: 400 })
        }

        // Find partner
        const partner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
        }

        // Additional validation based on method
        if (payoutMethod === 'STRIPE_CONNECT' && !partner.stripe_connect_id) {
            return NextResponse.json({
                error: 'Please connect Stripe first'
            }, { status: 400 })
        }

        if (payoutMethod === 'PAYPAL' && !paypalEmail) {
            return NextResponse.json({
                error: 'PayPal email required'
            }, { status: 400 })
        }

        if (payoutMethod === 'IBAN' && (!iban || !bic)) {
            return NextResponse.json({
                error: 'IBAN and BIC required'
            }, { status: 400 })
        }

        // Update partner
        const updated = await prisma.partner.update({
            where: { id: partner.id },
            data: {
                payout_method: payoutMethod,
                paypal_email: paypalEmail || partner.paypal_email,
                iban: iban || partner.iban,
                bic: bic || partner.bic
            }
        })

        console.log(`[PayoutMethod] Updated partner ${partner.id} to ${payoutMethod}`)

        return NextResponse.json({
            success: true,
            payoutMethod: updated.payout_method
        })
    } catch (err) {
        console.error('[PayoutMethod] PUT error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
