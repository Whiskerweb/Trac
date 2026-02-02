/**
 * Admin Seller Detail API
 *
 * GET /api/admin/sellers/[sellerId] - Get detailed seller info with full history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sellerId: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { sellerId } = await params

        // Get seller with profile
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                Profile: true,
            }
        })

        // Get balance separately (no back-relation on Seller)
        const sellerBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: sellerId }
        })

        if (!seller) {
            return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
        }

        // Get all commissions with workspace (startup) info
        const commissions = await prisma.commission.findMany({
            where: { seller_id: sellerId },
            orderBy: { created_at: 'desc' },
            take: 100
        })

        // Get workspace info for commissions
        const workspaceIds = [...new Set(commissions.map(c => c.program_id).filter(Boolean))]
        const workspaces = await prisma.workspace.findMany({
            where: { id: { in: workspaceIds as string[] } },
            select: { id: true, name: true, slug: true }
        })
        const workspaceMap = new Map(workspaces.map(w => [w.id, w]))

        // Format commissions with startup info
        const formattedCommissions = commissions.map(c => ({
            id: c.id,
            saleId: c.sale_id,
            grossAmount: c.gross_amount,
            netAmount: c.net_amount,
            commissionAmount: c.commission_amount,
            platformFee: c.platform_fee,
            status: c.status,
            startupPaymentStatus: c.startup_payment_status,
            holdDays: c.hold_days,
            createdAt: c.created_at.toISOString(),
            maturedAt: c.matured_at?.toISOString() || null,
            paidAt: c.paid_at?.toISOString() || null,
            // Startup info
            startup: c.program_id ? {
                id: c.program_id,
                name: workspaceMap.get(c.program_id)?.name || 'Unknown',
                slug: workspaceMap.get(c.program_id)?.slug || null,
            } : null,
            // Recurring info
            subscriptionId: c.subscription_id,
            recurringMonth: c.recurring_month,
        }))

        // Get wallet ledger (for PLATFORM sellers)
        const ledgerEntries = await prisma.walletLedger.findMany({
            where: { seller_id: sellerId },
            orderBy: { created_at: 'desc' },
            take: 50
        })

        const formattedLedger = ledgerEntries.map(l => ({
            id: l.id,
            type: l.entry_type,
            amount: l.amount,
            balanceAfter: l.balance_after,
            referenceType: l.reference_type,
            referenceId: l.reference_id,
            description: l.description,
            createdAt: l.created_at.toISOString(),
        }))

        // Get gift card redemptions
        const giftCards = await prisma.giftCardRedemption.findMany({
            where: { seller_id: sellerId },
            orderBy: { created_at: 'desc' },
            take: 20
        })

        const formattedGiftCards = giftCards.map(g => ({
            id: g.id,
            cardType: g.card_type,
            amount: g.amount,
            status: g.status,
            createdAt: g.created_at.toISOString(),
            fulfilledAt: g.fulfilled_at?.toISOString() || null,
        }))

        // Calculate ledger balance
        let ledgerBalance = 0
        if (ledgerEntries.length > 0) {
            const credits = ledgerEntries.filter(l => l.entry_type === 'CREDIT').reduce((sum, l) => sum + l.amount, 0)
            const debits = ledgerEntries.filter(l => l.entry_type === 'DEBIT').reduce((sum, l) => sum + l.amount, 0)
            ledgerBalance = credits - debits
        }

        // Check for balance discrepancy
        const storedBalance = sellerBalance?.balance || 0
        const hasDiscrepancy = ledgerBalance !== storedBalance && seller.payout_method === 'PLATFORM'

        // Stats summary
        const stats = {
            totalCommissions: commissions.length,
            pendingCommissions: commissions.filter(c => c.status === 'PENDING').length,
            proceedCommissions: commissions.filter(c => c.status === 'PROCEED').length,
            completeCommissions: commissions.filter(c => c.status === 'COMPLETE').length,
            totalEarned: commissions.reduce((sum, c) => sum + c.commission_amount, 0),
            totalPlatformFees: commissions.reduce((sum, c) => sum + c.platform_fee, 0),
            uniqueStartups: new Set(commissions.map(c => c.program_id).filter(Boolean)).size,
        }

        // Get startups this seller has worked with
        const startupStats = new Map<string, { name: string; commissions: number; earned: number }>()
        for (const c of commissions) {
            if (c.program_id) {
                const ws = workspaceMap.get(c.program_id)
                const existing = startupStats.get(c.program_id) || { name: ws?.name || 'Unknown', commissions: 0, earned: 0 }
                existing.commissions++
                existing.earned += c.commission_amount
                startupStats.set(c.program_id, existing)
            }
        }

        return NextResponse.json({
            success: true,
            seller: {
                id: seller.id,
                email: seller.email,
                name: seller.name,
                status: seller.status,
                payoutMethod: seller.payout_method,
                hasStripeConnect: !!seller.stripe_connect_id,
                stripeConnectId: seller.stripe_connect_id,
                payoutsEnabled: !!seller.payouts_enabled_at,
                payoutsEnabledAt: seller.payouts_enabled_at?.toISOString() || null,
                onboardingStep: seller.onboarding_step,
                createdAt: seller.created_at.toISOString(),

                // Profile
                profile: seller.Profile ? {
                    bio: seller.Profile.bio,
                    tiktok: seller.Profile.tiktok_url,
                    instagram: seller.Profile.instagram_url,
                    twitter: seller.Profile.twitter_url,
                    youtube: seller.Profile.youtube_url,
                    website: seller.Profile.website_url,
                    profileScore: seller.Profile.profile_score,
                } : null,

                // Balance
                balance: {
                    stored: storedBalance,
                    ledger: ledgerBalance,
                    hasDiscrepancy,
                    pending: sellerBalance?.pending || 0,
                    due: sellerBalance?.due || 0,
                    paidTotal: sellerBalance?.paid_total || 0,
                }
            },
            stats,
            startups: Array.from(startupStats.entries()).map(([id, data]) => ({
                id,
                name: data.name,
                commissions: data.commissions,
                earned: data.earned,
            })),
            commissions: formattedCommissions,
            ledger: formattedLedger,
            giftCards: formattedGiftCards,
        })

    } catch (error) {
        console.error('[AdminSellerDetail] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
