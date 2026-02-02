/**
 * Admin Gift Cards API
 *
 * GET /api/admin/gift-cards - List all gift card redemptions
 * POST /api/admin/gift-cards - Process redemption (deliver or fail)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

// Admin email whitelist (should match layout.tsx)
const ADMIN_EMAILS = [
    'lucas@traaaction.com',
    'admin@traaaction.com',
    'lucas.music.manager@gmail.com',
]

// =============================================
// GET - List all redemptions
// =============================================

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check admin access
        if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all redemptions with seller info
        const redemptions = await prisma.giftCardRedemption.findMany({
            orderBy: { created_at: 'desc' },
            take: 100
        })

        // Get seller info for each redemption
        const sellerIds = [...new Set(redemptions.map(r => r.seller_id))]
        const sellers = await prisma.seller.findMany({
            where: { id: { in: sellerIds } },
            select: { id: true, email: true, name: true }
        })
        const sellerMap = new Map(sellers.map(s => [s.id, s]))

        const enrichedRedemptions = redemptions.map(r => ({
            id: r.id,
            seller_id: r.seller_id,
            seller_email: sellerMap.get(r.seller_id)?.email || 'Unknown',
            seller_name: sellerMap.get(r.seller_id)?.name || null,
            card_type: r.card_type,
            amount: r.amount,
            status: r.status,
            gift_card_code: r.gift_card_code,
            created_at: r.created_at.toISOString(),
            delivered_at: r.delivered_at?.toISOString() || null
        }))

        return NextResponse.json({
            success: true,
            redemptions: enrichedRedemptions
        })

    } catch (error) {
        console.error('[AdminGiftCards] GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// =============================================
// POST - Process redemption
// =============================================

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check admin access
        if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const body = await request.json()
        const { redemptionId, action, code } = body

        if (!redemptionId || !action) {
            return NextResponse.json(
                { error: 'redemptionId and action required' },
                { status: 400 }
            )
        }

        const redemption = await prisma.giftCardRedemption.findUnique({
            where: { id: redemptionId }
        })

        if (!redemption) {
            return NextResponse.json(
                { error: 'Redemption not found' },
                { status: 404 }
            )
        }

        if (redemption.status !== 'PENDING' && redemption.status !== 'PROCESSING') {
            return NextResponse.json(
                { error: `Cannot process redemption in ${redemption.status} status` },
                { status: 400 }
            )
        }

        if (action === 'deliver') {
            if (!code?.trim()) {
                return NextResponse.json(
                    { error: 'Gift card code required' },
                    { status: 400 }
                )
            }

            // Mark as delivered
            await prisma.giftCardRedemption.update({
                where: { id: redemptionId },
                data: {
                    status: 'DELIVERED',
                    gift_card_code: code.trim(),
                    delivered_at: new Date()
                }
            })

            console.log('[AdminGiftCards] Delivered:', {
                redemptionId,
                sellerId: redemption.seller_id,
                amount: redemption.amount / 100 + '€',
                cardType: redemption.card_type
            })

            // TODO: Send notification email to seller with the code

            return NextResponse.json({
                success: true,
                message: 'Gift card delivered'
            })

        } else if (action === 'fail') {
            // Mark as failed and refund the balance
            await prisma.$transaction(async (tx) => {
                // Update redemption status
                await tx.giftCardRedemption.update({
                    where: { id: redemptionId },
                    data: { status: 'FAILED' }
                })

                // Get current ledger balance
                const ledgerEntries = await tx.walletLedger.groupBy({
                    by: ['entry_type'],
                    where: { seller_id: redemption.seller_id },
                    _sum: { amount: true }
                })

                let credits = 0, debits = 0
                for (const row of ledgerEntries) {
                    if (row.entry_type === 'CREDIT') credits = row._sum.amount || 0
                    if (row.entry_type === 'DEBIT') debits = row._sum.amount || 0
                }
                const currentLedgerBalance = credits - debits

                // Create CREDIT entry to refund
                const newBalance = currentLedgerBalance + redemption.amount
                await tx.walletLedger.create({
                    data: {
                        seller_id: redemption.seller_id,
                        entry_type: 'CREDIT',
                        amount: redemption.amount,
                        reference_type: 'REFUND',
                        reference_id: `refund_${redemptionId}`,
                        balance_after: newBalance,
                        description: `Refund failed gift card: ${redemption.card_type} - ${redemption.amount / 100}€`
                    }
                })

                // Update seller balance
                await tx.sellerBalance.update({
                    where: { seller_id: redemption.seller_id },
                    data: { balance: newBalance }
                })
            })

            console.log('[AdminGiftCards] Failed & Refunded:', {
                redemptionId,
                sellerId: redemption.seller_id,
                amount: redemption.amount / 100 + '€'
            })

            return NextResponse.json({
                success: true,
                message: 'Gift card marked as failed, balance refunded'
            })

        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "deliver" or "fail"' },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error('[AdminGiftCards] POST error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
