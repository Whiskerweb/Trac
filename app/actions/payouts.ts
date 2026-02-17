'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { revalidatePath } from 'next/cache'
import { updateSellerBalance } from '@/lib/commission/engine'
import { recordLedgerEntry } from '@/lib/payout-service'

// =============================================
// GET UNPAID COMMISSIONS FOR STARTUP
// =============================================

// Minimum payout threshold in cents (10€)
const MIN_PAYOUT_THRESHOLD = 1000

export interface UnpaidCommission {
    id: string
    seller_id: string
    seller_name: string
    sale_id: string
    net_amount: number
    commission_amount: number
    platform_fee: number
    created_at: Date
    status: string
}

export interface SellerSummary {
    seller_id: string
    seller_name: string
    commission_count: number
    total_commission: number
    total_platform_fee: number
}

// New enhanced interface for the aggregated view
export interface SellerPayoutSummary {
    sellerId: string
    sellerName: string
    sellerEmail: string
    sellerAvatar?: string
    totalCommission: number      // Total commission in cents
    totalPlatformFee: number     // 15% platform fee in cents
    commissionCount: number
    commissions: {               // Details for modal
        id: string
        saleId: string
        amount: number           // in cents
        platformFee: number      // in cents
        date: string             // ISO string
    }[]
    meetsMinimum: boolean        // >= 1000 cents (10€)
}

export interface PayoutsDataResponse {
    success: boolean
    // Aggregated by seller
    eligibleSellers: SellerPayoutSummary[]    // Sellers with total >= 10€
    ineligibleSellers: SellerPayoutSummary[]  // Sellers with total < 10€
    // Totals (only for eligible sellers)
    totals: {
        sellerTotal: number      // Total seller commissions (eligible only)
        platformTotal: number    // Total platform fees (eligible only)
        grandTotal: number       // sellerTotal + platformTotal
        eligibleCount: number    // Number of eligible sellers
        ineligibleCount: number  // Number of sellers below threshold
        totalCommissions: number // Total number of commissions (eligible)
    }
    error?: string
}

export async function getUnpaidCommissions(): Promise<PayoutsDataResponse> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return {
                success: false,
                eligibleSellers: [],
                ineligibleSellers: [],
                totals: { sellerTotal: 0, platformTotal: 0, grandTotal: 0, eligibleCount: 0, ineligibleCount: 0, totalCommissions: 0 },
                error: 'Not authenticated'
            }
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return {
                success: false,
                eligibleSellers: [],
                ineligibleSellers: [],
                totals: { sellerTotal: 0, platformTotal: 0, grandTotal: 0, eligibleCount: 0, ineligibleCount: 0, totalCommissions: 0 },
                error: 'No active workspace'
            }
        }

        // Get all UNPAID commissions for this workspace (matured = PROCEED status)
        const commissions = await prisma.commission.findMany({
            where: {
                program_id: workspace.workspaceId,
                startup_payment_status: 'UNPAID',
                status: 'PROCEED' // Only matured commissions
            },
            include: {
                Seller: {
                    include: {
                        Profile: {
                            select: {
                                avatar_url: true
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Group by seller with full details
        const sellerMap = new Map<string, SellerPayoutSummary>()

        for (const c of commissions) {
            const sellerId = c.seller_id
            const existing = sellerMap.get(sellerId)

            const commissionDetail = {
                id: c.id,
                saleId: c.sale_id,
                amount: c.commission_amount,
                platformFee: c.platform_fee,
                date: c.created_at.toISOString()
            }

            if (existing) {
                existing.commissionCount++
                existing.totalCommission += c.commission_amount
                existing.totalPlatformFee += c.platform_fee
                existing.commissions.push(commissionDetail)
            } else {
                sellerMap.set(sellerId, {
                    sellerId,
                    sellerName: c.Seller.name || c.Seller.email.split('@')[0],
                    sellerEmail: c.Seller.email,
                    sellerAvatar: c.Seller.Profile?.avatar_url || undefined,
                    totalCommission: c.commission_amount,
                    totalPlatformFee: c.platform_fee,
                    commissionCount: 1,
                    commissions: [commissionDetail],
                    meetsMinimum: false // Will be set below
                })
            }
        }

        // Split into eligible (>= 10€) and ineligible (< 10€)
        const eligibleSellers: SellerPayoutSummary[] = []
        const ineligibleSellers: SellerPayoutSummary[] = []

        for (const seller of sellerMap.values()) {
            seller.meetsMinimum = seller.totalCommission >= MIN_PAYOUT_THRESHOLD

            if (seller.meetsMinimum) {
                eligibleSellers.push(seller)
            } else {
                ineligibleSellers.push(seller)
            }
        }

        // Sort by total commission descending
        eligibleSellers.sort((a, b) => b.totalCommission - a.totalCommission)
        ineligibleSellers.sort((a, b) => b.totalCommission - a.totalCommission)

        // Calculate totals for ELIGIBLE sellers only
        const sellerTotal = eligibleSellers.reduce((sum, s) => sum + s.totalCommission, 0)
        const platformTotal = eligibleSellers.reduce((sum, s) => sum + s.totalPlatformFee, 0)
        const totalCommissions = eligibleSellers.reduce((sum, s) => sum + s.commissionCount, 0)

        return {
            success: true,
            eligibleSellers,
            ineligibleSellers,
            totals: {
                sellerTotal,
                platformTotal,
                grandTotal: sellerTotal + platformTotal,
                eligibleCount: eligibleSellers.length,
                ineligibleCount: ineligibleSellers.length,
                totalCommissions
            }
        }
    } catch (err) {
        console.error('[Payouts] Error fetching unpaid commissions:', err)
        return {
            success: false,
            eligibleSellers: [],
            ineligibleSellers: [],
            totals: { sellerTotal: 0, platformTotal: 0, grandTotal: 0, eligibleCount: 0, ineligibleCount: 0, totalCommissions: 0 },
            error: 'Failed to fetch commissions'
        }
    }
}

// =============================================
// CREATE PAYMENT SESSION
// =============================================

export async function createPaymentSession(commissionIds: string[]): Promise<{
    success: boolean
    checkoutUrl?: string
    error?: string
}> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'No active workspace' }
        }

        // SECURITY: Verify all commissions belong to this workspace
        const commissions = await prisma.commission.findMany({
            where: {
                id: { in: commissionIds },
                program_id: workspace.workspaceId,
                startup_payment_status: 'UNPAID',
                status: 'PROCEED'
            }
        })

        if (commissions.length !== commissionIds.length) {
            return { success: false, error: 'Invalid commission selection' }
        }

        // Calculate totals (server-side recalculation for security)
        const sellerTotal = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
        const platformTotal = commissions.reduce((sum, c) => sum + c.platform_fee, 0)
        const grandTotal = sellerTotal + platformTotal

        // Create StartupPayment record
        const payment = await prisma.startupPayment.create({
            data: {
                workspace_id: workspace.workspaceId,
                total_amount: grandTotal,
                partner_total: sellerTotal,
                platform_total: platformTotal,
                commission_count: commissions.length,
                status: 'PENDING'
            }
        })

        // Link commissions to payment (optimistic)
        await prisma.commission.updateMany({
            where: { id: { in: commissionIds } },
            data: { startup_payment_id: payment.id }
        })

        // Create Stripe Checkout session
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Seller Commissions (${commissions.length} ventes)`,
                            description: 'Paiement des commissions sellers'
                        },
                        unit_amount: sellerTotal
                    },
                    quantity: 1
                },
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Frais Traaaction (15%)',
                            description: 'Frais de plateforme'
                        },
                        unit_amount: platformTotal
                    },
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pipeline?success=true&payment_id=${payment.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pipeline?canceled=true`,
            metadata: {
                startup_payment_id: payment.id,
                workspace_id: workspace.workspaceId,
                type: 'startup_payout'
            }
        })

        // Save session ID for webhook verification
        await prisma.startupPayment.update({
            where: { id: payment.id },
            data: { stripe_session_id: session.id }
        })

        return { success: true, checkoutUrl: session.url! }
    } catch (err) {
        console.error('[Payouts] Error creating payment session:', err)
        return { success: false, error: 'Failed to create payment' }
    }
}

// =============================================
// CONFIRM PAYMENT (Called by webhook)
// =============================================

export async function confirmStartupPayment(paymentId: string, stripePaymentId: string): Promise<boolean> {
    try {
        // ATOMIC IDEMPOTENCY: Update status ONLY if currently PENDING
        // This prevents TOCTOU race condition (two webhooks reading PENDING simultaneously)
        const updateResult = await prisma.startupPayment.updateMany({
            where: {
                id: paymentId,
                status: 'PENDING'  // Only update if still PENDING (atomic check-and-set)
            },
            data: {
                status: 'PAID',
                stripe_payment_id: stripePaymentId,
                paid_at: new Date()
            }
        })

        // If no rows updated: either already PAID (idempotent) or not found
        if (updateResult.count === 0) {
            const existing = await prisma.startupPayment.findUnique({
                where: { id: paymentId },
                select: { status: true }
            })

            if (existing?.status === 'PAID') {
                console.log(`[Payouts] Payment ${paymentId} already confirmed, skipping`)
                return true
            }

            console.error(`[Payouts] Payment ${paymentId} not found or in unexpected status: ${existing?.status}`)
            return false
        }

        // Fetch the payment for subsequent processing
        const payment = await prisma.startupPayment.findUniqueOrThrow({
            where: { id: paymentId }
        })

        // Get all commissions linked to this payment
        const commissions = await prisma.commission.findMany({
            where: { startup_payment_id: paymentId },
            include: {
                Seller: {
                    select: {
                        id: true,
                        stripe_connect_id: true,
                        payout_method: true,
                        payouts_enabled_at: true
                    }
                }
            }
        })

        console.log(`[Payouts] Processing ${commissions.length} commissions for automatic payout`)

        // Group commissions by seller
        const commissionsBySeller = commissions.reduce((acc, comm) => {
            const sellerId = comm.seller_id
            if (!acc[sellerId]) {
                acc[sellerId] = {
                    seller: comm.Seller,
                    commissions: []
                }
            }
            acc[sellerId].commissions.push(comm)
            return acc
        }, {} as Record<string, { seller: any, commissions: typeof commissions }>)

        // Track successful and failed commission IDs
        const successfulCommissionIds: string[] = []
        const failedCommissionIds: string[] = []

        // Process each seller
        for (const [sellerId, data] of Object.entries(commissionsBySeller)) {
            const { seller, commissions: sellerCommissions } = data
            const totalAmount = sellerCommissions.reduce((sum, c) => sum + c.commission_amount, 0)
            const commissionIds = sellerCommissions.map(c => c.id)

            console.log(`[Payouts] Processing seller ${sellerId}: ${totalAmount / 100}€ (${sellerCommissions.length} commissions)`)

            // OPTION 1: Seller has Stripe Connect → Direct transfer
            if (seller.stripe_connect_id && seller.payout_method === 'STRIPE_CONNECT') {
                try {
                    const { dispatchPayout } = await import('@/lib/payout-service')

                    const result = await dispatchPayout({
                        sellerId,
                        amount: totalAmount,
                        commissionIds
                    })

                    if (result.success) {
                        console.log(`[Payouts] ✅ Stripe transfer ${result.transferId} sent to seller ${sellerId}`)
                        successfulCommissionIds.push(...commissionIds)
                    } else {
                        console.error(`[Payouts] ❌ Failed to transfer to seller ${sellerId}: ${result.error}`)
                        failedCommissionIds.push(...commissionIds)
                    }
                } catch (err) {
                    console.error(`[Payouts] Error dispatching payout to seller ${sellerId}:`, err)
                    failedCommissionIds.push(...commissionIds)
                }
            }
            // OPTION 2: No Stripe Connect → Add to platform wallet with ledger audit trail
            else {
                try {
                    console.log(`[Payouts] 💰 Seller ${sellerId} has no Stripe Connect, adding ${totalAmount / 100}€ to wallet`)

                    // Ensure SellerBalance exists
                    await prisma.sellerBalance.upsert({
                        where: { seller_id: sellerId },
                        create: {
                            seller_id: sellerId,
                            balance: 0,
                            pending: 0,
                            due: 0,
                            paid_total: 0
                        },
                        update: {}
                    })

                    // Record immutable ledger entry (audit trail)
                    const batchRefId = `startup_payout_${payment.id}_${sellerId}`
                    const { balanceAfter } = await recordLedgerEntry({
                        sellerId,
                        entryType: 'CREDIT',
                        amount: totalAmount,
                        referenceType: 'COMMISSION',
                        referenceId: batchRefId,
                        description: `Startup payout: ${sellerCommissions.length} commission(s) - ${totalAmount / 100}€`,
                    })

                    // Sync SellerBalance.balance with ledger
                    await prisma.sellerBalance.update({
                        where: { seller_id: sellerId },
                        data: { balance: balanceAfter }
                    })

                    console.log(`[Payouts] ✅ Added ${totalAmount / 100}€ to seller ${sellerId} platform wallet (ledger balance: ${balanceAfter / 100}€)`)
                    successfulCommissionIds.push(...commissionIds)
                } catch (err) {
                    console.error(`[Payouts] Error adding to wallet for seller ${sellerId}:`, err)
                    failedCommissionIds.push(...commissionIds)
                }
            }
        }

        // Mark SUCCESSFUL commissions as PAID and COMPLETE
        if (successfulCommissionIds.length > 0) {
            await prisma.commission.updateMany({
                where: { id: { in: successfulCommissionIds } },
                data: {
                    startup_payment_status: 'PAID',
                    status: 'COMPLETE',
                    paid_at: new Date()
                }
            })
            console.log(`[Payouts] ✅ ${successfulCommissionIds.length} commissions marked as COMPLETE`)
        }

        // Mark FAILED commissions - startup paid but transfer failed
        // Keep status as PROCEED so we can retry, but mark startup_payment_status as PAID
        if (failedCommissionIds.length > 0) {
            await prisma.commission.updateMany({
                where: { id: { in: failedCommissionIds } },
                data: {
                    startup_payment_status: 'PAID'
                    // status stays PROCEED, no paid_at - transfer failed!
                }
            })
            console.error(`[Payouts] ⚠️ ${failedCommissionIds.length} commissions: startup paid but transfer FAILED - need retry!`)
        }

        // Recalculate balances for ALL affected sellers
        // This ensures pending/due/paid_total are accurate
        const allSellerIds = Object.keys(commissionsBySeller)
        for (const sellerId of allSellerIds) {
            await updateSellerBalance(sellerId)
        }
        console.log(`[Payouts] ✅ Recalculated balances for ${allSellerIds.length} sellers`)

        console.log(`[Payouts] ✅ Payment ${paymentId} confirmed: ${successfulCommissionIds.length} succeeded, ${failedCommissionIds.length} failed`)

        revalidatePath('/dashboard/pipeline')
        revalidatePath('/seller/wallet')
        return true
    } catch (err) {
        console.error('[Payouts] Error confirming payment:', err)
        return false
    }
}

// =============================================
// GET PAYOUT HISTORY WITH PAGINATION
// =============================================

export interface PayoutItem {
    id: string
    period: string
    partnerId: string
    partnerName: string
    partnerAvatar: string
    status: 'pending' | 'completed'
    paidDate: string | null
    amount: number
    platformFee: number
    type: 'partner' | 'platform_fee'
}

export interface PayoutHistoryResponse {
    success: boolean
    payouts?: PayoutItem[]
    totals?: {
        pendingTotal: number
        paidTotal: number
        pendingCount: number
        paidCount: number
    }
    pagination?: {
        total: number
        page: number
        perPage: number
        totalPages: number
    }
    error?: string
}

export async function getPayoutHistory(page: number = 1, perPage: number = 10): Promise<PayoutHistoryResponse> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'No active workspace' }
        }

        // Get all commissions (both paid and unpaid) with pagination
        const [commissions, totalCount] = await Promise.all([
            prisma.commission.findMany({
                where: {
                    program_id: workspace.workspaceId,
                    status: 'PROCEED'
                },
                include: {
                    Seller: true,
                    StartupPayment: true
                },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * perPage,
                take: perPage
            }),
            prisma.commission.count({
                where: {
                    program_id: workspace.workspaceId,
                    status: 'PROCEED'
                }
            })
        ])

        // Get totals for stats
        const [pendingCommissions, paidCommissions] = await Promise.all([
            prisma.commission.aggregate({
                where: {
                    program_id: workspace.workspaceId,
                    status: 'PROCEED',
                    startup_payment_status: 'UNPAID'
                },
                _sum: { commission_amount: true, platform_fee: true },
                _count: true
            }),
            prisma.commission.aggregate({
                where: {
                    program_id: workspace.workspaceId,
                    status: 'PROCEED',
                    startup_payment_status: 'PAID'
                },
                _sum: { commission_amount: true, platform_fee: true },
                _count: true
            })
        ])

        // Helper to format date as period
        const formatPeriod = (date: Date) => {
            const start = new Date(date)
            start.setDate(start.getDate() - 30) // Assume 30-day period
            const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
            return `${start.toLocaleDateString('en-US', options)} - ${date.toLocaleDateString('en-US', options)}`
        }

        // Get initials from name
        const getInitials = (name: string) => {
            const parts = name.split(' ')
            return parts.length >= 2
                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                : name.substring(0, 2).toUpperCase()
        }

        // Format paid date
        const formatPaidDate = (date: Date | null) => {
            if (!date) return null
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }

        // Map to response format
        const payouts: PayoutItem[] = commissions.map(c => ({
            id: c.id,
            period: formatPeriod(c.created_at),
            partnerId: c.seller_id,
            partnerName: c.Seller.name || c.Seller.email,
            partnerAvatar: getInitials(c.Seller.name || c.Seller.email),
            status: c.startup_payment_status === 'PAID' ? 'completed' as const : 'pending' as const,
            paidDate: c.StartupPayment?.paid_at ? formatPaidDate(c.StartupPayment.paid_at) : null,
            amount: c.commission_amount / 100, // Convert from cents
            platformFee: c.platform_fee / 100,
            type: 'partner' as const
        }))

        return {
            success: true,
            payouts,
            totals: {
                pendingTotal: (pendingCommissions._sum.commission_amount || 0) / 100,
                paidTotal: (paidCommissions._sum.commission_amount || 0) / 100,
                pendingCount: pendingCommissions._count,
                paidCount: paidCommissions._count
            },
            pagination: {
                total: totalCount,
                page,
                perPage,
                totalPages: Math.ceil(totalCount / perPage)
            }
        }
    } catch (err) {
        console.error('[Payouts] Error fetching history:', err)
        return { success: false, error: 'Failed to fetch payout history' }
    }
}

// =============================================
// CHECK PAYMENT STATUS (For UI polling)
// =============================================

export type PaymentStatusResult = 'PENDING' | 'PAID' | 'UNKNOWN'

export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    try {
        const payment = await prisma.startupPayment.findUnique({
            where: { id: paymentId },
            select: { status: true }
        })

        if (!payment) {
            return 'UNKNOWN'
        }

        return payment.status as PaymentStatusResult
    } catch (err) {
        console.error('[Payouts] Error checking payment status:', err)
        return 'UNKNOWN'
    }
}

