import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getUserRoles } from '@/app/actions/get-user-roles'
import { createGlobalSeller, claimSellers } from '@/app/actions/sellers'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Capture redirection target if exists (e.g., inviting user)
    const redirectTo = searchParams.get('next')
    // Capture role from OAuth flow (startup or seller)
    const roleIntent = searchParams.get('role')

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && user) {
            // If explicit redirect was requested (e.g. from invite link), honor it
            if (redirectTo) {
                return NextResponse.redirect(`${origin}${redirectTo}`)
            }

            // Claim any shadow sellers for this email
            if (user.email) {
                await claimSellers(user.id, user.email)
            }

            // Check current roles
            let roles = await getUserRoles(user.id)

            if (!roles) {
                return NextResponse.redirect(`${origin}/login?error=role_fetch_failed`)
            }

            // =============================================
            // NEW USER HANDLING (Google OAuth)
            // =============================================
            if (!roles.hasWorkspace && !roles.hasSeller) {
                // New user from Google OAuth - check role intent
                if (roleIntent === 'seller') {
                    // Create global seller for new Google user
                    const result = await createGlobalSeller({
                        userId: user.id,
                        email: user.email || '',
                        name: user.user_metadata?.full_name || user.user_metadata?.name || ''
                    })

                    if (result.success) {
                        console.log('[Auth Callback] 🤝 Auto-created Global Seller for Google user')
                        return NextResponse.redirect(`${origin}/seller/onboarding`)
                    } else {
                        console.error('[Auth Callback] ❌ Failed to create seller:', result.error)
                    }
                }

                // Startup flow or fallback - redirect to onboarding
                return NextResponse.redirect(`${origin}/onboarding`)
            }

            // =============================================
            // EXISTING USER HANDLING
            // =============================================

            // 2. Dual Role User -> Auth Choice (Resume session)
            if (roles.hasWorkspace && roles.hasSeller) {
                // If role intent is specified, respect it
                if (roleIntent === 'seller') {
                    return NextResponse.redirect(`${origin}/seller`)
                }
                if (roleIntent === 'startup') {
                    return NextResponse.redirect(`${origin}/dashboard`)
                }
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
