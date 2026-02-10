import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getUserRoles } from '@/app/actions/get-user-roles'
import { createGlobalSeller, claimSellers } from '@/app/actions/sellers'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // Capture redirection target if exists (e.g., inviting user)
    const redirectTo = searchParams.get('next')
    // Capture role from OAuth flow or email confirmation (startup or seller)
    let roleIntent = searchParams.get('role')
    // Error from Supabase (e.g., otp_expired, email_exists)
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    // =============================================
    // COOKIE COLLECTION — applied to EVERY redirect response
    // Session cookies from exchangeCodeForSession() MUST be forwarded
    // on the redirect response. Using cookies() from next/headers
    // silently fails in Route Handlers (Next.js 16).
    // =============================================
    const cookiesToForward: { name: string; value: string; options: Record<string, unknown> }[] = []

    function createRedirect(url: string) {
        const response = NextResponse.redirect(url)
        const isProduction = process.env.NODE_ENV === 'production'
        const cookieDomain = isProduction ? '.traaaction.com' : undefined

        for (const { name, value, options } of cookiesToForward) {
            response.cookies.set(name, value, {
                ...options,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
        }
        console.log(`[Auth Callback] Redirect → ${new URL(url).pathname} (${cookiesToForward.length} cookies forwarded: ${cookiesToForward.map(c => c.name).join(', ')})`)
        return response
    }

    // =============================================
    // SELLER SUBDOMAIN DETECTION
    // If callback comes from seller.traaaction.com, force seller role
    // =============================================
    const callbackHostname = new URL(request.url).hostname
    const isSellerDomain = callbackHostname === 'seller.traaaction.com' || callbackHostname === 'seller.localhost'

    if (isSellerDomain && !roleIntent) {
        roleIntent = 'seller'
        console.log('[Auth Callback] Seller subdomain detected, forcing roleIntent=seller')
    }

    // =============================================
    // APP SUBDOMAIN DETECTION
    // If callback comes from app.traaaction.com, force startup role
    // =============================================
    const isAppDomain = callbackHostname === 'app.traaaction.com' || callbackHostname === 'app.localhost'

    if (isAppDomain && !roleIntent) {
        roleIntent = 'startup'
        console.log('[Auth Callback] App subdomain detected, forcing roleIntent=startup')
    }

    // =============================================
    // SUBDOMAIN-AWARE REDIRECT ORIGINS
    // In production, redirect directly to the correct subdomain
    // to avoid cross-origin RSC fetch issues (CORS)
    // =============================================
    const isProduction = process.env.NODE_ENV === 'production'
    const sellerOrigin = isProduction ? 'https://seller.traaaction.com' : origin
    const appOrigin = isProduction ? 'https://app.traaaction.com' : origin

    console.log('[Auth Callback] Starting...', {
        code: !!code,
        redirectTo,
        roleIntent,
        errorCode,
        errorDescription,
        isSellerDomain,
        isAppDomain,
    })

    // =============================================
    // HANDLE SUPABASE ERRORS (e.g., expired link, email conflict)
    // =============================================
    if (errorCode) {
        console.error('[Auth Callback] Supabase error:', errorCode, errorDescription)

        if (errorCode === 'otp_expired') {
            return createRedirect(`${origin}/login?error=link_expired&message=${encodeURIComponent('The confirmation link has expired. Please request a new one.')}`)
        }
        if (errorCode === 'access_denied' || errorCode === 'email_exists') {
            return createRedirect(`${origin}/login?error=email_conflict&message=${encodeURIComponent('An account with this email already exists. Please sign in instead.')}`)
        }

        return createRedirect(`${origin}/login?error=${errorCode}&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`)
    }

    if (!code) {
        console.error('[Auth Callback] No code provided')
        return createRedirect(`${origin}/login?error=no_code`)
    }

    try {
        // =============================================
        // CREATE SUPABASE CLIENT WITH RESPONSE-LEVEL COOKIES
        // Uses NextRequest.cookies.getAll() — same API as middleware.ts
        // =============================================
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        // Collect cookies — they'll be applied to the redirect response
                        cookiesToForward.push(...cookiesToSet)
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

        console.log('[Auth Callback] After exchangeCodeForSession:', {
            hasUser: !!user,
            hasError: !!authError,
            cookiesCollected: cookiesToForward.length,
            cookieNames: cookiesToForward.map(c => c.name),
        })

        if (authError) {
            console.error('[Auth Callback] Auth error:', authError.message, authError.code)

            // Handle specific auth errors
            if (authError.message.includes('expired') || authError.code === 'otp_expired') {
                return createRedirect(`${origin}/login?error=link_expired&message=${encodeURIComponent('The confirmation link has expired. Please request a new one.')}`)
            }
            if (authError.message.includes('already registered') || authError.message.includes('email_exists')) {
                return createRedirect(`${origin}/login?error=email_exists&message=${encodeURIComponent('An account with this email already exists. Please sign in instead.')}`)
            }

            return createRedirect(`${origin}/login?error=auth_error&message=${encodeURIComponent(authError.message)}`)
        }

        if (!user) {
            console.error('[Auth Callback] No user returned')
            return createRedirect(`${origin}/login?error=no_user`)
        }

        console.log('[Auth Callback] User authenticated:', user.id, user.email)

        // If roleIntent not in URL, check user_metadata (set during signup)
        if (!roleIntent && user.user_metadata?.role) {
            roleIntent = user.user_metadata.role
            console.log('[Auth Callback] Using role from user_metadata:', roleIntent)
        }

        // Third fallback: check cookie (set during signup as backup for PKCE flow)
        if (!roleIntent) {
            const cookieRole = request.cookies.get('trac_signup_role')?.value
            if (cookieRole) {
                roleIntent = cookieRole
                console.log('[Auth Callback] Using role from cookie fallback:', roleIntent)
            }
        }

        // If explicit redirect was requested (e.g. from invite link), honor it
        if (redirectTo) {
            return createRedirect(`${origin}${redirectTo}`)
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
            return createRedirect(`${origin}/login?error=roles_error`)
        }

        if (!roles) {
            console.log('[Auth Callback] No roles found, new user')
            roles = { hasWorkspace: false, hasSeller: false }
        }

        console.log('[Auth Callback] User roles:', roles, 'roleIntent:', roleIntent)

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
                        console.log('[Auth Callback] Auto-created Global Seller, redirecting to onboarding')
                        // ?new=1 tells the onboarding page to show step 1 immediately
                        // without waiting for the DB read (PgBouncer lag protection)
                        return createRedirect(`${sellerOrigin}/seller/onboarding?new=1`)
                    } else {
                        console.error('[Auth Callback] Failed to create seller:', result.error)
                        return createRedirect(`${origin}/login?error=seller_creation_failed&message=${encodeURIComponent(result.error || 'Failed to create seller account')}`)
                    }
                } catch (createError) {
                    console.error('[Auth Callback] createGlobalSeller exception:', createError)
                    return createRedirect(`${origin}/login?error=seller_creation_failed&message=${encodeURIComponent('An error occurred while creating your seller account')}`)
                }
            }

            // Startup flow → onboarding to create workspace
            console.log('[Auth Callback] Redirecting to startup onboarding')
            return createRedirect(`${origin}/onboarding`)
        }

        // =============================================
        // EXISTING USER HANDLING
        // =============================================

        // Dual Role User -> Auth Choice (Resume session)
        if (roles.hasWorkspace && roles.hasSeller) {
            if (roleIntent === 'seller') {
                return createRedirect(`${sellerOrigin}/seller`)
            }
            if (roleIntent === 'startup') {
                return createRedirect(`${appOrigin}/dashboard`)
            }
            return createRedirect(`${origin}/auth/choice`)
        }

        // Seller Only -> Seller Dashboard
        if (roles.hasSeller) {
            return createRedirect(`${sellerOrigin}/seller`)
        }

        // Startup Only -> Dashboard
        if (roles.hasWorkspace) {
            return createRedirect(`${appOrigin}/dashboard`)
        }

        // Fallback
        return createRedirect(`${origin}/onboarding`)

    } catch (error) {
        console.error('[Auth Callback] Unexpected error:', error)
        return createRedirect(`${origin}/login?error=unexpected_error`)
    }
}
