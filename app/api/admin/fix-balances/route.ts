/**
 * Admin Endpoint: Fix All Seller Balances
 * POST /api/admin/fix-balances
 *
 * Recalculates pending/due/paid_total for all sellers based on commission statuses.
 * Use this to fix inconsistent balance data.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateSellerBalance } from '@/lib/commission/engine'

export async function POST() {
    try {
        console.log('[Fix Balances] Starting balance recalculation for all sellers...')

        // Get all sellers with commissions
        const sellers = await prisma.seller.findMany({
            where: {
                Commissions: {
                    some: {}
                }
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        })

        console.log(`[Fix Balances] Found ${sellers.length} sellers with commissions`)

        const results = []

        for (const seller of sellers) {
            try {
                // Get current balance before fix
                const beforeBalance = await prisma.sellerBalance.findUnique({
                    where: { seller_id: seller.id }
                })

                // Recalculate balance
                await updateSellerBalance(seller.id)

                // Get balance after fix
                const afterBalance = await prisma.sellerBalance.findUnique({
                    where: { seller_id: seller.id }
                })

                results.push({
                    sellerId: seller.id,
                    sellerName: seller.name || seller.email,
                    before: beforeBalance ? {
                        pending: `${beforeBalance.pending / 100}€`,
                        due: `${beforeBalance.due / 100}€`,
                        balance: `${beforeBalance.balance / 100}€`,
                        paid_total: `${beforeBalance.paid_total / 100}€`
                    } : null,
                    after: afterBalance ? {
                        pending: `${afterBalance.pending / 100}€`,
                        due: `${afterBalance.due / 100}€`,
                        balance: `${afterBalance.balance / 100}€`,
                        paid_total: `${afterBalance.paid_total / 100}€`
                    } : null,
                    status: 'fixed'
                })

                console.log(`[Fix Balances] ✅ Fixed balance for ${seller.name || seller.email}`)
            } catch (err) {
                console.error(`[Fix Balances] ❌ Failed to fix balance for ${seller.id}:`, err)
                results.push({
                    sellerId: seller.id,
                    sellerName: seller.name || seller.email,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Unknown error'
                })
            }
        }

        console.log(`[Fix Balances] ✅ Completed. Fixed ${results.filter(r => r.status === 'fixed').length}/${sellers.length} sellers`)

        return NextResponse.json({
            success: true,
            totalSellers: sellers.length,
            fixed: results.filter(r => r.status === 'fixed').length,
            errors: results.filter(r => r.status === 'error').length,
            results
        })
    } catch (error) {
        console.error('[Fix Balances] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// GET endpoint to preview what would be fixed
export async function GET() {
    try {
        // Get all sellers with their balances and commission aggregates
        const sellers = await prisma.seller.findMany({
            where: {
                Commissions: {
                    some: {}
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                Commissions: {
                    select: {
                        status: true,
                        commission_amount: true
                    }
                }
            }
        })

        const preview = await Promise.all(sellers.map(async (seller) => {
            // Get current balance
            const currentBalance = await prisma.sellerBalance.findUnique({
                where: { seller_id: seller.id }
            })

            // Calculate expected balance from commissions
            let expectedPending = 0
            let expectedDue = 0
            let expectedPaid = 0

            for (const commission of seller.Commissions) {
                if (commission.status === 'PENDING') expectedPending += commission.commission_amount
                else if (commission.status === 'PROCEED') expectedDue += commission.commission_amount
                else if (commission.status === 'COMPLETE') expectedPaid += commission.commission_amount
            }

            const current = {
                pending: currentBalance?.pending || 0,
                due: currentBalance?.due || 0,
                balance: currentBalance?.balance || 0,
                paid_total: currentBalance?.paid_total || 0
            }

            const expected = {
                pending: expectedPending,
                due: expectedDue,
                balance: expectedDue, // balance = due in updateSellerBalance logic
                paid_total: expectedPaid
            }

            const needsFix =
                current.pending !== expected.pending ||
                current.due !== expected.due ||
                current.paid_total !== expected.paid_total

            return {
                sellerId: seller.id,
                sellerName: seller.name || seller.email,
                current: {
                    pending: `${current.pending / 100}€`,
                    due: `${current.due / 100}€`,
                    balance: `${current.balance / 100}€`,
                    paid_total: `${current.paid_total / 100}€`
                },
                expected: {
                    pending: `${expected.pending / 100}€`,
                    due: `${expected.due / 100}€`,
                    balance: `${expected.balance / 100}€`,
                    paid_total: `${expected.paid_total / 100}€`
                },
                needsFix
            }
        }))

        const needsFixCount = preview.filter(p => p.needsFix).length

        return NextResponse.json({
            success: true,
            totalSellers: sellers.length,
            needsFix: needsFixCount,
            message: needsFixCount > 0
                ? `${needsFixCount} sellers have incorrect balances. POST to this endpoint to fix.`
                : 'All seller balances are correct.',
            preview
        })
    } catch (error) {
        console.error('[Fix Balances] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
