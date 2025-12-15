import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// CORS Headers for public API
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    })
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { projectId, destinationUrl, userId, name } = body

        // Validation
        if (!projectId || !destinationUrl || !userId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: projectId, destinationUrl, userId' },
                { status: 400, headers: corsHeaders }
            )
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404, headers: corsHeaders }
            )
        }

        // Validate destination URL format
        try {
            new URL(destinationUrl)
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid destination URL format' },
                { status: 400, headers: corsHeaders }
            )
        }

        // Create the link
        const link = await prisma.link.create({
            data: {
                destination_url: destinationUrl,
                project_id: projectId,
                user_id: userId,
                name: name || null,
            },
        })

        // Build tracking URL with proper parameter handling
        const trackingUrl = buildTrackingUrl(link.destination_url, link.id)

        console.log('✅ Link claimed:', {
            linkId: link.id,
            userId: link.user_id,
            projectName: project.name
        })

        return NextResponse.json(
            {
                success: true,
                link: {
                    id: link.id,
                    destination_url: link.destination_url,
                    project_id: link.project_id,
                    user_id: link.user_id,
                    name: link.name,
                    created_at: link.created_at,
                },
                tracking_url: trackingUrl,
            },
            { status: 201, headers: corsHeaders }
        )
    } catch (error) {
        console.error('Error creating link:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        )
    }
}

/**
 * Build tracking URL with ref_id parameter
 * Handles URLs that already have query parameters
 */
function buildTrackingUrl(destinationUrl: string, refId: string): string {
    try {
        const url = new URL(destinationUrl)
        url.searchParams.set('ref_id', refId)
        return url.toString()
    } catch {
        // Fallback if URL parsing fails (shouldn't happen after validation)
        const separator = destinationUrl.includes('?') ? '&' : '?'
        return `${destinationUrl}${separator}ref_id=${refId}`
    }
}
