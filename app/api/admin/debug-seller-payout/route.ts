/**
 * Debug endpoint to diagnose seller payout issues
 * GET /api/admin/debug-seller-payout?sellerId=xxx
 *
 * This endpoint shows the complete state of a seller's payout configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    const sellerId = request.nextUrl.searchParams.get('sellerId')

    try {
        // If no sellerId provided, list all sellers with their payout config
        if (!sellerId) {
            const sellers = await prisma.seller.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    payout_method: true,
                    stripe_connect_id: true,
                    payouts_enabled_at: true,
                    status: true,
                },
                orderBy: { created_at: 'desc' },
                take: 20
            })

            return NextResponse.json({
                success: true,
                message: 'Add ?sellerId=xxx to get detailed info',
                sellers: sellers.map(s => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    payout_method: s.payout_method,
                    has_stripe_connect: !!s.stripe_connect_id,
                    stripe_connect_id: s.stripe_connect_id,
                    payouts_enabled: !!s.payouts_enabled_at,
                    status: s.status,
                    // Flag issues
                    issues: [
                        s.payout_method === 'STRIPE_CONNECT' && !s.stripe_connect_id ? 'NO_STRIPE_ID' : null,
                        s.payout_method !== 'STRIPE_CONNECT' && s.stripe_connect_id ? 'HAS_STRIPE_BUT_METHOD_NOT_SET' : null,
                    ].filter(Boolean)
                }))
            })
        }

        // Get detailed seller info
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                Commissions: {
                    orderBy: { created_at: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        commission_amount: true,
                        status: true,
                        startup_payment_status: true,
                        startup_payment_id: true,
                        paid_at: true,
                        created_at: true
                    }
                }
            }
        })

        if (!seller) {
            return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
        }

        // Get seller balance separately (not a direct relation)
        const sellerBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: sellerId }
        })

        // Check Stripe Connect status if configured
        let stripeAccountStatus = null
        if (seller.stripe_connect_id) {
            try {
                const account = await stripe.accounts.retrieve(seller.stripe_connect_id)
                stripeAccountStatus = {
                    id: account.id,
                    charges_enabled: account.charges_enabled,
                    payouts_enabled: account.payouts_enabled,
                    details_submitted: account.details_submitted,
                    type: account.type,
                    country: account.country,
                }
            } catch (e) {
                stripeAccountStatus = { error: 'Failed to retrieve account' }
            }
        }

        // Check platform balance
        const balance = await stripe.balance.retrieve()

        // Analyze issues
        const issues: string[] = []

        if (seller.payout_method !== 'STRIPE_CONNECT') {
            issues.push(`payout_method is '${seller.payout_method}', not 'STRIPE_CONNECT'`)
        }

        if (!seller.stripe_connect_id) {
            issues.push('No stripe_connect_id configured')
        }

        if (stripeAccountStatus && !stripeAccountStatus.payouts_enabled) {
            issues.push('Stripe account payouts_enabled is false (but we skip this in test mode)')
        }

        const availableBalance = balance.available.find(b => b.currency === 'eur')?.amount || 0
        if (availableBalance === 0) {
            issues.push('Platform has 0 EUR available balance - Stripe will reject transfers!')
        }

        const totalDueCommissions = seller.Commissions
            .filter(c => c.status === 'PROCEED' || (c.status === 'COMPLETE' && !c.paid_at))
            .reduce((sum, c) => sum + c.commission_amount, 0)

        if (totalDueCommissions < 1000) {
            issues.push(`Total due commissions (${totalDueCommissions / 100}€) is below minimum 10€`)
        }

        return NextResponse.json({
            success: true,
            seller: {
                id: seller.id,
                name: seller.name,
                email: seller.email,
                payout_method: seller.payout_method,
                stripe_connect_id: seller.stripe_connect_id,
                payouts_enabled_at: seller.payouts_enabled_at,
                status: seller.status
            },
            balance: sellerBalance ? {
                pending: `${sellerBalance.pending / 100}€`,
                due: `${sellerBalance.due / 100}€`,
                balance: `${sellerBalance.balance / 100}€`,
                paid_total: `${sellerBalance.paid_total / 100}€`
            } : null,
            stripeAccount: stripeAccountStatus,
            platformBalance: {
                available: `${availableBalance / 100}€`,
                pending: `${balance.pending.find(b => b.currency === 'eur')?.amount || 0 / 100}€`
            },
            recentCommissions: seller.Commissions.map(c => ({
                id: c.id,
                amount: `${c.commission_amount / 100}€`,
                status: c.status,
                startup_payment_status: c.startup_payment_status,
                has_startup_payment_id: !!c.startup_payment_id,
                paid_at: c.paid_at,
                created_at: c.created_at
            })),
            issues: issues.length > 0 ? issues : ['No issues found - payout should work!'],
            canTransfer: issues.length === 0 || (issues.length === 1 && issues[0].includes('payouts_enabled'))
        })
    } catch (error) {
        console.error('[Debug Seller Payout] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
