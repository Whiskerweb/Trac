import { NextRequest, NextResponse } from 'next/server';
import { recordSaleToTinybird } from '@/lib/analytics/tinybird';
import { requireScopes } from '@/lib/api-middleware';

/**
 * POST /api/conversions/sale
 * Record a manual sale conversion
 * 
 * Requires: conversions:write scope
 */
export async function POST(req: NextRequest) {
    // Verify API key and scope
    const ctx = await requireScopes(req, ['conversions:write']);

    if (!ctx.valid) {
        return NextResponse.json(
            { error: ctx.error || 'Unauthorized' },
            { status: ctx.workspaceId ? 403 : 401 }
        );
    }

    // Parse request
    try {
        const { click_id, order_id, amount, currency, timestamp } = await req.json();

        if (!click_id || !order_id || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: click_id, order_id, amount' },
                { status: 400 }
            );
        }

        // Record to Tinybird with workspace from API key
        await recordSaleToTinybird({
            clickId: click_id,
            orderId: order_id,
            amount: parseFloat(amount),
            currency: currency || 'EUR',
            timestamp: timestamp || new Date().toISOString(),
            source: 'manual_api',
            workspaceId: ctx.workspaceId!,
            linkId: '',
            customerExternalId: click_id,
            customerEmail: ''
        });

        console.log(`[Conversions] ✅ Sale recorded for workspace ${ctx.workspaceId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Conversions Sale] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
