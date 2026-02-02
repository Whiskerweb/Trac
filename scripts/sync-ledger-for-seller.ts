/**
 * Sync ledger for a specific seller
 * Creates initial CREDIT entry to match current SellerBalance
 *
 * Usage: npx tsx scripts/sync-ledger-for-seller.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SELLER_ID = 'cml5j6beb000004lbg07vgqob' // test@pomme.com

async function main() {
    console.log('🔄 Syncing ledger for seller:', SELLER_ID)

    // Get current balance
    const balance = await prisma.sellerBalance.findUnique({
        where: { seller_id: SELLER_ID }
    })

    if (!balance) {
        console.log('❌ No balance record found')
        return
    }

    console.log('Current SellerBalance:', {
        pending: balance.pending / 100 + '€',
        due: balance.due / 100 + '€',
        balance: balance.balance / 100 + '€'
    })

    if (balance.balance === 0) {
        console.log('❌ Balance is 0, nothing to sync')
        return
    }

    // Check if ledger already has entries
    const existingEntries = await prisma.walletLedger.count({
        where: { seller_id: SELLER_ID }
    })

    if (existingEntries > 0) {
        console.log('⚠️ Ledger already has', existingEntries, 'entries')

        // Calculate current ledger balance
        const result = await prisma.walletLedger.groupBy({
            by: ['entry_type'],
            where: { seller_id: SELLER_ID },
            _sum: { amount: true }
        })

        let credits = 0
        let debits = 0
        for (const row of result) {
            if (row.entry_type === 'CREDIT') credits = row._sum.amount || 0
            if (row.entry_type === 'DEBIT') debits = row._sum.amount || 0
        }
        const ledgerBalance = credits - debits

        console.log('Current ledger balance:', ledgerBalance / 100 + '€')
        return
    }

    // Create initial CREDIT entry to match current balance
    const entry = await prisma.walletLedger.create({
        data: {
            seller_id: SELLER_ID,
            entry_type: 'CREDIT',
            amount: balance.balance,
            reference_type: 'ADJUSTMENT',
            reference_id: `initial_sync_${Date.now()}`,
            balance_after: balance.balance,
            description: `Initial balance sync: ${balance.balance / 100}€ (available commissions)`,
        }
    })

    console.log('✅ Ledger entry created:', {
        id: entry.id,
        type: entry.entry_type,
        amount: entry.amount / 100 + '€',
        balanceAfter: entry.balance_after / 100 + '€',
        description: entry.description
    })

    await prisma.$disconnect()
    await pool.end()
}

main()
    .then(() => {
        console.log('\n✅ Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Error:', error)
        process.exit(1)
    })
