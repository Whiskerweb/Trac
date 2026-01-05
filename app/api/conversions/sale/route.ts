import { NextRequest, NextResponse } from 'next/server';
import { recordSaleToTinybird } from '@/lib/analytics/tinybird';

export async function POST(req: NextRequest) {
    // 1. Verify Bearer token
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.substring(7);
    if (token !== process.env.TRAC_CLIENT_TOKEN) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse request
    try {
        const { click_id, order_id, amount, currency, timestamp } = await req.json();

        if (!click_id || !order_id || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 3. Record to Tinybird
        await recordSaleToTinybird({
            clickId: click_id,
            orderId: order_id,
            amount: parseFloat(amount),
            currency: currency || 'USD',
            timestamp: timestamp || new Date().toISOString(),
            source: 'manual_api',
            // Required fields for existing interface
            linkId: '',
            workspaceId: '',
            customerExternalId: click_id,
            customerEmail: ''
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Conversions Sale] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
