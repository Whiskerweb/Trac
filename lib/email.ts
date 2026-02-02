/**
 * Email Service using Resend
 *
 * Handles all transactional emails for the platform
 */

import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured')
        return null
    }
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY)
    }
    return resendClient
}

// Default sender
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Traaaction <noreply@traaaction.com>'

// =============================================
// EMAIL TEMPLATES
// =============================================

interface GiftCardEmailData {
    sellerEmail: string
    sellerName: string | null
    cardType: string
    amount: number // in cents
    code: string
}

interface EmailResult {
    success: boolean
    error?: string
}

// =============================================
// GIFT CARD DELIVERY EMAIL
// =============================================

export async function sendGiftCardEmail(data: GiftCardEmailData): Promise<EmailResult> {
    const { sellerEmail, sellerName, cardType, amount, code } = data

    const cardNames: Record<string, string> = {
        amazon: 'Amazon',
        fnac: 'Fnac',
        itunes: 'Apple',
        google_play: 'Google Play',
        netflix: 'Netflix',
        spotify: 'Spotify',
        steam: 'Steam',
        paypal_gift: 'PayPal'
    }

    const cardName = cardNames[cardType] || cardType
    const amountFormatted = (amount / 100).toFixed(0)
    const firstName = sellerName?.split(' ')[0] || 'Seller'

    try {
        const resend = getResendClient()
        if (!resend) {
            return { success: false, error: 'Email service not configured' }
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: sellerEmail,
            subject: `Your ${cardName} gift card worth ${amountFormatted}€ is ready`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafafa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 24px; text-align: center;">
                            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #a855f7); border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 24px;">🎁</span>
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #171717;">
                                Your ${cardName} card
                            </h1>
                            <p style="margin: 8px 0 0; font-size: 14px; color: #737373;">
                                ${amountFormatted}€ • Ready to use
                            </p>
                        </td>
                    </tr>

                    <!-- Code Box -->
                    <tr>
                        <td style="padding: 0 40px 32px;">
                            <div style="background-color: #fafafa; border: 2px dashed #e5e5e5; border-radius: 12px; padding: 24px; text-align: center;">
                                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #a3a3a3;">
                                    Your code
                                </p>
                                <p style="margin: 0; font-size: 24px; font-weight: 600; font-family: monospace; color: #171717; letter-spacing: 0.05em;">
                                    ${code}
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Instructions -->
                    <tr>
                        <td style="padding: 0 40px 32px;">
                            <p style="margin: 0; font-size: 14px; color: #525252; line-height: 1.6;">
                                Hi ${firstName},<br><br>
                                Thank you for your loyalty! Your <strong>${cardName}</strong> gift card worth <strong>${amountFormatted}€</strong> is now available.
                            </p>
                        </td>
                    </tr>

                    <!-- How to use -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <p style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #a3a3a3;">
                                How to use
                            </p>
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #525252; line-height: 1.8;">
                                <li>Go to the ${cardName} website</li>
                                <li>Add the code in the "Gift card" or "Promo code" section</li>
                                <li>The amount will be credited to your account</li>
                            </ol>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f5f5f5;">
                            <p style="margin: 0; font-size: 12px; color: #a3a3a3; text-align: center;">
                                This code is personal and for single use only.<br>
                                Please keep this email safe.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Brand footer -->
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
                                Traaaction • Seller Marketing Platform
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
            text: `
Your ${cardName} gift card worth ${amountFormatted}€

Hi ${firstName},

Your ${cardName} gift card is ready!

YOUR CODE: ${code}

Amount: ${amountFormatted}€

How to use:
1. Go to the ${cardName} website
2. Add the code in the "Gift card" or "Promo code" section
3. The amount will be credited to your account

This code is personal and for single use only.
Please keep this email safe.

---
Traaaction • Seller Marketing Platform
            `
        })

        if (error) {
            console.error('[Email] Failed to send gift card email:', error)
            return { success: false, error: error.message }
        }

        console.log('[Email] Gift card email sent to:', sellerEmail)
        return { success: true }

    } catch (err) {
        console.error('[Email] Error sending gift card email:', err)
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        }
    }
}

// =============================================
// GENERIC EMAIL HELPER
// =============================================

interface SendEmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
        const resend = getResendClient()
        if (!resend) {
            return { success: false, error: 'Email service not configured' }
        }

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            ...options
        })

        if (error) {
            console.error('[Email] Failed to send email:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err) {
        console.error('[Email] Error:', err)
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
        }
    }
}
