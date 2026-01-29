/**
 * Debug endpoint to list recent Stripe Transfers
 * GET /api/admin/debug-transfers
 *
 * This endpoint lists the last 10 transfers to verify payouts are working
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET() {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        // List recent transfers
        const transfers = await stripe.transfers.list({
            limit: 10,
        })

        // Format for readability
        const formattedTransfers = transfers.data.map(t => ({
            id: t.id,
            amount: `${t.amount / 100}€`,
            destination: t.destination,
            created: new Date(t.created * 1000).toISOString(),
            metadata: t.metadata,
            status: t.reversed ? 'reversed' : 'completed'
        }))

        // Also get balance to see available funds
        const balance = await stripe.balance.retrieve()

        return NextResponse.json({
            success: true,
            transfers: formattedTransfers,
            transferCount: transfers.data.length,
            balance: {
                available: balance.available.map(b => `${b.amount / 100} ${b.currency.toUpperCase()}`),
                pending: balance.pending.map(b => `${b.amount / 100} ${b.currency.toUpperCase()}`)
            },
            message: transfers.data.length === 0
                ? 'No transfers found. Verify the payout flow is being triggered.'
                : `Found ${transfers.data.length} transfers`
        })
    } catch (error) {
        console.error('[Debug Transfers] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
