// Commission Engine - Utility Functions for API Routes

import { prisma } from '@/lib/db'
import { CommissionType, CommissionStatus } from '@/lib/generated/prisma/client'

// =============================================
// COMMISSION ENGINE (Dub.co Style)
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
}): Promise<{ success: boolean; commission?: { id: string; commission_amount: number; platform_fee: number }; error?: string }> {
    const {
        partnerId,
        programId,
        saleId,
        linkId,
        grossAmount,
        netAmount,
        stripeFee,
        taxAmount,
        missionReward,
        currency,
        subscriptionId = null,
        recurringMonth = null,
        recurringMax = null,
        holdDays = 7
    } = params

    try {
        // Calculate partner commission based on mission reward
        const { amount: partnerCommission, type } = calculateCommission({ netAmount, missionReward })

        // IMPORTANT: Platform fee = 15% of HT (netAmount), NOT of commission
        // This is a separate charge to the startup, not deducted from partner
        const traaactionFee = Math.floor(netAmount * PLATFORM_FEE_RATE)

        // Partner gets their FULL commission (no deduction)
        // Startup pays: partnerCommission + traaactionFee

        console.log(`[Commission] 💰 Sale HT: ${netAmount / 100}€`)
        console.log(`[Commission] 💰 Partner commission: ${partnerCommission / 100}€ (${missionReward})`)
        console.log(`[Commission] 💰 Traaaction fee: ${traaactionFee / 100}€ (15% of HT)`)
        console.log(`[Commission] 💰 Startup owes: ${(partnerCommission + traaactionFee) / 100}€`)

        // Idempotent upsert by sale_id
        const result = await prisma.commission.upsert({
            where: { sale_id: saleId },
            create: {
                partner_id: partnerId,
                program_id: programId,
                sale_id: saleId,
                link_id: linkId,
                gross_amount: grossAmount,
                net_amount: netAmount,
                stripe_fee: stripeFee,
                tax_amount: taxAmount,
                // Partner gets FULL commission
                commission_amount: partnerCommission,
                // Traaaction fee = 15% of HT (separate from commission)
                platform_fee: traaactionFee,
                commission_rate: missionReward,
                commission_type: type,
                currency: currency.toUpperCase(),
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
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
        await updatePartnerBalance(partnerId)

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

        if (commission.status === 'PENDING' || commission.status === 'PROCEED') {
            // Not yet paid - simply delete the commission
            await prisma.commission.delete({
                where: { id: commission.id }
            })
            console.log(`[Commission] 🔙 Deleted ${commission.status} commission ${commission.id} due to refund`)

        } else if (commission.status === 'COMPLETE') {
            // Already paid - create negative balance entry by decrementing balance
            await prisma.partnerBalance.upsert({
                where: { partner_id: commission.partner_id },
                create: {
                    partner_id: commission.partner_id,
                    balance: -commission.commission_amount, // Negative balance
                    pending: 0,
                    due: 0,
                    paid_total: 0
                },
                update: {
                    balance: { decrement: commission.commission_amount }
                }
            })

            // Delete the commission after adjusting balance
            await prisma.commission.delete({
                where: { id: commission.id }
            })

            console.log(`[Commission] 🔙 Clawed back COMPLETE commission ${commission.id} - created negative balance`)
        }

        // Update partner balance
        await updatePartnerBalance(commission.partner_id)

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
export async function updatePartnerBalance(partnerId: string): Promise<void> {
    try {
        // Aggregate commission amounts by status
        const aggregates = await prisma.commission.groupBy({
            by: ['status'],
            where: { partner_id: partnerId },
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
        await prisma.partnerBalance.upsert({
            where: { partner_id: partnerId },
            create: {
                partner_id: partnerId,
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
 * Find partner by click attribution
 * Uses link_id → MissionEnrollment → user_id → Partner
 * OR affiliateId directly (could be Partner.id or Partner.user_id)
 */
export async function findPartnerForSale(params: {
    linkId?: string | null
    affiliateId?: string | null
    programId: string
}): Promise<string | null> {
    const { linkId, affiliateId, programId } = params

    try {
        // Case 1: Direct affiliate ID provided
        if (affiliateId) {
            // Try 1: affiliateId is Partner.id directly
            const partnerById = await prisma.partner.findFirst({
                where: {
                    id: affiliateId,
                    program_id: programId,
                    status: 'APPROVED'
                }
            })
            if (partnerById) {
                console.log(`[Commission] 🔗 Found partner ${partnerById.id} by direct id`)
                return partnerById.id
            }

            // Try 2: affiliateId is Partner.user_id
            const partnerByUserId = await prisma.partner.findFirst({
                where: {
                    program_id: programId,
                    user_id: affiliateId,
                    status: 'APPROVED'
                }
            })
            if (partnerByUserId) {
                console.log(`[Commission] 🔗 Found partner ${partnerByUserId.id} by user_id ${affiliateId}`)
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
                const partner = await prisma.partner.findFirst({
                    where: {
                        program_id: programId,
                        user_id: userId,
                        status: 'APPROVED'
                    }
                })
                if (partner) {
                    console.log(`[Commission] 🔗 Found partner ${partner.id} via link ${linkId}`)
                    return partner.id
                }
            }
        }

        console.log(`[Commission] ⚠️ No approved partner found for link=${linkId}, affiliate=${affiliateId}`)
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
                    await updatePartnerBalance(commission.partner_id)

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
