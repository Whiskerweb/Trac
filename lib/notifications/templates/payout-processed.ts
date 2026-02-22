import type { NotificationLocale } from '../locale'
import { renderBaseHtml, formatAmount } from './base'

const STRINGS = {
  title: {
    fr: 'Paiement effectué',
    en: 'Payout Processed',
    es: 'Pago procesado',
  },
  body: {
    fr: (amount: string, method: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Votre paiement de <strong style="color: #171717;">${amount}</strong> a été traité avec succès via <strong style="color: #171717;">${method}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Le montant sera crédité sur votre compte sous 1 à 3 jours ouvrés.
      </p>`,
    en: (amount: string, method: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Your payout of <strong style="color: #171717;">${amount}</strong> has been processed via <strong style="color: #171717;">${method}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        The amount will be credited to your account within 1-3 business days.
      </p>`,
    es: (amount: string, method: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Tu pago de <strong style="color: #171717;">${amount}</strong> ha sido procesado a través de <strong style="color: #171717;">${method}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        El monto será acreditado en tu cuenta en 1-3 días hábiles.
      </p>`,
  },
  cta: {
    fr: 'Voir mes paiements',
    en: 'View My Payouts',
    es: 'Ver mis pagos',
  },
  plainText: {
    fr: (amount: string, method: string) =>
      `Votre paiement de ${amount} a été traité via ${method}.`,
    en: (amount: string, method: string) =>
      `Your payout of ${amount} has been processed via ${method}.`,
    es: (amount: string, method: string) =>
      `Tu pago de ${amount} ha sido procesado a través de ${method}.`,
  },
}

const METHOD_LABELS: Record<string, string> = {
  STRIPE_CONNECT: 'Stripe',
  PAYPAL: 'PayPal',
  IBAN: 'IBAN/SEPA',
  PLATFORM: 'Wallet',
}

export interface PayoutProcessedData {
  amountCents: number
  currency?: string
  payoutMethod: string
}

export function renderPayoutProcessed(locale: NotificationLocale, data: PayoutProcessedData, unsubscribeUrl?: string) {
  const amount = formatAmount(data.amountCents, data.currency)
  const method = METHOD_LABELS[data.payoutMethod] || data.payoutMethod

  return {
    subject: `${STRINGS.title[locale]} — ${amount}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '💸',
      bodyHtml: STRINGS.body[locale](amount, method),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/seller/payouts`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](amount, method),
  }
}
