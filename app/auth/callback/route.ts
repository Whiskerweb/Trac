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

    console.log('[Auth Callback] Starting...', { code: !!code, redirectTo, roleIntent })

    if (!code) {
        console.error('[Auth Callback] No code provided')
        return NextResponse.redirect(`${origin}/login?error=no_code`)
    }

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

        if (authError) {
            console.error('[Auth Callback] Auth error:', authError.message)
            return NextResponse.redirect(`${origin}/login?error=auth_error&message=${encodeURIComponent(authError.message)}`)
        }

        if (!user) {
            console.error('[Auth Callback] No user returned')
            return NextResponse.redirect(`${origin}/login?error=no_user`)
        }

        console.log('[Auth Callback] User authenticated:', user.id, user.email)

        // If explicit redirect was requested (e.g. from invite link), honor it
        if (redirectTo) {
            return NextResponse.redirect(`${origin}${redirectTo}`)
        }

        // Claim any shadow sellers for this email (non-blocking)
        if (user.email) {
            try {
                await claimSellers(user.id, user.email)
            } catch (claimError) {
                console.error('[Auth Callback] claimSellers error (non-blocking):', claimError)
            }
        }

        // Check current roles
        let roles
        try {
            roles = await getUserRoles(user.id)
        } catch (rolesError) {
            console.error('[Auth Callback] getUserRoles error:', rolesError)
            return NextResponse.redirect(`${origin}/login?error=roles_error`)
        }

        if (!roles) {
            console.log('[Auth Callback] No roles found, new user')
            roles = { hasWorkspace: false, hasSeller: false }
        }

        console.log('[Auth Callback] User roles:', roles)

        // =============================================
        // NEW USER HANDLING (Google OAuth)
        // =============================================
        if (!roles.hasWorkspace && !roles.hasSeller) {
            // New user from Google OAuth - check role intent
            if (roleIntent === 'seller') {
                try {
                    // Create global seller for new Google user
                    const result = await createGlobalSeller({
                        userId: user.id,
                        email: user.email || '',
                        name: user.user_metadata?.full_name || user.user_metadata?.name || ''
                    })

                    if (result.success) {
                        console.log('[Auth Callback] ✅ Auto-created Global Seller for Google user')
                        return NextResponse.redirect(`${origin}/seller`)
                    } else {
                        console.error('[Auth Callback] ❌ Failed to create seller:', result.error)
                        // Continue to onboarding as fallback
                    }
                } catch (createError) {
                    console.error('[Auth Callback] createGlobalSeller exception:', createError)
                    // Continue to onboarding as fallback
                }
            }

            // Startup flow → onboarding to create workspace
            return NextResponse.redirect(`${origin}/onboarding`)
        }

        // =============================================
        // EXISTING USER HANDLING
        // =============================================

        // Dual Role User -> Auth Choice (Resume session)
        if (roles.hasWorkspace && roles.hasSeller) {
            if (roleIntent === 'seller') {
                return NextResponse.redirect(`${origin}/seller`)
            }
            if (roleIntent === 'startup') {
                return NextResponse.redirect(`${origin}/dashboard`)
            }
            return NextResponse.redirect(`${origin}/auth/choice`)
        }

        // Seller Only -> Seller Dashboard
        if (roles.hasSeller) {
            return NextResponse.redirect(`${origin}/seller`)
        }

        // Startup Only -> Dashboard
        if (roles.hasWorkspace) {
            return NextResponse.redirect(`${origin}/dashboard`)
        }

        // Fallback
        return NextResponse.redirect(`${origin}/onboarding`)

    } catch (error) {
        console.error('[Auth Callback] Unexpected error:', error)
        return NextResponse.redirect(`${origin}/login?error=unexpected_error`)
    }
}
