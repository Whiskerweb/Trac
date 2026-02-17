/**
 * Migration script: Convert campaign strings on ShortLink to MarketingCampaign entities
 *
 * 1. Query distinct (workspace_id, campaign) on ShortLink where campaign is not null
 * 2. Create a MarketingCampaign per unique pair
 * 3. Update each ShortLink to set campaign_id
 *
 * Usage: npx tsx scripts/migrate-campaigns.ts
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
    console.log('🔄 Starting campaign migration...\n')

    // 1. Find all distinct (workspace_id, campaign) pairs
    const links = await prisma.shortLink.findMany({
        where: {
            campaign: { not: null },
            link_type: 'marketing',
        },
        select: {
            workspace_id: true,
            campaign: true,
        },
        distinct: ['workspace_id', 'campaign'],
    })

    console.log(`Found ${links.length} unique workspace/campaign pairs\n`)

    let created = 0
    let updated = 0

    for (const { workspace_id, campaign } of links) {
        if (!campaign) continue

        // 2. Create MarketingCampaign (upsert to be safe)
        const existing = await prisma.marketingCampaign.findUnique({
            where: { workspace_id_name: { workspace_id, name: campaign } },
        })

        let campaignId: string
        if (existing) {
            campaignId = existing.id
            console.log(`  ⏭️  Campaign "${campaign}" already exists in workspace ${workspace_id.slice(0, 8)}...`)
        } else {
            const newCampaign = await prisma.marketingCampaign.create({
                data: {
                    name: campaign,
                    workspace_id,
                    status: 'ACTIVE',
                },
            })
            campaignId = newCampaign.id
            created++
            console.log(`  ✅ Created campaign "${campaign}" in workspace ${workspace_id.slice(0, 8)}...`)
        }

        // 3. Update all ShortLinks with this campaign string in this workspace
        const result = await prisma.shortLink.updateMany({
            where: {
                workspace_id,
                campaign,
                link_type: 'marketing',
                campaign_id: null, // Only update if not already set
            },
            data: { campaign_id: campaignId },
        })
        updated += result.count
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`   Campaigns created: ${created}`)
    console.log(`   Links updated: ${updated}`)
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error('❌ Migration failed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
