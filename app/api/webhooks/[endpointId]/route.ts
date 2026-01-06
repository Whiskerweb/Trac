import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { recordSaleToTinybird, recordSaleItemsToTinybird } from '@/lib/analytics/tinybird'
import { waitUntil } from '@vercel/functions'

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
                    // Extract core data
                    const clickId = session.client_reference_id ||
                        session.metadata?.clk_id ||
                        null
                    const workspaceId = endpoint.workspace_id // Attribution to workspace of the endpoint

                    const customerExternalId = typeof session.customer === 'string'
                        ? session.customer
                        : session.customer_details?.email || 'guest'

                    // Amount
                    // Amount & Net Calculation
                    const amount = session.amount_total || 0
                    const tax = session.total_details?.amount_tax || 0
                    const netAmount = amount - tax
                    const currency = session.currency || 'eur'

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
                        amount: amount / 100,
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
                            amount: amount / 100,
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

    } else {
        console.log(`[Multi-Tenant Webhook] ⏭️ Ignoring event ${event.type}`)
    }

    // Always return 200 OK immediately to Stripe
    return NextResponse.json({ received: true }, { status: 200 })
}
