/**
 * TINYBIRD ANALYTICS INTEGRATION
 * Records sales and lead events to Tinybird for revenue attribution
 */

import crypto from 'crypto';
import { TINYBIRD_HOST, TINYBIRD_TOKEN, IS_MOCK_MODE } from '@/lib/config/constants';

interface ClickEvent {
    timestamp: string
    click_id: string
    link_id: string
    url: string
    country: string
    user_agent: string
}

interface ConversionEvent {
    timestamp: string
    click_id: string
    event_name: string
    amount: number
    currency: string
    external_id: string
}

export interface DashboardStats {
    total_clicks: number
    total_leads: number
    total_sales: number
    total_revenue: number
}

interface SaleEvent {
    clickId: string;
    linkId?: string;
    workspaceId?: string;
    customerExternalId?: string;
    customerEmail?: string;
    amount: number;
    netAmount?: number; // ✅ NEW: Net revenue (excl. tax)
    currency: string;
    orderId: string;
    timestamp?: string;
    source?: string;
    affiliateId?: string;
    lineItems?: Array<{
        product_id: string;
        product_name: string;
        sku?: string | null;
        category?: string | null;
        brand?: string | null;
        quantity: number;
        unit_price: number;
        total: number;
        net_total?: number; // ✅ NEW: Net total per item
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
    if (IS_MOCK_MODE) {
        console.log('[🦁 MOCK TINYBIRD] Sale Event:', {
            click_id: event.clickId,
            order_id: event.orderId,
            amount: event.amount,
            net_amount: event.netAmount,
            currency: event.currency,
            workspace_id: event.workspaceId,
            products_count: event.lineItems?.length || 0,
            source: event.source
        });
        return;
    }

    if (!TINYBIRD_TOKEN) {
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
        net_amount: event.netAmount ? Math.round(event.netAmount * 100) : Math.round(event.amount * 100), // ✅ NEW
        currency: event.currency.toUpperCase(),
        payment_processor: event.source || 'stripe'
        // NOTE: "sales" datasource doesn't have line_items field
        // Line items kept in webhook for future use if needed
    };

    try {
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=sales`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
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
    net_total: number; // ✅ NEW
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
    if (IS_MOCK_MODE) {
        console.log('[🦁 MOCK TINYBIRD] Sale Items:', {
            order_id: event.orderId,
            items_count: event.lineItems.length,
            products: event.lineItems.map(i => i.product_name)
        });
        return;
    }

    if (!TINYBIRD_TOKEN) {
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
        unit_price: item.unit_price,
        total: item.total,
        net_total: item.net_total || item.total, // ✅ NEW
        currency: event.currency.toUpperCase()
    }));

    // Send items as NDJSON (one JSON per line) for batch ingestion
    const ndjson = items.map(item => JSON.stringify(item)).join('\n');

    try {
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=sale_items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
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
    if (IS_MOCK_MODE) {
        console.log('[🦁 MOCK TINYBIRD] Lead Event:', {
            click_id: data.click_id,
            email: data.email,
            source: data.source,
            timestamp: data.timestamp
        });
        return;
    }

    if (!TINYBIRD_TOKEN) {
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
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=lead_events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
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

// ==========================================
// LEGACY / GENERIC EVENTS (Unified)
// ==========================================

export async function ingestToTinybird(datasource: string, data: object): Promise<{ success: boolean; error?: string }> {
    if (IS_MOCK_MODE) {
        console.log(`[🦁 MOCK TINYBIRD] Ingesting to ${datasource}:`, data);
        return { success: true };
    }

    if (!TINYBIRD_TOKEN) {
        console.error('[Tinybird] Missing TINYBIRD_ADMIN_TOKEN')
        return { success: false, error: 'Missing token' }
    }

    try {
        const response = await fetch(`${TINYBIRD_HOST}/v0/events?name=${datasource}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Tinybird] Ingest error:', errorText)
            return { success: false, error: errorText }
        }

        return { success: true }
    } catch (error) {
        console.error('[Tinybird] Fetch error:', error)
        return { success: false, error: String(error) }
    }
}

export async function recordEvent(data: Omit<ConversionEvent, 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    const event: ConversionEvent = {
        ...data,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    return ingestToTinybird('events', event)
}

export async function getDashboardStats(): Promise<DashboardStats> {
    if (!TINYBIRD_TOKEN) {
        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    }

    try {
        const url = `${TINYBIRD_HOST}/v0/pipes/kpis.json`
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
            cache: 'no-store',
        })

        if (!response.ok) return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }

        const result = await response.json()
        if (result.data && result.data.length > 0) {
            return result.data[0]
        }

        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    } catch (error) {
        console.error('[Tinybird] Error fetching stats:', error)
        return { total_clicks: 0, total_leads: 0, total_sales: 0, total_revenue: 0 }
    }
}

// ==========================================
// RECENT CLICKS FOR DASHBOARD
// ==========================================

export interface RecentClick {
    click_id: string
    link_id: string
    affiliate_id: string | null
    timestamp: string
    country: string
    device: string
}

/**
 * Get recent clicks for a workspace from Tinybird
 * Used in dashboard "Last Events" section
 */
export async function getRecentClicks(workspaceId: string, limit: number = 10): Promise<RecentClick[]> {
    if (IS_MOCK_MODE) {
        console.log('[🦁 MOCK TINYBIRD] Getting recent clicks for workspace:', workspaceId)
        return []
    }

    if (!TINYBIRD_TOKEN) {
        console.warn('[Tinybird] No API key configured for recent clicks')
        return []
    }

    try {
        // Query clicks datasource directly via SQL API
        const query = `
            SELECT click_id, link_id, affiliate_id, timestamp, country, device
            FROM clicks
            WHERE workspace_id = '${workspaceId}'
            ORDER BY timestamp DESC
            LIMIT ${limit}
        `

        const url = `${TINYBIRD_HOST}/v0/sql?q=${encodeURIComponent(query)}`
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${TINYBIRD_TOKEN}` },
            cache: 'no-store',
        })

        if (!response.ok) {
            console.error('[Tinybird] Failed to fetch recent clicks:', await response.text())
            return []
        }

        const result = await response.json()
        return result.data || []
    } catch (error) {
        console.error('[Tinybird] Error fetching recent clicks:', error)
        return []
    }
}

