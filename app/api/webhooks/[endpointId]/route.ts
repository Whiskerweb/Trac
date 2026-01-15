import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { recordSaleToTinybird, recordSaleItemsToTinybird } from '@/lib/analytics/tinybird'
import { waitUntil } from '@vercel/functions'
import { createCommission, findPartnerForSale, handleClawback } from '@/lib/commission/engine'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Tinybird configuration (used for click_id lookup)
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

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
        // Return 200 OK to not block Stripe's queue for unknown endpoints
        // Log for debugging but don't retry - endpoint truly doesn't exist
        console.log('[Multi-Tenant Webhook] ⚠️ Endpoint not found (returning 200):', endpointId)
        return NextResponse.json(
            { received: true, warning: 'Endpoint not registered' },
            { status: 200 }
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
    // 4. PROCESS EVENT (ASYNC ENRICHMENT)
    // ========================================

    // Only checkout.session.completed is processed to avoid duplicates
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // Use waitUntil for "Fire-and-Forget" reliability
        // This ensures the response to Stripe is fast (ms) while processing continues
        waitUntil(
            (async () => {
                try {
                    // ========================================
                    // IDEMPOTENCY CHECK (CRITICAL FOR PRODUCTION)
                    // ========================================
                    const existingEvent = await prisma.processedEvent.findUnique({
                        where: { event_id: event.id }
                    })

                    if (existingEvent) {
                        console.log(`[Webhook] ⏭️ Event ${event.id} already processed, skipping`)
                        return
                    }

                    // Extract core data
                    let clickId = session.client_reference_id ||
                        session.metadata?.clk_id ||
                        null
                    const workspaceId = endpoint.workspace_id // Attribution to workspace of the endpoint

                    // ========================================
                    // CUSTOMER EXTERNAL ID (Dub-style Priority)
                    // 1. metadata.customer_id = Internal user ID from startup (BEST)
                    // 2. metadata.user_id = Alternative key
                    // 3. Stripe customer ID = Fallback
                    // 4. Email = Last resort
                    // ========================================
                    const customerExternalId =
                        session.metadata?.customer_id ||      // ✅ Internal user ID (recommended)
                        session.metadata?.user_id ||          // ✅ Alternative key
                        session.metadata?.external_id ||      // ✅ Explicit external ID
                        (typeof session.customer === 'string' ? session.customer : null) ||
                        session.customer_details?.email ||
                        'guest'

                    console.log(`[Webhook] 🔑 Customer External ID: ${customerExternalId} (source: ${session.metadata?.customer_id ? 'metadata.customer_id' :
                            session.metadata?.user_id ? 'metadata.user_id' :
                                session.metadata?.external_id ? 'metadata.external_id' :
                                    typeof session.customer === 'string' ? 'stripe_customer' :
                                        session.customer_details?.email ? 'email' : 'guest'
                        })`)

                    // ========================================
                    // CUSTOMER LOOKUP FALLBACK (Dub-style)
                    // If no clickId from cookie/URL, lookup from Customer table
                    // Enables lifetime attribution even with expired cookies
                    // ========================================
                    if (!clickId) {
                        try {
                            const customer = await prisma.customer.findFirst({
                                where: {
                                    workspace_id: workspaceId,
                                    OR: [
                                        { external_id: customerExternalId },
                                        { email: session.customer_details?.email || undefined }
                                    ]
                                }
                            })
                            if (customer?.click_id) {
                                clickId = customer.click_id
                                console.log(`[Webhook] 🔍 Customer lookup found click_id: ${clickId}`)
                            }
                        } catch (e) {
                            console.log('[Webhook] Customer lookup failed:', e)
                        }
                    }

                    // ========================================
                    // NET REVENUE CALCULATION (PRODUCTION GRADE)
                    // Revenu_net = Montant_brut - (Frais_Stripe + Taxes)
                    // ========================================
                    const grossAmount = session.amount_total || 0
                    const tax = session.total_details?.amount_tax || 0
                    const currency = session.currency || 'eur'

                    // Fetch exact Stripe fees from balance_transaction
                    let stripeFee = 0
                    try {
                        if (session.payment_intent) {
                            const paymentIntentId = typeof session.payment_intent === 'string'
                                ? session.payment_intent
                                : session.payment_intent.id

                            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                                expand: ['latest_charge.balance_transaction']
                            })

                            const charge = paymentIntent.latest_charge as Stripe.Charge
                            if (charge?.balance_transaction && typeof charge.balance_transaction !== 'string') {
                                stripeFee = charge.balance_transaction.fee || 0
                                console.log(`[Webhook] 💰 Stripe fee from balance_transaction: ${stripeFee / 100} ${currency}`)
                            }
                        }
                    } catch (feeError) {
                        console.error('[Webhook] ⚠️ Failed to fetch Stripe fee (using estimate):', feeError)
                        // Fallback: estimate 2.9% + 30¢
                        stripeFee = Math.floor(grossAmount * 0.029 + 30)
                    }

                    // TRUE NET REVENUE = Gross - Stripe Fee - Tax
                    const netAmount = grossAmount - stripeFee - tax

                    console.log(`[Webhook] 📊 Revenue Breakdown:`)
                    console.log(`  Gross: ${grossAmount / 100} ${currency}`)
                    console.log(`  Stripe Fee: ${stripeFee / 100} ${currency}`)
                    console.log(`  Tax: ${tax / 100} ${currency}`)
                    console.log(`  Net: ${netAmount / 100} ${currency}`)

                    // Update Customer with clk_id for future recurring payments (invoice.paid)
                    if (clickId && typeof session.customer === 'string') {
                        try {
                            await stripe.customers.update(session.customer, {
                                metadata: { clk_id: clickId }
                            })
                            console.log(`[Webhook] Updated Customer ${session.customer} with clk_id: ${clickId}`)
                        } catch (err) {
                            console.error('[Webhook] Failed to update customer metadata:', err)
                        }
                    }

                    // Invoice ID for deduplication
                    const invoiceId = typeof session.invoice === 'string'
                        ? session.invoice
                        : session.id

                    // ===== NEW: Extract line items with product details =====
                    let products: Array<{
                        product_id: string;
                        product_name: string;
                        sku: string | null;
                        category: string | null;
                        brand: string | null;
                        quantity: number;
                        unit_price: number;
                        total: number;
                        net_total: number;
                    }> = [];

                    try {
                        // Note: This API call adds latency, which is why we must be inside waitUntil
                        const lineItemsResponse = await stripe.checkout.sessions.listLineItems(
                            session.id,
                            { expand: ['data.price.product'] }
                        );

                        products = lineItemsResponse.data.map(item => {
                            const product = item.price?.product as Stripe.Product;
                            // Calculate item net (if tax is available on item, otherwise proportional or simplified)
                            // Note: Stripe listLineItems might not return amount_tax directly on item unless specified?
                            // Checked: LineItem has amount_tax.
                            const itemTax = item.amount_tax || 0;

                            return {
                                product_id: product?.id || 'unknown',
                                product_name: product?.name || 'Unknown Product',
                                sku: product?.metadata?.sku || null,
                                category: product?.metadata?.category || null,
                                brand: product?.metadata?.brand || null,
                                quantity: item.quantity || 1,
                                unit_price: item.price?.unit_amount || 0,
                                total: item.amount_total || 0,
                                net_total: (item.amount_total || 0) - itemTax
                            };
                        });
                        console.log(`[Webhook] Extracted ${products.length} line items for session ${session.id}`);
                    } catch (error) {
                        console.error('[Webhook] Failed to fetch line items:', error);
                        // Don't fail the webhook - continue without line items
                    }
                    // ===== END: Line items extraction =====

                    // ========================================
                    // 4.1 RESOLVE AFFILIATE FROM CLICK_ID (FAIL-SAFE)
                    // ========================================
                    let linkId: string | null = null
                    let affiliateId: string | null = null

                    if (clickId) {
                        try {
                            // Step 1: Query Tinybird to get link_id from click_id
                            console.log(`[Multi-Tenant Webhook] 🔍 Looking up click_id: ${clickId}`)

                            const tinybirdQuery = `SELECT link_id FROM clicks WHERE click_id = '${clickId}' LIMIT 1`
                            const tinybirdResponse = await fetch(
                                `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(tinybirdQuery)}`,
                                { headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` } }
                            )

                            if (tinybirdResponse.ok) {
                                const tinybirdText = await tinybirdResponse.text()
                                const lines = tinybirdText.trim().split('\n')
                                if (lines.length > 0 && lines[0].trim()) {
                                    linkId = lines[0].trim()
                                    console.log(`[Multi-Tenant Webhook] ✅ Found link_id from Tinybird: ${linkId}`)

                                    // Step 2: Find ShortLink by ID to get affiliate
                                    const shortLink = await prisma.shortLink.findFirst({
                                        where: { id: linkId },
                                        include: { MissionEnrollment: true }
                                    })

                                    if (shortLink?.MissionEnrollment) {
                                        affiliateId = shortLink.MissionEnrollment.user_id
                                        console.log(`[Multi-Tenant Webhook] 🔗 Attribution: Link ${linkId} → Affiliate ${affiliateId}`)
                                    } else if (shortLink?.affiliate_id) {
                                        affiliateId = shortLink.affiliate_id
                                        console.log(`[Multi-Tenant Webhook] 🔗 Attribution (direct): Link ${linkId} → Affiliate ${affiliateId}`)
                                    }
                                }
                            }
                        } catch (attributionError) {
                            console.error('[Multi-Tenant Webhook] ⚠️ Affiliate attribution failed (non-blocking):', attributionError)
                        }
                    }

                    console.log(`[Multi-Tenant Webhook] 💰 Sale for Workspace ${workspaceId} verified via Endpoint ${endpointId}`)

                    // ========================================
                    // 4.2 LOG TO TINYBIRD (PRIORITY #1)
                    // ========================================
                    const eventId = crypto.randomUUID();
                    await recordSaleToTinybird({
                        clickId: clickId || 'direct',
                        orderId: invoiceId,
                        amount: grossAmount / 100,
                        netAmount: netAmount / 100, // Pass Net Amount
                        currency: currency.toUpperCase(),
                        timestamp: new Date().toISOString(),
                        source: 'stripe_webhook',
                        workspaceId: workspaceId,
                        linkId: linkId || undefined,
                        affiliateId: affiliateId || undefined,
                        customerExternalId: customerExternalId,
                        customerEmail: customerExternalId,
                        lineItems: products
                    });

                    // Record individual line items
                    if (products.length > 0) {
                        await recordSaleItemsToTinybird({
                            clickId: clickId || 'direct',
                            orderId: invoiceId,
                            amount: grossAmount / 100,
                            currency: currency.toUpperCase(),
                            timestamp: new Date().toISOString(),
                            source: 'stripe_webhook',
                            workspaceId: workspaceId,
                            linkId: linkId || undefined,
                            affiliateId: affiliateId || undefined,
                            customerExternalId: customerExternalId,
                            lineItems: products
                        }, eventId);
                    }

                    // ========================================
                    // CREATE COMMISSION (IF AFFILIATE ATTRIBUTION)
                    // ========================================
                    if (affiliateId || linkId) {
                        try {
                            // Find the partner for this affiliate
                            const partnerId = await findPartnerForSale({
                                linkId,
                                affiliateId,
                                programId: workspaceId
                            })

                            if (partnerId) {
                                // Get mission reward for commission calculation
                                // For now, use a default - should be fetched from Mission
                                const missionReward = '10%' // TODO: Fetch from Mission.reward

                                await createCommission({
                                    partnerId,
                                    programId: workspaceId,
                                    saleId: session.id,
                                    linkId,
                                    grossAmount,
                                    netAmount,
                                    stripeFee,
                                    taxAmount: tax,
                                    missionReward,
                                    currency
                                })
                                console.log(`[Webhook] 💰 Commission created for partner ${partnerId}`)
                            } else {
                                console.log(`[Webhook] ⚠️ No approved partner found for affiliate ${affiliateId}`)
                            }
                        } catch (commissionError) {
                            console.error('[Webhook] ⚠️ Commission creation failed (non-blocking):', commissionError)
                        }
                    }

                    // ========================================
                    // RECORD PROCESSED EVENT (IDEMPOTENCY)
                    // ========================================
                    await prisma.processedEvent.create({
                        data: {
                            event_id: event.id,
                            event_type: event.type,
                            workspace_id: workspaceId,
                            amount_cents: grossAmount,
                            net_cents: netAmount,
                            stripe_fee: stripeFee
                        }
                    })
                    console.log(`[Webhook] ✅ Event ${event.id} processed and recorded`)

                } catch (err) {
                    // Start of the catch block for the async wrapper
                    console.error('[Multi-Tenant Webhook] ❌ Async processing error:', err)
                }
            })()
        )
    } else if (event.type === 'invoice.paid') {
        const invoice = event.data.object as Stripe.Invoice

        // Skip initial subscription invoice (handled by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') {
            console.log('[Multi-Tenant Webhook] ⏭️ Skipping initial subscription invoice (deduplication)')
            return NextResponse.json({ received: true }, { status: 200 })
        }

        waitUntil(
            (async () => {
                try {
                    const workspaceId = endpoint.workspace_id

                    // 1. Recover Click ID from Customer Metadata
                    let clickId = invoice.metadata?.clk_id || null

                    if (!clickId && invoice.customer) {
                        try {
                            const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
                            const customer = await stripe.customers.retrieve(customerId)
                            if (!customer.deleted && customer.metadata?.clk_id) {
                                clickId = customer.metadata.clk_id
                                console.log(`[Webhook] Recovered click_id ${clickId} from Customer ${customerId}`)
                            }
                        } catch (e) {
                            console.error('[Webhook] Failed to retrieve customer:', e)
                        }
                    }

                    // 2. Net Amount Calculation
                    const amount = invoice.amount_paid || 0
                    const tax = (invoice as any).tax || 0
                    const netAmount = amount - tax
                    const currency = invoice.currency || 'eur'

                    // 3. Extract Line Items (Products)
                    let products: any[] = []
                    try {
                        const lineItems = await stripe.invoices.listLineItems(invoice.id, { expand: ['data.price.product'] })
                        products = lineItems.data.map(item => {
                            const product = (item as any).price?.product as Stripe.Product
                            const itemTax = (item as any).tax_amounts?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0
                            const itemAmount = item.amount || 0
                            return {
                                product_id: product?.id || 'unknown',
                                product_name: product?.name || item.description || 'Unknown Product',
                                sku: product?.metadata?.sku || null,
                                category: product?.metadata?.category || null,
                                brand: product?.metadata?.brand || null,
                                quantity: item.quantity || 1,
                                unit_price: (item as any).price?.unit_amount || 0,
                                total: itemAmount,
                                net_total: itemAmount - itemTax
                            }
                        })
                    } catch (e) {
                        console.error('[Webhook] Failed to list invoice lines:', e)
                    }

                    // 4. Record to Tinybird
                    const eventId = crypto.randomUUID()

                    console.log(`[Webhook] 💰 Recurring Payment: ${amount / 100} ${currency} (Net: ${netAmount / 100}) - Click: ${clickId || 'none'}`)

                    await recordSaleToTinybird({
                        clickId: clickId || 'recurring', // Tag as recurring if lost
                        orderId: invoice.id,
                        amount: amount / 100,
                        netAmount: netAmount / 100,
                        currency: currency.toUpperCase(),
                        timestamp: new Date().toISOString(),
                        source: 'stripe_recurring',
                        workspaceId: workspaceId,
                        // Customer info
                        customerExternalId: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
                        customerEmail: invoice.customer_email || undefined,
                        lineItems: products
                    })

                    // granular items
                    if (products.length > 0) {
                        await recordSaleItemsToTinybird({
                            clickId: clickId || 'recurring',
                            orderId: invoice.id,
                            amount: amount / 100,
                            netAmount: netAmount / 100,
                            currency: currency.toUpperCase(),
                            timestamp: new Date().toISOString(),
                            source: 'stripe_recurring',
                            workspaceId: workspaceId,
                            lineItems: products
                        }, eventId)
                    }

                } catch (err) {
                    console.error('[Webhook] ❌ Invoice processing error:', err)
                }
            })()
        )

    } else if (event.type === 'charge.refunded') {
        // ========================================
        // CLAWBACK HANDLER
        // ========================================
        const charge = event.data.object as Stripe.Charge

        waitUntil(
            (async () => {
                try {
                    console.log(`[Webhook] 🔙 Processing refund for charge ${charge.id}`)

                    // Find associated session via payment_intent
                    if (charge.payment_intent) {
                        const paymentIntentId = typeof charge.payment_intent === 'string'
                            ? charge.payment_intent
                            : charge.payment_intent.id

                        // Find the session that used this payment intent
                        const sessions = await stripe.checkout.sessions.list({
                            payment_intent: paymentIntentId,
                            limit: 1
                        })

                        if (sessions.data.length > 0) {
                            const sessionId = sessions.data[0].id
                            await handleClawback({
                                saleId: sessionId,
                                reason: charge.refunds?.data[0]?.reason || 'Customer refund'
                            })
                            console.log(`[Webhook] ✅ Clawback processed for session ${sessionId}`)
                        } else {
                            console.log(`[Webhook] ⚠️ No checkout session found for payment intent ${paymentIntentId}`)
                        }
                    }
                } catch (err) {
                    console.error('[Webhook] ❌ Clawback processing error:', err)
                }
            })()
        )
    } else {
        console.log(`[Multi-Tenant Webhook] ⏭️ Ignoring event ${event.type}`)
    }

    // Always return 200 OK immediately to Stripe
    return NextResponse.json({ received: true }, { status: 200 })
}
