/**
 * Notification category definitions
 *
 * All Phase 1 categories are transactional (RGPD: no consent needed).
 * Marketing categories (Phase 3) will require explicit opt-in.
 */

export type NotificationType = 'transactional' | 'marketing'
export type NotificationRecipient = 'seller' | 'startup' | 'both'

export interface NotificationCategory {
  id: string
  label: string
  type: NotificationType
  defaultEnabled: boolean
  recipient: NotificationRecipient
}

export const NOTIFICATION_CATEGORIES: Record<string, NotificationCategory> = {
  commission_earned: {
    id: 'commission_earned',
    label: 'New commission earned',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'seller',
  },
  commission_matured: {
    id: 'commission_matured',
    label: 'Commission matured',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'seller',
  },
  payout_processed: {
    id: 'payout_processed',
    label: 'Payout processed',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'seller',
  },
  enrollment_status: {
    id: 'enrollment_status',
    label: 'Enrollment approved/rejected',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'seller',
  },
  new_message: {
    id: 'new_message',
    label: 'New message received',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'both',
  },
  clawback: {
    id: 'clawback',
    label: 'Commission reversed (refund)',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'seller',
  },
  new_enrollment: {
    id: 'new_enrollment',
    label: 'New seller enrolled',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'startup',
  },
  enrollment_request: {
    id: 'enrollment_request',
    label: 'Enrollment request (private mission)',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'startup',
  },
  commissions_ready: {
    id: 'commissions_ready',
    label: 'Commissions ready to pay',
    type: 'transactional',
    defaultEnabled: true,
    recipient: 'startup',
  },
} as const

/** Categories visible in seller settings */
export const SELLER_CATEGORIES = Object.values(NOTIFICATION_CATEGORIES).filter(
  c => c.recipient === 'seller' || c.recipient === 'both'
)

/** Categories visible in startup settings */
export const STARTUP_CATEGORIES = Object.values(NOTIFICATION_CATEGORIES).filter(
  c => c.recipient === 'startup' || c.recipient === 'both'
)
