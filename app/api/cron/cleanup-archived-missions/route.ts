/**
 * Cleanup Archived Missions Cron Job
 *
 * Runs daily to hard-delete missions archived for 30+ days.
 * Preserves commissions (legal/accounting obligation) by detaching link_id.
 * Deletes: MissionContent, MissionEnrollment, ProgramRequest (cascade),
 *          OrganizationMission, GroupMission, Customer, ShortLink.
 *
 * Call via: GET /api/cron/cleanup-archived-missions
 * Secure with CRON_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function cleanupArchivedMissions() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Backfill: missions ARCHIVED without archived_at → set to now()
    const backfilled = await prisma.mission.updateMany({
        where: { status: 'ARCHIVED', archived_at: null },
        data: { archived_at: new Date() }
    })

    // Find missions archived 30+ days ago
    const expiredMissions = await prisma.mission.findMany({
        where: {
            status: 'ARCHIVED',
            archived_at: { not: null, lte: thirtyDaysAgo }
        },
        include: {
            MissionEnrollment: {
                select: { link_id: true }
            }
        }
    })

    let deletedCount = 0
    const errors: string[] = []

    for (const mission of expiredMissions) {
        try {
            const linkIds = mission.MissionEnrollment
                .map(e => e.link_id)
                .filter((id): id is string => id !== null)

            // 1. Detach commissions from links (preserve for accounting)
            if (linkIds.length > 0) {
                await prisma.commission.updateMany({
                    where: { link_id: { in: linkIds } },
                    data: { link_id: null }
                })
            }

            // 2. Delete OrganizationMissions
            await prisma.organizationMission.deleteMany({
                where: { mission_id: mission.id }
            })

            // 3. Delete GroupMissions
            await prisma.groupMission.deleteMany({
                where: { mission_id: mission.id }
            })

            // 4. Delete Customers attributed to these links (RGPD)
            if (linkIds.length > 0) {
                await prisma.customer.deleteMany({
                    where: { link_id: { in: linkIds } }
                })
            }

            // 5. Delete ShortLinks
            if (linkIds.length > 0) {
                await prisma.shortLink.deleteMany({
                    where: { id: { in: linkIds } }
                })
            }

            // 6. Delete Mission (cascades: MissionContent, MissionEnrollment, ProgramRequest)
            await prisma.mission.delete({
                where: { id: mission.id }
            })

            deletedCount++
            console.log(`[CleanupArchived] Deleted mission ${mission.id} (${mission.title})`)
        } catch (error) {
            const msg = `Failed to delete mission ${mission.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            console.error(`[CleanupArchived] ${msg}`)
            errors.push(msg)
        }
    }

    return {
        backfilled: backfilled.count,
        expired: expiredMissions.length,
        deleted: deletedCount,
        errors
    }
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await cleanupArchivedMissions()

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error('[CleanupArchived] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
