import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /r/[code] — Referral redirect
 * Sets a trac_ref cookie (90 days) and redirects to signup
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params

    // Verify referral code exists and seller is APPROVED
    const referrer = await prisma.seller.findUnique({
        where: { referral_code: code },
        select: { id: true, name: true, status: true }
    })

    if (!referrer || referrer.status !== 'APPROVED') {
        // Invalid code or non-approved seller → redirect to homepage
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Set referral cookie (90 days) and redirect to signup
    const response = NextResponse.redirect(new URL('/login?role=seller', request.url))
    response.cookies.set('trac_ref', code, {
        maxAge: 90 * 24 * 60 * 60, // 90 days
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
    })

    console.log(`[Referral] Cookie set for code ${code} (referrer: ${referrer.name || referrer.id})`)
    return response
}
