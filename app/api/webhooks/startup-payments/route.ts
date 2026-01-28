import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { confirmStartupPayment } from '@/app/actions/payouts'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// =============================================
// WEBHOOK: Startup Payment Confirmation
// =============================================
// This webhook handles payment confirmations for startup payouts
// (when startups pay their partners' commissions + platform fees)
//
// Events handled:
// - checkout.session.completed (with metadata.type === 'startup_payout')

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
        console.error('[Webhook Startup] Missing stripe-signature header')
        return NextResponse.json(
            { error: 'Missing signature' },
            { status: 400 }
        )
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_STARTUP_WEBHOOK_SECRET!
        )
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Webhook Startup] Signature verification failed:', message)
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        )
    }

    console.log(`[Webhook Startup] Received event: ${event.type} (${event.id})`)

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // Only process startup payout sessions
        if (session.metadata?.type === 'startup_payout') {
            const paymentId = session.metadata.startup_payment_id
            const workspaceId = session.metadata.workspace_id
            const stripePaymentId = session.payment_intent as string

            if (!paymentId) {
                console.error('[Webhook Startup] Missing startup_payment_id in metadata')
                return NextResponse.json(
                    { error: 'Missing payment ID' },
                    { status: 400 }
                )
            }

            console.log(`[Webhook Startup] Processing startup payout:`, {
                paymentId,
                workspaceId,
                stripePaymentId,
                amount: session.amount_total
            })

            try {
                const success = await confirmStartupPayment(paymentId, stripePaymentId)

                if (success) {
                    console.log(`[Webhook Startup] ✅ Payment ${paymentId} confirmed successfully`)
                } else {
                    console.error(`[Webhook Startup] ❌ Failed to confirm payment ${paymentId}`)
                }
            } catch (err) {
                console.error('[Webhook Startup] Error confirming payment:', err)
                // Return 200 to prevent Stripe retries (we logged the error)
                // Manual intervention may be needed
            }
        } else {
            console.log(`[Webhook Startup] Ignoring session (type: ${session.metadata?.type || 'none'})`)
        }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
}
