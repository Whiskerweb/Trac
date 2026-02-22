/**
 * Notification preferences CRUD
 *
 * Handles checking if a notification is enabled, updating preferences,
 * and RGPD compliance (export/delete).
 */

import { prisma } from '@/lib/db'
import { NOTIFICATION_CATEGORIES } from './categories'

/**
 * Check if a notification category is enabled for a user.
 * Returns the category default if no preference record exists.
 */
export async function isNotificationEnabled(userId: string, category: string): Promise<boolean> {
  const cat = NOTIFICATION_CATEGORIES[category]
  if (!cat) return false

  const pref = await prisma.notificationPreference.findUnique({
    where: { user_id_category: { user_id: userId, category } }
  })

  return pref ? pref.enabled : cat.defaultEnabled
}

/**
 * Get all notification preferences for a user, merging DB records with defaults.
 */
export async function getUserPreferences(userId: string) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { user_id: userId }
  })

  const prefMap = new Map(prefs.map(p => [p.category, p]))

  return Object.values(NOTIFICATION_CATEGORIES).map(cat => {
    const pref = prefMap.get(cat.id)
    return {
      category: cat.id,
      label: cat.label,
      type: cat.type,
      recipient: cat.recipient,
      enabled: pref ? pref.enabled : cat.defaultEnabled,
      consentedAt: pref?.consented_at ?? null,
    }
  })
}

/**
 * Update a single notification preference.
 */
export async function updatePreference(userId: string, category: string, enabled: boolean) {
  const cat = NOTIFICATION_CATEGORIES[category]
  if (!cat) throw new Error(`Unknown notification category: ${category}`)

  return prisma.notificationPreference.upsert({
    where: { user_id_category: { user_id: userId, category } },
    create: {
      user_id: userId,
      category,
      enabled,
      consented_at: cat.type === 'marketing' && enabled ? new Date() : null,
    },
    update: {
      enabled,
      consented_at: cat.type === 'marketing' && enabled ? new Date() : undefined,
    },
  })
}

/**
 * Disable a category via unsubscribe token (1-click unsubscribe from email).
 */
export async function unsubscribeByToken(token: string, category: string): Promise<boolean> {
  const seller = await prisma.seller.findUnique({
    where: { unsubscribe_token: token },
    select: { user_id: true }
  })
  if (!seller?.user_id) return false

  await updatePreference(seller.user_id, category, false)
  return true
}

/**
 * RGPD: Export all notification data for a user.
 */
export async function exportNotificationData(userId: string) {
  const [preferences, logs] = await Promise.all([
    prisma.notificationPreference.findMany({ where: { user_id: userId } }),
    prisma.notificationLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    }),
  ])
  return { preferences, logs }
}

/**
 * RGPD: Delete all notification data for a user.
 */
export async function deleteNotificationData(userId: string) {
  await Promise.all([
    prisma.notificationPreference.deleteMany({ where: { user_id: userId } }),
    prisma.notificationLog.deleteMany({ where: { user_id: userId } }),
  ])
}
