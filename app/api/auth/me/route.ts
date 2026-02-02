import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/lib/admin'

// Force dynamic to never cache user data
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the current authenticated user info
 */
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json(
            { user: null, error: 'Not authenticated' },
            { status: 401 }
        )
    }

    return NextResponse.json({
        user: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            isAdmin: isAdmin(user.email),
        }
    })
}
