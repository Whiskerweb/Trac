import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getUserRoles } from '@/app/actions/get-user-roles'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Capture redirection target if exists (e.g., inviting user)
    const redirectTo = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && user) {
            // If explicit redirect was requested (e.g. from invite link), honor it
            if (redirectTo) {
                return NextResponse.redirect(`${origin}${redirectTo}`)
            }

            // Otherwise, determine smart destination based on roles
            const roles = await getUserRoles(user.id)

            if (!roles) {
                return NextResponse.redirect(`${origin}/login?error=role_fetch_failed`)
            }

            // 1. New User (No Workspace, No Partner) -> Onboarding Choice
            if (!roles.hasWorkspace && !roles.hasSeller) {
                return NextResponse.redirect(`${origin}/onboarding/choice`)
            }

            // 2. Dual Role User -> Auth Choice (Resume session)
            if (roles.hasWorkspace && roles.hasSeller) {
                return NextResponse.redirect(`${origin}/auth/choice`)
            }

            // 3. Seller Only -> Seller Dashboard
            if (roles.hasSeller) {
                return NextResponse.redirect(`${origin}/seller`)
            }

            // 4. Startup Only -> Dashboard
            if (roles.hasWorkspace) {
                return NextResponse.redirect(`${origin}/dashboard`)
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
