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
import { updateSellerBalance } from '@/lib/commission/engine'
import { LedgerEntryType, LedgerReferenceType } from './generated/prisma/enums'

// =============================================
// TYPES
// =============================================

type PayoutMethod = 'STRIPE_CONNECT' | 'PAYPAL' | 'IBAN' | 'PLATFORM'

export interface PayoutRequest {
    sellerId: string
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
// WALLET LEDGER (IMMUTABLE AUDIT TRAIL)
// =============================================

/**
 * Record an immutable ledger entry for wallet movements
 * This creates a complete audit trail for reconciliation
 */
async function recordLedgerEntry(params: {
    sellerId: string
    entryType: LedgerEntryType
    amount: number // in cents, always positive
    referenceType: LedgerReferenceType
    referenceId: string
    description: string
}): Promise<{ ledgerId: string; balanceAfter: number }> {
    // Get current balance from ledger (source of truth)
    const currentLedgerBalance = await calculateLedgerBalance(params.sellerId)

    // Calculate new balance
    const balanceAfter = params.entryType === 'CREDIT'
        ? currentLedgerBalance + params.amount
        : currentLedgerBalance - params.amount

    // Create immutable ledger entry
    const entry = await prisma.walletLedger.create({
        data: {
            seller_id: params.sellerId,
            entry_type: params.entryType,
            amount: params.amount,
            reference_type: params.referenceType,
            reference_id: params.referenceId,
            balance_after: balanceAfter,
            description: params.description,
        }
    })

    console.log('[Ledger] 📝 Entry recorded:', {
        id: entry.id,
        sellerId: params.sellerId,
        type: params.entryType,
        amount: `${params.amount / 100}€`,
        balanceAfter: `${balanceAfter / 100}€`,
        reference: `${params.referenceType}:${params.referenceId}`,
    })

    return { ledgerId: entry.id, balanceAfter }
}

/**
 * Calculate balance from ledger entries (source of truth)
 * Balance = SUM(CREDIT amounts) - SUM(DEBIT amounts)
 */
export async function calculateLedgerBalance(sellerId: string): Promise<number> {
    const result = await prisma.walletLedger.groupBy({
        by: ['entry_type'],
        where: { seller_id: sellerId },
        _sum: { amount: true },
    })

    let credits = 0
    let debits = 0

    for (const row of result) {
        if (row.entry_type === 'CREDIT') {
            credits = row._sum.amount || 0
        } else if (row.entry_type === 'DEBIT') {
            debits = row._sum.amount || 0
        }
    }

    return credits - debits
}

/**
 * Get ledger history for a seller
 */
export async function getLedgerHistory(sellerId: string, limit = 50) {
    return prisma.walletLedger.findMany({
        where: { seller_id: sellerId },
        orderBy: { created_at: 'desc' },
        take: limit,
    })
}

/**
 * Reconcile ledger balance with SellerBalance.balance
 * Returns true if they match, false if there's a discrepancy
 */
export async function reconcileSellerBalance(sellerId: string): Promise<{
    isReconciled: boolean
    ledgerBalance: number
    storedBalance: number
    discrepancy: number
}> {
    const [ledgerBalance, storedBalanceRecord] = await Promise.all([
        calculateLedgerBalance(sellerId),
        prisma.sellerBalance.findUnique({ where: { seller_id: sellerId } })
    ])

    const storedBalance = storedBalanceRecord?.balance || 0
    const discrepancy = ledgerBalance - storedBalance

    if (discrepancy !== 0) {
        console.warn('[Ledger] ⚠️ Balance discrepancy detected:', {
            sellerId,
            ledgerBalance: `${ledgerBalance / 100}€`,
            storedBalance: `${storedBalance / 100}€`,
            discrepancy: `${discrepancy / 100}€`,
        })
    }

    return {
        isReconciled: discrepancy === 0,
        ledgerBalance,
        storedBalance,
        discrepancy,
    }
}

/**
 * Fix balance discrepancy by syncing SellerBalance with ledger
 * Only use this after manual verification!
 */
export async function syncBalanceFromLedger(sellerId: string): Promise<number> {
    const ledgerBalance = await calculateLedgerBalance(sellerId)

    await prisma.sellerBalance.upsert({
        where: { seller_id: sellerId },
        create: {
            seller_id: sellerId,
            balance: ledgerBalance,
        },
        update: {
            balance: ledgerBalance,
        }
    })

    console.log('[Ledger] 🔄 Balance synced from ledger:', {
        sellerId,
        newBalance: `${ledgerBalance / 100}€`,
    })

    return ledgerBalance
}

// =============================================
// DISPATCH PAYOUT
// =============================================

/**
 * Dispatch payout based on partner's configured method
 */
export async function dispatchPayout(request: PayoutRequest): Promise<PayoutResult> {
    const partner = await prisma.seller.findUnique({
        where: { id: request.sellerId },
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
        request.sellerId,
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
        partnerId: request.sellerId,
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
        partnerId: request.sellerId,
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

    // Mark commissions as complete (money is in platform balance)
    await prisma.commission.updateMany({
        where: { id: { in: request.commissionIds } },
        data: {
            status: 'COMPLETE',
            paid_at: new Date(),
        }
    })

    // Recalculate balance from commissions (this sets pending/due/paid_total correctly)
    await updateSellerBalance(request.sellerId)

    // Create a reference ID for this batch of commissions
    const batchRefId = `commission_batch_${Date.now()}`

    // Record ledger entry for each commission (for precise audit trail)
    // Or alternatively, one entry per batch - we'll do per batch for simplicity
    const { balanceAfter } = await recordLedgerEntry({
        sellerId: request.sellerId,
        entryType: 'CREDIT',
        amount: request.amount,
        referenceType: 'COMMISSION',
        referenceId: batchRefId,
        description: `Commission payout: ${request.commissionIds.length} commission(s) - ${request.amount / 100}€`,
    })

    // Update SellerBalance to match ledger (belt and suspenders)
    await prisma.sellerBalance.update({
        where: { seller_id: request.sellerId },
        data: {
            balance: balanceAfter,
        }
    })

    console.log('[PayoutService] 💰 Platform balance updated with ledger:', {
        partnerId: request.sellerId,
        amount: `${request.amount / 100}€`,
        newBalance: `${balanceAfter / 100}€`,
    })

    return {
        success: true,
        method: 'PLATFORM',
        transferId: batchRefId,
    }
}

// =============================================
// GIFT CARD REDEMPTION
// =============================================

export interface GiftCardRequest {
    sellerId: string
    cardType: 'amazon' | 'itunes' | 'steam' | 'paypal_gift' | 'fnac' | 'google_play' | 'netflix' | 'spotify'
    amount: number // in cents
}

const GIFT_CARD_MIN = {
    amazon: 1000,       // 10€
    itunes: 1500,       // 15€
    steam: 2000,        // 20€
    paypal_gift: 1000,  // 10€
    fnac: 1500,         // 15€
    google_play: 1500,  // 15€
    netflix: 1500,      // 15€
    spotify: 1000,      // 10€
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

    // Check balance from LEDGER (source of truth)
    const ledgerBalance = await calculateLedgerBalance(request.sellerId)

    if (ledgerBalance < request.amount) {
        return {
            success: false,
            error: 'Insufficient platform balance'
        }
    }

    // Create redemption request
    const redemption = await prisma.giftCardRedemption.create({
        data: {
            seller_id: request.sellerId,
            amount: request.amount,
            card_type: request.cardType,
            status: 'PENDING',
        }
    })

    // Record DEBIT ledger entry
    const { balanceAfter } = await recordLedgerEntry({
        sellerId: request.sellerId,
        entryType: 'DEBIT',
        amount: request.amount,
        referenceType: 'GIFT_CARD_REDEMPTION',
        referenceId: redemption.id,
        description: `Gift card redemption: ${request.cardType} - ${request.amount / 100}€`,
    })

    // Sync SellerBalance with ledger
    await prisma.sellerBalance.update({
        where: { seller_id: request.sellerId },
        data: {
            balance: balanceAfter,
        }
    })

    console.log('[PayoutService] 🎁 Gift card requested with ledger:', {
        redemptionId: redemption.id,
        partnerId: request.sellerId,
        cardType: request.cardType,
        amount: `${request.amount / 100}€`,
        newBalance: `${balanceAfter / 100}€`,
    })

    return {
        success: true,
        redemptionId: redemption.id,
    }
}

// =============================================
// GET GIFT CARD REDEMPTIONS HISTORY
// =============================================

export async function getGiftCardRedemptions(sellerId: string) {
    const redemptions = await prisma.giftCardRedemption.findMany({
        where: { seller_id: sellerId },
        orderBy: { created_at: 'desc' },
        take: 20
    })

    return redemptions.map(r => ({
        id: r.id,
        cardType: r.card_type,
        amount: r.amount,
        status: r.status,
        createdAt: r.created_at.toISOString(),
        deliveredAt: r.fulfilled_at?.toISOString() || null,
        code: r.card_code || null
    }))
}

// =============================================
// GET SELLER WALLET INFO
// =============================================

export async function getSellerWallet(sellerId: string) {
    const [seller, balance, pendingRedemptions, commissions] = await Promise.all([
        prisma.seller.findUnique({
            where: { id: sellerId },
            select: {
                id: true,
                payout_method: true,
                stripe_connect_id: true,
                paypal_email: true,
                iban: true,
                payouts_enabled_at: true,
            }
        }),
        prisma.sellerBalance.findUnique({
            where: { seller_id: sellerId }
        }),
        prisma.giftCardRedemption.count({
            where: {
                seller_id: sellerId,
                status: { in: ['PENDING', 'PROCESSING'] }
            }
        }),
        prisma.commission.findMany({
            where: { seller_id: sellerId },
            select: {
                id: true,
                sale_id: true,
                gross_amount: true,
                commission_amount: true,
                status: true,
                created_at: true,
                matured_at: true,
                hold_days: true,
            },
            orderBy: { created_at: 'desc' },
            take: 50
        })
    ])

    if (!seller) return null

    return {
        sellerId,
        payoutMethod: seller.payout_method,
        hasStripeConnect: !!seller.stripe_connect_id,
        hasPayPal: !!seller.paypal_email,
        hasIBAN: !!seller.iban,
        payoutsEnabled: !!seller.payouts_enabled_at,

        // Balances in cents (matching UI expectations)
        balance: balance?.balance || 0,
        pending: balance?.pending || 0,
        due: balance?.due || 0,
        paid_total: balance?.paid_total || 0,
        platformBalance: balance?.balance || 0,
        totalEarned: balance?.paid_total || 0,

        // Formatted
        pendingFormatted: `${((balance?.pending || 0) / 100).toFixed(2)}€`,
        dueFormatted: `${((balance?.due || 0) / 100).toFixed(2)}€`,
        platformBalanceFormatted: `${((balance?.balance || 0) / 100).toFixed(2)}€`,
        totalEarnedFormatted: `${((balance?.paid_total || 0) / 100).toFixed(2)}€`,

        // Commissions
        commissions: commissions.map(c => ({
            id: c.id,
            sale_id: c.sale_id || '',
            gross_amount: c.gross_amount,
            commission_amount: c.commission_amount,
            status: c.status,
            created_at: c.created_at.toISOString(),
            matured_at: c.matured_at?.toISOString() || null,
            hold_days: c.hold_days
        })),

        pendingRedemptions,

        // Can withdraw?
        canWithdraw: (balance?.due || 0) >= MIN_PAYOUT[seller.payout_method],
        minWithdraw: MIN_PAYOUT[seller.payout_method] / 100,
        method: seller.payout_method,
    }
}
