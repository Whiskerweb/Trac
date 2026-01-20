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
    partner_id: string
    partner_name: string
    sale_id: string
    net_amount: number
    commission_amount: number
    platform_fee: number
    created_at: Date
    status: string
}

export interface PartnerSummary {
    partner_id: string
    partner_name: string
    commission_count: number
    total_commission: number
    total_platform_fee: number
}

export async function getUnpaidCommissions(): Promise<{
    success: boolean
    commissions?: UnpaidCommission[]
    partnerSummary?: PartnerSummary[]
    totals?: {
        partnerTotal: number
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
                Partner: true
            },
            orderBy: { created_at: 'desc' }
        })

        // Map to response format
        const mapped: UnpaidCommission[] = commissions.map(c => ({
            id: c.id,
            partner_id: c.partner_id,
            partner_name: c.Partner.name || c.Partner.email,
            sale_id: c.sale_id,
            net_amount: c.net_amount,
            commission_amount: c.commission_amount,
            platform_fee: c.platform_fee,
            created_at: c.created_at,
            status: c.status
        }))

        // Group by partner
        const partnerMap = new Map<string, PartnerSummary>()
        for (const c of mapped) {
            const existing = partnerMap.get(c.partner_id)
            if (existing) {
                existing.commission_count++
                existing.total_commission += c.commission_amount
                existing.total_platform_fee += c.platform_fee
            } else {
                partnerMap.set(c.partner_id, {
                    partner_id: c.partner_id,
                    partner_name: c.partner_name,
                    commission_count: 1,
                    total_commission: c.commission_amount,
                    total_platform_fee: c.platform_fee
                })
            }
        }

        const partnerSummary = Array.from(partnerMap.values())

        // Calculate totals
        const partnerTotal = mapped.reduce((sum, c) => sum + c.commission_amount, 0)
        const platformTotal = mapped.reduce((sum, c) => sum + c.platform_fee, 0)

        return {
            success: true,
            commissions: mapped,
            partnerSummary,
            totals: {
                partnerTotal,
                platformTotal,
                grandTotal: partnerTotal + platformTotal,
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
        const partnerTotal = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
        const platformTotal = commissions.reduce((sum, c) => sum + c.platform_fee, 0)
        const grandTotal = partnerTotal + platformTotal

        // Create StartupPayment record
        const payment = await prisma.startupPayment.create({
            data: {
                workspace_id: workspace.workspaceId,
                total_amount: grandTotal,
                partner_total: partnerTotal,
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
                            name: `Partner Commissions (${commissions.length} ventes)`,
                            description: 'Paiement des commissions partenaires'
                        },
                        unit_amount: partnerTotal
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
        // Update payment status
        const payment = await prisma.startupPayment.update({
            where: { id: paymentId },
            data: {
                status: 'PAID',
                stripe_payment_id: stripePaymentId,
                paid_at: new Date()
            }
        })

        // Mark all linked commissions as PAID
        await prisma.commission.updateMany({
            where: { startup_payment_id: paymentId },
            data: { startup_payment_status: 'PAID' }
        })

        console.log(`[Payouts] ✅ Payment ${paymentId} confirmed: ${payment.commission_count} commissions`)

        revalidatePath('/dashboard/payouts')
        return true
    } catch (err) {
        console.error('[Payouts] Error confirming payment:', err)
        return false
    }
}
