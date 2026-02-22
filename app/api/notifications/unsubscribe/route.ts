import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/lib/notifications/preferences'
import { NOTIFICATION_CATEGORIES } from '@/lib/notifications/categories'

/**
 * GET /api/notifications/unsubscribe?token=xxx&category=yyy
 *
 * 1-click unsubscribe from email notifications.
 * Renders a simple HTML confirmation page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get('token')
  const category = searchParams.get('category')

  if (!token || !category) {
    return renderPage('Error', 'Missing token or category parameter.', false)
  }

  if (!NOTIFICATION_CATEGORIES[category]) {
    return renderPage('Error', 'Invalid notification category.', false)
  }

  const success = await unsubscribeByToken(token, category)

  if (success) {
    return renderPage(
      'Unsubscribed',
      `You have been unsubscribed from "${NOTIFICATION_CATEGORIES[category].label}" notifications. You can re-enable them in your settings at any time.`,
      true
    )
  }

  return renderPage('Error', 'Invalid or expired unsubscribe link.', false)
}

function renderPage(title: string, message: string, success: boolean) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Traaaction</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
  <div style="max-width: 420px; padding: 40px; background: #ffffff; border-radius: 16px; text-align: center;">
    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${success ? '#8b5cf6' : '#ef4444'}, ${success ? '#a855f7' : '#f87171'}); border-radius: 12px; margin: 0 auto 20px; line-height: 48px;">
      <span style="font-size: 24px;">${success ? '✅' : '❌'}</span>
    </div>
    <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #171717;">${title}</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: #525252; line-height: 1.6;">${message}</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
      Go to Traaaction
    </a>
    <p style="margin: 24px 0 0; font-size: 12px; color: #a3a3a3;">Traaaction &bull; Affiliate Marketing Platform</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
