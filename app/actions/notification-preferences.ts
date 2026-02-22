'use server'

import { createClient } from '@/utils/supabase/server'
import { getUserPreferences, updatePreference } from '@/lib/notifications/preferences'
import { NOTIFICATION_CATEGORIES } from '@/lib/notifications/categories'

/**
 * Get the current user's notification preferences (merged with defaults).
 */
export async function getMyNotificationPreferences() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: 'Not authenticated' }

    const preferences = await getUserPreferences(user.id)

    return { success: true as const, data: preferences }
  } catch (error) {
    console.error('[NotificationPrefs] Error getting preferences:', error)
    return { success: false as const, error: 'Failed to get preferences' }
  }
}

/**
 * Toggle a notification category on/off.
 */
export async function updateNotificationPreference(category: string, enabled: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: 'Not authenticated' }

    // Validate category exists
    if (!NOTIFICATION_CATEGORIES[category]) {
      return { success: false as const, error: 'Invalid notification category' }
    }

    await updatePreference(user.id, category, enabled)

    return { success: true as const }
  } catch (error) {
    console.error('[NotificationPrefs] Error updating preference:', error)
    return { success: false as const, error: 'Failed to update preference' }
  }
}
