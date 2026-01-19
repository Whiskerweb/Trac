/**
 * Commission Engine
 * 
 * Calculates partner commissions based on mission configuration.
 * Handles:
 * - Flat (€) vs Percentage (%) commissions
 * - Platform fee (15%)
 * - Lead vs Sale reward types
 * - Recurring subscription tracking
 */

import { prisma } from '@/lib/db'

// =============================================
// TYPES
// =============================================

export interface SaleEvent {
    /** Gross amount in cents */
    grossAmount: number
    /** Net amount after Stripe fees in cents */
    netAmount: number
    /** Stripe fee in cents */
    stripeFee: number
    /** Customer ID (for attribution) */
    customerId: string
    /** ShortLink ID that generated this sale */
    linkId?: string
    /** Partner/Affiliate ID */
    affiliateId?: string
    /** Stripe event ID for idempotency */
    stripeEventId: string
    /** Currency code */
    currency: string
    /** Is this a recurring payment? */
    isRecurring: boolean
    /** Stripe subscription ID (for recurring) */
    subscriptionId?: string
    /** Invoice number in subscription (1, 2, 3...) */
    invoiceNumber?: number
}

export interface CommissionResult {
    /** What partner receives in cents */
    partnerAmount: number
    /** What Traaaction receives in cents (15%) */
    platformFee: number
    /** Commission type for record */
    commissionType: 'FIXED' | 'PERCENTAGE'
    /** Commission rate display string */
    commissionRate: string
    /** Should create commission (false if max months exceeded) */
    shouldCreate: boolean
    /** Reason if shouldCreate is false */
    skipReason?: string
}

// =============================================
// PLATFORM FEE RATE
// =============================================

const PLATFORM_FEE_RATE = 0.15 // 15%

// =============================================
// COMMISSION CALCULATION
// =============================================

/**
 * Calculate commission for a sale event based on mission configuration
 */
export async function calculateCommission(
    missionId: string,
    sale: SaleEvent
): Promise<CommissionResult | null> {
    // Fetch mission with reward configuration
    const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        select: {
            id: true,
            reward_type: true,
            reward_structure: true,
            reward_amount: true,
            commission_structure: true,
            recurring_duration: true,
        }
    })

    if (!mission) {
        console.error('[CommissionEngine] Mission not found:', missionId)
        return null
    }

    // Calculate platform fee (15% of net amount)
    const platformFee = Math.round(sale.netAmount * PLATFORM_FEE_RATE)

    // =============================================
    // CHECK RECURRING LIMITS
    // =============================================

    if (sale.isRecurring && mission.recurring_duration !== null) {
        // recurring_duration = null means Lifetime (unlimited)
        // Otherwise, check if we've exceeded the max months
        const maxMonths = mission.recurring_duration

        if (maxMonths > 0 && sale.invoiceNumber && sale.invoiceNumber > maxMonths) {
            return {
                partnerAmount: 0,
                platformFee: 0,
                commissionType: 'FIXED',
                commissionRate: '0€',
                shouldCreate: false,
                skipReason: `Exceeded recurring limit (${sale.invoiceNumber}/${maxMonths} months)`
            }
        }
    }

    // =============================================
    // CALCULATE PARTNER AMOUNT
    // =============================================

    let partnerAmount: number
    let commissionType: 'FIXED' | 'PERCENTAGE'
    let commissionRate: string

    // For LEAD type, always use flat amount
    if (mission.reward_type === 'LEAD') {
        // Lead reward is in euros, convert to cents
        partnerAmount = Math.round(mission.reward_amount * 100)
        commissionType = 'FIXED'
        commissionRate = `${mission.reward_amount}€`
    }
    // For SALE type, check structure
    else if (mission.reward_structure === 'FLAT') {
        // Flat reward in euros, convert to cents
        partnerAmount = Math.round(mission.reward_amount * 100)
        commissionType = 'FIXED'
        commissionRate = `${mission.reward_amount}€`
    }
    else {
        // Percentage of net amount
        const percentage = mission.reward_amount / 100
        partnerAmount = Math.round(sale.netAmount * percentage)
        commissionType = 'PERCENTAGE'
        commissionRate = `${mission.reward_amount}%`
    }

    return {
        partnerAmount,
        platformFee,
        commissionType,
        commissionRate,
        shouldCreate: true
    }
}

// =============================================
// CREATE COMMISSION RECORD
// =============================================

interface CreateCommissionParams {
    partnerId: string
    programId: string
    missionId: string
    sale: SaleEvent
    calculation: CommissionResult
    holdDays?: number
}

/**
 * Create a commission record in the database
 */
export async function createCommissionRecord(params: CreateCommissionParams) {
    const {
        partnerId,
        programId,
        sale,
        calculation,
        holdDays = 7
    } = params

    // Check if commission already exists (idempotency)
    const existing = await prisma.commission.findUnique({
        where: { sale_id: sale.stripeEventId }
    })

    if (existing) {
        console.log('[CommissionEngine] Commission already exists:', existing.id)
        return existing
    }

    // Create commission record
    const commission = await prisma.commission.create({
        data: {
            partner_id: partnerId,
            program_id: programId,
            sale_id: sale.stripeEventId,
            link_id: sale.linkId,
            gross_amount: sale.grossAmount,
            net_amount: sale.netAmount,
            stripe_fee: sale.stripeFee,
            commission_amount: calculation.partnerAmount,
            platform_fee: calculation.platformFee,
            commission_rate: calculation.commissionRate,
            commission_type: calculation.commissionType,
            currency: sale.currency,
            status: 'PENDING',
            hold_days: holdDays,
            // Recurring tracking
            subscription_id: sale.subscriptionId,
            recurring_month: sale.invoiceNumber,
            recurring_max: null, // Will be set from mission if needed
        }
    })

    console.log('[CommissionEngine] ✅ Commission created:', {
        id: commission.id,
        partner: partnerId,
        amount: `${calculation.partnerAmount / 100}€`,
        platformFee: `${calculation.platformFee / 100}€`,
        type: calculation.commissionType,
        recurring: sale.isRecurring ? `Month ${sale.invoiceNumber}` : 'One-time'
    })

    // Update partner balance (pending)
    await updatePartnerBalance(partnerId, calculation.partnerAmount, 'pending')

    return commission
}

// =============================================
// PARTNER BALANCE MANAGEMENT
// =============================================

/**
 * Update partner balance based on commission changes
 */
async function updatePartnerBalance(
    partnerId: string,
    amount: number,
    type: 'pending' | 'due' | 'paid' | 'clawback'
) {
    // Upsert balance record
    await prisma.partnerBalance.upsert({
        where: { partner_id: partnerId },
        create: {
            partner_id: partnerId,
            pending: type === 'pending' ? amount : 0,
            due: type === 'due' ? amount : 0,
            paid_total: type === 'paid' ? amount : 0,
            balance: type === 'clawback' ? -amount : 0,
        },
        update: {
            pending: type === 'pending' ? { increment: amount } : undefined,
            due: type === 'due' ? { increment: amount } : undefined,
            paid_total: type === 'paid' ? { increment: amount } : undefined,
            balance: type === 'clawback' ? { decrement: amount } : undefined,
        }
    })
}

// =============================================
// COMMISSION MATURATION
// =============================================

/**
 * Mature pending commissions that have passed their hold period
 * Called by cron job daily
 */
export async function matureCommissions() {
    const now = new Date()

    // Find all PENDING commissions where hold period has passed
    const pendingCommissions = await prisma.commission.findMany({
        where: {
            status: 'PENDING',
        }
    })

    let maturedCount = 0

    for (const commission of pendingCommissions) {
        const createdAt = new Date(commission.created_at)
        const holdEndDate = new Date(createdAt)
        holdEndDate.setDate(holdEndDate.getDate() + commission.hold_days)

        if (now >= holdEndDate) {
            // Transition to PROCEED
            await prisma.commission.update({
                where: { id: commission.id },
                data: {
                    status: 'PROCEED',
                    matured_at: now
                }
            })

            // Update balance: move from pending to due
            await prisma.partnerBalance.update({
                where: { partner_id: commission.partner_id },
                data: {
                    pending: { decrement: commission.commission_amount },
                    due: { increment: commission.commission_amount }
                }
            })

            maturedCount++
        }
    }

    console.log(`[CommissionEngine] ✅ Matured ${maturedCount} commissions`)
    return maturedCount
}

// =============================================
// CLAWBACK (REFUND HANDLING)
// =============================================

/**
 * Handle refund by creating clawback
 */
export async function handleRefund(saleId: string, reason: string) {
    const commission = await prisma.commission.findUnique({
        where: { sale_id: saleId }
    })

    if (!commission) {
        console.log('[CommissionEngine] No commission found for refund:', saleId)
        return null
    }

    // Update commission status
    await prisma.commission.update({
        where: { id: commission.id },
        data: {
            status: 'PENDING', // Reset status based on existing enum
            clawback_at: new Date(),
            clawback_reason: reason
        }
    })

    // Deduct from partner balance
    await prisma.partnerBalance.update({
        where: { partner_id: commission.partner_id },
        data: {
            balance: { decrement: commission.commission_amount },
            // Also reduce pending/due based on previous status
            pending: commission.status === 'PENDING'
                ? { decrement: commission.commission_amount }
                : undefined,
            due: commission.status === 'PROCEED'
                ? { decrement: commission.commission_amount }
                : undefined,
        }
    })

    console.log('[CommissionEngine] ⚠️ Clawback created:', {
        commissionId: commission.id,
        amount: `${commission.commission_amount / 100}€`,
        reason
    })

    return commission
}
