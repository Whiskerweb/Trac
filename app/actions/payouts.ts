'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { revalidatePath } from 'next/cache'

// =============================================
// GET UNPAID COMMISSIONS FOR STARTUP
// =============================================

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

export async function getUnpaidCommissions(): Promise<{
    success: boolean
    commissions?: UnpaidCommission[]
    sellerSummary?: SellerSummary[]
    totals?: {
        sellerTotal: number
        platformTotal: number
        grandTotal: number
        commissionCount: number
    }
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

        // Get all UNPAID commissions for this workspace (matured = PROCEED status)
        const commissions = await prisma.commission.findMany({
            where: {
                program_id: workspace.workspaceId,
                startup_payment_status: 'UNPAID',
                status: 'PROCEED' // Only matured commissions
            },
            include: {
                Seller: true
            },
            orderBy: { created_at: 'desc' }
        })

        // Map to response format
        const mapped: UnpaidCommission[] = commissions.map(c => ({
            id: c.id,
            seller_id: c.seller_id,
            seller_name: c.Seller.name || c.Seller.email,
            sale_id: c.sale_id,
            net_amount: c.net_amount,
            commission_amount: c.commission_amount,
            platform_fee: c.platform_fee,
            created_at: c.created_at,
            status: c.status
        }))

        // Group by seller
        const sellerMap = new Map<string, SellerSummary>()
        for (const c of mapped) {
            const existing = sellerMap.get(c.seller_id)
            if (existing) {
                existing.commission_count++
                existing.total_commission += c.commission_amount
                existing.total_platform_fee += c.platform_fee
            } else {
                sellerMap.set(c.seller_id, {
                    seller_id: c.seller_id,
                    seller_name: c.seller_name,
                    commission_count: 1,
                    total_commission: c.commission_amount,
                    total_platform_fee: c.platform_fee
                })
            }
        }

        const sellerSummary = Array.from(sellerMap.values())

        // Calculate totals
        const sellerTotal = mapped.reduce((sum, c) => sum + c.commission_amount, 0)
        const platformTotal = mapped.reduce((sum, c) => sum + c.platform_fee, 0)

        return {
            success: true,
            commissions: mapped,
            sellerSummary,
            totals: {
                sellerTotal,
                platformTotal,
                grandTotal: sellerTotal + platformTotal,
                commissionCount: mapped.length
            }
        }
    } catch (err) {
        console.error('[Payouts] Error fetching unpaid commissions:', err)
        return { success: false, error: 'Failed to fetch commissions' }
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
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts?success=true&payment_id=${payment.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts?canceled=true`,
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
        // IDEMPOTENCE: Check if already processed
        const existing = await prisma.startupPayment.findUnique({
            where: { id: paymentId },
            select: { status: true }
        })

        if (existing?.status === 'PAID') {
            console.log(`[Payouts] Payment ${paymentId} already confirmed, skipping`)
            return true
        }

        if (!existing) {
            console.error(`[Payouts] Payment ${paymentId} not found`)
            return false
        }

        // Update payment status
        const payment = await prisma.startupPayment.update({
            where: { id: paymentId },
            data: {
                status: 'PAID',
                stripe_payment_id: stripePaymentId,
                paid_at: new Date()
            }
        })

        // Mark all linked commissions as PAID and COMPLETE
        await prisma.commission.updateMany({
            where: { startup_payment_id: paymentId },
            data: {
                startup_payment_status: 'PAID',
                status: 'COMPLETE',
                paid_at: new Date()
            }
        })

        console.log(`[Payouts] ✅ Payment ${paymentId} confirmed: ${payment.commission_count} commissions → COMPLETE`)

        revalidatePath('/dashboard/payouts')
        revalidatePath('/dashboard/commissions')
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

