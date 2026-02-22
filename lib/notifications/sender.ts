/**
 * Email sender with logging
 *
 * Wraps sendEmail() from lib/email.ts and logs every send attempt
 * into NotificationLog for audit trail.
 */

import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { nanoid } from 'nanoid'

interface SendNotificationEmailParams {
  userId: string
  toEmail: string
  category: string
  subject: string
  html: string
  text: string
  unsubscribeUrl?: string
}

/**
 * Send a notification email and log the result.
 * Never throws — catches all errors and logs them.
 */
export async function sendNotificationEmail(params: SendNotificationEmailParams) {
  const { userId, toEmail, category, subject, html, text, unsubscribeUrl } = params

  try {
    // Build headers for List-Unsubscribe (1-click unsubscribe compliance)
    const headers: Record<string, string> = {}
    if (unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }

    const result = await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      headers,
    })

    // Log the send attempt
    await prisma.notificationLog.create({
      data: {
        id: nanoid(),
        user_id: userId,
        to_email: toEmail,
        category,
        subject,
        status: result.success ? 'sent' : 'failed',
        error: result.error ?? null,
        metadata: { unsubscribeUrl: unsubscribeUrl ?? null },
      },
    }).catch(logErr => {
      console.error('[Notifications] Failed to log notification:', logErr)
    })

    if (!result.success) {
      console.error(`[Notifications] Failed to send ${category} to ${toEmail}:`, result.error)
    }

    return result
  } catch (err) {
    console.error(`[Notifications] Error sending ${category} to ${toEmail}:`, err)

    // Still try to log the failure
    await prisma.notificationLog.create({
      data: {
        id: nanoid(),
        user_id: userId,
        to_email: toEmail,
        category,
        subject,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    }).catch(() => { /* best effort */ })

    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Ensure a seller has an unsubscribe token (lazy generation).
 */
export async function ensureUnsubscribeToken(sellerId: string): Promise<string> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { unsubscribe_token: true },
  })

  if (seller?.unsubscribe_token) return seller.unsubscribe_token

  const token = nanoid(32)
  await prisma.seller.update({
    where: { id: sellerId },
    data: { unsubscribe_token: token },
  })
  return token
}
