import type { NotificationLocale } from '../locale'
import { renderBaseHtml } from './base'

const STRINGS = {
  title: {
    fr: 'Demande d\'inscription',
    en: 'Enrollment Request',
    es: 'Solicitud de inscripción',
  },
  body: {
    fr: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> souhaite rejoindre votre mission privée <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Consultez le profil du seller et approuvez ou refusez la demande depuis votre tableau de bord.
      </p>`,
    en: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> requested to join your private mission <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Review the seller's profile and approve or reject the request from your dashboard.
      </p>`,
    es: (sellerName: string, mission: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${sellerName}</strong> solicitó unirse a tu misión privada <strong style="color: #171717;">${mission}</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; color: #a3a3a3;">
        Revisa el perfil del seller y aprueba o rechaza la solicitud desde tu panel.
      </p>`,
  },
  cta: {
    fr: 'Gérer les demandes',
    en: 'Manage Requests',
    es: 'Gestionar solicitudes',
  },
  plainText: {
    fr: (sellerName: string, mission: string) =>
      `${sellerName} souhaite rejoindre votre mission privée "${mission}". Connectez-vous pour approuver ou refuser.`,
    en: (sellerName: string, mission: string) =>
      `${sellerName} requested to join your private mission "${mission}". Log in to approve or reject.`,
    es: (sellerName: string, mission: string) =>
      `${sellerName} solicitó unirse a tu misión privada "${mission}". Inicia sesión para aprobar o rechazar.`,
  },
}

export interface EnrollmentRequestData {
  sellerName: string
  missionTitle: string
}

export function renderEnrollmentRequest(locale: NotificationLocale, data: EnrollmentRequestData, unsubscribeUrl?: string) {
  return {
    subject: `${STRINGS.title[locale]} — ${data.sellerName}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '📋',
      bodyHtml: STRINGS.body[locale](data.sellerName, data.missionTitle),
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'}/dashboard/sellers`,
      ctaLabel: STRINGS.cta[locale],
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](data.sellerName, data.missionTitle),
  }
}
