import type { NotificationLocale } from '../locale'
import { renderBaseHtml } from './base'

const STRINGS = {
  approved: {
    title: {
      fr: 'Inscription approuvée',
      en: 'Enrollment Approved',
      es: 'Inscripción aprobada',
    },
    body: {
      fr: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Votre inscription à la mission <strong style="color: #171717;">${mission}</strong> a été approuvée.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          Vous pouvez maintenant partager votre lien d'affiliation et commencer à gagner des commissions.
        </p>`,
      en: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Your enrollment in mission <strong style="color: #171717;">${mission}</strong> has been approved.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          You can now share your affiliate link and start earning commissions.
        </p>`,
      es: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Tu inscripción en la misión <strong style="color: #171717;">${mission}</strong> ha sido aprobada.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          Ahora puedes compartir tu enlace de afiliado y empezar a ganar comisiones.
        </p>`,
    },
    plainText: {
      fr: (mission: string) => `Votre inscription à la mission "${mission}" a été approuvée. Partagez votre lien d'affiliation.`,
      en: (mission: string) => `Your enrollment in mission "${mission}" has been approved. Share your affiliate link.`,
      es: (mission: string) => `Tu inscripción en la misión "${mission}" ha sido aprobada. Comparte tu enlace de afiliado.`,
    },
  },
  rejected: {
    title: {
      fr: 'Inscription refusée',
      en: 'Enrollment Rejected',
      es: 'Inscripción rechazada',
    },
    body: {
      fr: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Votre demande d'inscription à la mission <strong style="color: #171717;">${mission}</strong> a été refusée.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          Vous pouvez explorer d'autres missions disponibles sur la marketplace.
        </p>`,
      en: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Your enrollment request for mission <strong style="color: #171717;">${mission}</strong> has been rejected.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          You can explore other available missions on the marketplace.
        </p>`,
      es: (mission: string) =>
        `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
          Tu solicitud de inscripción en la misión <strong style="color: #171717;">${mission}</strong> ha sido rechazada.
        </p>
        <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
          Puedes explorar otras misiones disponibles en el marketplace.
        </p>`,
    },
    plainText: {
      fr: (mission: string) => `Votre demande d'inscription à la mission "${mission}" a été refusée.`,
      en: (mission: string) => `Your enrollment request for mission "${mission}" has been rejected.`,
      es: (mission: string) => `Tu solicitud de inscripción en la misión "${mission}" ha sido rechazada.`,
    },
  },
  cta: {
    fr: 'Voir la marketplace',
    en: 'Browse Marketplace',
    es: 'Ver marketplace',
  },
}

export interface EnrollmentStatusData {
  missionTitle: string
  status: 'approved' | 'rejected'
}

export function renderEnrollmentStatus(locale: NotificationLocale, data: EnrollmentStatusData, unsubscribeUrl?: string) {
  const s = STRINGS[data.status]

  return {
    subject: s.title[locale],
    html: renderBaseHtml({
      locale,
      title: s.title[locale],
      emoji: data.status === 'approved' ? '🎉' : '😔',
      bodyHtml: s.body[locale](data.missionTitle),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/seller/marketplace`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: s.plainText[locale](data.missionTitle),
  }
}
