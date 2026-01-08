import { NextResponse } from 'next/server'
import { getUserRoles } from '@/app/actions/get-user-roles'

/**
 * GET /api/auth/user-roles
 * 
 * Returns the current user's roles (Startup/Partner) for client-side routing decisions.
 * Used by the /auth/choice page to determine navigation options.
 */
export async function GET() {
    try {
        const roles = await getUserRoles()

        if (!roles) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        return NextResponse.json(roles)

    } catch (error) {
        console.error('[API] ❌ Failed to get user roles:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
