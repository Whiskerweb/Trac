/**
 * Simulation de paiements referral sur 4 generations
 * Visualise les commissions et earnings par seller
 *
 * Usage: npx tsx scripts/sim-referral-payout.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// =============================================
// CONSTANTS
// =============================================

const SIM_PREFIX = 'sim_ref_'
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4'

const SELLERS = [
    { id: SIM_PREFIX + 'alice',   name: 'Alice',   label: 'Gen 0 (racine)',     referredBy: null },
    { id: SIM_PREFIX + 'bob',     name: 'Bob',     label: 'Gen 1 (ref by Alice)', referredBy: SIM_PREFIX + 'alice' },
    { id: SIM_PREFIX + 'carol',   name: 'Carol',   label: 'Gen 2 (ref by Bob)',   referredBy: SIM_PREFIX + 'bob' },
    { id: SIM_PREFIX + 'dave',    name: 'Dave',    label: 'Gen 3 (ref by Carol)', referredBy: SIM_PREFIX + 'carol' },
]

const MISSION_ID = SIM_PREFIX + 'mission'
const REFERRAL_RATES = [
    { generation: 1, rate: 0.05, label: '5%' },
    { generation: 2, rate: 0.03, label: '3%' },
    { generation: 3, rate: 0.02, label: '2%' },
]

// =============================================
// HELPERS
// =============================================

function euro(cents: number): string {
    return (cents / 100).toFixed(2) + '€'
}

function pad(str: string, len: number): string {
    return str.padEnd(len)
}

function padL(str: string, len: number): string {
    return str.padStart(len)
}

// =============================================
// CLEANUP & SEED
// =============================================

async function cleanup() {
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: SIM_PREFIX } } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { startsWith: SIM_PREFIX } } })
    await prisma.missionEnrollment.deleteMany({ where: { id: { startsWith: SIM_PREFIX } } })
    await prisma.shortLink.deleteMany({ where: { id: { startsWith: SIM_PREFIX } } })
    await prisma.mission.deleteMany({ where: { id: MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: { startsWith: SIM_PREFIX } } })
}

async function seed() {
    // Create sellers
    for (const s of SELLERS) {
        await prisma.seller.create({
            data: {
                id: s.id,
                user_id: s.id + '_uid',
                tenant_id: s.id + '_tid',
                email: `${s.name.toLowerCase()}@sim.test`,
                name: s.name,
                status: 'APPROVED',
                referral_code: s.name.toLowerCase().slice(0, 4) + '_sim',
                referred_by: s.referredBy,
                referred_at: s.referredBy ? new Date() : null,
            }
        })
    }

    // Create mission (10% sale commission)
    await prisma.mission.create({
        data: {
            id: MISSION_ID,
            workspace_id: WORKSPACE_ID,
            title: 'Sim Referral Mission',
            description: 'Simulation',
            target_url: 'https://example.com',
            reward: '10%',
            status: 'ACTIVE',
            reward_type: 'SALE',
            reward_amount: 10,
            reward_structure: 'PERCENTAGE',
            commission_structure: 'ONE_OFF',
            sale_enabled: true,
            sale_reward_amount: 10,
            sale_reward_structure: 'PERCENTAGE',
        }
    })

    // Create links & enrollments for each seller
    for (const s of SELLERS) {
        const linkId = s.id + '_link'
        await prisma.shortLink.create({
            data: {
                id: linkId,
                slug: `sim-${s.name.toLowerCase()}`,
                original_url: 'https://example.com',
                workspace_id: WORKSPACE_ID,
                affiliate_id: s.id + '_uid',
            }
        })
        await prisma.missionEnrollment.create({
            data: {
                id: s.id + '_enroll',
                mission_id: MISSION_ID,
                user_id: s.id + '_uid',
                status: 'APPROVED',
                link_id: linkId,
            }
        })
    }
}

// =============================================
// SIMULATE SALES + REFERRAL COMMISSIONS
// =============================================

interface SaleResult {
    saleLabel: string
    seller: string
    grossTTC: number
    htAmount: number
    sellerCommission: number
    platformFee: number
    referrals: { seller: string; generation: number; amount: number }[]
}

async function simulateSale(params: {
    saleLabel: string
    sellerIndex: number
    grossTTC: number
}): Promise<SaleResult> {
    const { saleLabel, sellerIndex, grossTTC } = params
    const seller = SELLERS[sellerIndex]
    const saleId = SIM_PREFIX + saleLabel.replace(/\s/g, '_').toLowerCase()
    const linkId = seller.id + '_link'

    // Calculate amounts
    const taxRate = 0.20 // 20% TVA
    const htAmount = Math.round(grossTTC / (1 + taxRate))
    const taxAmount = grossTTC - htAmount
    const stripeFee = Math.floor(grossTTC * 0.029 + 30)
    const netAmount = htAmount - stripeFee

    // Seller commission (10% of HT)
    const sellerCommission = Math.floor(htAmount * 0.10)
    const platformFee = Math.floor(htAmount * 0.15)

    // Create main commission
    const commission = await prisma.commission.upsert({
        where: { sale_id: saleId },
        create: {
            seller_id: seller.id,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            link_id: linkId,
            gross_amount: grossTTC,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: taxAmount,
            commission_amount: sellerCommission,
            platform_fee: platformFee,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status: 'PENDING',
            startup_payment_status: 'UNPAID',
            commission_source: 'SALE',
            hold_days: 30,
        },
        update: {}
    })

    // Create referral commissions (walk up the chain)
    const referrals: SaleResult['referrals'] = []
    let currentSellerId = seller.id

    for (const { generation, rate } of REFERRAL_RATES) {
        const current = await prisma.seller.findUnique({
            where: { id: currentSellerId },
            select: { referred_by: true }
        })
        if (!current?.referred_by) break

        const referrerId = current.referred_by
        const referralAmount = Math.floor(htAmount * rate)
        if (referralAmount <= 0) { currentSellerId = referrerId; continue }

        const referralSaleId = `${saleId}:ref:gen${generation}:${referrerId}`

        await prisma.commission.upsert({
            where: { sale_id: referralSaleId },
            create: {
                seller_id: referrerId,
                program_id: WORKSPACE_ID,
                sale_id: referralSaleId,
                gross_amount: grossTTC,
                net_amount: netAmount,
                stripe_fee: stripeFee,
                tax_amount: taxAmount,
                commission_amount: referralAmount,
                platform_fee: 0,
                commission_rate: `ref:gen${generation}:${(rate * 100).toFixed(0)}%`,
                commission_type: 'PERCENTAGE',
                currency: 'EUR',
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                commission_source: 'SALE',
                hold_days: 30,
                referral_source_commission_id: commission.id,
                referral_generation: generation,
            },
            update: {}
        })

        const referrerSeller = SELLERS.find(s => s.id === referrerId)
        referrals.push({ seller: referrerSeller?.name || referrerId, generation, amount: referralAmount })
        currentSellerId = referrerId
    }

    return {
        saleLabel,
        seller: seller.name,
        grossTTC,
        htAmount,
        sellerCommission,
        platformFee,
        referrals,
    }
}

// =============================================
// DISPLAY
// =============================================

function printHeader(title: string) {
    const line = '═'.repeat(80)
    console.log(`\n╔${line}╗`)
    console.log(`║  ${pad(title, 78)}║`)
    console.log(`╚${line}╝`)
}

function printSaleDetail(sale: SaleResult) {
    console.log(`\n┌─── Vente: ${sale.saleLabel} ───`)
    console.log(`│  Vendeur:      ${sale.seller}`)
    console.log(`│  Montant TTC:  ${euro(sale.grossTTC)}`)
    console.log(`│  Montant HT:   ${euro(sale.htAmount)}`)
    console.log(`│`)
    console.log(`│  Commission seller (10% HT):  ${euro(sale.sellerCommission)} → ${sale.seller}`)
    console.log(`│  Platform fee (15% HT):       ${euro(sale.platformFee)} → Traaaction`)

    if (sale.referrals.length > 0) {
        console.log(`│`)
        console.log(`│  Referral commissions (prises sur la part Traaaction):`)
        for (const ref of sale.referrals) {
            const rateInfo = REFERRAL_RATES.find(r => r.generation === ref.generation)
            console.log(`│    Gen ${ref.generation} (${rateInfo?.label} HT): ${padL(euro(ref.amount), 8)} → ${ref.seller}`)
        }
        const totalRef = sale.referrals.reduce((s, r) => s + r.amount, 0)
        console.log(`│    ─────────────────────────`)
        console.log(`│    Total referral:    ${padL(euro(totalRef), 8)}`)
        console.log(`│    Traaaction net:    ${padL(euro(sale.platformFee - totalRef), 8)} (${euro(sale.platformFee)} - ${euro(totalRef)})`)
    } else {
        console.log(`│`)
        console.log(`│  Aucune commission referral (pas de referrer)`)
    }
    console.log(`└───`)
}

async function printEarningsSummary() {
    printHeader('RECAPITULATIF EARNINGS PAR SELLER')

    const sep = '─'.repeat(88)
    console.log(`\n┌${sep}┐`)
    console.log(`│ ${pad('Seller', 10)} ${pad('Role', 25)} │ ${padL('Direct', 10)} │ ${padL('Ref Gen1', 10)} │ ${padL('Ref Gen2', 10)} │ ${padL('Ref Gen3', 10)} │ ${padL('TOTAL', 10)} │`)
    console.log(`├${sep}┤`)

    for (const s of SELLERS) {
        // Direct commissions (not referral)
        const directAgg = await prisma.commission.aggregate({
            where: { seller_id: s.id, referral_generation: null },
            _sum: { commission_amount: true },
        })

        // Referral by generation
        const gen1Agg = await prisma.commission.aggregate({
            where: { seller_id: s.id, referral_generation: 1 },
            _sum: { commission_amount: true },
        })
        const gen2Agg = await prisma.commission.aggregate({
            where: { seller_id: s.id, referral_generation: 2 },
            _sum: { commission_amount: true },
        })
        const gen3Agg = await prisma.commission.aggregate({
            where: { seller_id: s.id, referral_generation: 3 },
            _sum: { commission_amount: true },
        })

        const direct = directAgg._sum.commission_amount || 0
        const g1 = gen1Agg._sum.commission_amount || 0
        const g2 = gen2Agg._sum.commission_amount || 0
        const g3 = gen3Agg._sum.commission_amount || 0
        const total = direct + g1 + g2 + g3

        console.log(`│ ${pad(s.name, 10)} ${pad(s.label, 25)} │ ${padL(direct ? euro(direct) : '-', 10)} │ ${padL(g1 ? euro(g1) : '-', 10)} │ ${padL(g2 ? euro(g2) : '-', 10)} │ ${padL(g3 ? euro(g3) : '-', 10)} │ ${padL(euro(total), 10)} │`)
    }
    console.log(`└${sep}┘`)

    // Platform summary
    const totalPlatformFee = await prisma.commission.aggregate({
        where: { sale_id: { startsWith: SIM_PREFIX }, referral_generation: null, org_parent_commission_id: null },
        _sum: { platform_fee: true },
    })
    const totalReferralPaid = await prisma.commission.aggregate({
        where: { sale_id: { startsWith: SIM_PREFIX }, referral_generation: { not: null } },
        _sum: { commission_amount: true },
    })
    const grossPlatform = totalPlatformFee._sum.platform_fee || 0
    const refPaid = totalReferralPaid._sum.commission_amount || 0

    console.log(`\n  Traaaction platform fee brut:  ${euro(grossPlatform)}`)
    console.log(`  Referral commissions payees:   -${euro(refPaid)}`)
    console.log(`  ─────────────────────────────`)
    console.log(`  Traaaction net:                ${euro(grossPlatform - refPaid)}`)
}

async function printCommissionLedger() {
    printHeader('LEDGER COMPLET DES COMMISSIONS')

    const allComm = await prisma.commission.findMany({
        where: { sale_id: { startsWith: SIM_PREFIX } },
        orderBy: [{ created_at: 'asc' }],
        select: {
            sale_id: true,
            seller_id: true,
            commission_amount: true,
            platform_fee: true,
            referral_generation: true,
            commission_source: true,
            status: true,
        }
    })

    const sep = '─'.repeat(108)
    console.log(`\n┌${sep}┐`)
    console.log(`│ ${pad('Sale ID', 40)} │ ${pad('Seller', 8)} │ ${pad('Type', 8)} │ ${padL('Amount', 10)} │ ${padL('Platf.Fee', 10)} │ ${pad('Status', 8)} │`)
    console.log(`├${sep}┤`)

    for (const c of allComm) {
        const sellerName = SELLERS.find(s => s.id === c.seller_id)?.name || c.seller_id.slice(-8)
        const saleShort = c.sale_id.replace(SIM_PREFIX, '')
        const type = c.referral_generation ? `Ref G${c.referral_generation}` : c.commission_source
        console.log(`│ ${pad(saleShort, 40)} │ ${pad(sellerName, 8)} │ ${pad(type, 8)} │ ${padL(euro(c.commission_amount), 10)} │ ${padL(euro(c.platform_fee), 10)} │ ${pad(c.status, 8)} │`)
    }
    console.log(`└${sep}┘`)
    console.log(`  Total: ${allComm.length} commissions`)
}

// =============================================
// MAIN
// =============================================

async function main() {
    printHeader('SIMULATION REFERRAL PAYOUT — 4 GENERATIONS')

    console.log('\n  Chaine de referral:')
    console.log('  Alice (racine) → a refere Bob → a refere Carol → a refere Dave')
    console.log('')
    console.log('  Taux referral: Gen1 = 5% HT | Gen2 = 3% HT | Gen3 = 2% HT')
    console.log('  Commission seller: 10% du HT')
    console.log('  Platform fee: 15% du HT')
    console.log('  Referral = pris sur la part Traaaction (seller earnings inchanges)')

    try {
        await cleanup()
        await seed()

        // =============================================
        // SCENARIOS DE VENTES
        // =============================================

        printHeader('DETAIL DES VENTES')

        // Vente 1: Bob vend (Alice recoit gen1)
        const sale1 = await simulateSale({
            saleLabel: 'Vente 1 — Bob vend 100€ TTC',
            sellerIndex: 1, // Bob
            grossTTC: 10000, // 100€
        })
        printSaleDetail(sale1)

        // Vente 2: Carol vend (Bob gen1, Alice gen2)
        const sale2 = await simulateSale({
            saleLabel: 'Vente 2 — Carol vend 250€ TTC',
            sellerIndex: 2, // Carol
            grossTTC: 25000, // 250€
        })
        printSaleDetail(sale2)

        // Vente 3: Dave vend (Carol gen1, Bob gen2, Alice gen3)
        const sale3 = await simulateSale({
            saleLabel: 'Vente 3 — Dave vend 500€ TTC',
            sellerIndex: 3, // Dave
            grossTTC: 50000, // 500€
        })
        printSaleDetail(sale3)

        // Vente 4: Dave vend encore (pour montrer l'accumulation)
        const sale4 = await simulateSale({
            saleLabel: 'Vente 4 — Dave vend 150€ TTC',
            sellerIndex: 3,
            grossTTC: 15000,
        })
        printSaleDetail(sale4)

        // Vente 5: Alice vend (aucun referral — elle est la racine)
        const sale5 = await simulateSale({
            saleLabel: 'Vente 5 — Alice vend 200€ TTC (pas de referrer)',
            sellerIndex: 0, // Alice
            grossTTC: 20000,
        })
        printSaleDetail(sale5)

        // Vente 6: Bob vend a nouveau
        const sale6 = await simulateSale({
            saleLabel: 'Vente 6 — Bob vend 300€ TTC',
            sellerIndex: 1,
            grossTTC: 30000,
        })
        printSaleDetail(sale6)

        // =============================================
        // RECAPITULATIFS
        // =============================================

        await printCommissionLedger()
        await printEarningsSummary()

        // =============================================
        // CLEANUP
        // =============================================

        await cleanup()
        console.log('\n  Donnees de simulation nettoyees.\n')

    } catch (err) {
        console.error('\n💥 ERREUR:', err)
        await cleanup().catch(() => {})
    }

    await prisma.$disconnect()
    pool.end()
}

main()
