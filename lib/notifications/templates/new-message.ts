import type { NotificationLocale } from '../locale'
import { renderBaseHtml } from './base'

const STRINGS = {
  title: {
    fr: 'Nouveau message',
    en: 'New Message',
    es: 'Nuevo mensaje',
  },
  bodyForSeller: {
    fr: (senderName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${senderName}</strong> vous a envoyé un message :
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
    en: (senderName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${senderName}</strong> sent you a message:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
    es: (senderName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        <strong style="color: #171717;">${senderName}</strong> te envió un mensaje:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
  },
  bodyForStartup: {
    fr: (sellerName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Le seller <strong style="color: #171717;">${sellerName}</strong> vous a envoyé un message :
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
    en: (sellerName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        Seller <strong style="color: #171717;">${sellerName}</strong> sent you a message:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
    es: (sellerName: string, preview: string) =>
      `<p style="margin: 0 0 16px; font-size: 15px; color: #525252; line-height: 1.6;">
        El seller <strong style="color: #171717;">${sellerName}</strong> te envió un mensaje:
      </p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; border-left: 3px solid #8b5cf6;">
        <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.5; font-style: italic;">
          "${preview}"
        </p>
      </div>`,
  },
  ctaSeller: {
    fr: 'Voir mes messages',
    en: 'View Messages',
    es: 'Ver mensajes',
  },
  ctaStartup: {
    fr: 'Voir les messages',
    en: 'View Messages',
    es: 'Ver mensajes',
  },
  plainText: {
    fr: (sender: string, preview: string) => `Nouveau message de ${sender}: "${preview}"`,
    en: (sender: string, preview: string) => `New message from ${sender}: "${preview}"`,
    es: (sender: string, preview: string) => `Nuevo mensaje de ${sender}: "${preview}"`,
  },
}

export interface NewMessageData {
  senderName: string
  messagePreview: string
  recipientType: 'seller' | 'startup'
}

export function renderNewMessage(locale: NotificationLocale, data: NewMessageData, unsubscribeUrl?: string) {
  const { senderName, messagePreview, recipientType } = data
  const preview = messagePreview.length > 120 ? messagePreview.slice(0, 120) + '...' : messagePreview

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://traaaction.com'
  const ctaUrl = recipientType === 'seller' ? `${appUrl}/seller/messages` : `${appUrl}/dashboard/messages`
  const bodyFn = recipientType === 'seller' ? STRINGS.bodyForSeller : STRINGS.bodyForStartup
  const ctaLabel = recipientType === 'seller' ? STRINGS.ctaSeller[locale] : STRINGS.ctaStartup[locale]

  return {
    subject: `${STRINGS.title[locale]} — ${senderName}`,
    html: renderBaseHtml({
      locale,
      title: STRINGS.title[locale],
      emoji: '💬',
      bodyHtml: bodyFn[locale](senderName, preview),
      ctaUrl,
      ctaLabel,
      unsubscribeUrl,
    }),
    text: STRINGS.plainText[locale](senderName, preview),
  }
}
