import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

/**
 * API endpoint to check if the current user has any workspace
 * Used by middleware to enforce onboarding flow
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ hasWorkspace: false }, { status: 401 })
        }

        // Check if user has any workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: { user_id: user.id },
            select: { workspace_id: true }
        })

        // Check if user is a Seller
        const seller = await prisma.seller.findFirst({
            where: { user_id: user.id },
            select: { id: true }
        })

        return NextResponse.json({
            hasWorkspace: !!membership,
            workspaceId: membership?.workspace_id || null,
            hasSeller: !!seller
        })
    } catch (err) {
        console.error('[API] ❌ Workspace check error:', err)
        return NextResponse.json({ hasWorkspace: false, error: 'Server error' }, { status: 500 })
    }
}
