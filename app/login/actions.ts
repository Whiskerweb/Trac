'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { claimPartners } from '@/app/actions/partners'
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
 * - If hasWorkspace && hasPartner → /auth/choice (let user pick)
 * - If hasWorkspace only → /dashboard
 * - If hasPartner only → /partner
 * - If neither → /onboarding
 */
async function getAuthRedirectPath(userId: string): Promise<string> {
    const roles = await getUserRoles(userId)

    if (!roles) {
        return '/onboarding'
    }

    if (roles.hasWorkspace && roles.hasPartner) {
        // Dual identity - show choice page
        return '/auth/choice'
    }

    if (roles.hasWorkspace) {
        return '/dashboard'
    }

    if (roles.hasPartner) {
        return '/partner'
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
    // SHADOW PARTNER CLAIM (Dub.co Style)
    // =============================================
    if (data.user) {
        const claimed = await claimPartners(data.user.id, email)
        if (claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow partners for ${email}`)
        }
    }

    revalidatePath('/', 'layout')

    // =============================================
    // ROLE-BASED ROUTING
    // =============================================
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

    console.log('[Auth] ✅ Signup success for:', email)

    // =============================================
    // SHADOW PARTNER CLAIM (Dub.co Style)
    // =============================================
    if (data.user) {
        const claimed = await claimPartners(data.user.id, email)
        if (claimed.claimed > 0) {
            console.log(`[Auth] ✨ Claimed ${claimed.claimed} shadow partners for ${email}`)
        }
    }

    revalidatePath('/', 'layout')

    // =============================================
    // ROLE-BASED ROUTING
    // =============================================
    // If user had shadow partners, they might already have a role
    const redirectPath = await getAuthRedirectPath(data.user!.id)
    redirect(redirectPath)
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

