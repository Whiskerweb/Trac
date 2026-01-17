import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * POST /api/admin/domains
 * Add a verified domain (admin only)
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate admin
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin (lucas.roncey@gmail.com)
        if (user.email !== 'lucas.roncey@gmail.com') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { name, workspaceId } = await request.json()

        if (!name || !workspaceId) {
            return NextResponse.json(
                { error: 'Missing name or workspaceId' },
                { status: 400 }
            )
        }

        // Check if domain already exists
        const existing = await prisma.domain.findUnique({
            where: { name: name.toLowerCase() }
        })

        if (existing) {
            return NextResponse.json({
                success: true,
                message: 'Domain already exists',
                domain: existing
            })
        }

        // Create domain
        const domain = await prisma.domain.create({
            data: {
                name: name.toLowerCase(),
                workspace_id: workspaceId,
                verified: true
            }
        })

        console.log('[Admin] ✅ Domain added:', domain)

        return NextResponse.json({
            success: true,
            domain
        })

    } catch (error) {
        console.error('[Admin] Error adding domain:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
