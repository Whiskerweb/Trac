import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// CORS Headers for Edge middleware
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}

/**
 * Domain Lookup API for Edge Middleware
 * 
 * GET /api/domains/lookup?hostname=track.startup.com
 * 
 * Returns the workspace ID for a verified custom domain.
 * Results are cached via HTTP headers for Edge performance.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const hostname = searchParams.get('hostname')

    if (!hostname) {
        return NextResponse.json(
            { found: false, error: 'Missing hostname parameter' },
            { status: 400, headers: corsHeaders }
        )
    }

    try {
        // Lookup domain in database
        const domain = await prisma.domain.findUnique({
            where: { name: hostname.toLowerCase() },
            select: {
                workspace_id: true,
                verified: true,
            }
        })

        if (!domain) {
            return NextResponse.json(
                { found: false },
                { status: 200, headers: corsHeaders }
            )
        }

        // Only return workspace ID if domain is verified
        if (!domain.verified) {
            return NextResponse.json(
                { found: true, verified: false },
                { status: 200, headers: corsHeaders }
            )
        }

        console.log('[Domain Lookup] ✅ Found:', hostname, '→', domain.workspace_id)

        return NextResponse.json(
            {
                found: true,
                verified: true,
                workspaceId: domain.workspace_id,
            },
            { status: 200, headers: corsHeaders }
        )

    } catch (error) {
        console.error('[Domain Lookup] ❌ Error:', error)
        return NextResponse.json(
            { found: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        )
    }
}
