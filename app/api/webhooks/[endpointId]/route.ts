import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { recordSaleToTinybird, recordSaleItemsToTinybird } from '@/lib/analytics/tinybird'
import { waitUntil } from '@vercel/functions'
import { createCommission, findSellerForSale, handleClawback, getMissionReward } from '@/lib/commission/engine'

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
                    // Click ID: Check multiple sources (Trac-style and Dub-style)
                    let clickId = session.client_reference_id ||
                        session.metadata?.tracClickId ||          // ✅ Trac recommended
                        session.metadata?.clk_id ||               // ✅ Legacy
                        session.metadata?.dubClickId ||           // ✅ Dub compatibility
                        null
                    const workspaceId = endpoint.workspace_id // Attribution to workspace of the endpoint

                    // ========================================
                    // CUSTOMER EXTERNAL ID (Trac-style + Dub-style)
                    // Priority order:
                    // 1. metadata.tracCustomerExternalId (Trac recommended)
                    // 2. metadata.dubCustomerExternalId (Dub compatibility)
                    // 3. metadata.customer_id (generic)
                    // 4. metadata.user_id (alternative)
                    // 5. Stripe customer ID (fallback)
                    // 6. Email (last resort)
                    // ========================================
                    const customerExternalId =
                        session.metadata?.tracCustomerExternalId || // ✅ Trac recommended
                        session.metadata?.dubCustomerExternalId ||  // ✅ Dub compatibility
                        session.metadata?.customer_id ||            // ✅ Generic
                        session.metadata?.user_id ||                // ✅ Alternative key
                        session.metadata?.external_id ||            // ✅ Explicit external ID
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
                    let tax = session.total_details?.amount_tax || 0
                    const currency = session.currency || 'eur'

                    // ✅ CRITICAL FIX: If Stripe doesn't return tax, calculate French VAT (20%)
                    // French VAT calculation: VAT = TTC * (20/120) = TTC * 0.1667
                    if (tax === 0 && currency === 'eur') {
                        tax = Math.round(grossAmount * 0.1667)  // 20% VAT from TTC
                        console.log(`[Webhook] 🧮 Calculated French VAT: ${tax / 100}€ (20% of ${grossAmount / 100}€ TTC)`)
                    }

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

                    // ✅ FIXED: Calculate HT (price excluding VAT) first
                    // This is the base for platform fee calculation (15% of HT, not of net)
                    const htAmount = grossAmount - tax  // HT = Hors Taxes (before Stripe fees)

                    // TRUE NET REVENUE = HT - Stripe Fee (available for seller + platform split)
                    const netAmount = htAmount - stripeFee

                    console.log(`[Webhook] 📊 Revenue Breakdown:`)
                    console.log(`  Gross (TTC): ${grossAmount / 100} ${currency}`)
                    console.log(`  Tax (TVA 20%): ${tax / 100} ${currency}`)
                    console.log(`  HT (before Stripe): ${htAmount / 100} ${currency}`)
                    console.log(`  Stripe Fee: ${stripeFee / 100} ${currency}`)
                    console.log(`  Net (for split): ${netAmount / 100} ${currency}`)

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
                    // Uses Redis first (fast, reliable), Tinybird as fallback
                    // ========================================
                    let linkId: string | null = null
                    let sellerId: string | null = null

                    if (clickId) {
                        try {
                            console.log(`[Multi-Tenant Webhook] 🔍 Looking up click_id: ${clickId}`)

                            // Step 1: Try Redis first (stored by middleware during click)
                            // This is more reliable as it doesn't depend on Tinybird ingestion delay
                            const { Redis } = await import('@upstash/redis')
                            const redis = new Redis({
                                url: process.env.UPSTASH_REDIS_REST_URL!,
                                token: process.env.UPSTASH_REDIS_REST_TOKEN!
                            })

                            const redisData = await redis.get<string | { linkId: string; sellerId: string | null }>(`click:${clickId}`)
                            if (redisData) {
                                const clickData = typeof redisData === 'string' ? JSON.parse(redisData) : redisData
                                if (clickData.linkId) {
                                    linkId = clickData.linkId
                                    sellerId = clickData.sellerId || null
                                    console.log(`[Multi-Tenant Webhook] ✅ Found from Redis: link=${linkId}, seller=${sellerId}`)
                                }
                            }

                            // ✅ IMPROVED: Step 2: If Redis miss, fallback to Tinybird query with timeout
                            if (!linkId && clickId) {
                                console.log(`[Multi-Tenant Webhook] 🔄 Redis miss, falling back to Tinybird for clickId=${clickId}`)

                                try {
                                    // Query both link_id AND affiliate_id from Tinybird
                                    const tinybirdSQL = `
                                        SELECT link_id, affiliate_id
                                        FROM clicks
                                        WHERE click_id = '${clickId}' AND workspace_id = '${workspaceId}'
                                        LIMIT 1
                                        FORMAT JSON
                                    `

                                    const tinybirdResponse = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                                            'Content-Type': 'text/plain',
                                        },
                                        body: tinybirdSQL,
                                        signal: AbortSignal.timeout(5000)  // ✅ 5s timeout to prevent blocking
                                    })

                                    if (tinybirdResponse.ok) {
                                        const result = await tinybirdResponse.json()
                                        if (result.data?.[0]?.link_id) {
                                            linkId = result.data[0].link_id
                                            // Also get affiliate_id if available
                                            if (result.data[0].affiliate_id) {
                                                sellerId = result.data[0].affiliate_id
                                            }
                                            console.log(`[Multi-Tenant Webhook] ✅ Tinybird recovery: linkId=${linkId}, sellerId=${sellerId}`)
                                        } else {
                                            console.log(`[Multi-Tenant Webhook] ⚠️ Tinybird: No click found for clickId=${clickId}`)
                                        }
                                    } else {
                                        console.error(`[Multi-Tenant Webhook] ❌ Tinybird error: ${tinybirdResponse.status}`)
                                    }
                                } catch (tinybirdError) {
                                    console.error('[Multi-Tenant Webhook] ❌ Tinybird fallback failed:', tinybirdError)
                                    // Continue without linkId (will be orphaned sale)
                                }
                            }

                            // Step 3: If we have linkId but no sellerId, lookup from ShortLink
                            if (linkId && !sellerId) {
                                const shortLink = await prisma.shortLink.findFirst({
                                    where: { id: linkId },
                                    include: { MissionEnrollment: true }
                                })

                                if (shortLink?.MissionEnrollment) {
                                    sellerId = shortLink.MissionEnrollment.user_id
                                    console.log(`[Multi-Tenant Webhook] 🔗 Attribution via MissionEnrollment: Link ${linkId} → Seller ${sellerId}`)
                                } else if (shortLink?.affiliate_id) {
                                    sellerId = shortLink.affiliate_id
                                    console.log(`[Multi-Tenant Webhook] 🔗 Attribution via ShortLink.affiliate_id: Link ${linkId} → Seller ${sellerId}`)
                                }
                            }

                            if (sellerId) {
                                console.log(`[Multi-Tenant Webhook] ✅ Final attribution: seller=${sellerId}, link=${linkId}`)
                            } else {
                                console.log(`[Multi-Tenant Webhook] ⚠️ No seller found for click_id=${clickId}`)
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
                        sellerId: sellerId || undefined,
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
                            sellerId: sellerId || undefined,
                            customerExternalId: customerExternalId,
                            lineItems: products
                        }, eventId);
                    }

                    // ========================================
                    // CREATE COMMISSION (IF SELLER ATTRIBUTION)
                    // ========================================
                    if (sellerId || linkId) {
                        try {
                            // Find the seller for this sale
                            const partnerId = await findSellerForSale({
                                linkId,
                                sellerId,
                                programId: workspaceId
                            })

                            if (partnerId) {
                                // Get mission reward dynamically
                                const missionReward = await getMissionReward({
                                    linkId,
                                    programId: workspaceId
                                })

                                await createCommission({
                                    partnerId,
                                    programId: workspaceId,
                                    saleId: session.id,
                                    linkId,
                                    grossAmount,
                                    htAmount,  // ✅ FIXED: Pass HT for correct platform fee calculation
                                    netAmount,
                                    stripeFee,
                                    taxAmount: tax,
                                    missionReward,
                                    currency,
                                    // Subscription tracking if applicable
                                    subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
                                    recurringMonth: 1,
                                    holdDays: 7
                                })
                                console.log(`[Webhook] 💰 Commission created for seller ${partnerId} with reward ${missionReward}`)
                            } else {
                                console.log(`[Webhook] ⚠️ No approved seller found for seller ${sellerId}`)
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

                    // 2. Revenue Calculation (same as checkout.session)
                    const grossAmount = invoice.amount_paid || 0
                    let tax = (invoice as any).tax || 0
                    const currency = invoice.currency || 'eur'

                    // ✅ CRITICAL FIX: If Stripe doesn't return tax, calculate French VAT (20%)
                    if (tax === 0 && currency === 'eur') {
                        tax = Math.round(grossAmount * 0.1667)  // 20% VAT from TTC
                        console.log(`[Webhook] 🧮 Calculated French VAT (recurring): ${tax / 100}€`)
                    }

                    // Fetch Stripe fee from balance_transaction via payment_intent
                    let stripeFee = 0
                    try {
                        const paymentIntentRef = (invoice as any).payment_intent
                        if (paymentIntentRef) {
                            const paymentIntentId = typeof paymentIntentRef === 'string'
                                ? paymentIntentRef
                                : paymentIntentRef.id

                            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                                expand: ['latest_charge.balance_transaction']
                            })

                            const charge = paymentIntent.latest_charge as Stripe.Charge
                            if (charge?.balance_transaction && typeof charge.balance_transaction !== 'string') {
                                stripeFee = charge.balance_transaction.fee || 0
                                console.log(`[Webhook] 💰 Recurring Stripe fee: ${stripeFee / 100} ${currency}`)
                            }
                        }
                    } catch (feeError) {
                        console.error('[Webhook] ⚠️ Failed to fetch recurring Stripe fee:', feeError)
                        // Fallback estimate
                        stripeFee = Math.floor(grossAmount * 0.029 + 30)
                    }

                    // ✅ FIXED: Calculate HT and net amounts correctly
                    const htAmount = grossAmount - tax  // HT before Stripe fees
                    const netAmount = htAmount - stripeFee  // Net after Stripe fees

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

                    console.log(`[Webhook] 💰 Recurring Payment: ${grossAmount / 100} ${currency} (HT: ${htAmount / 100}, Net: ${netAmount / 100}) - Click: ${clickId || 'none'}`)

                    await recordSaleToTinybird({
                        clickId: clickId || 'recurring', // Tag as recurring if lost
                        orderId: invoice.id,
                        amount: grossAmount / 100,
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
                            amount: grossAmount / 100,
                            netAmount: netAmount / 100,
                            currency: currency.toUpperCase(),
                            timestamp: new Date().toISOString(),
                            source: 'stripe_recurring',
                            workspaceId: workspaceId,
                            lineItems: products
                        }, eventId)
                    }

                    // ========================================
                    // CREATE RECURRING COMMISSION
                    // ========================================
                    if (clickId && clickId !== 'recurring') {
                        try {
                            // Get link_id from click (via Tinybird query already done upstream)
                            // For now, find partner via customer lookup
                            const customer = await prisma.customer.findFirst({
                                where: {
                                    workspace_id: workspaceId,
                                    OR: [
                                        { external_id: typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id },
                                        { email: invoice.customer_email || undefined }
                                    ]
                                }
                            })

                            if (customer?.click_id) {
                                const partnerId = await findSellerForSale({
                                    linkId: customer.link_id,
                                    programId: workspaceId
                                })

                                if (partnerId) {
                                    // Get mission reward
                                    const missionReward = await getMissionReward({
                                        linkId: customer.link_id,
                                        programId: workspaceId
                                    })

                                    // Calculate recurring month from invoice number
                                    const recurringMonth = invoice.number ? parseInt(invoice.number.split('-').pop() || '1') : 1

                                    await createCommission({
                                        partnerId,
                                        programId: workspaceId,
                                        saleId: invoice.id,
                                        linkId: customer.link_id,
                                        grossAmount,
                                        htAmount,  // ✅ FIXED: Pass HT for correct platform fee
                                        netAmount,
                                        stripeFee,  // ✅ FIXED: Now fetched from balance_transaction
                                        taxAmount: tax,
                                        missionReward,
                                        currency,
                                        subscriptionId: typeof (invoice as any).subscription === 'string' ? (invoice as any).subscription : null,
                                        recurringMonth,
                                        holdDays: 7
                                    })
                                    console.log(`[Webhook] 💰 Recurring commission created for partner ${partnerId} (month ${recurringMonth})`)
                                }
                            }
                        } catch (commError) {
                            console.error('[Webhook] ⚠️ Recurring commission failed (non-blocking):', commError)
                        }
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
