/**
 * Commission Maturation Cron Job
 * 
 * Runs daily to mature PENDING commissions that have passed their hold period.
 * PENDING → PROCEED after hold_days (default 7 days)
 * 
 * Call via: GET /api/cron/mature-commissions
 * Secure with CRON_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server'
import { matureCommissions } from '@/lib/commission-engine'

// =============================================
// CRON HANDLER
// =============================================

export async function GET(request: NextRequest) {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const maturedCount = await matureCommissions()

        return NextResponse.json({
            success: true,
            maturedCount,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('[CronMatureCommissions] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Disable static optimization for cron endpoint
export const dynamic = 'force-dynamic'
