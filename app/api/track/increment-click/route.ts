import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/track/increment-click
 *
 * Lightweight endpoint called by Edge middleware (fire-and-forget)
 * to increment ShortLink.clicks in Prisma.
 *
 * Edge middleware cannot use Prisma directly, so this bridges the gap.
 *
 * Body: { linkId: string }
 * Auth: Internal token (TRAC_CLIENT_TOKEN) to prevent abuse
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization')
        const expectedToken = process.env.TRAC_CLIENT_TOKEN

        if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { linkId } = await request.json()

        if (!linkId || typeof linkId !== 'string') {
            return NextResponse.json({ error: 'Missing linkId' }, { status: 400 })
        }

        await prisma.shortLink.update({
            where: { id: linkId },
            data: { clicks: { increment: 1 } }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[increment-click] Error:', error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
