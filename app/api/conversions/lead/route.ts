import { NextRequest, NextResponse } from 'next/server';
import { recordLeadToTinybird } from '@/lib/analytics/tinybird';
import { requireScopes } from '@/lib/api-middleware';

/**
 * POST /api/conversions/lead
 * Record a manual lead conversion
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
        const { click_id, email, timestamp } = await req.json();

        if (!click_id || !email) {
            return NextResponse.json(
                { error: 'Missing required fields: click_id, email' },
                { status: 400 }
            );
        }

        // Record to Tinybird
        await recordLeadToTinybird({
            click_id: click_id,
            email: email,
            timestamp: timestamp || new Date().toISOString(),
            source: 'manual_api'
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
