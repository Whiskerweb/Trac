/**
 * Admin endpoint to fix sellers with Stripe Connect but wrong payout_method
 * POST /api/admin/fix-seller-payout-methods
 *
 * This is a one-time fix for sellers who connected Stripe before the bug fix
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        // Find all sellers with Stripe Connect but payout_method not set correctly
        const sellersToFix = await prisma.seller.findMany({
            where: {
                stripe_connect_id: { not: null },
                payout_method: { not: 'STRIPE_CONNECT' }
            },
            select: {
                id: true,
                name: true,
                email: true,
                stripe_connect_id: true,
                payout_method: true
            }
        })

        if (sellersToFix.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No sellers need fixing',
                fixed: 0
            })
        }

        // Fix them all
        const result = await prisma.seller.updateMany({
            where: {
                stripe_connect_id: { not: null },
                payout_method: { not: 'STRIPE_CONNECT' }
            },
            data: {
                payout_method: 'STRIPE_CONNECT'
            }
        })

        return NextResponse.json({
            success: true,
            message: `Fixed ${result.count} sellers`,
            fixed: result.count,
            sellersFixed: sellersToFix.map(s => ({
                id: s.id,
                name: s.name,
                email: s.email,
                stripe_connect_id: s.stripe_connect_id,
                old_payout_method: s.payout_method,
                new_payout_method: 'STRIPE_CONNECT'
            }))
        })
    } catch (error) {
        console.error('[Fix Seller Payout Methods] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// GET to preview what would be fixed
export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const sellersToFix = await prisma.seller.findMany({
            where: {
                stripe_connect_id: { not: null },
                payout_method: { not: 'STRIPE_CONNECT' }
            },
            select: {
                id: true,
                name: true,
                email: true,
                stripe_connect_id: true,
                payout_method: true
            }
        })

        return NextResponse.json({
            success: true,
            message: sellersToFix.length > 0
                ? `Found ${sellersToFix.length} sellers to fix. POST to this endpoint to fix them.`
                : 'No sellers need fixing',
            count: sellersToFix.length,
            sellers: sellersToFix
        })
    } catch (error) {
        console.error('[Fix Seller Payout Methods] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
