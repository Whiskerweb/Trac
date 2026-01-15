import { NextRequest, NextResponse } from 'next/server';
import { recordLeadToTinybird } from '@/lib/analytics/tinybird';
import { requireScopes } from '@/lib/api-middleware';
import crypto from 'crypto';

/**
 * POST /api/conversions/lead
 * Record a manual lead conversion (Legacy API)
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
        const { click_id, email, customer_id, event_name, timestamp } = await req.json();

        if (!click_id && !customer_id) {
            return NextResponse.json(
                { error: 'Missing required fields: click_id or customer_id' },
                { status: 400 }
            );
        }

        // Generate customer_id if not provided
        const customerId = customer_id || crypto.randomUUID();
        const customerExternalId = email || customerId;

        // Record to Tinybird
        await recordLeadToTinybird({
            timestamp: timestamp || new Date().toISOString(),
            workspace_id: ctx.workspaceId || '',
            customer_id: customerId,
            customer_external_id: customerExternalId,
            click_id: click_id || null,
            event_name: event_name || 'Lead',
            customer_email: email || null,
            metadata: JSON.stringify({ source: 'manual_api' })
        });

        console.log(`[Conversions] ✅ Lead recorded for workspace ${ctx.workspaceId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Conversions Lead] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
