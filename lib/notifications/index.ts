/**
 * Notification System — Entry Point
 *
 * notify()      — Async, awaitable. For use in crons or when you need the result.
 * notifyAsync() — Fire-and-forget. For use in server actions / webhooks.
 */

import { prisma } from '@/lib/db'
import { isNotificationEnabled } from './preferences'
import { sendNotificationEmail, ensureUnsubscribeToken } from './sender'
import { getSellerLocale, getStartupLocale } from './locale'
import type { NotificationLocale } from './locale'

// Template renderers
import { renderCommissionEarned, type CommissionEarnedData } from './templates/commission-earned'
import { renderCommissionMatured, type CommissionMaturedData } from './templates/commission-matured'
import { renderPayoutProcessed, type PayoutProcessedData } from './templates/payout-processed'
import { renderEnrollmentStatus, type EnrollmentStatusData } from './templates/enrollment-status'
import { renderNewMessage, type NewMessageData } from './templates/new-message'
import { renderClawback, type ClawbackData } from './templates/clawback'
import { renderNewEnrollment, type NewEnrollmentData } from './templates/new-enrollment'
import { renderEnrollmentRequest, type EnrollmentRequestData } from './templates/enrollment-request'
import { renderCommissionsReady, type CommissionsReadyData } from './templates/commissions-ready'

// =============================================
// Types
// =============================================

type NotifyParams =
  | { category: 'commission_earned'; sellerId: string; data: CommissionEarnedData }
  | { category: 'commission_matured'; sellerId: string; data: CommissionMaturedData }
  | { category: 'payout_processed'; sellerId: string; data: PayoutProcessedData }
  | { category: 'enrollment_status'; sellerId: string; data: EnrollmentStatusData }
  | { category: 'new_message'; userId: string; email: string; data: NewMessageData; sellerId?: string }
  | { category: 'clawback'; sellerId: string; data: ClawbackData }
  | { category: 'new_enrollment'; workspaceId: string; data: NewEnrollmentData }
  | { category: 'enrollment_request'; workspaceId: string; data: EnrollmentRequestData }
  | { category: 'commissions_ready'; workspaceId: string; data: CommissionsReadyData }

// =============================================
// Anti-spam dedup (in-memory, per-process)
// =============================================

const recentSends = new Map<string, number>()
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function isDuplicate(userId: string, category: string): boolean {
  const key = `${userId}:${category}`
  const lastSent = recentSends.get(key)
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return true
  }
  recentSends.set(key, Date.now())
  return false
}

// Periodic cleanup of old entries (every 10 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of recentSends) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentSends.delete(key)
    }
  }
}, 10 * 60 * 1000).unref?.()

// =============================================
// Resolvers — Get userId + email + locale
// =============================================

async function resolveSellerInfo(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { user_id: true, email: true, name: true, id: true },
  })
  if (!seller?.user_id || !seller.email) return null

  const locale = await getSellerLocale(sellerId)
  const token = await ensureUnsubscribeToken(sellerId)

  return { userId: seller.user_id, email: seller.email, name: seller.name, locale, sellerId, token }
}

async function resolveStartupInfo(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner_id: true, name: true },
  })
  if (!workspace?.owner_id) return null

  // Get owner's email from Supabase user or workspace member
  const member = await prisma.workspaceMember.findFirst({
    where: { workspace_id: workspaceId, user_id: workspace.owner_id },
  })
  if (!member) return null

  // We need the email — fetch from a seller record or use a known lookup
  const seller = await prisma.seller.findFirst({
    where: { user_id: workspace.owner_id },
    select: { email: true },
  })

  // Try workspace-level: look up via the auth user's metadata
  // Fallback: query by user_id in the User table (via Supabase) — not available in Prisma
  // Use seller email if they have a seller account, otherwise skip
  let email = seller?.email
  if (!email) {
    // Look up from workspace members who have seller records
    const anyMemberSeller = await prisma.seller.findFirst({
      where: { user_id: workspace.owner_id },
      select: { email: true },
    })
    email = anyMemberSeller?.email
  }
  if (!email) return null

  const locale = await getStartupLocale(workspaceId)

  return { userId: workspace.owner_id, email, locale, workspaceId }
}

// =============================================
// Template Renderer
// =============================================

function renderTemplate(
  category: string,
  locale: NotificationLocale,
  data: unknown,
  unsubscribeUrl?: string
): { subject: string; html: string; text: string } | null {
  switch (category) {
    case 'commission_earned':
      return renderCommissionEarned(locale, data as CommissionEarnedData, unsubscribeUrl)
    case 'commission_matured':
      return renderCommissionMatured(locale, data as CommissionMaturedData, unsubscribeUrl)
    case 'payout_processed':
      return renderPayoutProcessed(locale, data as PayoutProcessedData, unsubscribeUrl)
    case 'enrollment_status':
      return renderEnrollmentStatus(locale, data as EnrollmentStatusData, unsubscribeUrl)
    case 'new_message':
      return renderNewMessage(locale, data as NewMessageData, unsubscribeUrl)
    case 'clawback':
      return renderClawback(locale, data as ClawbackData, unsubscribeUrl)
    case 'new_enrollment':
      return renderNewEnrollment(locale, data as NewEnrollmentData, unsubscribeUrl)
    case 'enrollment_request':
      return renderEnrollmentRequest(locale, data as EnrollmentRequestData, unsubscribeUrl)
    case 'commissions_ready':
      return renderCommissionsReady(locale, data as CommissionsReadyData, unsubscribeUrl)
    default:
      return null
  }
}

// =============================================
// Main notify() function
// =============================================

/**
 * Send a notification email. Never throws.
 *
 * 1. Resolve recipient info (email, locale)
 * 2. Check preferences (opt-out → skip)
 * 3. Check dedup (anti-spam for messages)
 * 4. Render template
 * 5. Send via Resend + log
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    const { category, data } = params
    let userId: string
    let email: string
    let locale: NotificationLocale
    let unsubscribeUrl: string | undefined

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'

    // Resolve recipient based on category type
    if ('sellerId' in params && params.sellerId) {
      const info = await resolveSellerInfo(params.sellerId)
      if (!info) {
        console.warn(`[Notifications] Could not resolve seller ${params.sellerId} for ${category}`)
        return
      }
      userId = info.userId
      email = info.email
      locale = info.locale
      unsubscribeUrl = `${appUrl}/api/notifications/unsubscribe?token=${info.token}&category=${category}`
    } else if ('workspaceId' in params) {
      const info = await resolveStartupInfo(params.workspaceId)
      if (!info) {
        console.warn(`[Notifications] Could not resolve startup for workspace ${params.workspaceId} for ${category}`)
        return
      }
      userId = info.userId
      email = info.email
      locale = info.locale
      // Startups use JWT-based unsubscribe (simplified: link to settings)
      unsubscribeUrl = `${appUrl}/dashboard/settings?tab=notifications`
    } else if ('userId' in params) {
      // Direct userId + email (for new_message to startup)
      userId = params.userId
      email = params.email
      locale = 'en' // Default for direct userId
      if (params.sellerId) {
        const sellerLocale = await getSellerLocale(params.sellerId)
        locale = sellerLocale
        const token = await ensureUnsubscribeToken(params.sellerId)
        unsubscribeUrl = `${appUrl}/api/notifications/unsubscribe?token=${token}&category=${category}`
      } else {
        unsubscribeUrl = `${appUrl}/dashboard/settings?tab=notifications`
      }
    } else {
      return
    }

    // Check preferences
    const enabled = await isNotificationEnabled(userId, category)
    if (!enabled) {
      // Log as skipped
      await prisma.notificationLog.create({
        data: {
          user_id: userId,
          to_email: email,
          category,
          subject: `[SKIPPED] ${category}`,
          status: 'skipped',
        },
      }).catch(() => { /* best effort */ })
      return
    }

    // Anti-spam dedup for messages (5 min window)
    if (category === 'new_message' && isDuplicate(userId, category)) {
      return
    }

    // Render template
    const rendered = renderTemplate(category, locale, data, unsubscribeUrl)
    if (!rendered) {
      console.error(`[Notifications] Unknown category: ${category}`)
      return
    }

    // Send
    await sendNotificationEmail({
      userId,
      toEmail: email,
      category,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      unsubscribeUrl,
    })

  } catch (err) {
    console.error('[Notifications] Unexpected error in notify():', err)
  }
}

/**
 * Fire-and-forget notification. Does not await the result.
 * Same pattern as Tinybird analytics logging.
 */
export function notifyAsync(params: NotifyParams): void {
  notify(params).catch(err => {
    console.error('[Notifications] notifyAsync error:', err)
  })
}

// Re-export types for convenience
export type {
  CommissionEarnedData,
  CommissionMaturedData,
  PayoutProcessedData,
  EnrollmentStatusData,
  NewMessageData,
  ClawbackData,
  NewEnrollmentData,
  EnrollmentRequestData,
  CommissionsReadyData,
}
