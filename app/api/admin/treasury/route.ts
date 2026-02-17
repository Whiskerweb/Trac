/**
 * Admin Treasury API
 *
 * GET /api/admin/treasury - Get reconciliation data for PLATFORM seller funds
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all PLATFORM sellers with their balances
        const platformSellers = await prisma.seller.findMany({
            where: { payout_method: 'PLATFORM' },
            include: { Profile: true }
        })

        const sellerIds = platformSellers.map(s => s.id)

        // Get balances for these sellers
        const balances = await prisma.sellerBalance.findMany({
            where: { seller_id: { in: sellerIds } }
        })

        const balanceMap = new Map(balances.map(b => [b.seller_id, b]))

        // Calculate totals from balances
        let totalOwedToSellers = 0
        let totalPending = 0
        let totalDue = 0
        let totalPaidOut = 0

        const sellersWithBalances = platformSellers.map(seller => {
            const balance = balanceMap.get(seller.id)
            const available = balance?.balance || 0
            const pending = balance?.pending || 0
            const due = balance?.due || 0
            const paidTotal = balance?.paid_total || 0

            totalOwedToSellers += available
            totalPending += pending
            totalDue += due
            totalPaidOut += paidTotal

            return {
                id: seller.id,
                name: seller.name,
                email: seller.email,
                balance: available,
                pending,
                due,
                paidTotal,
                createdAt: seller.created_at.toISOString()
            }
        })

        // Get startup payments (money received from startups)
        const startupPayments = await prisma.startupPayment.findMany({
            where: { status: 'PAID' },
            select: {
                id: true,
                partner_total: true,
                platform_total: true,
                total_amount: true,
                created_at: true
            }
        })

        const totalReceivedFromStartups = startupPayments.reduce((sum, p) => sum + p.partner_total, 0)
        const totalPlatformFees = startupPayments.reduce((sum, p) => sum + p.platform_total, 0)

        // Get gift card redemptions (money paid out as gift cards)
        const giftCardRedemptions = await prisma.giftCardRedemption.findMany({
            where: { status: 'DELIVERED' },
            select: { amount: true }
        })

        const totalGiftCardsPaid = giftCardRedemptions.reduce((sum, g) => sum + g.amount, 0)

        // Get Stripe Connect transfers (money transferred to connected accounts)
        // This is tracked in commissions with status COMPLETE and sellers with STRIPE_CONNECT
        const stripeConnectCommissions = await prisma.commission.findMany({
            where: {
                status: 'COMPLETE',
                Seller: { payout_method: 'STRIPE_CONNECT' }
            },
            select: { commission_amount: true }
        })

        const totalStripeConnectTransfers = stripeConnectCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

        // Wallet ledger summary for PLATFORM sellers
        const ledgerEntries = await prisma.walletLedger.findMany({
            where: { seller_id: { in: sellerIds } },
            orderBy: { created_at: 'desc' },
            take: 100 // Last 100 entries for display
        })

        const credits = ledgerEntries.filter(l => l.entry_type === 'CREDIT').reduce((sum, l) => sum + l.amount, 0)
        const debits = ledgerEntries.filter(l => l.entry_type === 'DEBIT').reduce((sum, l) => sum + l.amount, 0)
        const ledgerNetBalance = credits - debits

        // Reconciliation
        // Expected funds = Money received for PLATFORM sellers - Money paid out (gift cards)
        // We need to calculate how much of startup payments went to PLATFORM sellers specifically
        const platformSellerCommissions = await prisma.commission.findMany({
            where: {
                seller_id: { in: sellerIds },
                startup_payment_status: 'PAID',
                referral_generation: null // Exclure referral (finance par Traaaction, pas StartupPayment)
            },
            select: { commission_amount: true }
        })

        const totalReceivedForPlatformSellers = platformSellerCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

        // Referral commissions funded by Traaaction's margin (not by startups)
        const platformReferralCommissions = await prisma.commission.findMany({
            where: {
                seller_id: { in: sellerIds },
                referral_generation: { not: null }
            },
            select: { commission_amount: true }
        })
        const totalReferralFunded = platformReferralCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

        // Net position = What we received for PLATFORM sellers - What we paid out (gift cards)
        const netPosition = totalReceivedForPlatformSellers - totalGiftCardsPaid

        // Reconciliation check: Does net position match total owed?
        const isReconciled = Math.abs(netPosition - totalOwedToSellers) < 100 // Allow 1€ tolerance for rounding

        return NextResponse.json({
            success: true,
            treasury: {
                // Summary
                totalOwedToSellers,      // What we owe to PLATFORM sellers (sum of balances)
                totalPending,            // Commissions still in hold period
                totalDue,                // Ready to be paid out
                totalPaidOut,            // Total ever paid out

                // Inflows
                totalReceivedFromStartups,        // Total partner_total from all startups
                totalReceivedForPlatformSellers,  // Portion that went to PLATFORM sellers
                totalPlatformFees,                // Our cut (15%)

                // Outflows
                totalGiftCardsPaid,              // Gift cards delivered
                totalStripeConnectTransfers,      // Sent to Stripe Connect accounts
                totalReferralFunded,             // Referral commissions funded by Traaaction margin

                // Reconciliation
                netPosition,             // Should equal totalOwedToSellers if reconciled
                isReconciled,
                discrepancy: netPosition - totalOwedToSellers,

                // Ledger summary
                ledger: {
                    totalCredits: credits,
                    totalDebits: debits,
                    netBalance: ledgerNetBalance
                }
            },
            sellers: sellersWithBalances.sort((a, b) => b.balance - a.balance),
            recentLedgerEntries: ledgerEntries.map(l => ({
                id: l.id,
                sellerId: l.seller_id,
                type: l.entry_type,
                amount: l.amount,
                referenceType: l.reference_type,
                description: l.description,
                balanceAfter: l.balance_after,
                createdAt: l.created_at.toISOString()
            })),
            startupPaymentsCount: startupPayments.length,
            platformSellersCount: platformSellers.length
        })
    } catch (error) {
        console.error('[Treasury] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
