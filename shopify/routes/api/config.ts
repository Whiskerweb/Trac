import { json } from '@remix-run/node';
import { shopify } from '../../shopify.server';

/**
 * API route for Shopify store configuration
 * Returns store-specific settings and embed script URL
 */

export const loader = async ({ request }: { request: Request }) => {
    try {
        const { session } = await shopify.authenticate.admin(request);

        const config = {
            shop: session.shop,
            embedScriptUrl: `${process.env.SHOPIFY_APP_URL}/shopify/embed.js`,
            webhookUrl: `${process.env.SHOPIFY_APP_URL}/shopify/webhooks`,
            status: 'active'
        };

        return json(config);
    } catch (error) {
        console.error('[Shopify Config] Error:', error);
        return json({ error: 'Authentication failed' }, { status: 401 });
    }
};

export const action = async ({ request }: { request: Request }) => {
    try {
        const { session } = await shopify.authenticate.admin(request);
        const body = await request.json();

        // Update store configuration
        // Store in database or session

        return json({ success: true });
    } catch (error) {
        console.error('[Shopify Config] Error:', error);
        return json({ error: 'Configuration update failed' }, { status: 500 });
    }
};
