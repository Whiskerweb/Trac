import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/links/lookup?slug=XXX
 * 
 * Internal API to lookup link data for middleware.
 * Returns workspace_id (project owner), link_id, and destination_url.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
        return NextResponse.json(
            { error: 'Missing slug parameter' },
            { status: 400 }
        )
    }

    try {
        // Lookup link with project and owner info
        const link = await prisma.link.findUnique({
            where: { id: slug },
            include: {
                project: {
                    include: {
                        owner: {
                            select: { id: true }
                        }
                    }
                }
            }
        })

        if (!link) {
            return NextResponse.json(
                { error: 'Link not found' },
                { status: 404 }
            )
        }

        // Return workspace_id = project owner's user ID
        return NextResponse.json({
            workspace_id: link.project.owner.id,  // Project owner = startup
            link_id: link.id,
            destination_url: link.destination_url,
        })

    } catch (error) {
        console.error('[Link Lookup] ❌ Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
