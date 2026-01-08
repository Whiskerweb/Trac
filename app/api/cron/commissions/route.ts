import { NextResponse } from 'next/server'
import { processMaturedCommissions, getCommissionStats } from '@/lib/commission/worker'

export const dynamic = 'force-dynamic'

// Vercel Cron secret for security
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Vercel Cron Endpoint for Commission Maturation
 * 
 * Runs daily to transition PENDING commissions (>30 days) to DUE
 * Secured by CRON_SECRET header
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/commissions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
    // Verify cron secret (Vercel adds this header)
    const authHeader = request.headers.get('authorization')

    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.log('[Cron] ❌ Unauthorized request to commission cron')
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    console.log('[Cron] 🚀 Starting commission maturation cron job...')

    try {
        // Get stats before processing
        const statsBefore = await getCommissionStats()
        console.log('[Cron] 📊 Stats before:', statsBefore)

        // Process matured commissions
        const result = await processMaturedCommissions()

        // Get stats after processing
        const statsAfter = await getCommissionStats()
        console.log('[Cron] 📊 Stats after:', statsAfter)

        return NextResponse.json({
            success: true,
            processed: result.processed,
            errors: result.errors,
            stats: {
                before: statsBefore,
                after: statsAfter
            },
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        console.error('[Cron] ❌ Commission cron failed:', error)
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
