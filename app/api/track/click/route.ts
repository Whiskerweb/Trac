import { NextRequest, NextResponse } from 'next/server';
import { isValidClickId, getRootDomain } from '@/lib/click-id';

export async function POST(req: NextRequest) {
    try {
        const { click_id } = await req.json();

        if (!click_id || !isValidClickId(click_id)) {
            return NextResponse.json(
                { error: 'Invalid click_id format' },
                { status: 400 }
            );
        }

        const response = NextResponse.json({ success: true });

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
        console.error('[Trac API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
