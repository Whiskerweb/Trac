/**
 * Locale detection for notification emails
 *
 * Re-exports getSellerLocale from org-notifications and adds startup locale detection.
 */

import { prisma } from '@/lib/db'
import { getSellerLocale } from '@/lib/org-notifications'
import type { OrgLocale } from '@/lib/org-notifications'

export type NotificationLocale = OrgLocale // 'fr' | 'en' | 'es'

export { getSellerLocale }

/**
 * Detect startup locale from workspace owner's preference or default to 'en'.
 * Uses the workspace member's locale cookie pattern (stored in next-intl).
 */
export async function getStartupLocale(workspaceId: string): Promise<NotificationLocale> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true }
  })
  if (!workspace) return 'en'

  // Check if owner is also a seller (some users have both roles)
  const seller = await prisma.seller.findFirst({
    where: { user_id: workspace.owner_id },
    select: { id: true }
  })
  if (seller) {
    return getSellerLocale(seller.id)
  }

  return 'en'
}
