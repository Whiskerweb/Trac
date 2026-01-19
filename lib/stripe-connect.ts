/**
 * Stripe Connect Integration
 * 
 * Handles partner payouts via Stripe Connect Express accounts.
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/db'

// Initialize Stripe (uses default API version from installed package)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// =============================================
// TYPES
// =============================================

export interface ConnectAccountResult {
    success: boolean
    accountId?: string
    onboardingUrl?: string
    error?: string
}

export interface PayoutResult {
    success: boolean
    transferId?: string
    error?: string
}

// =============================================
// CREATE CONNECT ACCOUNT
// =============================================

/**
 * Create a Stripe Connect Express account for a partner
 */
export async function createConnectAccount(
    partnerId: string,
    email: string,
    country: string = 'FR'
): Promise<ConnectAccountResult> {
    try {
        // Check if partner already has a Connect account
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId }
        })

        if (partner?.stripe_connect_id) {
            // Already has account, just return onboarding link
            const link = await createOnboardingLink(partner.stripe_connect_id)
            return {
                success: true,
                accountId: partner.stripe_connect_id,
                onboardingUrl: link
            }
        }

        // Create new Connect Express account
        const account = await stripe.accounts.create({
            type: 'express',
            email,
            country,
            capabilities: {
                transfers: { requested: true },
            },
            metadata: {
                partner_id: partnerId,
            },
        })

        // Save account ID to partner
        await prisma.partner.update({
            where: { id: partnerId },
            data: { stripe_connect_id: account.id }
        })

        // Create onboarding link
        const onboardingUrl = await createOnboardingLink(account.id)

        console.log('[StripeConnect] ✅ Account created:', account.id)

        return {
            success: true,
            accountId: account.id,
            onboardingUrl
        }
    } catch (error) {
        console.error('[StripeConnect] ❌ Error creating account:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create account'
        }
    }
}

// =============================================
// CREATE ONBOARDING LINK
// =============================================

/**
 * Create an onboarding link for a Connect account
 */
async function createOnboardingLink(accountId: string): Promise<string> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/partner/payouts?refresh=true`,
        return_url: `${appUrl}/partner/payouts?success=true`,
        type: 'account_onboarding',
    })

    return link.url
}

// =============================================
// CHECK ACCOUNT STATUS
// =============================================

/**
 * Check if a Connect account has payouts enabled
 */
export async function checkPayoutsEnabled(accountId: string): Promise<{
    enabled: boolean
    details?: {
        chargesEnabled: boolean
        payoutsEnabled: boolean
        detailsSubmitted: boolean
    }
}> {
    try {
        const account = await stripe.accounts.retrieve(accountId)

        return {
            enabled: account.payouts_enabled === true,
            details: {
                chargesEnabled: account.charges_enabled === true,
                payoutsEnabled: account.payouts_enabled === true,
                detailsSubmitted: account.details_submitted === true,
            }
        }
    } catch (error) {
        console.error('[StripeConnect] Error checking account:', error)
        return { enabled: false }
    }
}

// =============================================
// CREATE PAYOUT (TRANSFER)
// =============================================

/**
 * Create a payout (transfer) to a partner's Connect account
 */
export async function createPayout(
    partnerId: string,
    amount: number,
    commissionIds: string[],
    currency: string = 'eur'
): Promise<PayoutResult> {
    try {
        // Get partner with Connect ID
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId }
        })

        if (!partner?.stripe_connect_id) {
            return {
                success: false,
                error: 'Partner has no Stripe Connect account'
            }
        }

        // Check if payouts are enabled
        const { enabled } = await checkPayoutsEnabled(partner.stripe_connect_id)
        if (!enabled) {
            return {
                success: false,
                error: 'Partner payouts not enabled yet'
            }
        }

        // Minimum payout threshold (10€ = 1000 cents)
        if (amount < 1000) {
            return {
                success: false,
                error: 'Minimum payout is 10€'
            }
        }

        // Create transfer to Connect account
        const transfer = await stripe.transfers.create({
            amount,
            currency,
            destination: partner.stripe_connect_id,
            metadata: {
                partner_id: partnerId,
                commission_ids: commissionIds.join(','),
                commission_count: String(commissionIds.length),
            },
        })

        // Update commissions to COMPLETE
        await prisma.commission.updateMany({
            where: { id: { in: commissionIds } },
            data: {
                status: 'COMPLETE',
                paid_at: new Date(),
            }
        })

        // Update partner balance
        await prisma.partnerBalance.update({
            where: { partner_id: partnerId },
            data: {
                due: { decrement: amount },
                paid_total: { increment: amount },
            }
        })

        console.log('[StripeConnect] ✅ Payout created:', {
            transferId: transfer.id,
            amount: `${amount / 100}€`,
            partner: partnerId,
            commissions: commissionIds.length
        })

        return {
            success: true,
            transferId: transfer.id
        }
    } catch (error) {
        console.error('[StripeConnect] ❌ Payout error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create payout'
        }
    }
}

// =============================================
// GET PARTNER PAYOUT STATUS
// =============================================

/**
 * Get payout summary for a partner
 */
export async function getPartnerPayoutSummary(partnerId: string) {
    const balance = await prisma.partnerBalance.findUnique({
        where: { partner_id: partnerId }
    })

    const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: {
            stripe_connect_id: true,
            payouts_enabled_at: true,
        }
    })

    let payoutsEnabled = false
    if (partner?.stripe_connect_id) {
        const status = await checkPayoutsEnabled(partner.stripe_connect_id)
        payoutsEnabled = status.enabled
    }

    return {
        pending: balance?.pending || 0,
        due: balance?.due || 0,
        paidTotal: balance?.paid_total || 0,
        currentBalance: balance?.balance || 0,
        hasConnectAccount: !!partner?.stripe_connect_id,
        payoutsEnabled,
        canWithdraw: payoutsEnabled && (balance?.due || 0) >= 1000, // Min 10€
    }
}
