import { createClient } from '@/utils/supabase/server'

export interface CurrentUser {
    userId: string
    email: string
    role: 'STARTUP' | 'AFFILIATE' | null
}

/**
 * Get the current authenticated user from Supabase
 * Returns user info or null if not authenticated
 * 
 * Note: Role is fetched from user_metadata or defaults based on context.
 * For a proper role system, you should store roles in a database table.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    // Get role from user metadata (set during signup or in Supabase dashboard)
    // Default to STARTUP if not set
    const role = (user.user_metadata?.role as 'STARTUP' | 'AFFILIATE') || 'STARTUP'

    return {
        userId: user.id,
        email: user.email || '',
        role: role,
    }
}
