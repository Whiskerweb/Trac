import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/links/short
 * Get all short links for the authenticated user
 */
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json([], { status: 200 })
    }

    const links = await prisma.shortLink.findMany({
        where: { workspace_id: user.id },
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            slug: true,
            original_url: true,
            clicks: true,
            created_at: true,
        }
    })

    return NextResponse.json(links)
}
