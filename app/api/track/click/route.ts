import { NextRequest, NextResponse } from 'next/server';
import { isValidClickId, getRootDomain } from '@/lib/click-id';
import { validateApiKey } from '@/lib/api-keys';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { click_id, token } = body;

        // Extract token from header or body
        const apiToken = req.headers.get('X-Trac-Token')
            || req.headers.get('Authorization')?.replace('Bearer ', '')
            || token;

        // Validate API token if provided
        let workspaceId: string | undefined;
        if (apiToken) {
            const validation = await validateApiKey(apiToken);
            if (!validation.valid) {
                return NextResponse.json(
                    { error: 'Invalid API key' },
                    { status: 401 }
                );
            }
            workspaceId = validation.workspaceId;
            console.log('[Track] ✅ Validated token for workspace:', workspaceId);
        }

        // Validate click_id format
        if (!click_id || !isValidClickId(click_id)) {
            return NextResponse.json(
                { error: 'Invalid click_id format' },
                { status: 400 }
            );
        }

        const response = NextResponse.json({
            success: true,
            workspace_id: workspaceId || null
        });

        // SERVER-SIDE COOKIE (SURVIVES SAFARI ITP)
        const domain = getRootDomain(req.url);

        response.cookies.set({
            name: 'clk_id',
            value: click_id,
            httpOnly: false,  // JS accessible pour injection
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 90,  // 90 JOURS
            path: '/',
            domain: domain  // localhost / .example.com
        });

        return response;
    } catch (error) {
        console.error('[Track] ❌ Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

