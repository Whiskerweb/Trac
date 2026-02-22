/**
 * Base email template layout
 *
 * Shared header, footer, unsubscribe link for all notification emails.
 * Uses inline styles for email client compatibility.
 */

import type { NotificationLocale } from '../locale'

const STRINGS = {
  unsubscribe: {
    fr: 'Se désabonner de ces notifications',
    en: 'Unsubscribe from these notifications',
    es: 'Cancelar suscripción a estas notificaciones',
  },
  footer: {
    fr: 'Vous recevez cet email car vous avez un compte Traaaction.',
    en: 'You are receiving this email because you have a Traaaction account.',
    es: 'Recibe este correo porque tiene una cuenta Traaaction.',
  },
  viewDashboard: {
    fr: 'Voir le tableau de bord',
    en: 'View Dashboard',
    es: 'Ver panel',
  },
}

interface BaseTemplateParams {
  locale: NotificationLocale
  title: string
  preheader?: string
  emoji?: string
  bodyHtml: string
  ctaUrl?: string
  ctaLabel?: string
  unsubscribeUrl?: string
}

/**
 * Render the full HTML email wrapping content in the Traaaction brand layout.
 */
export function renderBaseHtml(params: BaseTemplateParams): string {
  const {
    locale,
    title,
    preheader,
    emoji = '📬',
    bodyHtml,
    ctaUrl,
    ctaLabel,
    unsubscribeUrl,
  } = params

  const ctaButton = ctaUrl
    ? `<tr>
        <td style="padding: 0 40px 32px;">
          <a href="${ctaUrl}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
            ${ctaLabel || STRINGS.viewDashboard[locale]}
          </a>
        </td>
      </tr>`
    : ''

  const unsubscribeLink = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color: #a3a3a3; text-decoration: underline;">${STRINGS.unsubscribe[locale]}</a>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<span style="display:none;font-size:1px;color:#fafafa;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px; text-align: center;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 12px; margin: 0 auto 20px; line-height: 48px; text-align: center;">
                <span style="font-size: 24px;">${emoji}</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #171717;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 24px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- CTA -->
          ${ctaButton}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f5f5f5;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #a3a3a3; text-align: center;">
                ${STRINGS.footer[locale]}
              </p>
              ${unsubscribeLink ? `<p style="margin: 0; font-size: 12px; text-align: center;">${unsubscribeLink}</p>` : ''}
            </td>
          </tr>
        </table>

        <!-- Brand footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                Traaaction &bull; Affiliate Marketing Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Format a currency amount from cents to display string.
 */
export function formatAmount(cents: number, currency = 'EUR'): string {
  const value = (cents / 100).toFixed(2)
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency
  return `${value}${symbol}`
}
