/**
 * Migration Script: Create Workspaces for existing data
 * 
 * Run this BEFORE adding FK constraints:
 * npx tsx scripts/migrate-to-workspaces.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import { nanoid } from 'nanoid'

// Setup same as lib/db.ts
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🚀 Starting workspace migration...')

    // 1. Get all unique workspace_ids from existing tables
    const shortLinks = await prisma.$queryRaw<{ workspace_id: string }[]>`
        SELECT DISTINCT workspace_id FROM "ShortLink" WHERE workspace_id IS NOT NULL
    `
    const apiKeys = await prisma.$queryRaw<{ workspace_id: string }[]>`
        SELECT DISTINCT workspace_id FROM "ApiKey" WHERE workspace_id IS NOT NULL
    `
    const webhooks = await prisma.$queryRaw<{ workspace_id: string }[]>`
        SELECT DISTINCT workspace_id FROM "WebhookEndpoint" WHERE workspace_id IS NOT NULL
    `
    const missions = await prisma.$queryRaw<{ workspace_id: string }[]>`
        SELECT DISTINCT workspace_id FROM "Mission" WHERE workspace_id IS NOT NULL
    `

    // Collect all unique workspace_ids (these are currently user IDs)
    const allWorkspaceIds = new Set<string>()
    for (const row of [...shortLinks, ...apiKeys, ...webhooks, ...missions]) {
        if (row.workspace_id) {
            allWorkspaceIds.add(row.workspace_id)
        }
    }

    console.log(`📊 Found ${allWorkspaceIds.size} unique workspace_ids to migrate`)

    // 2. Create Workspace for each unique ID
    for (const userId of allWorkspaceIds) {
        // Check if workspace already exists with this ID
        const existing = await prisma.workspace.findUnique({
            where: { id: userId }
        })

        if (existing) {
            console.log(`⏭️  Workspace already exists: ${userId}`)
            continue
        }

        // Generate unique slug
        const baseSlug = `ws-${nanoid(8)}`

        // Create workspace with SAME ID as old workspace_id
        // This way we don't need to update any FK references!
        const workspace = await prisma.workspace.create({
            data: {
                id: userId, // Reuse the same ID!
                name: 'My Workspace',
                slug: baseSlug,
                owner_id: userId,
            }
        })

        // Create workspace member as owner
        await prisma.workspaceMember.create({
            data: {
                workspace_id: workspace.id,
                user_id: userId,
                role: 'OWNER',
            }
        })

        console.log(`✅ Created workspace ${workspace.id} for user ${userId}`)
    }

    console.log('🎉 Migration complete!')
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
