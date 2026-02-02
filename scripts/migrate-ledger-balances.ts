/**
 * Migration Script: Initialize WalletLedger for existing balances
 *
 * Run with: npx tsx scripts/migrate-ledger-balances.ts
 *
 * This script creates ADJUSTMENT entries in the ledger for all sellers
 * who have existing balances but no ledger entries.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'

// Load environment variables
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function migrateLedgerBalances() {
    console.log('🚀 Starting ledger migration...\n')

    // Find all sellers with PLATFORM method and positive balance
    const sellersWithBalance = await prisma.sellerBalance.findMany({
        where: {
            balance: { gt: 0 }
        },
        include: {
            // We need to check if seller uses PLATFORM method
            // But SellerBalance doesn't have a direct relation to Seller
            // So we'll check after fetching
        }
    })

    console.log(`Found ${sellersWithBalance.length} sellers with positive balance\n`)

    let migrated = 0
    let skipped = 0

    for (const sellerBalance of sellersWithBalance) {
        // Check if seller uses PLATFORM payout method
        const seller = await prisma.seller.findUnique({
            where: { id: sellerBalance.seller_id },
            select: { id: true, email: true, payout_method: true }
        })

        if (!seller) {
            console.log(`⚠️  Seller ${sellerBalance.seller_id} not found, skipping`)
            skipped++
            continue
        }

        // Only migrate PLATFORM sellers (not STRIPE_CONNECT)
        if (seller.payout_method !== 'PLATFORM') {
            console.log(`⏭️  Skipping ${seller.email} (payout_method: ${seller.payout_method})`)
            skipped++
            continue
        }

        // Check if seller already has ledger entries
        const existingEntries = await prisma.walletLedger.count({
            where: { seller_id: seller.id }
        })

        if (existingEntries > 0) {
            console.log(`⏭️  Skipping ${seller.email} (already has ${existingEntries} ledger entries)`)
            skipped++
            continue
        }

        // Create initial CREDIT entry
        const entry = await prisma.walletLedger.create({
            data: {
                seller_id: seller.id,
                entry_type: 'CREDIT',
                amount: sellerBalance.balance,
                reference_type: 'ADJUSTMENT',
                reference_id: `migration_${Date.now()}_${seller.id}`,
                balance_after: sellerBalance.balance,
                description: `Initial balance migration: ${sellerBalance.balance / 100}€`,
            }
        })

        console.log(`✅ Migrated ${seller.email}: ${sellerBalance.balance / 100}€ (entry: ${entry.id})`)
        migrated++
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   - Migrated: ${migrated}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`   - Total processed: ${sellersWithBalance.length}`)

    await prisma.$disconnect()
    await pool.end()
}

migrateLedgerBalances()
    .then(() => {
        console.log('\n✅ Migration complete!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Migration failed:', error)
        process.exit(1)
    })
