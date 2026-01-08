import { NextResponse } from 'next/server'
import { processAllPayouts } from '@/lib/commission/payout'

export const dynamic = 'force-dynamic'

// Vercel Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Vercel Cron Endpoint for Batched Payouts
 * 
 * Runs weekly (Monday 6 AM) to process all DUE commissions
 * Aggregates payouts per partner to minimize Stripe fees
 * 
 * Secured by CRON_SECRET header
 */
export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.log('[Cron] ❌ Unauthorized request to payout cron')
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    console.log('[Cron] 🚀 Starting batched payout cron job...')

    try {
        const result = await processAllPayouts()

        return NextResponse.json({
            success: true,
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            totalAmount: result.totalAmount,
            totalAmountFormatted: `${(result.totalAmount / 100).toFixed(2)}€`,
            results: result.results.map(r => ({
                partnerId: r.partnerId,
                success: r.success,
                transferId: r.transferId,
                amount: r.amount ? `${(r.amount / 100).toFixed(2)}€` : undefined,
                error: r.error
            })),
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('[Cron] ❌ Payout cron failed:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        )
    }
}
