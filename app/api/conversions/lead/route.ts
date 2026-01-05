import { NextRequest, NextResponse } from 'next/server';
import { recordLeadToTinybird } from '@/lib/analytics/tinybird';

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
        const { click_id, email, timestamp } = await req.json();

        if (!click_id || !email) {
            console.error('[Conversions Lead] Missing fields:', { click_id, email });
            return NextResponse.json(
                { error: 'Missing click_id or email' },
                { status: 400 }
            );
        }

        console.log('[Conversions Lead] Processing:', { click_id, email, timestamp });

        // 3. Record to Tinybird
        await recordLeadToTinybird({
            click_id: click_id,
            email: email,
            timestamp: timestamp || new Date().toISOString(),
            source: 'manual_api'
        });

        console.log('[Conversions Lead] Success');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Conversions Lead] Error:', error);
        // Ensure we return a valid JSON response even on error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
