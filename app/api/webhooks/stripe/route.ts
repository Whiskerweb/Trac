import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * Resolve click_id to workspace_id via Tinybird attribution pipe
 */
async function resolveClickToWorkspace(clickId: string): Promise<string | null> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Attribution] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return null
    }

    const url = `${TINYBIRD_HOST}/v0/pipes/attribution.json?click_id=${encodeURIComponent(clickId)}&token=${TINYBIRD_TOKEN}`

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!response.ok) {
            console.error('[Attribution] ❌ Tinybird error:', response.status)
            return null
        }

        const data = await response.json()

        if (data.data && data.data.length > 0) {
            const workspaceId = data.data[0].workspace_id
            console.log(`[Attribution] 🔄 Resolved Click ID ${clickId} to Workspace ${workspaceId}`)
            return workspaceId
        }

        console.warn(`[Attribution] ⚠️ Click ID ${clickId} not found in database`)
        return null

    } catch (error) {
        console.error('[Attribution] ❌ Network error:', error)
        return null
    }
}

/**
 * Send sale event to Tinybird
 */
async function logSaleToTinybird(data: {
    workspace_id: string
    invoice_id: string
    click_id: string | null
    customer_external_id: string
    amount: number
    currency: string
}): Promise<boolean> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Stripe Webhook] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return false
    }

    const payload = {
        timestamp: new Date().toISOString(),
        event_id: crypto.randomUUID(),
        workspace_id: data.workspace_id,
        invoice_id: data.invoice_id,
        click_id: data.click_id,
        customer_external_id: data.customer_external_id,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        payment_processor: 'stripe',
    }

    console.log('[Stripe Webhook] 📊 Sending to Tinybird:', {
        workspace_id: payload.workspace_id,
        amount: payload.amount,
        currency: payload.currency,
        click_id: payload.click_id,
    })

    try {
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })

        if (response.ok) {
            const result = await response.json()
            console.log('[Stripe Webhook] ✅ Sale logged to Tinybird:', result)
            return true
        } else {
            const errorText = await response.text()
            console.error('[Stripe Webhook] ❌ Tinybird error:', response.status, errorText)
            return false
        }
    } catch (error) {
        console.error('[Stripe Webhook] ❌ Network error:', error)
        return false
    }
}

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * Handles checkout.session.completed events.
 * Resolves click_id (clk_xxx) to workspace_id via Tinybird attribution pipe.
 */
export async function POST(req: NextRequest) {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
        console.error('[Stripe Webhook] ❌ Missing stripe-signature header')
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // ========================================
    // VERIFY STRIPE SIGNATURE
    // ========================================
    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (err) {
        console.error('[Stripe Webhook] ❌ Signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('[Stripe Webhook] 📥 Received:', event.type)

    // ========================================
    // HANDLE: checkout.session.completed
    // ========================================
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // Get the reference ID from the session
        const referenceId = session.client_reference_id || ''
        let workspaceId = 'unknown'
        let clickId: string | null = null

        console.log('[Stripe Webhook] 🔍 client_reference_id:', referenceId)

        // ========================================
        // SMART RESOLUTION: Click ID vs User ID
        // ========================================
        if (referenceId.startsWith('clk_')) {
            // It's a click_id - resolve to workspace_id via Tinybird
            clickId = referenceId
            console.log('[Attribution] 🔄 Detected Click ID, resolving to workspace...')

            const resolvedWorkspace = await resolveClickToWorkspace(referenceId)

            if (resolvedWorkspace) {
                workspaceId = resolvedWorkspace
                console.log(`[Attribution] ✅ Attribution successful: ${clickId} → ${workspaceId}`)
            } else {
                console.warn(`[Attribution] ⚠️ Could not resolve ${clickId}, sale will be orphaned`)
            }
        } else if (referenceId) {
            // It's already a workspace/user ID
            workspaceId = referenceId
            console.log(`[Attribution] 📌 Direct User ID: ${workspaceId}`)
        } else {
            // Check metadata as fallback
            workspaceId = session.metadata?.workspace_id ||
                session.metadata?.user_id ||
                'unknown'
            clickId = session.metadata?.click_id || null
            console.log(`[Attribution] 📎 From metadata: workspace=${workspaceId}, click=${clickId}`)
        }

        // Customer identification
        const customerExternalId = typeof session.customer === 'string'
            ? session.customer
            : session.customer_details?.email || 'guest'

        // Amount in cents
        const amount = session.amount_total || 0
        const currency = session.currency || 'eur'

        // Invoice ID for deduplication
        const invoiceId = typeof session.invoice === 'string'
            ? session.invoice
            : session.id

        console.log('[Stripe Webhook] 💰 Processing sale:', {
            workspace_id: workspaceId,
            amount: `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
            customer: customerExternalId,
            click_id: clickId,
        })

        // Log to Tinybird
        const success = await logSaleToTinybird({
            workspace_id: workspaceId,
            invoice_id: invoiceId,
            click_id: clickId,
            customer_external_id: customerExternalId,
            amount,
            currency,
        })

        if (success) {
            console.log('[Stripe Webhook] ✅ Sale attributed to workspace:', workspaceId)
        }
    }

    return NextResponse.json({ received: true }, { status: 200 })
}