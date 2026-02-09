import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { getUserRoles } from '@/app/actions/get-user-roles'
import { createGlobalSeller, claimSellers } from '@/app/actions/sellers'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Capture redirection target if exists (e.g., inviting user)
    const redirectTo = searchParams.get('next')
    // Capture role from OAuth flow or email confirmation (startup or seller)
    let roleIntent = searchParams.get('role')
    // Error from Supabase (e.g., otp_expired, email_exists)
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    console.log('[Auth Callback] Starting...', {
        code: !!code,
        redirectTo,
        roleIntent,
        errorCode,
        errorDescription
    })

    // =============================================
    // HANDLE SUPABASE ERRORS (e.g., expired link, email conflict)
    // =============================================
    if (errorCode) {
        console.error('[Auth Callback] Supabase error:', errorCode, errorDescription)

        if (errorCode === 'otp_expired') {
            return NextResponse.redirect(`${origin}/login?error=link_expired&message=${encodeURIComponent('The confirmation link has expired. Please request a new one.')}`)
        }
        if (errorCode === 'access_denied' || errorCode === 'email_exists') {
            return NextResponse.redirect(`${origin}/login?error=email_conflict&message=${encodeURIComponent('An account with this email already exists. Please sign in instead.')}`)
        }

        return NextResponse.redirect(`${origin}/login?error=${errorCode}&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`)
    }

    if (!code) {
        console.error('[Auth Callback] No code provided')
        return NextResponse.redirect(`${origin}/login?error=no_code`)
    }

    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

        if (authError) {
            console.error('[Auth Callback] Auth error:', authError.message, authError.code)

            // Handle specific auth errors
            if (authError.message.includes('expired') || authError.code === 'otp_expired') {
                return NextResponse.redirect(`${origin}/login?error=link_expired&message=${encodeURIComponent('The confirmation link has expired. Please request a new one.')}`)
            }
            if (authError.message.includes('already registered') || authError.message.includes('email_exists')) {
                return NextResponse.redirect(`${origin}/login?error=email_exists&message=${encodeURIComponent('An account with this email already exists. Please sign in instead.')}`)
            }

            return NextResponse.redirect(`${origin}/login?error=auth_error&message=${encodeURIComponent(authError.message)}`)
        }

        if (!user) {
            console.error('[Auth Callback] No user returned')
            return NextResponse.redirect(`${origin}/login?error=no_user`)
        }

        console.log('[Auth Callback] User authenticated:', user.id, user.email)
        console.log('[Auth Callback] User metadata:', user.user_metadata)
        console.log('[Auth Callback] App metadata:', user.app_metadata)

        // If roleIntent not in URL, check user_metadata (set during signup)
        if (!roleIntent && user.user_metadata?.role) {
            roleIntent = user.user_metadata.role
            console.log('[Auth Callback] Using role from user_metadata:', roleIntent)
        }

        // Third fallback: check cookie (set during signup as backup for PKCE flow)
        if (!roleIntent) {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            const cookieRole = cookieStore.get('trac_signup_role')?.value
            if (cookieRole) {
                roleIntent = cookieRole
                console.log('[Auth Callback] Using role from cookie fallback:', roleIntent)
                // Clean up the cookie
                cookieStore.delete('trac_signup_role')
            }
        }

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
        // NEW USER HANDLING (Google OAuth or Email Confirmation)
        // =============================================
        if (!roles.hasWorkspace && !roles.hasSeller) {
            console.log('[Auth Callback] New user detected, roleIntent:', roleIntent)

            // New user - check role intent (from URL or user_metadata)
            if (roleIntent === 'seller') {
                try {
                    // Create global seller for new user
                    const result = await createGlobalSeller({
                        userId: user.id,
                        email: user.email || '',
                        name: user.user_metadata?.full_name || user.user_metadata?.name || ''
                    })

                    if (result.success) {
                        console.log('[Auth Callback] ✅ Auto-created Global Seller, redirecting to onboarding')
                        // Redirect to seller onboarding to complete setup (Stripe Connect, etc.)
                        return NextResponse.redirect(`${origin}/seller/onboarding`)
                    } else {
                        console.error('[Auth Callback] ❌ Failed to create seller:', result.error)
                        // Redirect with error
                        return NextResponse.redirect(`${origin}/login?error=seller_creation_failed&message=${encodeURIComponent(result.error || 'Failed to create seller account')}`)
                    }
                } catch (createError) {
                    console.error('[Auth Callback] createGlobalSeller exception:', createError)
                    return NextResponse.redirect(`${origin}/login?error=seller_creation_failed&message=${encodeURIComponent('An error occurred while creating your seller account')}`)
                }
            }

            // Startup flow → onboarding to create workspace
            console.log('[Auth Callback] Redirecting to startup onboarding')
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
