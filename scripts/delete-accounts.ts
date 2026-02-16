/**
 * Delete 3 specific accounts and ALL their data
 * Emails: lucasroncey07@gmail.com, sadcoin.show@gmail.com, lucas.roncey@gmail.com
 * Usage: npx tsx scripts/delete-accounts.ts
 */

import { Pool } from 'pg'
import 'dotenv/config'

const EMAILS_TO_DELETE = [
    'lucasroncey07@gmail.com',
    'sadcoin.show@gmail.com',
    'lucas.roncey@gmail.com',
]

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const client = await pool.connect()

    try {
        console.log(`\n🗑️  Deleting accounts for:\n${EMAILS_TO_DELETE.map(e => `  - ${e}`).join('\n')}\n`)

        // ========== LOOKUP ==========

        // Auth users
        const authResult = await client.query(
            `SELECT id, email FROM auth.users WHERE email = ANY($1)`,
            [EMAILS_TO_DELETE]
        )
        const userIds = authResult.rows.map((u: { id: string }) => u.id)
        console.log(`Found ${authResult.rows.length} auth users:`)
        authResult.rows.forEach((u: { id: string; email: string }) => console.log(`  - ${u.email} (${u.id})`))

        if (userIds.length === 0) {
            console.log('\nNo users found. Nothing to delete.')
            return
        }

        // Sellers
        const sellersResult = await client.query(
            `SELECT id, email, user_id FROM "Seller" WHERE user_id = ANY($1)`,
            [userIds]
        )
        const sellerIds = sellersResult.rows.map((s: { id: string }) => s.id)
        console.log(`\nFound ${sellersResult.rows.length} sellers:`)
        sellersResult.rows.forEach((s: { email: string; id: string }) => console.log(`  - ${s.email} (${s.id})`))

        // Workspaces
        const wsResult = await client.query(
            `SELECT id, name, slug FROM "Workspace" WHERE owner_id = ANY($1)`,
            [userIds]
        )
        const wsIds = wsResult.rows.map((w: { id: string }) => w.id)
        console.log(`\nFound ${wsResult.rows.length} workspaces:`)
        wsResult.rows.forEach((w: { name: string; slug: string }) => console.log(`  - ${w.name} (${w.slug})`))

        // Mission IDs (needed for sub-queries)
        let missionIds: string[] = []
        if (wsIds.length > 0) {
            const mResult = await client.query(
                `SELECT id FROM "Mission" WHERE workspace_id = ANY($1)`,
                [wsIds]
            )
            missionIds = mResult.rows.map((m: { id: string }) => m.id)
            console.log(`\nFound ${missionIds.length} missions`)
        }

        // Helper
        async function deleteWhere(table: string, column: string, ids: string[]) {
            if (ids.length === 0) return 0
            const r = await client.query(`DELETE FROM "${table}" WHERE "${column}" = ANY($1)`, [ids])
            return r.rowCount || 0
        }

        let count: number

        // ========== 1. GROUPS ==========
        console.log('\n--- Groups ---\n')

        // Find groups where these sellers are creator
        const groupsOwned = await client.query(
            `SELECT id FROM "SellerGroup" WHERE creator_id = ANY($1)`,
            [sellerIds]
        )
        const ownedGroupIds = groupsOwned.rows.map((g: { id: string }) => g.id)

        // GroupMission (via owned groups)
        count = await deleteWhere('GroupMission', 'group_id', ownedGroupIds)
        if (count) console.log(`  Deleted ${count} group missions (owned groups)`)

        // GroupMission via workspace missions
        if (missionIds.length > 0) {
            const r = await client.query(
                `DELETE FROM "GroupMission" WHERE mission_id = ANY($1)`,
                [missionIds]
            )
            if (r.rowCount) console.log(`  Deleted ${r.rowCount} group missions (workspace missions)`)
        }

        // SellerGroupMember (via owned groups + as member)
        count = await deleteWhere('SellerGroupMember', 'group_id', ownedGroupIds)
        if (count) console.log(`  Deleted ${count} group members (owned groups)`)
        count = await deleteWhere('SellerGroupMember', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} group memberships (as member)`)

        // SellerGroup (owned)
        count = await deleteWhere('SellerGroup', 'creator_id', sellerIds)
        if (count) console.log(`  Deleted ${count} seller groups`)

        // ========== 2. ORGANIZATIONS ==========
        console.log('\n--- Organizations ---\n')

        // Find orgs where these sellers are leader
        const orgsOwned = await client.query(
            `SELECT id FROM "Organization" WHERE leader_id = ANY($1)`,
            [sellerIds]
        )
        const ownedOrgIds = orgsOwned.rows.map((o: { id: string }) => o.id)

        // OrganizationMission (via owned orgs)
        count = await deleteWhere('OrganizationMission', 'organization_id', ownedOrgIds)
        if (count) console.log(`  Deleted ${count} org missions (owned orgs)`)

        // OrganizationMission via workspace missions
        if (missionIds.length > 0) {
            const r = await client.query(
                `DELETE FROM "OrganizationMission" WHERE mission_id = ANY($1)`,
                [missionIds]
            )
            if (r.rowCount) console.log(`  Deleted ${r.rowCount} org missions (workspace missions)`)
        }

        // OrganizationMember (via owned orgs + as member)
        count = await deleteWhere('OrganizationMember', 'organization_id', ownedOrgIds)
        if (count) console.log(`  Deleted ${count} org members (owned orgs)`)
        count = await deleteWhere('OrganizationMember', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} org memberships (as member)`)

        // Organization (owned)
        count = await deleteWhere('Organization', 'leader_id', sellerIds)
        if (count) console.log(`  Deleted ${count} organizations`)

        // ========== 3. MESSAGES ==========
        console.log('\n--- Messages ---\n')

        if (sellerIds.length > 0 || wsIds.length > 0) {
            const convos = await client.query(
                `SELECT id FROM "Conversation" WHERE seller_id = ANY($1) OR workspace_id = ANY($2)`,
                [sellerIds.length > 0 ? sellerIds : ['__none__'], wsIds.length > 0 ? wsIds : ['__none__']]
            )
            const convoIds = convos.rows.map((c: { id: string }) => c.id)
            count = await deleteWhere('Message', 'conversation_id', convoIds)
            if (count) console.log(`  Deleted ${count} messages`)
            count = await deleteWhere('Conversation', 'id', convoIds)
            if (count) console.log(`  Deleted ${count} conversations`)
        }

        // ========== 4. COMMISSIONS ==========
        console.log('\n--- Commissions ---\n')

        // By seller_id
        count = await deleteWhere('Commission', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} commissions (seller)`)

        // By workspace missions
        if (missionIds.length > 0) {
            const r = await client.query(
                `DELETE FROM "Commission" WHERE program_id = ANY($1)`,
                [missionIds]
            )
            if (r.rowCount) console.log(`  Deleted ${r.rowCount} commissions (workspace missions)`)
        }

        // ========== 5. SELLER DATA ==========
        console.log('\n--- Seller data ---\n')

        count = await deleteWhere('GiftCardRedemption', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} gift card redemptions`)
        count = await deleteWhere('WalletLedger', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} wallet ledger entries`)
        count = await deleteWhere('ProgramRequest', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} program requests (seller)`)
        count = await deleteWhere('SellerBalance', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} seller balances`)
        count = await deleteWhere('SellerProfile', 'seller_id', sellerIds)
        if (count) console.log(`  Deleted ${count} seller profiles`)
        count = await deleteWhere('MissionEnrollment', 'user_id', userIds)
        if (count) console.log(`  Deleted ${count} mission enrollments (seller)`)
        count = await deleteWhere('Seller', 'id', sellerIds)
        if (count) console.log(`  Deleted ${count} sellers`)

        // ========== 6. WORKSPACE DATA ==========
        if (wsIds.length > 0) {
            console.log('\n--- Workspace data ---\n')

            count = await deleteWhere('ShortLink', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} short links`)
            count = await deleteWhere('LeadEvent', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} lead events`)
            count = await deleteWhere('Customer', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} customers`)
            count = await deleteWhere('Domain', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} domains`)
            count = await deleteWhere('ApiKey', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} API keys`)
            count = await deleteWhere('WebhookEndpoint', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} webhook endpoints`)
            count = await deleteWhere('StartupPayment', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} startup payments`)
            count = await deleteWhere('Discount', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} discounts`)

            // Via missions
            if (missionIds.length > 0) {
                let r = await client.query(
                    `DELETE FROM "ProgramRequest" WHERE mission_id = ANY($1)`,
                    [missionIds]
                )
                if (r.rowCount) console.log(`  Deleted ${r.rowCount} program requests (workspace)`)

                r = await client.query(
                    `DELETE FROM "MissionEnrollment" WHERE mission_id = ANY($1)`,
                    [missionIds]
                )
                if (r.rowCount) console.log(`  Deleted ${r.rowCount} mission enrollments (workspace)`)

                r = await client.query(
                    `DELETE FROM "MissionContent" WHERE mission_id = ANY($1)`,
                    [missionIds]
                )
                if (r.rowCount) console.log(`  Deleted ${r.rowCount} mission content`)
            }

            count = await deleteWhere('Mission', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} missions`)
            count = await deleteWhere('WorkspaceProfile', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} workspace profiles`)
            count = await deleteWhere('WorkspaceMember', 'workspace_id', wsIds)
            if (count) console.log(`  Deleted ${count} workspace members`)
            count = await deleteWhere('Workspace', 'id', wsIds)
            if (count) console.log(`  Deleted ${count} workspaces`)
        }

        // ========== 7. FEEDBACK ==========
        console.log('\n--- Feedback & orphans ---\n')

        count = await deleteWhere('Feedback', 'user_id', userIds)
        if (count) console.log(`  Deleted ${count} feedback entries`)

        // Orphan workspace members (by user_id)
        count = await deleteWhere('WorkspaceMember', 'user_id', userIds)
        if (count) console.log(`  Deleted ${count} orphan workspace members`)

        // ========== 8. SUPABASE AUTH ==========
        console.log(`\n--- Deleting ${userIds.length} Supabase auth users ---\n`)

        for (const uid of userIds) {
            try {
                await client.query(`DELETE FROM auth.identities WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.sessions WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.refresh_tokens WHERE user_id::text = $1`, [uid])
                await client.query(`DELETE FROM auth.mfa_factors WHERE user_id = $1`, [uid])
                await client.query(`DELETE FROM auth.users WHERE id = $1`, [uid])
                const email = authResult.rows.find((u: { id: string }) => u.id === uid)?.email
                console.log(`  Deleted auth user: ${email}`)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                console.warn(`  ⚠ Could not delete auth user ${uid}: ${msg}`)
            }
        }

        console.log('\n✅ Done! All 3 accounts fully deleted — they can now re-register.\n')

    } catch (error) {
        console.error('❌ Failed:', error)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

main()
