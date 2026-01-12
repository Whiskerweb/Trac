/**
 * Payout Engine - Batched Commission Payouts
 * 
 * Implements aggregated payouts to minimize Stripe fees:
 * - Groups all PROCEED commissions per partner
 * - Executes single transfer per partner per batch
 * - Updates commission statuses atomically
 * - Handles negative balances (clawback recovery)
 */

import { prisma } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Minimum payout threshold (in cents) - avoid micro-payouts
const MIN_PAYOUT_THRESHOLD = 1000 // 10 EUR/USD

// =============================================
// TYPES
// =============================================

export interface PayoutBatch {
    partnerId: string
    partnerName: string | null
    stripeConnectId: string
    commissionIds: string[]
    totalAmount: number  // Signed: can be negative if clawback exceeds due
    currency: string
}

export interface PayoutResult {
    partnerId: string
    success: boolean
    transferId?: string
    amount?: number
    error?: string
    skippedReason?: string
}

// =============================================
// BATCH PREPARATION
// =============================================

/**
 * Prepare payout batches for all partners with PROCEED commissions
 * Aggregates commissions per partner to minimize Stripe fees
 */
export async function preparePayoutBatches(): Promise<PayoutBatch[]> {
    // Find all partners with PROCEED commissions and valid Stripe Connect
    const partnersWithProceed = await prisma.partner.findMany({
        where: {
            stripe_connect_id: { not: null },
            status: 'APPROVED',
            Commissions: {
                some: { status: 'PROCEED' }
            }
        },
        include: {
            Commissions: {
                where: { status: 'PROCEED' }
            }
        }
    })

    const batches: PayoutBatch[] = []

    for (const partner of partnersWithProceed) {
        // Get partner's current balance (may be negative from clawbacks)
        const balance = await prisma.partnerBalance.findUnique({
            where: { partner_id: partner.id }
        })

        // Aggregate PROCEED commissions
        const proceedAmount = partner.Commissions.reduce(
            (sum, c) => sum + c.commission_amount,
            0
        )

        // Apply any negative balance from clawbacks
        const adjustedAmount = proceedAmount + (balance?.balance || 0)

        // Skip if below threshold or negative
        if (adjustedAmount < MIN_PAYOUT_THRESHOLD) {
            console.log(`[Payout] ⏭️ Partner ${partner.id}: ${adjustedAmount / 100}€ below threshold, skipping`)
            continue
        }

        batches.push({
            partnerId: partner.id,
            partnerName: partner.name,
            stripeConnectId: partner.stripe_connect_id!,
            commissionIds: partner.Commissions.map(c => c.id),
            totalAmount: adjustedAmount,
            currency: partner.Commissions[0]?.currency || 'EUR'
        })
    }

    console.log(`[Payout] 📦 Prepared ${batches.length} payout batches`)
    return batches
}

// =============================================
// BATCH PROCESSING
// =============================================

/**
 * Process a single payout batch via Stripe Connect Transfer
 */
export async function processPayoutBatch(batch: PayoutBatch): Promise<PayoutResult> {
    const { partnerId, stripeConnectId, commissionIds, totalAmount, currency } = batch

    try {
        console.log(`[Payout] 💸 Processing batch for partner ${partnerId}: ${totalAmount / 100} ${currency}`)

        // Execute Stripe Connect Transfer
        const transfer = await stripe.transfers.create({
            amount: totalAmount,
            currency: currency.toLowerCase(),
            destination: stripeConnectId,
            description: `Traaaction commission payout - ${commissionIds.length} sales`,
            metadata: {
                partner_id: partnerId,
                commission_count: commissionIds.length.toString(),
                batch_date: new Date().toISOString()
            }
        })

        // Atomically update all commissions to COMPLETE
        await prisma.$transaction([
            prisma.commission.updateMany({
                where: { id: { in: commissionIds } },
                data: {
                    status: 'COMPLETE',
                    paid_at: new Date()
                }
            }),
            // Update partner balance
            prisma.partnerBalance.upsert({
                where: { partner_id: partnerId },
                create: {
                    partner_id: partnerId,
                    balance: 0,
                    pending: 0,
                    due: 0,
                    paid_total: totalAmount
                },
                update: {
                    balance: 0, // Reset after payout
                    due: 0,
                    paid_total: { increment: totalAmount }
                }
            })
        ])

        console.log(`[Payout] ✅ Transfer ${transfer.id} completed for partner ${partnerId}`)

        return {
            partnerId,
            success: true,
            transferId: transfer.id,
            amount: totalAmount
        }

    } catch (error) {
        console.error(`[Payout] ❌ Failed for partner ${partnerId}:`, error)

        return {
            partnerId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Process all prepared payout batches
 */
export async function processAllPayouts(): Promise<{
    processed: number
    succeeded: number
    failed: number
    totalAmount: number
    results: PayoutResult[]
}> {
    console.log('[Payout] 🚀 Starting batch payout processing...')

    const batches = await preparePayoutBatches()
    const results: PayoutResult[] = []
    let succeeded = 0
    let failed = 0
    let totalAmount = 0

    for (const batch of batches) {
        const result = await processPayoutBatch(batch)
        results.push(result)

        if (result.success) {
            succeeded++
            totalAmount += result.amount || 0
        } else {
            failed++
        }
    }

    console.log(`[Payout] 📊 Batch complete: ${succeeded}/${batches.length} succeeded, ${totalAmount / 100}€ paid out`)

    return {
        processed: batches.length,
        succeeded,
        failed,
        totalAmount,
        results
    }
}
