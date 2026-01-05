/**
 * TINYBIRD ANALYTICS INTEGRATION
 * Records sales and lead events to Tinybird for revenue attribution
 */

import crypto from 'crypto';

interface SaleEvent {
    clickId: string;
    linkId?: string;
    workspaceId?: string;
    customerExternalId?: string;
    customerEmail?: string;
    amount: number;
    currency: string;
    orderId: string;
    timestamp?: string;
    source?: string;
    // ✅ NEW: Add affiliate and line items support
    affiliateId?: string;  // From webhook enrichment
    lineItems?: Array<{
        product_id: string;
        product_name: string;
        sku?: string | null;
        category?: string | null;
        brand?: string | null;
        quantity: number;
        unit_price: number;
        total: number;
    }>;
}

interface LeadEvent {
    click_id: string;
    email: string;
    timestamp: string;
    source: string;
}

export async function recordSaleToTinybird(event: SaleEvent): Promise<void> {
    // 🦁 Mock Mode: Intercept calls in development
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK TINYBIRD] Sale Event:', {
            click_id: event.clickId,
            order_id: event.orderId,
            amount: event.amount,
            currency: event.currency,
            workspace_id: event.workspaceId,
            products_count: event.lineItems?.length || 0,
            source: event.source
        });
        return;
    }

    const endpoint = process.env.TINYBIRD_ENDPOINT || 'https://api.europe-west2.gcp.tinybird.co';
    const token = process.env.TINYBIRD_API_KEY || process.env.TINYBIRD_ADMIN_TOKEN;

    if (!token) {
        console.error('[Tinybird] No API key configured');
        throw new Error('TINYBIRD_API_KEY not configured');
    }

    const payload = {
        timestamp: event.timestamp || new Date().toISOString(),
        event_id: crypto.randomUUID(),  // Required by sales schema
        invoice_id: event.orderId,      // orderId → invoice_id for schema match
        workspace_id: event.workspaceId || '',
        click_id: event.clickId || null,
        link_id: event.linkId || null,
        affiliate_id: event.affiliateId || null,
        customer_external_id: event.customerExternalId || event.clickId,
        amount: Math.round(event.amount * 100),  // Convert to cents (Int32)
        currency: event.currency.toUpperCase(),
        payment_processor: event.source || 'stripe'
        // NOTE: "sales" datasource doesn't have line_items field
        // Line items kept in webhook for future use if needed
    };

    try {
        const response = await fetch(`${endpoint}/v0/events?name=sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Tinybird] Failed to record sale:', error);
            throw new Error(`Tinybird API error: ${response.status}`);
        }

        console.log('[Tinybird] Sale recorded successfully:', {
            clickId: event.clickId,
            orderId: event.orderId,
            amount: event.amount
        });
    } catch (error) {
        console.error('[Tinybird] Error recording sale:', error);
        throw error;
    }
}

interface SaleItem {
    timestamp: string;
    event_id: string;
    order_id: string;
    workspace_id: string;
    click_id: string | null;
    link_id: string | null;
    affiliate_id: string | null;
    product_id: string;
    product_name: string;
    sku: string | null;
    category: string | null;
    brand: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    currency: string;
}

/**
 * Record individual line items to Tinybird for product-level analytics
 * Enables queries like "Top products by campaign" and "Revenue by product category"
 */
export async function recordSaleItemsToTinybird(
    event: SaleEvent,
    eventId: string
): Promise<void> {
    if (!event.lineItems || event.lineItems.length === 0) {
        return; // No line items to record
    }

    // 🦁 Mock Mode: Intercept calls in development
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK TINYBIRD] Sale Items:', {
            order_id: event.orderId,
            items_count: event.lineItems.length,
            products: event.lineItems.map(i => i.product_name)
        });
        return;
    }

    const endpoint = process.env.TINYBIRD_ENDPOINT || 'https://api.europe-west2.gcp.tinybird.co';
    const token = process.env.TINYBIRD_API_KEY || process.env.TINYBIRD_ADMIN_TOKEN;

    if (!token) {
        console.error('[Tinybird] No API key configured for sale_items');
        return; // Don't throw - this is enhancement, not critical path
    }

    const timestamp = event.timestamp || new Date().toISOString();

    // Transform each line item into a Tinybird event
    const items: SaleItem[] = event.lineItems.map((item, index) => ({
        timestamp,
        event_id: `${eventId}_item_${index}`,
        order_id: event.orderId,
        workspace_id: event.workspaceId || '',
        click_id: event.clickId || null,
        link_id: event.linkId || null,
        affiliate_id: event.affiliateId || null,
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku || null,
        category: item.category || null,
        brand: item.brand || null,
        quantity: item.quantity,
        unit_price: item.unit_price, // Already in cents from Stripe
        total: item.total,           // Already in cents from Stripe
        currency: event.currency.toUpperCase()
    }));

    // Send items as NDJSON (one JSON per line) for batch ingestion
    const ndjson = items.map(item => JSON.stringify(item)).join('\n');

    try {
        const response = await fetch(`${endpoint}/v0/events?name=sale_items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-ndjson'
            },
            body: ndjson
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Tinybird] Failed to record sale_items:', error);
            // Don't throw - sale was already recorded, this is enhancement
        } else {
            console.log('[Tinybird] Sale items recorded:', {
                orderId: event.orderId,
                itemsCount: items.length
            });
        }
    } catch (error) {
        console.error('[Tinybird] Error recording sale_items:', error);
        // Fail silently - main sale record is priority
    }
}

export async function recordLeadToTinybird(data: LeadEvent): Promise<void> {
    // 🦁 Mock Mode: Intercept calls in development
    if (process.env.TINYBIRD_MOCK_MODE === 'true') {
        console.log('[🦁 MOCK TINYBIRD] Lead Event:', {
            click_id: data.click_id,
            email: data.email,
            source: data.source,
            timestamp: data.timestamp
        });
        return;
    }

    const endpoint = process.env.TINYBIRD_ENDPOINT || 'https://api.europe-west2.gcp.tinybird.co';
    const token = process.env.TINYBIRD_API_KEY || process.env.TINYBIRD_ADMIN_TOKEN;

    if (!token) {
        console.error('[Tinybird] No API key configured');
        throw new Error('TINYBIRD_API_KEY not configured');
    }

    const payload = {
        timestamp: data.timestamp,
        click_id: data.click_id,
        email: data.email,
        source: data.source,
        event_type: 'lead'
    };

    try {
        const response = await fetch(`${endpoint}/v0/events?name=lead_events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[Tinybird] Failed to record lead:', error);
            throw new Error(`Tinybird API error: ${response.status}`);
        }

        console.log('[Tinybird] Lead recorded successfully:', {
            clickId: data.click_id,
            email: data.email
        });
    } catch (error) {
        console.error('[Tinybird] Error recording lead:', error);
        throw error;
    }
}
