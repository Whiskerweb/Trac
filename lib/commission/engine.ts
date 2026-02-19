// Commission Engine - Utility Functions for API Routes

import { prisma } from '@/lib/db'
import { CommissionType, CommissionStatus, CommissionSource } from '@/lib/generated/prisma/client'

// =============================================
// COMMISSION ENGINE (Traaaction Style)
// =============================================

// Platform fee rate (15% for Traaaction)
const PLATFORM_FEE_RATE = 0.15

/**
 * Parse a reward string like "5€" or "10%" into structured data
 */
export function parseReward(reward: string): { type: CommissionType; value: number } {
    const trimmed = reward.trim()

    // Check for percentage
    if (trimmed.endsWith('%')) {
        const value = parseFloat(trimmed.replace('%', ''))
        if (!isNaN(value)) {
            return { type: 'PERCENTAGE', value }
        }
    }

    // Check for fixed amount (€, $, EUR, USD patterns)
    const fixedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)
    if (fixedMatch) {
        const value = parseFloat(fixedMatch[1] || fixedMatch[2])
        if (!isNaN(value)) {
            return { type: 'FIXED', value: Math.round(value * 100) } // Convert to cents
        }
    }

    // Default to 0 fixed if parsing fails
    console.warn(`[Commission] ⚠️ Could not parse reward "${reward}", defaulting to 0`)
    return { type: 'FIXED', value: 0 }
}

/**
 * Calculate commission amount based on mission reward and net revenue
 * 
 * @param netAmount - Net revenue in cents (after Stripe fees + tax)
 * @param missionReward - Reward string like "5€" or "10%"
 * @returns Commission amount in cents and type
 */
export function calculateCommission(params: {
    netAmount: number
    missionReward: string
}): { amount: number; type: CommissionType } {
    const { netAmount, missionReward } = params
    const parsed = parseReward(missionReward)

    if (parsed.type === 'PERCENTAGE') {
        // Percentage of net revenue
        const amount = Math.floor((netAmount * parsed.value) / 100)
        console.log(`[Commission] 📊 Calculated ${parsed.value}% of ${netAmount / 100}€ = ${amount / 100}€`)
        return { amount, type: 'PERCENTAGE' }
    } else {
        // Fixed amount (already in cents from parseReward)
        console.log(`[Commission] 📊 Fixed commission: ${parsed.value / 100}€`)
        return { amount: parsed.value, type: 'FIXED' }
    }
}

/**
 * Create a PENDING commission after checkout.session.completed
 * Uses upsert for idempotency based on sale_id
 * 
 * Supports:
 * - Platform fee (15%)
 * - Recurring subscription tracking
 * - Hold period before maturation
 */
export async function createCommission(params: {
    partnerId: string
    programId: string
    saleId: string
    linkId?: string | null
    grossAmount: number
    htAmount: number  // ✅ FIXED: HT amount (gross - tax) for platform fee calculation
    netAmount: number
    stripeFee: number
    taxAmount: number
    missionReward: string
    currency: string
    // Recurring support
    subscriptionId?: string | null
    recurringMonth?: number
    recurringMax?: number
    holdDays?: number
    // Commission source (LEAD, SALE, or RECURRING)
    commissionSource?: CommissionSource
}): Promise<{ success: boolean; commission?: { id: string; commission_amount: number; platform_fee: number }; error?: string }> {
    const {
        partnerId,
        programId,
        saleId,
        linkId,
        grossAmount,
        htAmount,  // ✅ FIXED: Extract htAmount parameter
        netAmount,
        stripeFee,
        taxAmount,
        missionReward,
        currency,
        subscriptionId = null,
        recurringMonth = null,
        recurringMax = null,
        holdDays = 30,  // Default 30 days for SALE/RECURRING (refund protection)
        commissionSource = 'SALE'
    } = params

    try {
        // Safety net: enforce recurringMax limit for RECURRING commissions
        if (commissionSource === 'RECURRING' && subscriptionId && recurringMax !== null) {
            const existingCount = await countRecurringCommissions(subscriptionId)
            if (existingCount >= recurringMax) {
                console.log(`[Commission] ⛔ Recurring limit reached for subscription ${subscriptionId}: ${existingCount}/${recurringMax}`)
                return { success: false, error: `Recurring limit reached (${existingCount}/${recurringMax})` }
            }
        }

        // Calculate commission based on reward string
        const { amount: rawCommission, type } = calculateCommission({ netAmount: htAmount, missionReward })

        // =============================================
        // LEAD vs SALE: Different platform fee logic
        // =============================================
        // LEAD: htAmount=0, commission is fixed (e.g., 5€)
        //       → Platform fee = 15% of commission
        //       → Seller receives = commission - platform fee
        // SALE: htAmount>0, commission is % of HT
        //       → Platform fee = 15% of HT
        //       → Seller receives = full commission
        // =============================================

        const isLeadCommission = htAmount === 0 && rawCommission > 0

        let traaactionFee: number
        let sellerReceives: number

        if (isLeadCommission) {
            // LEAD: Platform takes 15% of the commission amount
            traaactionFee = Math.floor(rawCommission * PLATFORM_FEE_RATE)
            sellerReceives = rawCommission - traaactionFee

            console.log(`[Commission] 💰 LEAD Breakdown:`)
            console.log(`  Lead reward: ${rawCommission / 100}€`)
            console.log(`  Platform 15%: -${traaactionFee / 100}€`)
            console.log(`  → Seller receives: ${sellerReceives / 100}€`)
            console.log(`  → Startup pays: ${rawCommission / 100}€ (commission to seller + platform fee)`)
        } else {
            // SALE: Platform takes 15% of HT (revenue)
            traaactionFee = Math.floor(htAmount * PLATFORM_FEE_RATE)
            sellerReceives = rawCommission  // Seller gets full commission

            const startupShare = netAmount - rawCommission - traaactionFee

            console.log(`[Commission] 💰 SALE Breakdown:`)
            console.log(`  Gross (TTC): ${grossAmount / 100}€`)
            console.log(`  Tax (TVA): -${taxAmount / 100}€`)
            console.log(`  HT (base): ${htAmount / 100}€`)
            console.log(`  Seller ${missionReward}: -${rawCommission / 100}€`)
            console.log(`  Platform 15%: -${traaactionFee / 100}€`)
            console.log(`  Stripe fees: -${stripeFee / 100}€`)
            console.log(`  → Startup keeps: ${startupShare / 100}€`)
        }

        // Idempotent upsert by sale_id
        const result = await prisma.commission.upsert({
            where: { sale_id: saleId },
            create: {
                seller_id: partnerId,
                program_id: programId,
                sale_id: saleId,
                link_id: linkId,
                gross_amount: grossAmount,
                net_amount: netAmount,
                stripe_fee: stripeFee,
                tax_amount: taxAmount,
                // Seller receives: full commission for SALE, commission - 15% for LEAD
                commission_amount: sellerReceives,
                // Platform fee: 15% of HT for SALE, 15% of commission for LEAD
                platform_fee: traaactionFee,
                commission_rate: missionReward,
                commission_type: type,
                currency: currency.toUpperCase(),
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                // Commission source (LEAD, SALE, RECURRING)
                commission_source: commissionSource,
                // Recurring tracking
                subscription_id: subscriptionId,
                recurring_month: recurringMonth,
                recurring_max: recurringMax,
                hold_days: holdDays
            },
            update: {} // No update on duplicate - idempotent
        })

        console.log(`[Commission] ✅ Created commission ${result.id} for partner ${partnerId}`)

        // Update partner's pending balance
        await updateSellerBalance(partnerId)

        // Create referral commissions for the seller's referral chain
        await createReferralCommissions({
            id: result.id,
            seller_id: partnerId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId,
            recurring_month: recurringMonth,
            recurring_max: recurringMax,
            ht_amount: htAmount,
        })

        // Create portal referral commissions (startup-configured, independent from Traaaction)
        await createPortalReferralCommissions({
            id: result.id,
            seller_id: partnerId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId,
            recurring_month: recurringMonth,
            recurring_max: recurringMax,
            ht_amount: htAmount,
        })

        return { success: true, commission: { ...result, platform_fee: traaactionFee } }

    } catch (error) {
        console.error('[Commission] ❌ Failed to create commission:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Count all commissions linked to a specific subscription_id.
 * Used to enforce recurringMax limits and calculate recurringMonth.
 */
export async function countRecurringCommissions(subscriptionId: string): Promise<number> {
    return prisma.commission.count({
        where: {
            subscription_id: subscriptionId,
            org_parent_commission_id: null,  // Exclude leader cuts from count
            referral_generation: null,       // Exclude referral bonuses from count
        }
    })
}

/**
 * Handle charge.refunded - Clawback logic
 *
 * Supports both FULL and PARTIAL refunds:
 * - Full refund: Delete the commission entirely
 * - Partial refund: Reduce commission proportionally
 *
 * If COMPLETE: Apply negative wallet balance
 *
 * All operations wrapped in $transaction for atomicity.
 */
export async function handleClawback(params: {
    saleId: string
    reason?: string
    refundAmount?: number    // Amount refunded in cents (if provided, enables partial refund)
    originalAmount?: number  // Original charge amount in cents
}): Promise<{ success: boolean; error?: string }> {
    const { saleId, reason, refundAmount, originalAmount } = params

    try {
        // Determine if this is a partial refund
        const isPartialRefund = refundAmount !== undefined &&
                                originalAmount !== undefined &&
                                originalAmount > 0 &&
                                refundAmount < originalAmount

        // Track affected sellers for balance recalculation after transaction
        const affectedSellerIds: string[] = []

        // === ALL CRITICAL OPERATIONS IN A SINGLE TRANSACTION ===
        await prisma.$transaction(async (tx) => {
            // Find existing commission
            const commission = await tx.commission.findUnique({
                where: { sale_id: saleId }
            })

            if (!commission) {
                console.log(`[Commission] ⚠️ No commission found for sale ${saleId} - nothing to claw back`)
                return
            }

            affectedSellerIds.push(commission.seller_id)

            // Find child leader commission (org split) if any
            const leaderCommission = await tx.commission.findFirst({
                where: { org_parent_commission_id: commission.id }
            })

            // Find referral commissions linked to this sale
            const referralCommissions = await tx.commission.findMany({
                where: { referral_source_commission_id: commission.id }
            })

            if (isPartialRefund) {
                // === PARTIAL REFUND: Reduce commission proportionally ===
                const refundRatio = refundAmount! / originalAmount!
                const commissionReduction = Math.floor(commission.commission_amount * refundRatio)
                const platformFeeReduction = Math.floor(commission.platform_fee * refundRatio)

                console.log(`[Commission] 🔙 Partial refund: ${refundAmount! / 100}€ / ${originalAmount! / 100}€ (${(refundRatio * 100).toFixed(1)}%) → reducing commission by ${commissionReduction / 100}€`)

                await tx.commission.update({
                    where: { id: commission.id },
                    data: {
                        commission_amount: { decrement: commissionReduction },
                        platform_fee: { decrement: platformFeeReduction },
                        gross_amount: { decrement: refundAmount! },
                    }
                })

                // If COMPLETE, apply negative wallet balance for the reduced amount
                if (commission.status === 'COMPLETE' && commissionReduction > 0) {
                    await tx.sellerBalance.update({
                        where: { seller_id: commission.seller_id },
                        data: { balance: { decrement: commissionReduction } }
                    })
                    console.log(`[Commission] 🔙 Applied -${commissionReduction / 100}€ partial clawback for seller ${commission.seller_id}`)
                }

                // Handle leader commission proportionally
                if (leaderCommission) {
                    const leaderReduction = Math.floor(leaderCommission.commission_amount * refundRatio)
                    affectedSellerIds.push(leaderCommission.seller_id)

                    await tx.commission.update({
                        where: { id: leaderCommission.id },
                        data: {
                            commission_amount: { decrement: leaderReduction },
                            gross_amount: { decrement: refundAmount! },
                        }
                    })

                    if (leaderCommission.status === 'COMPLETE' && leaderReduction > 0) {
                        await tx.sellerBalance.update({
                            where: { seller_id: leaderCommission.seller_id },
                            data: { balance: { decrement: leaderReduction } }
                        })
                        console.log(`[Commission] 🔙 Applied -${leaderReduction / 100}€ partial leader clawback`)
                    }
                }

                // Handle referral commissions proportionally
                for (const refComm of referralCommissions) {
                    const refReduction = Math.floor(refComm.commission_amount * refundRatio)
                    affectedSellerIds.push(refComm.seller_id)

                    await tx.commission.update({
                        where: { id: refComm.id },
                        data: { commission_amount: { decrement: refReduction } }
                    })

                    if (refComm.status === 'COMPLETE' && refReduction > 0) {
                        await tx.sellerBalance.update({
                            where: { seller_id: refComm.seller_id },
                            data: { balance: { decrement: refReduction } }
                        })
                        console.log(`[Commission] 🔙 Applied -${refReduction / 100}€ referral partial clawback for seller ${refComm.seller_id}`)
                    }
                }
            } else {
                // === FULL REFUND: Delete commissions entirely ===

                // 1. Delete referral commissions first (they reference the member commission)
                for (const refComm of referralCommissions) {
                    const refClawback = refComm.status === 'COMPLETE' ? refComm.commission_amount : 0
                    await tx.commission.delete({ where: { id: refComm.id } })
                    affectedSellerIds.push(refComm.seller_id)
                    console.log(`[Commission] 🔙 Deleted referral gen${refComm.referral_generation} commission ${refComm.id}`)

                    if (refClawback > 0) {
                        await tx.sellerBalance.update({
                            where: { seller_id: refComm.seller_id },
                            data: { balance: { decrement: refClawback } }
                        })
                        console.log(`[Commission] 🔙 Applied -${refClawback / 100}€ referral clawback for seller ${refComm.seller_id}`)
                    }
                }

                // 2. Delete leader commission (references member commission)
                if (leaderCommission) {
                    const leaderClawback = leaderCommission.status === 'COMPLETE' ? leaderCommission.commission_amount : 0
                    await tx.commission.delete({ where: { id: leaderCommission.id } })
                    affectedSellerIds.push(leaderCommission.seller_id)
                    console.log(`[Commission] 🔙 Deleted org leader commission ${leaderCommission.id}`)

                    if (leaderClawback > 0) {
                        await tx.sellerBalance.update({
                            where: { seller_id: leaderCommission.seller_id },
                            data: { balance: { decrement: leaderClawback } }
                        })
                        console.log(`[Commission] 🔙 Applied -${leaderClawback / 100}€ leader clawback`)
                    }
                }

                // 3. Delete the source commission
                const clawbackAmount = commission.status === 'COMPLETE' ? commission.commission_amount : 0
                await tx.commission.delete({ where: { id: commission.id } })
                console.log(`[Commission] 🔙 Deleted ${commission.status} commission ${commission.id} due to refund`)

                if (clawbackAmount > 0) {
                    await tx.sellerBalance.update({
                        where: { seller_id: commission.seller_id },
                        data: { balance: { decrement: clawbackAmount } }
                    })
                    console.log(`[Commission] 🔙 Applied -${clawbackAmount / 100}€ clawback for already-paid commission`)
                }
            }
        })

        // After transaction committed: recalculate denormalized balance fields (pending/due/paid_total)
        const uniqueSellerIds = [...new Set(affectedSellerIds)]
        for (const sellerId of uniqueSellerIds) {
            await updateSellerBalance(sellerId)
        }

        return { success: true }

    } catch (error) {
        console.error('[Commission] ❌ Clawback failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Update partner's balance aggregates
 */
export async function updateSellerBalance(sellerId: string): Promise<void> {
    try {
        // Aggregate commission amounts by status
        const aggregates = await prisma.commission.groupBy({
            by: ['status'],
            where: { seller_id: sellerId },
            _sum: { commission_amount: true }
        })

        let pending = 0
        let due = 0
        let paid = 0

        for (const agg of aggregates) {
            const amount = agg._sum.commission_amount || 0
            if (agg.status === 'PENDING') pending = amount
            else if (agg.status === 'PROCEED') due = amount
            else if (agg.status === 'COMPLETE') paid = amount
        }

        // Upsert balance record
        // NOTE: `balance` is managed exclusively by the wallet ledger (payout-service.ts)
        // DO NOT set balance = due here — it would overwrite the wallet balance
        await prisma.sellerBalance.upsert({
            where: { seller_id: sellerId },
            create: {
                seller_id: sellerId,
                balance: 0, // Wallet balance starts at 0, managed by ledger
                pending,
                due,
                paid_total: paid
            },
            update: {
                pending,
                due,
                // balance intentionally NOT updated — managed by wallet ledger
                paid_total: paid
            }
        })

    } catch (error) {
        console.error('[Commission] ⚠️ Failed to update partner balance:', error)
    }
}

/**
 * Find seller by click attribution
 * Uses link_id → MissionEnrollment → user_id → Seller
 * OR sellerId directly (could be Seller.id or Seller.user_id)
 *
 * IMPORTANT: Sellers can be:
 * - Global (program_id = null) - created when user joins any mission
 * - Program-specific (program_id = workspace_id) - legacy or specific enrollment
 *
 * We search both program-specific AND global sellers.
 */
export async function findSellerForSale(params: {
    linkId?: string | null
    sellerId?: string | null
    programId: string
}): Promise<string | null> {
    const { linkId, sellerId, programId } = params

    try {
        // Case 1: Direct affiliate ID provided
        if (sellerId) {
            // Try 1: sellerId is Partner.id directly (program-specific OR global)
            const partnerById = await prisma.seller.findFirst({
                where: {
                    id: sellerId,
                    OR: [
                        { program_id: programId },
                        { program_id: null }  // Global partners
                    ],
                    status: 'APPROVED'
                }
            })
            if (partnerById) {
                console.log(`[Commission] 🔗 Found partner ${partnerById.id} by direct id (program_id: ${partnerById.program_id || 'global'})`)
                return partnerById.id
            }

            // Try 2: sellerId is Partner.user_id (program-specific OR global)
            const partnerByUserId = await prisma.seller.findFirst({
                where: {
                    user_id: sellerId,
                    OR: [
                        { program_id: programId },
                        { program_id: null }  // Global partners
                    ],
                    status: 'APPROVED'
                },
                // Prefer program-specific over global
                orderBy: { program_id: 'desc' }
            })
            if (partnerByUserId) {
                console.log(`[Commission] 🔗 Found partner ${partnerByUserId.id} by user_id ${sellerId} (program_id: ${partnerByUserId.program_id || 'global'})`)
                return partnerByUserId.id
            }
        }

        // Case 2: Link ID - trace back to enrollment
        if (linkId) {
            const link = await prisma.shortLink.findUnique({
                where: { id: linkId },
                include: {
                    MissionEnrollment: {
                        include: { Mission: true }
                    }
                }
            })

            if (link?.MissionEnrollment) {
                const userId = link.MissionEnrollment.user_id
                // Search for partner by user_id (program-specific OR global)
                const partner = await prisma.seller.findFirst({
                    where: {
                        user_id: userId,
                        OR: [
                            { program_id: programId },
                            { program_id: null }  // Global partners
                        ],
                        status: 'APPROVED'
                    },
                    // Prefer program-specific over global
                    orderBy: { program_id: 'desc' }
                })
                if (partner) {
                    console.log(`[Commission] 🔗 Found partner ${partner.id} via link ${linkId} (program_id: ${partner.program_id || 'global'})`)
                    return partner.id
                }
            }

            // Also check link.affiliate_id directly (could be user_id stored there)
            if (link?.affiliate_id) {
                const partner = await prisma.seller.findFirst({
                    where: {
                        OR: [
                            { id: link.affiliate_id },
                            { user_id: link.affiliate_id }
                        ],
                        status: 'APPROVED'
                    }
                })
                if (partner) {
                    console.log(`[Commission] 🔗 Found partner ${partner.id} via link.affiliate_id ${link.affiliate_id}`)
                    return partner.id
                }
            }
        }

        console.log(`[Commission] ⚠️ No approved partner found for link=${linkId}, affiliate=${sellerId}, program=${programId}`)
        return null

    } catch (error) {
        console.error('[Commission] ❌ Error finding partner:', error)
        return null
    }
}

// =============================================
// COMMISSION MATURATION
// Called by cron job daily to transition PENDING → PROCEED
// =============================================

/**
 * Mature pending commissions that have passed their hold period
 * PENDING → PROCEED (ready for payout)
 */
export async function matureCommissions(): Promise<{ matured: number; errors: number }> {
    const now = new Date()
    let matured = 0
    let errors = 0

    try {
        // Find all PENDING commissions where hold period has passed
        const pendingCommissions = await prisma.commission.findMany({
            where: { status: 'PENDING' }
        })

        for (const commission of pendingCommissions) {
            try {
                // Calculate maturity date based on hold_days (default 7)
                const holdDays = commission.hold_days || 7
                const createdAt = new Date(commission.created_at)
                const maturityDate = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)

                if (now >= maturityDate) {
                    await prisma.commission.update({
                        where: { id: commission.id },
                        data: {
                            status: 'PROCEED',
                            matured_at: now
                        }
                    })

                    // Update partner balance
                    await updateSellerBalance(commission.seller_id)

                    matured++
                    console.log(`[Commission] ⏰ Matured: ${commission.id} (${holdDays} days hold)`)
                }
            } catch (err) {
                errors++
                console.error(`[Commission] ❌ Failed to mature ${commission.id}:`, err)
            }
        }

        console.log(`[Commission] 📊 Maturation complete: ${matured} matured, ${errors} errors`)
        return { matured, errors }

    } catch (error) {
        console.error('[Commission] ❌ Maturation job failed:', error)
        return { matured, errors: errors + 1 }
    }
}

// =============================================
// GET MISSION REWARD (Helper for webhook)
// =============================================

/**
 * Get the reward configuration for a mission
 */
export async function getMissionReward(params: {
    linkId?: string | null
    programId: string
}): Promise<string> {
    const { linkId, programId } = params

    try {
        if (linkId) {
            // Get mission from link
            const link = await prisma.shortLink.findUnique({
                where: { id: linkId },
                include: {
                    MissionEnrollment: {
                        include: { Mission: true }
                    }
                }
            })

            if (link?.MissionEnrollment?.Mission) {
                const mission = link.MissionEnrollment.Mission
                // Format reward: "10€" or "15%"
                if (mission.reward_structure === 'PERCENTAGE') {
                    return `${mission.reward_amount}%`
                } else {
                    return `${mission.reward_amount}€`
                }
            }
        }

        // Fallback: Get first active mission for the program
        const mission = await prisma.mission.findFirst({
            where: {
                workspace_id: programId,
                status: 'ACTIVE'
            }
        })

        if (mission) {
            if (mission.reward_structure === 'PERCENTAGE') {
                return `${mission.reward_amount}%`
            } else {
                return `${mission.reward_amount}€`
            }
        }

        // Default fallback
        console.log(`[Commission] ⚠️ No mission found for program ${programId}, using default 10%`)
        return '10%'

    } catch (error) {
        console.error('[Commission] ❌ Error getting mission reward:', error)
        return '10%'
    }
}

// =============================================
// GET MISSION FOR SALE COMMISSION
// =============================================

/**
 * Get mission details for SALE commission - returns null if mission is LEAD type
 * This ensures we only create commissions on sales for SALE-type missions
 *
 * @returns Mission details with reward string and recurring config, or null if:
 *   - Mission not found
 *   - Mission is LEAD type (seller only gets paid for leads, not sales)
 */
export async function getMissionForSaleCommission(params: {
    linkId?: string | null
    programId: string
}): Promise<{
    reward: string
    missionId: string
    missionName: string
    recurringDuration: number | null  // Duration in months, null = Lifetime
    commissionStructure: 'ONE_OFF' | 'RECURRING'
} | null> {
    const { linkId, programId } = params

    try {
        let mission = null

        if (linkId) {
            // Get mission from link → enrollment chain
            const link = await prisma.shortLink.findUnique({
                where: { id: linkId },
                include: {
                    MissionEnrollment: {
                        include: { Mission: true }
                    }
                }
            })

            mission = link?.MissionEnrollment?.Mission
        }

        // Fallback: Get first active SALE mission for the program
        if (!mission) {
            mission = await prisma.mission.findFirst({
                where: {
                    workspace_id: programId,
                    status: 'ACTIVE',
                    reward_type: 'SALE'  // Only SALE missions
                }
            })
        }

        if (!mission) {
            console.log(`[Commission] ⚠️ No SALE mission found for link=${linkId}, program=${programId}`)
            return null
        }

        // ✅ CRITICAL: Check mission type - ONLY SALE missions create commission on sales
        if (mission.reward_type === 'LEAD') {
            console.log(`[Commission] ℹ️ Mission ${mission.id} is LEAD type - no commission on sale`)
            return null
        }

        // Format reward: "10€" or "15%"
        const reward = mission.reward_structure === 'PERCENTAGE'
            ? `${mission.reward_amount}%`
            : `${mission.reward_amount}€`

        // Get recurring configuration
        // recurring_duration: number of months (3, 6, 12, 24, 36, 48) or null/0 = Lifetime
        const recurringDuration = mission.recurring_duration === 0 ? null : mission.recurring_duration

        console.log(`[Commission] ✅ SALE mission found: ${mission.id} (${mission.title}), reward=${reward}, structure=${mission.commission_structure}, recurringDuration=${recurringDuration ?? 'Lifetime'}`)

        return {
            reward,
            missionId: mission.id,
            missionName: mission.title,
            recurringDuration,
            commissionStructure: mission.commission_structure
        }

    } catch (error) {
        console.error('[Commission] ❌ Error getting mission for sale commission:', error)
        return null
    }
}

// =============================================
// GET MISSION COMMISSION CONFIG (NEW MULTI-COMMISSION SUPPORT)
// =============================================

/**
 * Multi-commission configuration for a mission
 * Supports Lead + Sale + Recurring simultaneously
 */
export interface MissionCommissionConfig {
    missionId: string
    missionName: string
    workspaceId: string

    // Lead configuration
    leadEnabled: boolean
    leadReward: string | null  // e.g., "5€" (always FLAT for leads)

    // Sale configuration
    saleEnabled: boolean
    saleReward: string | null  // e.g., "10%" or "15€"

    // Recurring configuration
    recurringEnabled: boolean
    recurringReward: string | null  // e.g., "10%" or "5€"
    recurringDuration: number | null  // months, null = Lifetime
}

/**
 * Get mission commission configuration for multi-commission support
 * Returns config for all commission types (Lead, Sale, Recurring)
 *
 * @returns MissionCommissionConfig or null if no active mission found
 */
export async function getMissionCommissionConfig(params: {
    linkId?: string | null
    programId: string
}): Promise<MissionCommissionConfig | null> {
    const { linkId, programId } = params

    try {
        let mission = null

        if (linkId) {
            // Get mission from link → enrollment chain
            const link = await prisma.shortLink.findUnique({
                where: { id: linkId },
                include: {
                    MissionEnrollment: {
                        include: { Mission: true }
                    }
                }
            })

            mission = link?.MissionEnrollment?.Mission
        }

        // Fallback: Get first active mission for the program
        if (!mission) {
            mission = await prisma.mission.findFirst({
                where: {
                    workspace_id: programId,
                    status: 'ACTIVE'
                }
            })
        }

        if (!mission) {
            console.log(`[Commission] ⚠️ No active mission found for link=${linkId}, program=${programId}`)
            return null
        }

        // =============================================
        // BACKWARD COMPATIBILITY + NEW FIELDS
        // =============================================
        // Check new fields first, fallback to legacy fields
        // New fields: lead_enabled, sale_enabled, recurring_enabled
        // Legacy fields: reward_type, commission_structure
        // =============================================

        // Determine lead configuration
        let leadEnabled = mission.lead_enabled ?? false
        let leadReward: string | null = null

        // Fallback: If using legacy reward_type
        if (!mission.lead_enabled && !mission.sale_enabled && !mission.recurring_enabled) {
            // Legacy mode: use reward_type to determine
            leadEnabled = mission.reward_type === 'LEAD'
        }

        if (leadEnabled && mission.lead_reward_amount) {
            leadReward = `${mission.lead_reward_amount}€`
        } else if (leadEnabled && mission.reward_type === 'LEAD') {
            // Legacy fallback
            leadReward = `${mission.reward_amount}€`
        }

        // Determine sale configuration
        let saleEnabled = mission.sale_enabled ?? false

        // Fallback: If using legacy reward_type
        if (!mission.lead_enabled && !mission.sale_enabled && !mission.recurring_enabled) {
            saleEnabled = mission.reward_type === 'SALE' && mission.commission_structure === 'ONE_OFF'
        }

        let saleReward: string | null = null
        if (saleEnabled) {
            const structure = mission.sale_reward_structure ?? mission.reward_structure
            const amount = mission.sale_reward_amount ?? mission.reward_amount
            saleReward = structure === 'PERCENTAGE' ? `${amount}%` : `${amount}€`
        }

        // Determine recurring configuration
        let recurringEnabled = mission.recurring_enabled ?? false

        // Fallback: If using legacy commission_structure
        if (!mission.lead_enabled && !mission.sale_enabled && !mission.recurring_enabled) {
            recurringEnabled = mission.reward_type === 'SALE' && mission.commission_structure === 'RECURRING'
        }

        let recurringReward: string | null = null
        let recurringDuration: number | null = null

        if (recurringEnabled) {
            const structure = mission.recurring_reward_structure ?? mission.reward_structure
            const amount = mission.recurring_reward_amount ?? mission.reward_amount
            recurringReward = structure === 'PERCENTAGE' ? `${amount}%` : `${amount}€`
            // Use new field if available, fallback to legacy
            recurringDuration = mission.recurring_duration_months ?? mission.recurring_duration ?? null
            // 0 means Lifetime
            if (recurringDuration === 0) recurringDuration = null
        }

        console.log(`[Commission] 📋 Mission config for ${mission.id} (${mission.title}):`)
        console.log(`  Lead: ${leadEnabled ? `✅ ${leadReward}` : '❌'}`)
        console.log(`  Sale: ${saleEnabled ? `✅ ${saleReward}` : '❌'}`)
        console.log(`  Recurring: ${recurringEnabled ? `✅ ${recurringReward} (${recurringDuration ?? 'Lifetime'})` : '❌'}`)

        return {
            missionId: mission.id,
            missionName: mission.title,
            workspaceId: mission.workspace_id,
            leadEnabled,
            leadReward,
            saleEnabled,
            saleReward,
            recurringEnabled,
            recurringReward,
            recurringDuration
        }

    } catch (error) {
        console.error('[Commission] ❌ Error getting mission commission config:', error)
        return null
    }
}

// =============================================
// ORGANIZATION COMMISSION SPLIT
// =============================================

/**
 * Check if a sale link is tied to an organization enrollment.
 * Returns the org config (total deal + leader cut) or null if not an org enrollment.
 *
 * The platform fee (15%) is INSIDE the deal, not on top.
 * Member reward is computed at commission time from: totalReward - 15% - leaderReward.
 */
export async function getOrgMissionConfig(params: {
    linkId?: string | null
}): Promise<{
    isOrgEnrollment: boolean
    organizationMissionId: string
    leaderId: string
    totalReward: string
    leaderReward: string
} | null> {
    const { linkId } = params
    if (!linkId) return null

    try {
        // Find enrollment for this link
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: { link_id: linkId }
        })

        if (!enrollment?.organization_mission_id) return null

        // Fetch org-mission config with leader info
        const orgMission = await prisma.organizationMission.findUnique({
            where: { id: enrollment.organization_mission_id },
            include: { Organization: { select: { leader_id: true } } }
        })

        if (!orgMission || orgMission.status !== 'ACCEPTED') return null

        // leader_reward must be set (set at acceptance time)
        if (!orgMission.leader_reward) return null

        return {
            isOrgEnrollment: true,
            organizationMissionId: orgMission.id,
            leaderId: orgMission.Organization.leader_id,
            totalReward: orgMission.total_reward,
            leaderReward: orgMission.leader_reward
        }
    } catch (error) {
        console.error('[Commission] ❌ Error checking org mission config:', error)
        return null
    }
}

/**
 * Create dual commissions for an organization sale.
 *
 * KEY DIFFERENCE from standard commissions:
 * Platform fee (15%) is INSIDE the deal, not on top.
 *
 * PERCENTAGE example (deal=40%, leader=5%):
 *   platformFee = 15% of HT = 15€ (on 100€ HT)
 *   leaderAmount = 5% of HT = 5€
 *   memberAmount = (40-15-5)% of HT = 20€
 *   Total startup pays = 40€ = exactly the deal
 *
 * FLAT example (deal=10€, leader=1.50€):
 *   platformFee = 15% of 10€ = 1.50€
 *   leaderAmount = 1.50€
 *   memberAmount = 10 - 1.50 - 1.50 = 7€
 *   Total startup pays = 10€ = exactly the deal
 */
export async function createOrgCommissions(params: {
    memberId: string
    leaderId: string
    programId: string
    saleId: string
    linkId?: string | null
    grossAmount: number
    htAmount: number
    netAmount: number
    stripeFee: number
    taxAmount: number
    totalReward: string
    leaderReward: string
    currency: string
    organizationMissionId: string
    subscriptionId?: string | null
    recurringMonth?: number
    recurringMax?: number
    holdDays?: number
    commissionSource?: CommissionSource
}): Promise<{
    success: boolean
    memberCommission?: { id: string; commission_amount: number; platform_fee: number }
    leaderCommission?: { id: string; commission_amount: number; platform_fee: number }
    error?: string
}> {
    const {
        memberId, leaderId, programId, saleId, linkId,
        grossAmount, htAmount, netAmount, stripeFee, taxAmount,
        totalReward, leaderReward, currency, organizationMissionId,
        subscriptionId, recurringMonth, recurringMax,
        holdDays = 30, commissionSource = 'SALE'
    } = params

    try {
        // =============================================
        // RECURRING LIMIT ENFORCEMENT
        // =============================================
        if (commissionSource === 'RECURRING' && subscriptionId && recurringMax !== null && recurringMax !== undefined) {
            const existingCount = await countRecurringCommissions(subscriptionId)
            if (existingCount >= recurringMax) {
                console.log(`[Commission] ⛔ Org recurring limit reached for subscription ${subscriptionId}: ${existingCount}/${recurringMax}`)
                return { success: false, error: `Recurring limit reached (${existingCount}/${recurringMax})` }
            }
        }

        // =============================================
        // PARSE REWARDS & CALCULATE SPLIT
        // Platform fee (15%) is INSIDE the deal
        // =============================================
        const totalParsed = parseReward(totalReward)
        const leaderParsed = parseReward(leaderReward)

        let memberAmount: number
        let leaderAmount: number
        let platformFee: number
        let memberRateStr: string

        if (totalParsed.type === 'PERCENTAGE') {
            // PERCENTAGE DEAL: each component is X% of HT
            const dealPct = totalParsed.value          // e.g., 40
            const platformFeePct = 15                   // fixed 15 percentage points
            const leaderPct = leaderParsed.value        // e.g., 5
            const memberPct = dealPct - platformFeePct - leaderPct  // e.g., 20

            if (memberPct < 0) {
                return { success: false, error: `Invalid org deal: member % would be negative (${memberPct}%). Deal ${dealPct}% - 15% platform - ${leaderPct}% leader.` }
            }

            memberAmount = Math.floor(htAmount * memberPct / 100)
            leaderAmount = Math.floor(htAmount * leaderPct / 100)
            platformFee = Math.floor(htAmount * platformFeePct / 100)
            memberRateStr = `${memberPct}%`

            console.log(`[Commission] 💰 ORG PERCENTAGE Breakdown:`)
            console.log(`  HT: ${htAmount / 100}€ | Deal: ${dealPct}%`)
            console.log(`  Platform: ${platformFeePct}% = ${platformFee / 100}€`)
            console.log(`  Leader: ${leaderPct}% = ${leaderAmount / 100}€`)
            console.log(`  Member: ${memberPct}% = ${memberAmount / 100}€`)
            console.log(`  Total: ${(memberAmount + leaderAmount + platformFee) / 100}€ (should = ${Math.floor(htAmount * dealPct / 100) / 100}€)`)
        } else {
            // FLAT DEAL: platform fee = 15% of the flat reward amount
            const dealFlat = totalParsed.value                       // in cents, e.g., 1000
            platformFee = Math.round(dealFlat * PLATFORM_FEE_RATE)   // e.g., 150
            leaderAmount = leaderParsed.value                        // in cents, e.g., 150
            memberAmount = dealFlat - platformFee - leaderAmount     // e.g., 700

            if (memberAmount < 0) {
                return { success: false, error: `Invalid org deal: member amount would be negative (${memberAmount / 100}€). Deal ${dealFlat / 100}€ - ${platformFee / 100}€ platform - ${leaderAmount / 100}€ leader.` }
            }

            memberRateStr = `${memberAmount / 100}€`

            console.log(`[Commission] 💰 ORG FLAT Breakdown:`)
            console.log(`  Deal: ${dealFlat / 100}€`)
            console.log(`  Platform 15%: ${platformFee / 100}€`)
            console.log(`  Leader: ${leaderAmount / 100}€`)
            console.log(`  Member: ${memberAmount / 100}€`)
            console.log(`  Total: ${(memberAmount + leaderAmount + platformFee) / 100}€ (should = ${dealFlat / 100}€)`)
        }

        // =============================================
        // 1. CREATE MEMBER COMMISSION
        // Platform fee tracked on member commission (for accounting)
        // but it's INSIDE the deal, not charged on top
        // =============================================
        const memberResult = await prisma.commission.upsert({
            where: { sale_id: saleId },
            create: {
                seller_id: memberId,
                program_id: programId,
                sale_id: saleId,
                link_id: linkId,
                gross_amount: grossAmount,
                net_amount: netAmount,
                stripe_fee: stripeFee,
                tax_amount: taxAmount,
                commission_amount: memberAmount,
                platform_fee: platformFee,
                commission_rate: memberRateStr,
                commission_type: totalParsed.type,
                currency: currency.toUpperCase(),
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                commission_source: commissionSource,
                subscription_id: subscriptionId,
                recurring_month: recurringMonth,
                recurring_max: recurringMax,
                hold_days: holdDays,
                organization_mission_id: organizationMissionId
            },
            update: {}
        })

        await updateSellerBalance(memberId)

        // =============================================
        // 2. CREATE LEADER COMMISSION
        // No platform fee (tracked on member commission)
        // Linked to member via org_parent_commission_id
        // =============================================
        const leaderSaleId = `${saleId}:orgcut`

        const leaderResult = await prisma.commission.upsert({
            where: { sale_id: leaderSaleId },
            create: {
                seller_id: leaderId,
                program_id: programId,
                sale_id: leaderSaleId,
                link_id: linkId,
                gross_amount: grossAmount,
                net_amount: netAmount,
                stripe_fee: 0,
                tax_amount: 0,
                commission_amount: leaderAmount,
                platform_fee: 0,
                commission_rate: leaderReward,
                commission_type: leaderParsed.type,
                currency: currency.toUpperCase(),
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                commission_source: commissionSource,
                subscription_id: subscriptionId,
                recurring_month: recurringMonth,
                recurring_max: recurringMax,
                hold_days: holdDays,
                org_parent_commission_id: memberResult.id,
                organization_mission_id: organizationMissionId
            },
            update: {}
        })

        await updateSellerBalance(leaderId)

        console.log(`[Commission] ✅ Org split (fees INSIDE deal): member ${memberId} gets ${memberAmount / 100}€, leader ${leaderId} gets ${leaderAmount / 100}€, platform ${platformFee / 100}€`)

        // Create referral commissions for the member who made the sale
        await createReferralCommissions({
            id: memberResult.id,
            seller_id: memberId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId ?? null,
            recurring_month: recurringMonth ?? null,
            recurring_max: recurringMax ?? null,
            ht_amount: htAmount,
        })

        // Create portal referral commissions (startup-configured, independent from Traaaction)
        await createPortalReferralCommissions({
            id: memberResult.id,
            seller_id: memberId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId ?? null,
            recurring_month: recurringMonth ?? null,
            recurring_max: recurringMax ?? null,
            ht_amount: htAmount,
        })

        return {
            success: true,
            memberCommission: { id: memberResult.id, commission_amount: memberAmount, platform_fee: platformFee },
            leaderCommission: { id: leaderResult.id, commission_amount: leaderAmount, platform_fee: 0 }
        }

    } catch (error) {
        console.error('[Commission] ❌ Org commission creation failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// =============================================
// GROUP COMMISSION SPLIT (EQUAL POOL)
// =============================================

/**
 * Check if a sale link is tied to a group enrollment.
 * Returns the group config (creator ID) or null if not a group enrollment.
 */
export async function getGroupConfig(params: {
    linkId?: string | null
}): Promise<{
    isGroupEnrollment: boolean
    groupId: string
    creatorId: string
} | null> {
    const { linkId } = params
    if (!linkId) return null

    try {
        const enrollment = await prisma.missionEnrollment.findFirst({
            where: { link_id: linkId, group_mission_id: { not: null }, status: 'APPROVED' }
        })

        if (!enrollment?.group_mission_id) return null

        const groupMission = await prisma.groupMission.findUnique({
            where: { id: enrollment.group_mission_id },
            include: {
                Group: {
                    select: { id: true, creator_id: true, status: true }
                }
            }
        })

        if (!groupMission || groupMission.Group.status !== 'ACTIVE') return null

        return {
            isGroupEnrollment: true,
            groupId: groupMission.group_id,
            creatorId: groupMission.Group.creator_id,
        }
    } catch (error) {
        console.error('[Commission] ❌ Error checking group config:', error)
        return null
    }
}

/**
 * Create a single commission for the group creator.
 *
 * All group revenue goes to the creator's account — they redistribute manually.
 * This avoids N transfers and associated fees. Groups represent small agencies
 * or friend groups selling together.
 *
 * Platform fee = 15% of HT, charged once.
 * Referral commissions are based on HT amount and credited to the creator's referrer.
 */
export async function createGroupCommissions(params: {
    sellerId: string       // The seller who made the sale (for tracking)
    creatorId: string      // The group creator who receives the commission
    groupId: string
    programId: string
    saleId: string
    linkId?: string | null
    grossAmount: number
    htAmount: number
    netAmount: number
    stripeFee: number
    taxAmount: number
    missionReward: string
    currency: string
    subscriptionId?: string | null
    recurringMonth?: number
    recurringMax?: number
    holdDays?: number
    commissionSource?: CommissionSource
}): Promise<{
    success: boolean
    commission?: { id: string; commission_amount: number; platform_fee: number }
    error?: string
}> {
    const {
        sellerId, creatorId, groupId, programId, saleId, linkId,
        grossAmount, htAmount, netAmount, stripeFee, taxAmount,
        missionReward, currency,
        subscriptionId, recurringMonth, recurringMax,
        holdDays = 30, commissionSource = 'SALE'
    } = params

    try {
        // Recurring limit enforcement
        if (commissionSource === 'RECURRING' && subscriptionId && recurringMax !== null && recurringMax !== undefined) {
            const existingCount = await countRecurringCommissions(subscriptionId)
            if (existingCount >= recurringMax) {
                console.log(`[Commission] ⛔ Group recurring limit reached for subscription ${subscriptionId}: ${existingCount}/${recurringMax}`)
                return { success: false, error: `Recurring limit reached (${existingCount}/${recurringMax})` }
            }
        }

        // Calculate total commission (full amount goes to creator)
        const { amount: totalCommission, type } = calculateCommission({ netAmount: htAmount, missionReward })

        // Platform fee: 15% of HT
        const isLeadCommission = htAmount === 0 && totalCommission > 0
        let platformFee: number
        if (isLeadCommission) {
            platformFee = Math.floor(totalCommission * PLATFORM_FEE_RATE)
        } else {
            platformFee = Math.floor(htAmount * PLATFORM_FEE_RATE)
        }

        console.log(`[Commission] 💰 GROUP sale (all to creator ${creatorId}, sold by ${sellerId}):`)
        console.log(`  HT: ${htAmount / 100}€ | Reward: ${missionReward}`)
        console.log(`  Commission: ${totalCommission / 100}€`)
        console.log(`  Platform fee: ${platformFee / 100}€`)

        // Create single commission for the group creator
        const result = await prisma.commission.upsert({
            where: { sale_id: saleId },
            create: {
                seller_id: creatorId,
                program_id: programId,
                sale_id: saleId,
                link_id: linkId,
                gross_amount: grossAmount,
                net_amount: netAmount,
                stripe_fee: stripeFee,
                tax_amount: taxAmount,
                commission_amount: totalCommission,
                platform_fee: platformFee,
                commission_rate: missionReward,
                commission_type: type,
                currency: currency.toUpperCase(),
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                commission_source: commissionSource,
                subscription_id: subscriptionId,
                recurring_month: recurringMonth,
                recurring_max: recurringMax,
                hold_days: holdDays,
                group_id: groupId,
            },
            update: {}
        })

        await updateSellerBalance(creatorId)

        console.log(`[Commission] ✅ Group commission: ${totalCommission / 100}€ → creator ${creatorId}, platform ${platformFee / 100}€`)

        // Create referral commissions based on HT (credited to creator's referrer)
        await createReferralCommissions({
            id: result.id,
            seller_id: creatorId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId,
            recurring_month: recurringMonth,
            recurring_max: recurringMax,
            ht_amount: htAmount,
        })

        // Create portal referral commissions (startup-configured, independent from Traaaction)
        await createPortalReferralCommissions({
            id: result.id,
            seller_id: creatorId,
            program_id: programId,
            sale_id: saleId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            currency: currency.toUpperCase(),
            hold_days: holdDays,
            commission_source: commissionSource as CommissionSource,
            subscription_id: subscriptionId,
            recurring_month: recurringMonth,
            recurring_max: recurringMax,
            ht_amount: htAmount,
        })

        return {
            success: true,
            commission: { id: result.id, commission_amount: totalCommission, platform_fee: platformFee },
        }

    } catch (error) {
        console.error('[Commission] ❌ Group commission creation failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// =============================================
// REFERRAL / PARRAINAGE COMMISSIONS
// =============================================

/**
 * Referral rates by generation (% of HT amount)
 * Gen 1 (direct referrer): 5%
 * Gen 2: 3%
 * Gen 3: 1%
 * Total max: 9% — deducted from Traaaction's 15% platform fee
 */
const REFERRAL_RATES: { generation: number; rate: number }[] = [
    { generation: 1, rate: 0.05 },
    { generation: 2, rate: 0.03 },
    { generation: 3, rate: 0.02 },
]

/**
 * Create referral commissions for the ancestors of a seller who just earned a commission.
 * Walks up the referred_by chain (max 3 generations).
 *
 * - Funded from Traaaction's 15% platform fee (seller earnings unchanged)
 * - Lifetime (no expiry)
 * - Idempotent via sale_id = "{original}:ref:gen{N}:{ancestorId}"
 * - Same hold_days as the source commission
 *
 * @param sourceCommission - The original commission that triggers referral bonuses
 */
export async function createReferralCommissions(sourceCommission: {
    id: string
    seller_id: string
    program_id: string
    sale_id: string
    gross_amount: number
    net_amount: number
    stripe_fee: number
    tax_amount: number
    currency: string
    hold_days: number
    commission_source: CommissionSource
    subscription_id?: string | null
    recurring_month?: number | null
    recurring_max?: number | null
    /** HT amount for calculating referral bonus (% of HT) */
    ht_amount: number
}): Promise<void> {
    try {
        const { seller_id, ht_amount } = sourceCommission

        // No HT = no referral (e.g. pure LEAD with htAmount=0)
        if (ht_amount <= 0) return

        // Walk up the referral chain
        let currentSellerId = seller_id

        for (const { generation, rate } of REFERRAL_RATES) {
            // Fetch the current seller's referrer
            const seller = await prisma.seller.findUnique({
                where: { id: currentSellerId },
                select: { referred_by: true }
            })

            if (!seller?.referred_by) break // No referrer → stop

            // S3: Skip referrers who are not APPROVED (BANNED, PENDING, etc.)
            const referrerSeller = await prisma.seller.findUnique({
                where: { id: seller.referred_by },
                select: { id: true, status: true }
            })
            if (!referrerSeller || referrerSeller.status !== 'APPROVED') {
                console.log(`[Referral] ⏭️ Skipping gen ${generation}: referrer ${seller.referred_by} status=${referrerSeller?.status ?? 'NOT_FOUND'}`)
                break
            }

            const referrerId = seller.referred_by
            const referralAmount = Math.floor(ht_amount * rate)

            if (referralAmount <= 0) {
                currentSellerId = referrerId
                continue
            }

            const referralSaleId = `${sourceCommission.sale_id}:ref:gen${generation}:${referrerId}`

            // Idempotent upsert
            await prisma.commission.upsert({
                where: { sale_id: referralSaleId },
                create: {
                    seller_id: referrerId,
                    program_id: sourceCommission.program_id,
                    sale_id: referralSaleId,
                    gross_amount: sourceCommission.gross_amount,
                    net_amount: sourceCommission.net_amount,
                    stripe_fee: sourceCommission.stripe_fee,
                    tax_amount: sourceCommission.tax_amount,
                    commission_amount: referralAmount,
                    platform_fee: 0,  // Funded from Traaaction's cut
                    commission_rate: `ref:gen${generation}:${(rate * 100).toFixed(0)}%`,
                    commission_type: 'PERCENTAGE',
                    currency: sourceCommission.currency,
                    status: 'PENDING',
                    startup_payment_status: 'PAID', // Funded from Traaaction's 15% platform fee, not billed to startup
                    commission_source: sourceCommission.commission_source,
                    subscription_id: sourceCommission.subscription_id,
                    recurring_month: sourceCommission.recurring_month,
                    recurring_max: sourceCommission.recurring_max,
                    hold_days: sourceCommission.hold_days,
                    referral_source_commission_id: sourceCommission.id,
                    referral_generation: generation,
                },
                update: {}  // Idempotent
            })

            await updateSellerBalance(referrerId)

            console.log(`[Referral] ✅ Gen ${generation}: ${referrerId} gets ${referralAmount / 100}€ (${(rate * 100).toFixed(0)}% of ${ht_amount / 100}€ HT)`)

            // Move up the chain
            currentSellerId = referrerId
        }
    } catch (error) {
        // Non-blocking: referral failure should not break the main commission flow
        console.error('[Referral] ❌ Failed to create referral commissions:', error)
    }
}

// =============================================
// PORTAL REFERRAL COMMISSIONS (Startup-configured)
// Independent from Traaaction's global referral system
// =============================================

/**
 * Create portal referral commissions for the ancestors of a seller in a workspace's referral tree.
 * Uses PortalReferral table (per-workspace) instead of Seller.referred_by (global).
 *
 * - Rates configured per mission (referral_gen1/2/3_rate in basis points)
 * - Paid by startup (startup_payment_status: UNPAID), not Traaaction
 * - Platform fee: 0 (no Traaaction cut on portal referrals)
 * - Idempotent via sale_id = "{original}:pref:gen{N}:{referrerId}"
 * - Same hold_days as the source commission
 */
export async function createPortalReferralCommissions(sourceCommission: {
    id: string
    seller_id: string
    program_id: string
    sale_id: string
    gross_amount: number
    net_amount: number
    stripe_fee: number
    tax_amount: number
    currency: string
    hold_days: number
    commission_source: CommissionSource
    subscription_id?: string | null
    recurring_month?: number | null
    recurring_max?: number | null
    ht_amount: number
    link_id?: string | null
}): Promise<void> {
    try {
        const { seller_id, program_id, ht_amount } = sourceCommission

        if (ht_amount <= 0) return

        // Find the mission via link_id → MissionEnrollment → Mission
        let linkId = sourceCommission.link_id
        if (!linkId) {
            // Fallback: look up link_id from the source commission in DB
            const sourceComm = await prisma.commission.findUnique({
                where: { id: sourceCommission.id },
                select: { link_id: true }
            })
            linkId = sourceComm?.link_id || null
        }
        if (!linkId) return

        // ShortLink → MissionEnrollment (1:1 via link_id) → mission_id
        const enrollment = await prisma.missionEnrollment.findUnique({
            where: { link_id: linkId },
            select: { mission_id: true }
        })
        if (!enrollment?.mission_id) return

        const mission = await prisma.mission.findUnique({
            where: { id: enrollment.mission_id },
            select: {
                referral_enabled: true,
                referral_gen1_rate: true,
                referral_gen2_rate: true,
                referral_gen3_rate: true,
            }
        })
        if (!mission?.referral_enabled) return

        // Build dynamic rates array from mission (only generations with non-null rates)
        const rates: { generation: number; rate: number }[] = []
        if (mission.referral_gen1_rate != null && mission.referral_gen1_rate > 0) {
            rates.push({ generation: 1, rate: mission.referral_gen1_rate / 10000 }) // basis points → decimal
        }
        if (mission.referral_gen2_rate != null && mission.referral_gen2_rate > 0) {
            rates.push({ generation: 2, rate: mission.referral_gen2_rate / 10000 })
        }
        if (mission.referral_gen3_rate != null && mission.referral_gen3_rate > 0) {
            rates.push({ generation: 3, rate: mission.referral_gen3_rate / 10000 })
        }

        if (rates.length === 0) return

        // Walk up the portal referral chain (PortalReferral table, not Seller.referred_by)
        let currentSellerId = seller_id

        for (const { generation, rate } of rates) {
            // Find portal referral: who referred currentSellerId in this workspace?
            const portalRef = await prisma.portalReferral.findUnique({
                where: {
                    workspace_id_referred_seller_id: {
                        workspace_id: program_id,
                        referred_seller_id: currentSellerId,
                    }
                },
                select: { referrer_seller_id: true }
            })

            if (!portalRef) break // No portal referrer → stop

            const referrerId = portalRef.referrer_seller_id

            // Skip referrers who are not APPROVED
            const referrerSeller = await prisma.seller.findUnique({
                where: { id: referrerId },
                select: { id: true, status: true }
            })
            if (!referrerSeller || referrerSeller.status !== 'APPROVED') {
                console.log(`[Portal Referral] ⏭️ Skipping gen ${generation}: referrer ${referrerId} status=${referrerSeller?.status ?? 'NOT_FOUND'}`)
                break
            }

            const referralAmount = Math.floor(ht_amount * rate)

            if (referralAmount <= 0) {
                currentSellerId = referrerId
                continue
            }

            const referralSaleId = `${sourceCommission.sale_id}:pref:gen${generation}:${referrerId}`

            await prisma.commission.upsert({
                where: { sale_id: referralSaleId },
                create: {
                    seller_id: referrerId,
                    program_id: sourceCommission.program_id,
                    sale_id: referralSaleId,
                    gross_amount: sourceCommission.gross_amount,
                    net_amount: sourceCommission.net_amount,
                    stripe_fee: sourceCommission.stripe_fee,
                    tax_amount: sourceCommission.tax_amount,
                    commission_amount: referralAmount,
                    platform_fee: 0,
                    commission_rate: `pref:gen${generation}:${(rate * 100).toFixed(1)}%`,
                    commission_type: 'PERCENTAGE',
                    currency: sourceCommission.currency,
                    status: 'PENDING',
                    startup_payment_status: 'UNPAID', // Paid by startup, not Traaaction
                    commission_source: sourceCommission.commission_source,
                    subscription_id: sourceCommission.subscription_id,
                    recurring_month: sourceCommission.recurring_month,
                    recurring_max: sourceCommission.recurring_max,
                    hold_days: sourceCommission.hold_days,
                    referral_source_commission_id: sourceCommission.id,
                    referral_generation: generation,
                    portal_referral: true,
                },
                update: {}
            })

            await updateSellerBalance(referrerId)

            console.log(`[Portal Referral] ✅ Gen ${generation}: ${referrerId} gets ${referralAmount / 100}€ (${(rate * 100).toFixed(1)}% of ${ht_amount / 100}€ HT)`)

            currentSellerId = referrerId
        }
    } catch (error) {
        console.error('[Portal Referral] ❌ Failed to create portal referral commissions:', error)
    }
}
