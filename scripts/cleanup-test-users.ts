/**
 * Cleanup script: delete all test users EXCEPT yoann.artois@reevy.fr
 * Uses raw SQL for reliability
 * Usage: npx tsx scripts/cleanup-test-users.ts
 */

import { Pool } from 'pg'
import 'dotenv/config'

const KEEP_EMAIL = 'yoann.artois@reevy.fr'

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const client = await pool.connect()

    try {
        console.log(`\n🧹 Cleaning up all users except: ${KEEP_EMAIL}\n`)

        // Find keep user
        const keepUser = await client.query(`SELECT id FROM auth.users WHERE email = $1`, [KEEP_EMAIL])
        const keepUserId = keepUser.rows[0]?.id
        console.log(`Keep user ID: ${keepUserId || 'NOT FOUND'}`)

        // Find users to delete
        const usersToDelete = await client.query(`SELECT id, email FROM auth.users WHERE email != $1`, [KEEP_EMAIL])
        console.log(`\nFound ${usersToDelete.rows.length} auth users to delete:`)
        usersToDelete.rows.forEach((u: { id: string; email: string }) => console.log(`  - ${u.email} (${u.id})`))

        const deleteUserIds = usersToDelete.rows.map((u: { id: string }) => u.id)
        if (deleteUserIds.length === 0) {
            console.log('\nNo users to delete. Done!')
            return
        }

        // Find workspaces to delete
        const ws = await client.query(
            `SELECT id, name, slug FROM "Workspace" WHERE owner_id != $1 OR owner_id IS NULL`,
            [keepUserId]
        )
        console.log(`\nFound ${ws.rows.length} workspaces to delete:`)
        ws.rows.forEach((w: { name: string; slug: string }) => console.log(`  - ${w.name} (${w.slug})`))
        const wsIds = ws.rows.map((w: { id: string }) => w.id)

        // Find sellers to delete
        const sellers = await client.query(
            `SELECT id, email FROM "Seller" WHERE user_id != $1 OR user_id IS NULL`,
            [keepUserId]
        )
        console.log(`\nFound ${sellers.rows.length} sellers to delete:`)
        sellers.rows.forEach((s: { email: string }) => console.log(`  - ${s.email}`))
        const sellerIds = sellers.rows.map((s: { id: string }) => s.id)

        // ========== DELETE APP DATA ==========
        console.log('\n--- Deleting app data ---\n')

        // Helper: delete from table with array filter, skip if empty
        async function deleteWhere(table: string, column: string, ids: string[]) {
            if (ids.length === 0) return 0
            const r = await client.query(`DELETE FROM "${table}" WHERE "${column}" = ANY($1)`, [ids])
            return r.rowCount || 0
        }

        // Organizations
        let count = await deleteWhere('OrganizationMember', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} organization members`)
        count = await deleteWhere('Organization', 'leader_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} organizations`)

        // Messages (via conversations)
        if (sellerIds.length > 0 || wsIds.length > 0) {
            const convos = await client.query(
                `SELECT id FROM "Conversation" WHERE seller_id = ANY($1) OR workspace_id = ANY($2)`,
                [sellerIds, wsIds]
            )
            const convoIds = convos.rows.map((c: { id: string }) => c.id)
            count = await deleteWhere('Message', 'conversation_id', convoIds)
            if (count) console.log(`✓ Deleted ${count} messages`)
            count = await deleteWhere('Conversation', 'id', convoIds)
            if (count) console.log(`✓ Deleted ${count} conversations`)
        }

        // Commissions (seller or workspace via mission)
        if (sellerIds.length > 0) {
            count = await deleteWhere('Commission', 'seller_id', sellerIds)
            if (count) console.log(`✓ Deleted ${count} commissions (seller)`)
        }
        if (wsIds.length > 0) {
            const r = await client.query(
                `DELETE FROM "Commission" WHERE program_id IN (SELECT id FROM "Mission" WHERE workspace_id = ANY($1))`,
                [wsIds]
            )
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} commissions (workspace)`)
        }

        // Seller-related
        count = await deleteWhere('GiftCardRedemption', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} gift card redemptions`)
        count = await deleteWhere('WalletLedger', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} wallet ledger entries`)
        count = await deleteWhere('ProgramRequest', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} program requests (seller)`)
        count = await deleteWhere('SellerBalance', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} seller balances`)
        count = await deleteWhere('SellerProfile', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} seller profiles`)
        count = await deleteWhere('MissionEnrollment', 'seller_id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} mission enrollments (seller)`)
        count = await deleteWhere('Seller', 'id', sellerIds)
        if (count) console.log(`✓ Deleted ${count} sellers`)

        // Workspace-related
        if (wsIds.length > 0) {
            // ShortLinks (workspace_id)
            count = await deleteWhere('ShortLink', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} short links`)

            // LeadEvent
            count = await deleteWhere('LeadEvent', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} lead events`)

            // Customer
            count = await deleteWhere('Customer', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} customers`)

            // Domain
            count = await deleteWhere('Domain', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} domains`)

            // ApiKey
            count = await deleteWhere('ApiKey', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} API keys`)

            // WebhookEndpoint
            count = await deleteWhere('WebhookEndpoint', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} webhook endpoints`)

            // StartupPayment
            count = await deleteWhere('StartupPayment', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} startup payments`)

            // Discount
            count = await deleteWhere('Discount', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} discounts`)

            // ProgramRequest via mission
            let r = await client.query(
                `DELETE FROM "ProgramRequest" WHERE mission_id IN (SELECT id FROM "Mission" WHERE workspace_id = ANY($1))`,
                [wsIds]
            )
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} program requests (workspace)`)

            // MissionEnrollment via mission
            r = await client.query(
                `DELETE FROM "MissionEnrollment" WHERE mission_id IN (SELECT id FROM "Mission" WHERE workspace_id = ANY($1))`,
                [wsIds]
            )
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} mission enrollments (workspace)`)

            // MissionContent via mission
            r = await client.query(
                `DELETE FROM "MissionContent" WHERE mission_id IN (SELECT id FROM "Mission" WHERE workspace_id = ANY($1))`,
                [wsIds]
            )
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} mission content`)

            // Mission
            count = await deleteWhere('Mission', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} missions`)

            // WorkspaceProfile
            count = await deleteWhere('WorkspaceProfile', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} workspace profiles`)

            // WorkspaceMember
            count = await deleteWhere('WorkspaceMember', 'workspace_id', wsIds)
            if (count) console.log(`✓ Deleted ${count} workspace members`)

            // Workspace
            count = await deleteWhere('Workspace', 'id', wsIds)
            if (count) console.log(`✓ Deleted ${count} workspaces`)
        }

        // Orphan workspace members
        if (keepUserId) {
            const r = await client.query(`DELETE FROM "WorkspaceMember" WHERE user_id != $1`, [keepUserId])
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} orphan workspace members`)
        }

        // Feedback
        if (keepUserId) {
            const r = await client.query(`DELETE FROM "Feedback" WHERE user_id != $1`, [keepUserId])
            if (r.rowCount) console.log(`✓ Deleted ${r.rowCount} feedback entries`)
        }

        // ========== DELETE SUPABASE AUTH USERS ==========
        console.log(`\n--- Deleting ${deleteUserIds.length} Supabase auth users ---\n`)

        for (const uid of deleteUserIds) {
            try {
                await client.query(`DELETE FROM auth.identities WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.refresh_tokens WHERE user_id::text = $1`, [uid])
                await client.query(`DELETE FROM auth.mfa_factors WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.users WHERE id = $1`, [uid])
                const email = usersToDelete.rows.find((u: { id: string }) => u.id === uid)?.email
                console.log(`✓ Deleted auth user: ${email}`)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                console.warn(`⚠ Could not delete auth user ${uid}: ${msg}`)
            }
        }

        console.log('\n✅ Cleanup complete! All emails are now free to re-register.\n')

    } catch (error) {
        console.error('❌ Cleanup failed:', error)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

main()
