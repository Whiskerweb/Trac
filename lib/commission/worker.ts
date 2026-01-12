// Commission Worker - Maturation Cron Functions

import { prisma } from '@/lib/db'
import { CommissionStatus } from '@/lib/generated/prisma/client'
import { updatePartnerBalance } from './engine'

// =============================================
// COMMISSION MATURATION WORKER
// =============================================

const MATURATION_DAYS = 30

/**
 * Process all PENDING commissions older than 30 days
 * Transitions them to PROCEED status
 * 
 * This should be called daily via Vercel Cron
 */
export async function processMaturedCommissions(): Promise<{
    processed: number
    errors: number
}> {
    console.log('[Worker] 🕐 Starting commission maturation process...')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - MATURATION_DAYS)

    let processed = 0
    let errors = 0

    try {
        // Find all PENDING commissions older than 30 days
        const pendingCommissions = await prisma.commission.findMany({
            where: {
                status: 'PENDING',
                created_at: { lt: cutoffDate }
            },
            include: { Partner: true }
        })

        console.log(`[Worker] 📋 Found ${pendingCommissions.length} commissions to mature`)

        // Track unique partners to update their balances
        const partnerIds = new Set<string>()

        for (const commission of pendingCommissions) {
            try {
                await prisma.commission.update({
                    where: { id: commission.id },
                    data: {
                        status: 'PROCEED' as CommissionStatus,
                        matured_at: new Date()
                    }
                })

                partnerIds.add(commission.partner_id)
                processed++

                console.log(`[Worker] ✅ Matured commission ${commission.id} → PROCEED (${commission.commission_amount / 100}€)`)

            } catch (err) {
                errors++
                console.error(`[Worker] ❌ Failed to mature commission ${commission.id}:`, err)
            }
        }

        // Update all affected partner balances
        for (const partnerId of partnerIds) {
            try {
                await updatePartnerBalance(partnerId)
            } catch (err) {
                console.error(`[Worker] ⚠️ Failed to update balance for partner ${partnerId}:`, err)
            }
        }

        console.log(`[Worker] ✅ Maturation complete: ${processed} processed, ${errors} errors`)

    } catch (error) {
        console.error('[Worker] ❌ Fatal error in maturation process:', error)
        errors++
    }

    return { processed, errors }
}

/**
 * Get commission statistics for monitoring
 */
export async function getCommissionStats(): Promise<{
    pending: { count: number; total: number }
    proceed: { count: number; total: number }
    complete: { count: number; total: number }
}> {
    const stats = await prisma.commission.groupBy({
        by: ['status'],
        _count: true,
        _sum: { commission_amount: true }
    })

    const result = {
        pending: { count: 0, total: 0 },
        proceed: { count: 0, total: 0 },
        complete: { count: 0, total: 0 }
    }

    for (const stat of stats) {
        const key = stat.status.toLowerCase() as keyof typeof result
        if (result[key]) {
            result[key] = {
                count: stat._count,
                total: stat._sum.commission_amount || 0
            }
        }
    }

    return result
}
