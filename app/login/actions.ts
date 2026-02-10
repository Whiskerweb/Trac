'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { claimSellers } from '@/app/actions/sellers'
import { getUserRoles } from '@/app/actions/get-user-roles'

// =============================================
// VALIDATION SCHEMAS
// =============================================

const loginSchema = z.object({
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
})

const signupSchema = z.object({
    email: z.string().email('Adresse email invalide'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
})

// =============================================
// ROLE-BASED REDIRECT LOGIC
// =============================================

/**
 * Determines where to redirect user after authentication based on their roles
 *
 * - If hasWorkspace && hasSeller → /auth/choice (let user pick)
 * - If hasWorkspace only → /dashboard
 * - If hasSeller only → /seller
 * - If neither → /onboarding
 */
// In production, redirect directly to the correct subdomain to avoid CORS on RSC fetches
const isProduction = process.env.NODE_ENV === 'production'
const SELLER_BASE = isProduction ? 'https://seller.traaaction.com' : ''
const APP_BASE = isProduction ? 'https://app.traaaction.com' : ''

async function getAuthRedirectPath(userId: string): Promise<string> {
    const roles = await getUserRoles(userId)

    if (!roles) {
        return '/onboarding'
    }

    if (roles.hasWorkspace && roles.hasSeller) {
        // Dual identity - show choice page
        return '/auth/choice'
    }

    if (roles.hasWorkspace) {
        return `${APP_BASE}/dashboard`
    }

    if (roles.hasSeller) {
        return `${SELLER_BASE}/seller`
    }

    return '/onboarding'
}

// =============================================
// LOGIN ACTION
// =============================================

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    // Validate input
    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
        return { error: validation.error.issues[0].message }
    }

    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Map Supabase errors to user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'Email ou mot de passe incorrect' }
        }
        if (error.message.includes('Email not confirmed')) {
            return { error: 'Veuillez confirmer votre email avant de vous connecter' }
        }
        return { error: error.message }
    }

    // =============================================
    // SHADOW SELLER CLAIM (Traaaction Style)
    // =============================================
    if (data.user) {
        const claimed = await claimSellers(data.user.id, email)
        if (claimed.success && claimed.claimed && claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow sellers for ${email}`)
        }
    }

    revalidatePath('/', 'layout')

    // =============================================
    // ROLE-BASED ROUTING
    // =============================================
    // =============================================
    // INTENT-BASED ROUTING
    // =============================================
    const roleIntent = String(formData.get('role') || 'startup')
    const userRoles = await getUserRoles(data.user!.id)

    // If user explicitly chose "Seller" and HAS seller role -> Go to /seller
    if (roleIntent === 'seller' && userRoles?.hasSeller) {
        redirect(`${SELLER_BASE}/seller`)
    }

    // If user explicitly chose "Seller" but has NO seller record -> create one & go to onboarding
    if (roleIntent === 'seller' && !userRoles?.hasSeller) {
        const { createGlobalSeller } = await import('@/app/actions/sellers')
        const result = await createGlobalSeller({
            userId: data.user!.id,
            email: data.user!.email || email,
            name: data.user!.user_metadata?.full_name || data.user!.user_metadata?.name || ''
        })
        if (result.success) {
            console.log('[Auth] Auto-created seller for login with roleIntent=seller')
            redirect(`${SELLER_BASE}/seller/onboarding`)
        }
        // If creation fails, fall through to smart detection
    }

    // If user explicitly chose "Startup" and HAS workspace -> Go to /dashboard
    if (roleIntent === 'startup' && userRoles?.hasWorkspace) {
        redirect(`${APP_BASE}/dashboard`)
    }

    // Fallback: Use smart detection
    const redirectPath = await getAuthRedirectPath(data.user!.id)
    redirect(redirectPath)
}

// =============================================
// SIGNUP ACTION
// =============================================

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const name = String(formData.get('name') || '').trim()

    // Validate input with Zod
    const validation = signupSchema.safeParse({ email, password, name })
    if (!validation.success) {
        return { error: validation.error.issues[0].message }
    }

    const role = String(formData.get('role') || 'startup')

    // Build the confirmation redirect URL with role
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
    const confirmRedirectUrl = `${siteUrl}/auth/callback?role=${role}`

    const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                role: role, // Store role in user metadata for callback
            },
            emailRedirectTo: confirmRedirectUrl,
        },
    })

    if (error) {
        // Map Supabase errors to user-friendly messages
        if (error.message.includes('User already registered')) {
            return { error: 'This email address is already in use' }
        }
        if (error.message.includes('Password should be')) {
            return { error: 'Password must be at least 6 characters' }
        }
        return { error: error.message }
    }

    // Check if email confirmation is required (duplicate email detection)
    if (data?.user?.identities?.length === 0) {
        return { error: 'This email address is already in use' }
    }

    console.log('[Auth] ✅ Signup initiated for:', email, '- Role:', role)

    // Store role in a cookie as backup for email confirmation callback
    // (Supabase PKCE flow can lose URL query params during redirect)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('trac_signup_role', role, {
        httpOnly: false, // Readable by client-side for cleanup after successful onboarding
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/',
    })

    // =============================================
    // EMAIL CONFIRMATION REQUIRED
    // =============================================
    // Check if email confirmation is enabled in Supabase
    // If user.email_confirmed_at is null, they need to confirm
    if (data.user && !data.user.email_confirmed_at) {
        console.log('[Auth] 📧 Email confirmation required for:', email)
        // Return success with confirmation required flag
        // The UI will show a "check your email" message
        return {
            success: true,
            confirmationRequired: true,
            email: email,
            role: role,
            message: 'Please check your email to confirm your account'
        }
    }

    // =============================================
    // EMAIL ALREADY CONFIRMED (rare case)
    // =============================================
    // If email is already confirmed (e.g., confirmation disabled in Supabase)
    // proceed with account setup

    // SELLER AUTO-CREATION (Split Flow)
    if (data.user && role === 'seller') {
        const { createGlobalSeller } = await import('@/app/actions/sellers')
        const result = await createGlobalSeller({
            userId: data.user.id,
            email: data.user.email || email,
            name: name
        })

        if (!result.success) {
            console.error('[Auth] ❌ Failed to create seller:', result.error)
            return { error: 'Error creating seller account' }
        }

        console.log('[Auth] 🤝 Auto-created Global Seller for new user')

        const claimed = await claimSellers(data.user.id, email)
        if (claimed.success && claimed.claimed && claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow sellers for ${email}`)
        }

        revalidatePath('/', 'layout')
        redirect(`${SELLER_BASE}/seller/onboarding`)
    }

    // STARTUP FLOW
    if (data.user) {
        const claimed = await claimSellers(data.user.id, email)
        if (claimed.success && claimed.claimed && claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow sellers for ${email}`)
        }
    }

    revalidatePath('/', 'layout')
    redirect('/onboarding')
}

// =============================================
// LOGOUT ACTION
// =============================================

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

// =============================================
// RESEND CONFIRMATION EMAIL ACTION
// =============================================

// =============================================
// PASSWORD RESET REQUEST ACTION
// =============================================

export async function requestPasswordReset(email: string) {
    const supabase = await createClient()

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !z.string().email().safeParse(trimmedEmail).success) {
        return { error: 'Please enter a valid email address' }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
    const redirectUrl = `${siteUrl}/auth/callback?next=/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
    })

    if (error) {
        console.error('[Auth] ❌ Password reset request failed:', error.message)
        if (error.message.includes('rate limit')) {
            return { error: 'Please wait a few minutes before requesting another reset email' }
        }
        // Don't reveal if email exists or not for security
        return { success: true }
    }

    console.log('[Auth] 📧 Password reset email sent to:', trimmedEmail)
    // Always return success even if email doesn't exist (security best practice)
    return { success: true }
}

// =============================================
// UPDATE PASSWORD ACTION (for reset flow)
// =============================================

export async function updatePassword(newPassword: string) {
    const supabase = await createClient()

    if (!newPassword || newPassword.length < 6) {
        return { error: 'Password must be at least 6 characters' }
    }

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    })

    if (error) {
        console.error('[Auth] ❌ Password update failed:', error.message)
        if (error.message.includes('same password')) {
            return { error: 'New password must be different from your current password' }
        }
        return { error: 'Failed to update password. Please try again.' }
    }

    console.log('[Auth] ✅ Password updated successfully')
    return { success: true }
}

// =============================================
// RESEND CONFIRMATION EMAIL ACTION
// =============================================

export async function resendConfirmationEmail(email: string, role: string = 'startup') {
    const supabase = await createClient()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.traaaction.com'
    const confirmRedirectUrl = `${siteUrl}/auth/callback?role=${role}`

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: confirmRedirectUrl,
        },
    })

    if (error) {
        console.error('[Auth] ❌ Failed to resend confirmation:', error.message)
        if (error.message.includes('rate limit')) {
            return { error: 'Please wait a few minutes before requesting another email' }
        }
        return { error: 'Failed to resend confirmation email' }
    }

    console.log('[Auth] 📧 Confirmation email resent to:', email)
    return { success: true, message: 'Confirmation email sent' }
}

