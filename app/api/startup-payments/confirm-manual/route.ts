/**
 * Manual Startup Payment Confirmation
 * POST /api/startup-payments/confirm-manual
 *
 * This endpoint allows manual confirmation of a startup payment
 * by verifying the payment status directly with Stripe API.
 *
 * Use this as a fallback when the webhook fails to process.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'
import { confirmStartupPayment } from '@/app/actions/payouts'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return NextResponse.json({ error: 'No active workspace' }, { status: 403 })
        }

        // Get payment ID from request
        const { paymentId } = await req.json()

        if (!paymentId) {
            return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
        }

        // Verify payment belongs to this workspace
        const payment = await prisma.startupPayment.findUnique({
            where: { id: paymentId }
        })

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        if (payment.workspace_id !== workspace.workspaceId) {
            return NextResponse.json({ error: 'Payment does not belong to this workspace' }, { status: 403 })
        }

        // Already paid?
        if (payment.status === 'PAID') {
            return NextResponse.json({
                success: true,
                message: 'Payment already confirmed',
                status: 'PAID'
            })
        }

        // Get the checkout session from Stripe to verify payment
        if (!payment.stripe_session_id) {
            return NextResponse.json({
                error: 'No Stripe session ID found for this payment'
            }, { status: 400 })
        }

        console.log(`[Manual Confirm] Checking Stripe session: ${payment.stripe_session_id}`)

        const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id)

        console.log(`[Manual Confirm] Session status: ${session.status}, payment_status: ${session.payment_status}`)

        // Check if payment was successful
        if (session.status !== 'complete' || session.payment_status !== 'paid') {
            return NextResponse.json({
                success: false,
                error: `Payment not completed. Status: ${session.status}, Payment: ${session.payment_status}`,
                stripeStatus: {
                    sessionStatus: session.status,
                    paymentStatus: session.payment_status
                }
            }, { status: 400 })
        }

        // Payment is confirmed in Stripe! Now process it
        const stripePaymentId = session.payment_intent as string

        console.log(`[Manual Confirm] Payment confirmed in Stripe, processing: ${paymentId}`)

        const success = await confirmStartupPayment(paymentId, stripePaymentId)

        if (success) {
            console.log(`[Manual Confirm] ✅ Payment ${paymentId} confirmed successfully`)
            return NextResponse.json({
                success: true,
                message: 'Payment confirmed and processed',
                status: 'PAID'
            })
        } else {
            console.error(`[Manual Confirm] ❌ Failed to confirm payment ${paymentId}`)
            return NextResponse.json({
                success: false,
                error: 'Failed to process payment confirmation'
            }, { status: 500 })
        }

    } catch (error) {
        console.error('[Manual Confirm] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// GET to check payment status
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return NextResponse.json({ error: 'No active workspace' }, { status: 403 })
        }

        const paymentId = req.nextUrl.searchParams.get('paymentId')

        if (!paymentId) {
            return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
        }

        const payment = await prisma.startupPayment.findUnique({
            where: { id: paymentId },
            include: {
                Commissions: {
                    select: {
                        id: true,
                        status: true,
                        startup_payment_status: true,
                        commission_amount: true
                    }
                }
            }
        })

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }

        if (payment.workspace_id !== workspace.workspaceId) {
            return NextResponse.json({ error: 'Payment does not belong to this workspace' }, { status: 403 })
        }

        // Also check Stripe if we have a session ID
        let stripeStatus = null
        if (payment.stripe_session_id) {
            try {
                const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id)
                stripeStatus = {
                    sessionStatus: session.status,
                    paymentStatus: session.payment_status,
                    amountTotal: session.amount_total,
                    paymentIntent: session.payment_intent
                }
            } catch (e) {
                stripeStatus = { error: 'Failed to retrieve Stripe session' }
            }
        }

        return NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                totalAmount: payment.total_amount,
                partnerTotal: payment.partner_total,
                platformTotal: payment.platform_total,
                commissionCount: payment.commission_count,
                stripeSessionId: payment.stripe_session_id,
                stripePaymentId: payment.stripe_payment_id,
                paidAt: payment.paid_at,
                createdAt: payment.created_at
            },
            commissions: payment.Commissions,
            stripeStatus
        })
    } catch (error) {
        console.error('[Payment Status] Error:', error)
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
