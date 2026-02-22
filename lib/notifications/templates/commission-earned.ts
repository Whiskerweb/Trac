import type { NotificationLocale } from '../locale'
import { renderBaseHtml, formatAmount } from './base'

const STRINGS = {
  title: {
    fr: 'Nouvelle commission',
    en: 'New Commission Earned',
    es: 'Nueva comisión ganada',
  },
  preheader: {
    fr: (amount: string) => `Vous avez gagné ${amount} de commission`,
    en: (amount: string) => `You earned ${amount} in commission`,
    es: (amount: string) => `Has ganado ${amount} de comisión`,
  },
  body: {
    fr: (amount: string, mission: string, source: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Vous avez gagné une nouvelle commission de <strong style="color: #171717;">${amount}</strong> sur la mission <strong style="color: #171717;">${mission}</strong>.
      </p>
      <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 500;">Type : ${source}</p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Cette commission est en attente de validation. Vous serez notifié quand elle sera disponible.
      </p>`,
    en: (amount: string, mission: string, source: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        You earned a new commission of <strong style="color: #171717;">${amount}</strong> on mission <strong style="color: #171717;">${mission}</strong>.
      </p>
      <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 500;">Type: ${source}</p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        This commission is pending validation. You'll be notified when it's available.
      </p>`,
    es: (amount: string, mission: string, source: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Has ganado una nueva comisión de <strong style="color: #171717;">${amount}</strong> en la misión <strong style="color: #171717;">${mission}</strong>.
      </p>
      <div style="background: #f5f3ff; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 13px; color: #7c3aed; font-weight: 500;">Tipo: ${source}</p>
      </div>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Esta comisión está pendiente de validación. Se te notificará cuando esté disponible.
      </p>`,
  },
  cta: {
    fr: 'Voir mes commissions',
    en: 'View My Commissions',
    es: 'Ver mis comisiones',
  },
  plainText: {
    fr: (amount: string, mission: string, source: string) =>
      `Nouvelle commission de ${amount} sur la mission "${mission}" (${source}). Connectez-vous pour voir les détails.`,
    en: (amount: string, mission: string, source: string) =>
      `New commission of ${amount} on mission "${mission}" (${source}). Log in to view details.`,
    es: (amount: string, mission: string, source: string) =>
      `Nueva comisión de ${amount} en la misión "${mission}" (${source}). Inicia sesión para ver los detalles.`,
  },
}

export interface CommissionEarnedData {
  amountCents: number
  currency?: string
  missionTitle: string
  commissionSource: string // SALE | LEAD | RECURRING
}

export function renderCommissionEarned(locale: NotificationLocale, data: CommissionEarnedData, unsubscribeUrl?: string) {
  const amount = formatAmount(data.amountCents, data.currency)
  const source = data.commissionSource

  return {
    subject: `${STRINGS.title[locale]} — ${amount}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      preheader: STRINGS.preheader[locale](amount),
      emoji: '💰',
      bodyHtml: STRINGS.body[locale](amount, data.missionTitle, source),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/seller`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](amount, data.missionTitle, source),
  }
}
