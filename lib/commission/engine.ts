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
        where: { subscription_id: subscriptionId }
    })
}

/**
 * Handle charge.refunded - Clawback logic
 * With simplified enum (PENDING/PROCEED/COMPLETE):
 * - Delete the commission if PENDING or PROCEED
 * - If COMPLETE: Create negative balance entry
 */
export async function handleClawback(params: {
    saleId: string
    reason?: string
}): Promise<{ success: boolean; error?: string }> {
    const { saleId, reason } = params

    try {
        // Find existing commission
        const commission = await prisma.commission.findUnique({
            where: { sale_id: saleId }
        })

        if (!commission) {
            console.log(`[Commission] ⚠️ No commission found for sale ${saleId} - nothing to claw back`)
            return { success: true }
        }

        const clawbackAmount = commission.status === 'COMPLETE' ? commission.commission_amount : 0

        // Delete the commission
        await prisma.commission.delete({
            where: { id: commission.id }
        })
        console.log(`[Commission] 🔙 Deleted ${commission.status} commission ${commission.id} due to refund`)

        // Recalculate balance from remaining commissions
        await updateSellerBalance(commission.seller_id)

        // For COMPLETE commissions: apply negative balance (money already paid out)
        if (clawbackAmount > 0) {
            await prisma.sellerBalance.update({
                where: { seller_id: commission.seller_id },
                data: {
                    balance: { decrement: clawbackAmount }
                }
            })
            console.log(`[Commission] 🔙 Applied -${clawbackAmount} clawback for already-paid commission`)
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
        await prisma.sellerBalance.upsert({
            where: { seller_id: sellerId },
            create: {
                seller_id: sellerId,
                balance: due, // Available for payout
                pending,
                due,
                paid_total: paid
            },
            update: {
                pending,
                due,
                balance: due,
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
