import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

/**
 * Send sale event to Tinybird with affiliate attribution
 */
async function logSaleToTinybird(data: {
    workspace_id: string
    invoice_id: string
    click_id: string | null
    link_id: string | null      // NEW: For affiliate stats
    affiliate_id: string | null // NEW: For affiliate stats
    customer_external_id: string
    amount: number
    currency: string
}): Promise<boolean> {
    if (!TINYBIRD_TOKEN) {
        console.error('[Multi-Tenant Webhook] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return false
    }

    const payload = {
        timestamp: new Date().toISOString(),
        event_id: crypto.randomUUID(),
        workspace_id: data.workspace_id,
        invoice_id: data.invoice_id,
        click_id: data.click_id,
        link_id: data.link_id,          // NEW
        affiliate_id: data.affiliate_id, // NEW
        customer_external_id: data.customer_external_id,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        payment_processor: 'stripe',
    }

    console.log('[Multi-Tenant Webhook] 📊 Sending to Tinybird:', {
        workspace_id: payload.workspace_id,
        link_id: payload.link_id,
        affiliate_id: payload.affiliate_id,
        amount: payload.amount,
        currency: payload.currency,
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
            console.log('[Multi-Tenant Webhook] ✅ Sale logged to Tinybird')
            return true
        } else {
            const errorText = await response.text()
            console.error('[Multi-Tenant Webhook] ❌ Tinybird error:', errorText)
            return false
        }
    } catch (error) {
        console.error('[Multi-Tenant Webhook] ❌ Network error:', error)
        return false
    }
}

/**
 * Multi-Tenant Stripe Webhook Handler
 * POST /api/webhooks/[endpointId]
 * 
 * Each workspace has its own webhook endpoint with its own secret.
 * The workspace_id for attribution comes from the endpoint config, not Stripe.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ endpointId: string }> }
) {
    const { endpointId } = await params
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    // ========================================
    // 1. LOOKUP ENDPOINT CONFIG
    // ========================================
    const endpoint = await prisma.webhookEndpoint.findUnique({
        where: { id: endpointId }
    })

    if (!endpoint) {
        console.log('[Multi-Tenant Webhook] ❌ Endpoint not found:', endpointId)
        return NextResponse.json(
            { error: 'Webhook endpoint not found' },
            { status: 404 }
        )
    }

    // ========================================
    // 2. VALIDATE CONFIGURATION
    // ========================================
    if (!endpoint.secret) {
        console.log('[Multi-Tenant Webhook] ⚠️ Endpoint not configured:', endpointId)
        return NextResponse.json(
            { error: 'Endpoint not configured. Please add your Stripe webhook secret.' },
            { status: 400 }
        )
    }

    if (!signature) {
        console.error('[Multi-Tenant Webhook] ❌ Missing stripe-signature header')
        return NextResponse.json(
            { error: 'Missing signature' },
            { status: 400 }
        )
    }

    // ========================================
    // 3. VERIFY STRIPE SIGNATURE
    // ========================================
    const body = await req.text()
    let event: Stripe.Event

    try {
        // Use the SECRET FROM DATABASE, not env variable
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            endpoint.secret  // ← Secret from DB per-workspace
        )
    } catch (err) {
        console.error('[Multi-Tenant Webhook] ❌ Signature verification failed:', err)
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        )
    }

    console.log(`[Multi-Tenant Webhook] 📥 Event ${event.type} for Workspace ${endpoint.workspace_id}`)

    // ========================================
    // 4. HANDLE: checkout.session.completed
    // ========================================
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // CRITICAL: workspace_id comes from the webhook endpoint config
        // This is the source of truth (owner of the Stripe account)
        const workspaceId = endpoint.workspace_id

        // click_id is metadata for traffic attribution (optional)
        const clickId = session.client_reference_id || session.metadata?.click_id || null

        // Customer identification
        const customerExternalId = typeof session.customer === 'string'
            ? session.customer
            : session.customer_details?.email || 'guest'

        // Amount
        const amount = session.amount_total || 0
        const currency = session.currency || 'eur'

        // Invoice ID for deduplication
        const invoiceId = typeof session.invoice === 'string'
            ? session.invoice
            : session.id

        // ========================================
        // 4.1 RESOLVE AFFILIATE FROM CLICK_ID (FAIL-SAFE)
        // ========================================
        // ⚠️ CRITICAL: This is OPTIONAL enrichment. If it fails, sale MUST still be logged.
        let linkId: string | null = null
        let affiliateId: string | null = null

        if (clickId) {
            try {
                // Try to find the ShortLink from click_id slug pattern
                // click_id format is typically: clk_<slug> or just the slug
                const slug = clickId.startsWith('clk_') ? clickId.slice(4) : clickId

                // Find ShortLink by slug and get its enrollment
                // This query is non-blocking - if it fails, we continue without attribution
                const shortLink = await prisma.shortLink.findFirst({
                    where: { slug },
                    include: {
                        enrollment: true  // Get the MissionEnrollment if exists
                    }
                })

                if (shortLink) {
                    linkId = shortLink.id
                    // If this link has an enrollment, get the affiliate (user_id)
                    if (shortLink.enrollment) {
                        affiliateId = shortLink.enrollment.user_id
                        console.log(`[Multi-Tenant Webhook] 🔗 Attribution: Link ${linkId} → Affiliate ${affiliateId}`)
                    }
                } else {
                    console.log(`[Multi-Tenant Webhook] ℹ️ No ShortLink found for slug: ${slug}`)
                }
            } catch (attributionError) {
                // ⚠️ FAIL-SAFE: Attribution failed but sale MUST still be logged
                console.error('[Multi-Tenant Webhook] ⚠️ Affiliate attribution failed (non-blocking):', attributionError)
                // linkId and affiliateId remain null - sale continues without attribution
            }
        }

        console.log(`[Multi-Tenant Webhook] 💰 Sale for Workspace ${workspaceId} verified via Endpoint ${endpointId}`)
        console.log('[Multi-Tenant Webhook] 📦 Details:', {
            amount: `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
            customer: customerExternalId,
            click_id: clickId,
            link_id: linkId,
            affiliate_id: affiliateId,
        })

        // ========================================
        // 4.2 LOG TO TINYBIRD (PRIORITY #1)
        // ========================================
        // This is the CRITICAL path - must always execute
        try {
            await logSaleToTinybird({
                workspace_id: workspaceId,
                invoice_id: invoiceId,
                click_id: clickId,
                link_id: linkId,
                affiliate_id: affiliateId,
                customer_external_id: customerExternalId,
                amount,
                currency,
            })
        } catch (tinybirdError) {
            // Log error but don't crash the webhook response
            console.error('[Multi-Tenant Webhook] ❌ Tinybird logging failed:', tinybirdError)
        }
    }

    // ========================================
    // 5. IGNORE OTHER EVENTS
    // ========================================
    // Only checkout.session.completed is processed to avoid duplicates
    // payment_intent.succeeded/created are ACKed but not logged
    if (event.type !== 'checkout.session.completed') {
        console.log(`[Multi-Tenant Webhook] ⏭️ Ignoring event ${event.type} (no duplicate logging)`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
}
