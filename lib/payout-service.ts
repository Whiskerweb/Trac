/**
 * Multi-Payout Service
 * 
 * Handles payouts via multiple methods:
 * - Stripe Connect (direct transfer)
 * - PayPal (email payout)
 * - IBAN (SEPA transfer - manual for now)
 * - Platform Balance (for gift card redemption)
 */

import { prisma } from '@/lib/db'
import { createPayout as stripeConnectPayout } from '@/lib/stripe-connect'

// =============================================
// TYPES
// =============================================

type PayoutMethod = 'STRIPE_CONNECT' | 'PAYPAL' | 'IBAN' | 'PLATFORM'

export interface PayoutRequest {
    partnerId: string
    amount: number // in cents
    commissionIds: string[]
}

export interface PayoutResult {
    success: boolean
    method: PayoutMethod
    transferId?: string
    error?: string
}

// =============================================
// MINIMUM PAYOUT AMOUNTS (in cents)
// =============================================

const MIN_PAYOUT = {
    STRIPE_CONNECT: 1000, // 10€
    PAYPAL: 1000,         // 10€
    IBAN: 2500,           // 25€ (higher for bank transfers)
    PLATFORM: 0,          // No minimum for platform balance
}

// =============================================
// DISPATCH PAYOUT
// =============================================

/**
 * Dispatch payout based on partner's configured method
 */
export async function dispatchPayout(request: PayoutRequest): Promise<PayoutResult> {
    const partner = await prisma.partner.findUnique({
        where: { id: request.partnerId },
        select: {
            id: true,
            payout_method: true,
            stripe_connect_id: true,
            paypal_email: true,
            iban: true,
            bic: true,
        }
    })

    if (!partner) {
        return { success: false, method: 'PLATFORM', error: 'Partner not found' }
    }

    const method = partner.payout_method

    // Check minimum amount
    const minAmount = MIN_PAYOUT[method]
    if (request.amount < minAmount) {
        return {
            success: false,
            method,
            error: `Minimum payout for ${method} is ${minAmount / 100}€`
        }
    }

    // Dispatch based on method
    switch (method) {
        case 'STRIPE_CONNECT':
            return await processStripeConnect(request, partner.stripe_connect_id)

        case 'PAYPAL':
            return await processPayPal(request, partner.paypal_email)

        case 'IBAN':
            return await processIBAN(request, partner.iban, partner.bic)

        case 'PLATFORM':
        default:
            return await processPlatformBalance(request)
    }
}

// =============================================
// STRIPE CONNECT PAYOUT
// =============================================

async function processStripeConnect(
    request: PayoutRequest,
    stripeConnectId: string | null
): Promise<PayoutResult> {
    if (!stripeConnectId) {
        return {
            success: false,
            method: 'STRIPE_CONNECT',
            error: 'Stripe Connect account not configured'
        }
    }

    const result = await stripeConnectPayout(
        request.partnerId,
        request.amount,
        request.commissionIds
    )

    return {
        success: result.success,
        method: 'STRIPE_CONNECT',
        transferId: result.transferId,
        error: result.error
    }
}

// =============================================
// PAYPAL PAYOUT (Manual for now)
// =============================================

async function processPayPal(
    request: PayoutRequest,
    paypalEmail: string | null
): Promise<PayoutResult> {
    if (!paypalEmail) {
        return {
            success: false,
            method: 'PAYPAL',
            error: 'PayPal email not configured'
        }
    }

    // For MVP: Create a pending payout record for manual processing
    // TODO: Integrate PayPal Payouts API

    await prisma.commission.updateMany({
        where: { id: { in: request.commissionIds } },
        data: {
            status: 'PROCEED', // Keep in PROCEED until manually sent
        }
    })

    console.log('[PayoutService] 📧 PayPal payout requested:', {
        partnerId: request.partnerId,
        amount: `${request.amount / 100}€`,
        email: paypalEmail,
        note: 'Manual payout required'
    })

    return {
        success: true,
        method: 'PAYPAL',
        transferId: `paypal_pending_${Date.now()}`,
    }
}

// =============================================
// IBAN PAYOUT (Manual SEPA)
// =============================================

async function processIBAN(
    request: PayoutRequest,
    iban: string | null,
    bic: string | null
): Promise<PayoutResult> {
    if (!iban) {
        return {
            success: false,
            method: 'IBAN',
            error: 'IBAN not configured'
        }
    }

    // For MVP: Create a pending payout record for manual SEPA transfer
    // TODO: Integrate with banking API (Swan, Stripe Treasury, etc.)

    await prisma.commission.updateMany({
        where: { id: { in: request.commissionIds } },
        data: {
            status: 'PROCEED', // Keep in PROCEED until manually sent
        }
    })

    console.log('[PayoutService] 🏦 IBAN payout requested:', {
        partnerId: request.partnerId,
        amount: `${request.amount / 100}€`,
        iban: `${iban.slice(0, 4)}****${iban.slice(-4)}`,
        bic: bic || 'N/A',
        note: 'Manual SEPA transfer required'
    })

    return {
        success: true,
        method: 'IBAN',
        transferId: `sepa_pending_${Date.now()}`,
    }
}

// =============================================
// PLATFORM BALANCE (No external transfer)
// =============================================

async function processPlatformBalance(request: PayoutRequest): Promise<PayoutResult> {
    // Money stays on platform - update balance for gift card redemption

    await prisma.partnerBalance.upsert({
        where: { partner_id: request.partnerId },
        create: {
            partner_id: request.partnerId,
            balance: request.amount,
        },
        update: {
            balance: { increment: request.amount },
        }
    })

    // Mark commissions as complete (money is in platform balance)
    await prisma.commission.updateMany({
        where: { id: { in: request.commissionIds } },
        data: {
            status: 'COMPLETE',
            paid_at: new Date(),
        }
    })

    // Update partner balance tracking
    await prisma.partnerBalance.update({
        where: { partner_id: request.partnerId },
        data: {
            due: { decrement: request.amount },
            paid_total: { increment: request.amount },
        }
    })

    console.log('[PayoutService] 💰 Platform balance updated:', {
        partnerId: request.partnerId,
        amount: `${request.amount / 100}€`,
    })

    return {
        success: true,
        method: 'PLATFORM',
        transferId: `platform_${Date.now()}`,
    }
}

// =============================================
// GIFT CARD REDEMPTION
// =============================================

export interface GiftCardRequest {
    partnerId: string
    cardType: 'amazon' | 'itunes' | 'steam' | 'paypal_gift'
    amount: number // in cents
}

const GIFT_CARD_MIN = {
    amazon: 1000,      // 10€
    itunes: 1500,      // 15€
    steam: 2000,       // 20€
    paypal_gift: 1000, // 10€
}

export async function requestGiftCard(request: GiftCardRequest): Promise<{
    success: boolean
    redemptionId?: string
    error?: string
}> {
    // Check minimum
    const minAmount = GIFT_CARD_MIN[request.cardType]
    if (request.amount < minAmount) {
        return {
            success: false,
            error: `Minimum for ${request.cardType} is ${minAmount / 100}€`
        }
    }

    // Check balance
    const balance = await prisma.partnerBalance.findUnique({
        where: { partner_id: request.partnerId }
    })

    if (!balance || balance.balance < request.amount) {
        return {
            success: false,
            error: 'Insufficient platform balance'
        }
    }

    // Create redemption request
    const redemption = await prisma.giftCardRedemption.create({
        data: {
            partner_id: request.partnerId,
            amount: request.amount,
            card_type: request.cardType,
            status: 'PENDING',
        }
    })

    // Deduct from balance
    await prisma.partnerBalance.update({
        where: { partner_id: request.partnerId },
        data: {
            balance: { decrement: request.amount },
        }
    })

    console.log('[PayoutService] 🎁 Gift card requested:', {
        redemptionId: redemption.id,
        partnerId: request.partnerId,
        cardType: request.cardType,
        amount: `${request.amount / 100}€`,
    })

    return {
        success: true,
        redemptionId: redemption.id,
    }
}

// =============================================
// GET PARTNER WALLET INFO
// =============================================

export async function getPartnerWallet(partnerId: string) {
    const [partner, balance, pendingRedemptions] = await Promise.all([
        prisma.partner.findUnique({
            where: { id: partnerId },
            select: {
                id: true,
                payout_method: true,
                stripe_connect_id: true,
                paypal_email: true,
                iban: true,
                payouts_enabled_at: true,
            }
        }),
        prisma.partnerBalance.findUnique({
            where: { partner_id: partnerId }
        }),
        prisma.giftCardRedemption.count({
            where: {
                partner_id: partnerId,
                status: { in: ['PENDING', 'PROCESSING'] }
            }
        })
    ])

    if (!partner) return null

    return {
        partnerId,
        payoutMethod: partner.payout_method,
        hasStripeConnect: !!partner.stripe_connect_id,
        hasPayPal: !!partner.paypal_email,
        hasIBAN: !!partner.iban,
        payoutsEnabled: !!partner.payouts_enabled_at,

        // Balances in cents
        pending: balance?.pending || 0,
        due: balance?.due || 0,
        platformBalance: balance?.balance || 0,
        totalEarned: balance?.paid_total || 0,

        // Formatted
        pendingFormatted: `${((balance?.pending || 0) / 100).toFixed(2)}€`,
        dueFormatted: `${((balance?.due || 0) / 100).toFixed(2)}€`,
        platformBalanceFormatted: `${((balance?.balance || 0) / 100).toFixed(2)}€`,
        totalEarnedFormatted: `${((balance?.paid_total || 0) / 100).toFixed(2)}€`,

        pendingRedemptions,

        // Can withdraw?
        canWithdraw: (balance?.due || 0) >= MIN_PAYOUT[partner.payout_method],
        minWithdraw: MIN_PAYOUT[partner.payout_method] / 100,
    }
}
