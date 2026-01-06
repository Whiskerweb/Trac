import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

/**
 * POST /api/projects
 * Create a new project for the authenticated STARTUP user
 */
export async function POST(request: Request) {
    try {
        // 1. Verify authentication
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 2. Check role is STARTUP
        if (user.role !== 'STARTUP') {
            return NextResponse.json(
                { success: false, error: 'Only STARTUP users can create projects' },
                { status: 403 }
            )
        }

        // 3. Parse request body
        const body = await request.json()
        const { name, website } = body

        // 4. Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Project name is required' },
                { status: 400 }
            )
        }

        // 5. Generate unique API key
        const publicKey = `pk_live_${nanoid(20)}`

        // 6. Create project in database
        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                website: website?.trim() || null,
                public_key: publicKey,
                user_id: user.userId,
            },
        })

        console.log(`✅ Project created: ${project.name} (${project.public_key})`)

        // 7. Return created project
        return NextResponse.json({
            success: true,
            project: {
                id: project.id,
                name: project.name,
                website: project.website,
                public_key: project.public_key,
                created_at: project.created_at,
            },
        })
    } catch (error) {
        console.error('Error creating project:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 */
export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const projects = await prisma.project.findMany({
            where: {
                user_id: user.userId,
            },
            include: {
                links: {
                    select: {
                        id: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        })

        return NextResponse.json({
            success: true,
            projects: projects.map((p: typeof projects[number]) => ({
                id: p.id,
                name: p.name,
                website: p.website,
                public_key: p.public_key,
                created_at: p.created_at,
                links_count: p.links.length,
            })),
        })
    } catch (error) {
        console.error('Error fetching projects:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
