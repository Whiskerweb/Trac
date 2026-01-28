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
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
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
        return '/dashboard'
    }

    if (roles.hasSeller) {
        return '/seller'
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
        redirect('/seller')
    }

    // If user explicitly chose "Startup" and HAS workspace -> Go to /dashboard
    if (roleIntent === 'startup' && userRoles?.hasWorkspace) {
        redirect('/dashboard')
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

    const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    })

    if (error) {
        // Map Supabase errors to user-friendly messages
        if (error.message.includes('User already registered')) {
            return { error: 'Cette adresse email est déjà utilisée' }
        }
        if (error.message.includes('Password should be')) {
            return { error: 'Le mot de passe doit contenir au moins 6 caractères' }
        }
        return { error: error.message }
    }

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
        return { error: 'Cette adresse email est déjà utilisée' }
    }

    const role = String(formData.get('role') || 'startup')

    console.log('[Auth] ✅ Signup success for:', email, '- Role:', role)

    // =============================================
    // SELLER AUTO-CREATION (Split Flow)
    // =============================================
    if (data.user && role === 'seller') {
        const { createGlobalSeller } = await import('@/app/actions/sellers')
        const result = await createGlobalSeller({
            userId: data.user.id,
            email: data.user.email || email,
            name: name
        })

        if (!result.success) {
            console.error('[Auth] ❌ Failed to create seller:', result.error)
            return { error: 'Erreur lors de la création du compte seller' }
        }

        console.log('[Auth] 🤝 Auto-created Global Seller for new user')

        // =============================================
        // SHADOW SELLER CLAIM (Traaaction Style)
        // =============================================
        const claimed = await claimSellers(data.user.id, email)
        if (claimed.success && claimed.claimed && claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow sellers for ${email}`)
        }

        revalidatePath('/', 'layout')
        redirect('/seller/onboarding')
    }

    // =============================================
    // STARTUP FLOW - SHADOW SELLER CLAIM
    // =============================================
    if (data.user) {
        const claimed = await claimSellers(data.user.id, email)
        if (claimed.success && claimed.claimed && claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow sellers for ${email}`)
        }
    }

    revalidatePath('/', 'layout')

    // =============================================
    // STARTUP ONBOARDING
    // =============================================
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

