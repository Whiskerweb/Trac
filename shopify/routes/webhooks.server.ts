import { json } from '@remix-run/node';
import { recordSaleToTinybird } from '@/lib/analytics/tinybird';
import crypto from 'crypto';

export const action = async ({ request }: { request: Request }) => {
    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const topic = request.headers.get('X-Shopify-Topic');
    const hmac = request.headers.get('X-Shopify-Hmac-SHA256');

    // Verify webhook authenticity (Shopify requirement)
    const body = await request.text();
    if (!verifyShopifyWebhook(body, hmac)) {
        return json({ error: 'Invalid signature' }, { status: 401 });
    }

    const order = JSON.parse(body);

    // Handle orders/paid event
    if (topic === 'orders/paid') {
        try {
            // 1. Extract clk_id from order attributes
            const clkIdAttr = order.attributes?.find(
                (attr: any) => attr.name === 'clk_id'
            );
            const clickId = clkIdAttr?.value;

            if (!clickId) {
                console.log('[Shopify] No clk_id found in order', order.id);
                return json({ success: true }); // Don't fail webhook
            }

            // 2. Get store domain (from webhook headers)
            const shopDomain = order.shop_domain;

            // 3. Record sale to Tinybird
            await recordSaleToTinybird({
                clickId: clickId,
                linkId: 'shopify_' + shopDomain, // Link ID for Shopify
                workspaceId: `shop_${shopDomain}`,
                customerExternalId: order.customer.id.toString(),
                customerEmail: order.customer.email,
                amount: parseFloat(order.total_price),
                currency: order.currency,
                orderId: order.id.toString()
            });

            // 4. Save to database (optional)
            // await db.shopifyOrders.create({
            //   data: {
            //     orderId: order.id.toString(),
            //     shopDomain: shopDomain,
            //     clickId: clickId,
            //     customerId: order.customer.id.toString(),
            //     amount: parseFloat(order.total_price),
            //     currency: order.currency,
            //     status: 'paid'
            //   }
            // });

            console.log('[Shopify] Sale recorded:', {
                orderId: order.id,
                clickId: clickId,
                amount: order.total_price
            });

            return json({ success: true });
        } catch (error) {
            console.error('[Shopify Webhook] Error:', error);
            // Don't fail webhook - Shopify will retry
            return json({ success: true });
        }
    }

    return json({ success: true });
};

function verifyShopifyWebhook(body: string, hmac: string | null): boolean {
    if (!hmac) return false;
    const hash = crypto
        .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
        .update(body, 'utf8')
        .digest('base64');
    return hash === hmac;
}
