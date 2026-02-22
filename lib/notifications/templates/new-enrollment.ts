import type { NotificationLocale } from '../locale'
import { renderBaseHtml } from './base'

const STRINGS = {
  title: {
    fr: 'Nouveau seller inscrit',
    en: 'New Seller Enrolled',
    es: 'Nuevo seller inscrito',
  },
  body: {
    fr: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> s'est inscrit à votre mission <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Ce seller peut maintenant partager son lien d'affiliation et générer des ventes pour vous.
      </p>`,
    en: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> enrolled in your mission <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        This seller can now share their affiliate link and drive sales for you.
      </p>`,
    es: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> se inscribió en tu misión <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Este seller ahora puede compartir su enlace de afiliado y generar ventas para ti.
      </p>`,
  },
  cta: {
    fr: 'Voir les sellers',
    en: 'View Sellers',
    es: 'Ver sellers',
  },
  plainText: {
    fr: (sellerName: string, mission: string) =>
      `${sellerName} s'est inscrit à votre mission "${mission}".`,
    en: (sellerName: string, mission: string) =>
      `${sellerName} enrolled in your mission "${mission}".`,
    es: (sellerName: string, mission: string) =>
      `${sellerName} se inscribió en tu misión "${mission}".`,
  },
}

export interface NewEnrollmentData {
  sellerName: string
  missionTitle: string
}

export function renderNewEnrollment(locale: NotificationLocale, data: NewEnrollmentData, unsubscribeUrl?: string) {
  return {
    subject: `${STRINGS.title[locale]} — ${data.sellerName}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '🙋',
      bodyHtml: STRINGS.body[locale](data.sellerName, data.missionTitle),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/dashboard/sellers`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](data.sellerName, data.missionTitle),
  }
}
