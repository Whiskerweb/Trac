/**
 * Partner Connect API
 * 
 * POST /api/partner/connect - Create/get Connect onboarding link
 * GET /api/partner/connect - Get Connect status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import {
    createConnectAccount,
    checkPayoutsEnabled,
    getPartnerPayoutSummary
} from '@/lib/stripe-connect'

// =============================================
// GET - Check Connect Status
// =============================================

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

        const summary = await getPartnerPayoutSummary(partner.id)

        return NextResponse.json({
            success: true,
            ...summary,
            pendingFormatted: `${(summary.pending / 100).toFixed(2)}€`,
            dueFormatted: `${(summary.due / 100).toFixed(2)}€`,
            paidTotalFormatted: `${(summary.paidTotal / 100).toFixed(2)}€`,
        })
    } catch (error) {
        console.error('[PartnerConnect] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// =============================================
// POST - Create/Get Onboarding Link
// =============================================

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

        // Get country from request body (optional)
        const body = await request.json().catch(() => ({}))
        const country = body.country || 'FR'

        // Create or get Connect account
        const result = await createConnectAccount(partner.id, partner.email, country)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        // If already has payouts enabled, return status instead of onboarding
        if (result.accountId) {
            const status = await checkPayoutsEnabled(result.accountId)
            if (status.enabled) {
                return NextResponse.json({
                    success: true,
                    alreadyEnabled: true,
                    message: 'Payouts are already enabled'
                })
            }
        }

        return NextResponse.json({
            success: true,
            onboardingUrl: result.onboardingUrl,
            accountId: result.accountId
        })
    } catch (error) {
        console.error('[PartnerConnect] POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
