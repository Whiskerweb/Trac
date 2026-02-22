import type { NotificationLocale } from '../locale'
import { renderBaseHtml, formatAmount } from './base'

const STRINGS = {
  title: {
    fr: 'Commissions à payer',
    en: 'Commissions Ready to Pay',
    es: 'Comisiones listas para pagar',
  },
  body: {
    fr: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} commission${count > 1 ? 's' : ''}</strong> d'un total de <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'sont' : 'est'} en attente de paiement.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Ces commissions ont passé la période de validation et sont prêtes à être payées à vos sellers.
      </p>`,
    en: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} commission${count > 1 ? 's' : ''}</strong> totaling <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'are' : 'is'} ready for payment.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        These commissions have passed the hold period and are ready to be paid to your sellers.
      </p>`,
    es: (count: number, total: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${count} comisión${count > 1 ? 'es' : ''}</strong> por un total de <strong style="color: #171717;">${total}</strong> ${count > 1 ? 'están listas' : 'está lista'} para pago.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Estas comisiones han pasado el período de espera y están listas para pagar a tus sellers.
      </p>`,
  },
  cta: {
    fr: 'Payer les commissions',
    en: 'Pay Commissions',
    es: 'Pagar comisiones',
  },
  plainText: {
    fr: (count: number, total: string) =>
      `${count} commission(s) d'un total de ${total} sont prêtes à être payées.`,
    en: (count: number, total: string) =>
      `${count} commission(s) totaling ${total} are ready for payment.`,
    es: (count: number, total: string) =>
      `${count} comisión(es) por un total de ${total} están listas para pago.`,
  },
}

export interface CommissionsReadyData {
  count: number
  totalCents: number
  currency?: string
}

export function renderCommissionsReady(locale: NotificationLocale, data: CommissionsReadyData, unsubscribeUrl?: string) {
  const total = formatAmount(data.totalCents, data.currency)

  return {
    subject: `${STRINGS.title[locale]} — ${total}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '📊',
      bodyHtml: STRINGS.body[locale](data.count, total),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/dashboard/commissions`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](data.count, total),
  }
}
