import { redirect } from '@remix-run/node';
import { shopify } from '../shopify.server';

export const loader = async ({ request }: { request: Request }) => {
    if (request.url.includes('/auth/callback')) {
        return await shopify.authenticate.callback(request);
    }

    return await shopify.authenticate.admin(request);
};
