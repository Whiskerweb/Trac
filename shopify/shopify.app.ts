import { shopifyApp } from '@shopify/shopify-app-remix/adapters/remix';
import { ApiVersion } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-10';

export const shopify = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecret: process.env.SHOPIFY_API_SECRET!,
    apiVersion: ApiVersion.October2024,
    scopes: [
        'write_orders',
        'read_orders',
        'read_products',
        'read_customers'
    ].filter(Boolean),
    appUrl: process.env.SHOPIFY_APP_URL!,
    redirectUriPath: '/auth/callback',
    restResources
});
