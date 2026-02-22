import type { NotificationLocale } from '../locale'
import { renderBaseHtml, formatAmount } from './base'

const STRINGS = {
  title: {
    fr: 'Commission annulée',
    en: 'Commission Reversed',
    es: 'Comisión anulada',
  },
  body: {
    fr: (amount: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Une commission de <strong style="color: #171717;">${amount}</strong> sur la mission <strong style="color: #171717;">${mission}</strong> a été annulée suite à un remboursement.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Votre solde a été mis à jour en conséquence.
      </p>`,
    en: (amount: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        A commission of <strong style="color: #171717;">${amount}</strong> on mission <strong style="color: #171717;">${mission}</strong> has been reversed due to a refund.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Your balance has been updated accordingly.
      </p>`,
    es: (amount: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Una comisión de <strong style="color: #171717;">${amount}</strong> en la misión <strong style="color: #171717;">${mission}</strong> ha sido anulada por un reembolso.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Tu saldo ha sido actualizado.
      </p>`,
  },
  cta: {
    fr: 'Voir mon wallet',
    en: 'View My Wallet',
    es: 'Ver mi billetera',
  },
  plainText: {
    fr: (amount: string, mission: string) =>
      `Commission de ${amount} sur "${mission}" annulée suite à un remboursement.`,
    en: (amount: string, mission: string) =>
      `Commission of ${amount} on "${mission}" reversed due to a refund.`,
    es: (amount: string, mission: string) =>
      `Comisión de ${amount} en "${mission}" anulada por un reembolso.`,
  },
}

export interface ClawbackData {
  amountCents: number
  currency?: string
  missionTitle: string
}

export function renderClawback(locale: NotificationLocale, data: ClawbackData, unsubscribeUrl?: string) {
  const amount = formatAmount(data.amountCents, data.currency)

  return {
    subject: `${STRINGS.title[locale]} — ${amount}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '⚠️',
      bodyHtml: STRINGS.body[locale](amount, data.missionTitle),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/seller/wallet`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](amount, data.missionTitle),
  }
}
