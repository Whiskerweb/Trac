'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

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

    const { error } = await supabase.auth.signInWithPassword({
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

    revalidatePath('/', 'layout')
    redirect('/dashboard')
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
    revalidatePath('/', 'layout')

    // Redirect to onboarding to create workspace
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
