/**
 * TINYBIRD ANALYTICS INTEGRATION
 * Records sales events to Tinybird for revenue attribution
 */

interface SaleEvent {
    clickId: string;
    linkId: string;
    workspaceId: string;
    customerExternalId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    orderId: string;
}

export async function recordSaleToTinybird(event: SaleEvent): Promise<void> {
    const endpoint = process.env.TINYBIRD_ENDPOINT || 'https://api.europe-west2.gcp.tinybird.co';
    const token = process.env.TINYBIRD_API_KEY;

    if (!token) {
        console.error('[Tinybird] No API key configured');
        throw new Error('TINYBIRD_API_KEY not configured');
    }

    const payload = {
        timestamp: new Date().toISOString(),
        click_id: event.clickId,
        link_id: event.linkId,
        workspace_id: event.workspaceId,
        customer_external_id: event.customerExternalId,
        customer_email: event.customerEmail,
        amount: event.amount,
        currency: event.currency,
        order_id: event.orderId,
        event_type: 'sale',
        platform: 'shopify'
    };

    try {
        const response = await fetch(`${endpoint}/v0/events?name=sale_events`, {
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
