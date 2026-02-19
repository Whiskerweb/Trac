/**
 * Migration script: Copy workspace-level portal referral rates to per-mission referral fields.
 *
 * For workspaces with portal_referral_enabled: true,
 * copies the rates to all their portal_exclusive ACTIVE missions.
 *
 * Usage: npx tsx scripts/migrate-referral-to-missions.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('[Migration] Starting referral workspace → mission migration...\n')

    // Find all workspaces with portal referral enabled
    const workspaces = await prisma.workspace.findMany({
        where: { portal_referral_enabled: true },
        select: {
            id: true,
            name: true,
            portal_referral_gen1_rate: true,
            portal_referral_gen2_rate: true,
            portal_referral_gen3_rate: true,
        },
    })

    console.log(`[Migration] Found ${workspaces.length} workspace(s) with portal referral enabled.\n`)

    let totalMissions = 0

    for (const ws of workspaces) {
        console.log(`[Migration] Workspace: ${ws.name} (${ws.id})`)
        console.log(`  Rates: gen1=${ws.portal_referral_gen1_rate}, gen2=${ws.portal_referral_gen2_rate}, gen3=${ws.portal_referral_gen3_rate}`)

        // Find portal-exclusive active missions for this workspace
        const missions = await prisma.mission.findMany({
            where: {
                workspace_id: ws.id,
                status: 'ACTIVE',
                portal_exclusive: true,
                referral_enabled: false, // Only migrate if not already set
            },
            select: { id: true, title: true },
        })

        if (missions.length === 0) {
            console.log('  No eligible missions to migrate.\n')
            continue
        }

        for (const mission of missions) {
            await prisma.mission.update({
                where: { id: mission.id },
                data: {
                    referral_enabled: true,
                    referral_gen1_rate: ws.portal_referral_gen1_rate,
                    referral_gen2_rate: ws.portal_referral_gen2_rate,
                    referral_gen3_rate: ws.portal_referral_gen3_rate,
                },
            })
            console.log(`  ✅ Migrated mission: ${mission.title} (${mission.id})`)
            totalMissions++
        }

        console.log()
    }

    console.log(`[Migration] Done. Migrated ${totalMissions} mission(s) across ${workspaces.length} workspace(s).`)
}

main()
    .catch((e) => {
        console.error('[Migration] Error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
