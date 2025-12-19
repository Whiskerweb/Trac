'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    // DEBUG: Log form data
    console.log('🔍 DEBUG LOGIN - Form Data:', Object.fromEntries(formData))

    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    console.log('🔍 DEBUG LOGIN - Email:', email, '| Password length:', password.length)

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.log('❌ LOGIN ERROR:', error.message)
        return { error: error.message }
    }

    console.log('✅ LOGIN SUCCESS for:', email)
    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    // DEBUG: Log form data
    console.log('🔍 DEBUG SIGNUP - Form Data:', Object.fromEntries(formData))

    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const name = String(formData.get('name') || '').trim()

    console.log('🔍 DEBUG SIGNUP - Email:', email, '| Name:', name, '| Password length:', password.length)

    if (!email || !password) {
        return { error: 'Email and password are required' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
            },
        },
    })

    if (error) {
        console.log('❌ SIGNUP ERROR:', error.message)
        return { error: error.message }
    }

    console.log('✅ SIGNUP SUCCESS for:', email)
    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
