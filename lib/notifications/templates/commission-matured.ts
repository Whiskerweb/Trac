import type { NotificationLocale } from '../locale'
import { renderBaseHtml, formatAmount } from './base'

const STRINGS = {
  title: {
    fr: 'Commissions disponibles',
    en: 'Commissions Available',
    es: 'Comisiones disponibles',
  },
  body: {
    fr: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} commission${count > 1 ? 's' : ''}</strong> d'un total de <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'sont maintenant disponibles' : 'est maintenant disponible'} pour paiement.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        La période de validation est terminée. Votre paiement sera traité lors du prochain cycle.
      </p>`,
    en: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} commission${count > 1 ? 's' : ''}</strong> totaling <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'are' : 'is'} now available for payout.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        The hold period has ended. Your payout will be processed in the next cycle.
      </p>`,
    es: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} comisión${count > 1 ? 'es' : ''}</strong> por un total de <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'están ahora disponibles' : 'está ahora disponible'} para pago.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        El período de espera ha terminado. Tu pago será procesado en el próximo ciclo.
      </p>`,
  },
  cta: {
    fr: 'Voir mon wallet',
    en: 'View My Wallet',
    es: 'Ver mi billetera',
  },
  plainText: {
    fr: (count: number, total: string) =>
      `${count} commission(s) d'un total de ${total} sont maintenant disponibles pour paiement.`,
    en: (count: number, total: string) =>
      `${count} commission(s) totaling ${total} are now available for payout.`,
    es: (count: number, total: string) =>
      `${count} comisión(es) por un total de ${total} están ahora disponibles para pago.`,
  },
}

export interface CommissionMaturedData {
  count: number
  totalCents: number
  currency?: string
}

export function renderCommissionMatured(locale: NotificationLocale, data: CommissionMaturedData, unsubscribeUrl?: string) {
  const total = formatAmount(data.totalCents, data.currency)

  return {
    subject: `${STRINGS.title[locale]} — ${total}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '✅',
      bodyHtml: STRINGS.body[locale](data.count, total),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/seller/wallet`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](data.count, total),
  }
}
