// Commission Engine - Utility Functions for API Routes

import { prisma } from '@/lib/db'
import { CommissionType, CommissionStatus } from '@/lib/generated/prisma/client'

// =============================================
// COMMISSION ENGINE (Dub.co Style)
// =============================================

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
}): Promise<{ success: boolean; commission?: { id: string; commission_amount: number }; error?: string }> {
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
        currency
    } = params

    try {
        // Calculate commission
        const { amount, type } = calculateCommission({ netAmount, missionReward })

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
                commission_amount: amount,
                commission_rate: missionReward,
                commission_type: type,
                currency: currency.toUpperCase(),
                status: 'PENDING'
            },
            update: {} // No update on duplicate - idempotent
        })

        console.log(`[Commission] ✅ Created commission ${result.id} for partner ${partnerId}: ${amount / 100}€`)

        // Update partner's pending balance
        await updatePartnerBalance(partnerId)

        return { success: true, commission: result }

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
