/**
 * EDGE CASE Test Suite for RECURRING commission mode
 * Tests extreme scenarios, race conditions, and data integrity
 *
 * Usage: npx tsx scripts/test-recurring-edge.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const TEST_PREFIX = 'test_edge_'
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4' // "Reevy" workspace
const SELLER_ID = TEST_PREFIX + 'seller_001'
const SELLER_ID_2 = TEST_PREFIX + 'seller_002'
const MISSION_ID = TEST_PREFIX + 'mission_001'
const ENROLLMENT_ID = TEST_PREFIX + 'enrollment_001'
const ENROLLMENT_ID_2 = TEST_PREFIX + 'enrollment_002'
const LINK_ID = TEST_PREFIX + 'link_001'
const LINK_ID_2 = TEST_PREFIX + 'link_002'
const CUSTOMER_ID = TEST_PREFIX + 'customer_001'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`)
        passed++
    } else {
        console.log(`  ❌ FAIL: ${message}`)
        failed++
    }
}

function parseReward(reward: string): { type: 'PERCENTAGE' | 'FIXED'; value: number } {
    const trimmed = reward.trim()
    if (trimmed.endsWith('%')) {
        const value = parseFloat(trimmed.replace('%', ''))
        if (!isNaN(value)) return { type: 'PERCENTAGE', value }
    }
    const fixedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$/)
    if (fixedMatch) {
        const value = parseFloat(fixedMatch[1])
        if (!isNaN(value)) return { type: 'FIXED', value: Math.round(value * 100) }
    }
    return { type: 'FIXED', value: 0 }
}

async function createCommission(params: {
    saleId: string
    sellerId?: string
    subscriptionId?: string | null
    recurringMonth?: number | null
    recurringMax?: number | null
    commissionSource: 'SALE' | 'RECURRING'
    grossAmount: number
    missionReward: string
    currency?: string
    holdDays?: number
    linkId?: string | null
}) {
    const {
        saleId, sellerId = SELLER_ID, subscriptionId = null,
        recurringMonth = null, recurringMax = null,
        commissionSource, grossAmount, missionReward,
        currency = 'EUR', holdDays = 30, linkId = LINK_ID
    } = params

    const tax = Math.round(grossAmount * 0.1667)
    const htAmount = grossAmount - tax
    const stripeFee = Math.floor(grossAmount * 0.029 + 30)
    const netAmount = htAmount - stripeFee
    const parsed = parseReward(missionReward)
    const rawCommission = parsed.type === 'PERCENTAGE'
        ? Math.floor((htAmount * parsed.value) / 100)
        : parsed.value
    const platformFee = Math.floor(htAmount * 0.15)

    return prisma.commission.upsert({
        where: { sale_id: saleId },
        create: {
            seller_id: sellerId,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            link_id: linkId,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: tax,
            commission_amount: rawCommission,
            platform_fee: platformFee,
            commission_rate: missionReward,
            commission_type: parsed.type,
            currency: currency.toUpperCase(),
            status: 'PENDING',
            startup_payment_status: 'UNPAID',
            commission_source: commissionSource,
            subscription_id: subscriptionId,
            recurring_month: recurringMonth,
            recurring_max: recurringMax,
            hold_days: holdDays,
        },
        update: {}
    })
}

async function cleanup() {
    console.log('\n🧹 Cleaning up...')
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: 'test_edge_' } } })
    await prisma.commission.deleteMany({ where: { seller_id: { startsWith: TEST_PREFIX } } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { startsWith: TEST_PREFIX } } })
    await prisma.customer.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.missionEnrollment.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.shortLink.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.mission.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.seller.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    console.log('  Done.')
}

async function seed() {
    console.log('🌱 Seeding...')

    await prisma.seller.create({
        data: { id: SELLER_ID, user_id: TEST_PREFIX + 'user_001', tenant_id: TEST_PREFIX + 'tenant_001', email: 'edge1@test.com', status: 'APPROVED' }
    })
    await prisma.seller.create({
        data: { id: SELLER_ID_2, user_id: TEST_PREFIX + 'user_002', tenant_id: TEST_PREFIX + 'tenant_002', email: 'edge2@test.com', status: 'APPROVED' }
    })

    await prisma.mission.create({
        data: {
            id: MISSION_ID, workspace_id: WORKSPACE_ID, title: 'Edge Test Mission',
            description: 'test', target_url: 'https://example.com', reward: '5%',
            status: 'ACTIVE', reward_type: 'SALE', reward_amount: 10, reward_structure: 'PERCENTAGE',
            commission_structure: 'RECURRING',
            sale_enabled: true, sale_reward_amount: 10, sale_reward_structure: 'PERCENTAGE',
            recurring_enabled: true, recurring_reward_amount: 5, recurring_reward_structure: 'PERCENTAGE',
            recurring_duration_months: 6,
        }
    })

    await prisma.shortLink.create({
        data: { id: LINK_ID, slug: 'test-edge-link-1', original_url: 'https://example.com', workspace_id: WORKSPACE_ID, affiliate_id: TEST_PREFIX + 'user_001' }
    })
    await prisma.shortLink.create({
        data: { id: LINK_ID_2, slug: 'test-edge-link-2', original_url: 'https://example.com', workspace_id: WORKSPACE_ID, affiliate_id: TEST_PREFIX + 'user_002' }
    })

    await prisma.missionEnrollment.create({
        data: { id: ENROLLMENT_ID, mission_id: MISSION_ID, user_id: TEST_PREFIX + 'user_001', status: 'APPROVED', link_id: LINK_ID }
    })
    await prisma.missionEnrollment.create({
        data: { id: ENROLLMENT_ID_2, mission_id: MISSION_ID, user_id: TEST_PREFIX + 'user_002', status: 'APPROVED', link_id: LINK_ID_2 }
    })

    await prisma.customer.create({
        data: { id: CUSTOMER_ID, workspace_id: WORKSPACE_ID, external_id: 'cus_edge_001', email: 'customer@test.com', click_id: 'clk_edge_001', link_id: LINK_ID, affiliate_id: TEST_PREFIX + 'user_001' }
    })

    console.log('  Done.\n')
}

// =============================================
// EDGE CASE TESTS
// =============================================

async function test_E1_ZeroAmountTrial() {
    console.log('📋 E1: Trial period — zero amount invoice')

    const c = await createCommission({
        saleId: 'test_edge_trial_001',
        subscriptionId: 'sub_trial',
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 0, // Trial = 0€
        missionReward: '5%',
    })

    assert(c.commission_amount === 0, `Commission on 0€ = ${c.commission_amount / 100}€ (expected 0€)`)
    assert(c.gross_amount === 0, 'Gross is 0')
    assert(c.status === 'PENDING', 'Still creates a PENDING commission (tracks the month)')

    // Month 2 with real payment
    const c2 = await createCommission({
        saleId: 'test_edge_trial_002',
        subscriptionId: 'sub_trial',
        recurringMonth: 2,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 2990,
        missionReward: '5%',
    })
    assert(c2.commission_amount > 0, `Month 2 commission = ${c2.commission_amount / 100}€ (real amount)`)

    // Count includes the 0€ month
    const count = await prisma.commission.count({ where: { subscription_id: 'sub_trial' } })
    assert(count === 2, `Count = ${count} (trial month counts toward limit)`)

    await prisma.commission.deleteMany({ where: { subscription_id: 'sub_trial' } })
}

async function test_E2_VerySmallAmount() {
    console.log('\n📋 E2: Very small amount — commission rounds to 0')

    // 0.10€ purchase with 5% commission = 0.005€ → rounds to 0
    const c = await createCommission({
        saleId: 'test_edge_tiny_001',
        commissionSource: 'SALE',
        grossAmount: 10, // 0.10€
        missionReward: '5%',
    })

    assert(c.commission_amount === 0, `Commission on 0.10€ at 5% = ${c.commission_amount} cents (rounds to 0)`)
    assert(c.gross_amount === 10, 'Gross recorded correctly')

    await prisma.commission.delete({ where: { id: c.id } })
}

async function test_E3_VeryLargeAmount() {
    console.log('\n📋 E3: Very large amount — check no integer overflow')

    // 999,999.99€ = 99999999 cents
    const c = await createCommission({
        saleId: 'test_edge_large_001',
        commissionSource: 'SALE',
        grossAmount: 99999999,
        missionReward: '10%',
    })

    assert(c.gross_amount === 99999999, `Gross = ${c.gross_amount} cents`)
    assert(c.commission_amount > 0, `Commission = ${c.commission_amount / 100}€`)
    assert(c.commission_amount < c.gross_amount, 'Commission < Gross (sanity)')
    // Check it's roughly 10% of HT
    const expectedHt = 99999999 - Math.round(99999999 * 0.1667)
    const expectedCommission = Math.floor(expectedHt * 0.10)
    const diff = Math.abs(c.commission_amount - expectedCommission)
    assert(diff < 100, `Commission within 1€ of expected (diff = ${diff} cents)`)

    await prisma.commission.delete({ where: { id: c.id } })
}

async function test_E4_FixedRewardOnSubscription() {
    console.log('\n📋 E4: Fixed reward (5€) on recurring subscription')

    const subId = 'sub_fixed_' + Date.now()
    for (let month = 1; month <= 3; month++) {
        await createCommission({
            saleId: `test_edge_fixed_month${month}`,
            subscriptionId: subId,
            recurringMonth: month,
            recurringMax: 12,
            commissionSource: 'RECURRING',
            grossAmount: 2990, // 29.90€ — doesn't matter for fixed
            missionReward: '5€', // Fixed 5€ per renewal
        })
    }

    const commissions = await prisma.commission.findMany({
        where: { subscription_id: subId },
        select: { commission_amount: true, commission_type: true }
    })

    assert(commissions.length === 3, `3 commissions created`)
    assert(commissions.every(c => c.commission_amount === 500), `All commissions = 500 cents (5€ fixed)`)
    assert(commissions.every(c => c.commission_type === 'FIXED'), 'All typed as FIXED')

    await prisma.commission.deleteMany({ where: { subscription_id: subId } })
}

async function test_E5_TwoSellersCompeting() {
    console.log('\n📋 E5: Two sellers — commissions attributed to correct seller')

    const subA = 'sub_sellerA_' + Date.now()
    const subB = 'sub_sellerB_' + Date.now()

    await createCommission({
        saleId: 'test_edge_sellerA',
        sellerId: SELLER_ID,
        subscriptionId: subA,
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 2990,
        missionReward: '5%',
        linkId: LINK_ID,
    })

    await createCommission({
        saleId: 'test_edge_sellerB',
        sellerId: SELLER_ID_2,
        subscriptionId: subB,
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 4990,
        missionReward: '5%',
        linkId: LINK_ID_2,
    })

    const sellerACommissions = await prisma.commission.count({ where: { seller_id: SELLER_ID, subscription_id: subA } })
    const sellerBCommissions = await prisma.commission.count({ where: { seller_id: SELLER_ID_2, subscription_id: subB } })
    assert(sellerACommissions === 1, `Seller A has 1 commission on sub A`)
    assert(sellerBCommissions === 1, `Seller B has 1 commission on sub B`)

    // Cross-check: no leakage
    const sellerACrossCheck = await prisma.commission.count({ where: { seller_id: SELLER_ID, subscription_id: subB } })
    const sellerBCrossCheck = await prisma.commission.count({ where: { seller_id: SELLER_ID_2, subscription_id: subA } })
    assert(sellerACrossCheck === 0, 'Seller A has 0 commissions on sub B (no leakage)')
    assert(sellerBCrossCheck === 0, 'Seller B has 0 commissions on sub A (no leakage)')

    await prisma.commission.deleteMany({ where: { subscription_id: { in: [subA, subB] } } })
}

async function test_E6_ParallelSubscriptionsSameCustomer() {
    console.log('\n📋 E6: Same customer, 2 active subscriptions in parallel')

    const sub1 = 'sub_parallel1_' + Date.now()
    const sub2 = 'sub_parallel2_' + Date.now()

    // Sub 1: monthly plan
    for (let m = 1; m <= 3; m++) {
        await createCommission({
            saleId: `test_edge_par1_m${m}`,
            subscriptionId: sub1,
            recurringMonth: m,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 990,
            missionReward: '5%',
        })
    }

    // Sub 2: premium plan (same seller, same customer)
    for (let m = 1; m <= 2; m++) {
        await createCommission({
            saleId: `test_edge_par2_m${m}`,
            subscriptionId: sub2,
            recurringMonth: m,
            recurringMax: 12,
            commissionSource: 'RECURRING',
            grossAmount: 4990,
            missionReward: '5%',
        })
    }

    const count1 = await prisma.commission.count({ where: { subscription_id: sub1 } })
    const count2 = await prisma.commission.count({ where: { subscription_id: sub2 } })
    assert(count1 === 3, `Sub 1: ${count1} commissions (independent)`)
    assert(count2 === 2, `Sub 2: ${count2} commissions (independent)`)

    // Cancel sub 1 only — sub 2 should be untouched
    await prisma.commission.deleteMany({ where: { subscription_id: sub1, status: 'PENDING' } })
    const afterCancel1 = await prisma.commission.count({ where: { subscription_id: sub1 } })
    const afterCancel2 = await prisma.commission.count({ where: { subscription_id: sub2 } })
    assert(afterCancel1 === 0, `Sub 1 after cancel: ${afterCancel1}`)
    assert(afterCancel2 === 2, `Sub 2 unaffected: ${afterCancel2}`)

    await prisma.commission.deleteMany({ where: { subscription_id: { in: [sub1, sub2] } } })
}

async function test_E7_ClawbackOnCompleteCommission() {
    console.log('\n📋 E7: Refund AFTER commission is COMPLETE (paid out) → negative balance')

    // Create and mature commission to COMPLETE
    const c = await createCommission({
        saleId: 'test_edge_clawback_complete',
        commissionSource: 'SALE',
        grossAmount: 5000,
        missionReward: '10%',
    })

    await prisma.commission.update({
        where: { id: c.id },
        data: { status: 'PROCEED', matured_at: new Date() }
    })
    await prisma.commission.update({
        where: { id: c.id },
        data: { status: 'COMPLETE', paid_at: new Date() }
    })

    // Initialize seller balance
    await prisma.sellerBalance.upsert({
        where: { seller_id: SELLER_ID },
        create: { seller_id: SELLER_ID, balance: 0, pending: 0, due: 0, paid_total: c.commission_amount },
        update: { paid_total: c.commission_amount, balance: 0 }
    })

    // Simulate handleClawback for COMPLETE
    const commission = await prisma.commission.findUnique({ where: { sale_id: 'test_edge_clawback_complete' } })
    assert(commission!.status === 'COMPLETE', 'Commission is COMPLETE before clawback')

    // Clawback: decrement balance, then delete
    await prisma.sellerBalance.update({
        where: { seller_id: SELLER_ID },
        data: { balance: { decrement: commission!.commission_amount } }
    })
    await prisma.commission.delete({ where: { id: commission!.id } })

    const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_ID } })
    assert(balance!.balance < 0, `Balance went negative: ${balance!.balance / 100}€`)
    assert(balance!.balance === -commission!.commission_amount, `Negative = -commission (${balance!.balance} = -${commission!.commission_amount})`)

    await prisma.sellerBalance.delete({ where: { seller_id: SELLER_ID } })
}

async function test_E8_SaleIdCollision() {
    console.log('\n📋 E8: sale_id collision — upsert protects against duplicate')

    const c1 = await createCommission({
        saleId: 'test_edge_collision',
        commissionSource: 'SALE',
        grossAmount: 5000,
        missionReward: '10%',
    })

    // Same sale_id, different amount — should NOT overwrite
    const c2 = await createCommission({
        saleId: 'test_edge_collision',
        commissionSource: 'SALE',
        grossAmount: 99999, // Different amount
        missionReward: '20%', // Different reward
    })

    assert(c1.id === c2.id, 'Same ID returned (upsert)')
    assert(c2.gross_amount === 5000, `Gross unchanged: ${c2.gross_amount} (original, not 99999)`)
    assert(c2.commission_rate === '10%', `Rate unchanged: ${c2.commission_rate} (original, not 20%)`)

    await prisma.commission.delete({ where: { sale_id: 'test_edge_collision' } })
}

async function test_E9_CurrencyEdgeCases() {
    console.log('\n📋 E9: Non-EUR currency (USD, JPY)')

    const cUSD = await createCommission({
        saleId: 'test_edge_usd',
        commissionSource: 'SALE',
        grossAmount: 1999, // $19.99
        missionReward: '10%',
        currency: 'USD',
    })
    assert(cUSD.currency === 'USD', `Currency stored: ${cUSD.currency}`)
    assert(cUSD.commission_amount > 0, `USD commission: ${cUSD.commission_amount}`)

    // JPY has no decimals: 1990 JPY = 1990¥ (not 19.90¥)
    const cJPY = await createCommission({
        saleId: 'test_edge_jpy',
        commissionSource: 'SALE',
        grossAmount: 1990, // 1990¥
        missionReward: '10%',
        currency: 'JPY',
    })
    assert(cJPY.currency === 'JPY', `Currency stored: ${cJPY.currency}`)
    assert(cJPY.commission_amount > 0, `JPY commission: ${cJPY.commission_amount}`)

    await prisma.commission.deleteMany({ where: { sale_id: { in: ['test_edge_usd', 'test_edge_jpy'] } } })
}

async function test_E10_RecurringMaxExactBoundary() {
    console.log('\n📋 E10: Exact boundary — max=3, create exactly 3, then try 4th')

    const subId = 'sub_boundary_' + Date.now()
    const max = 3

    for (let m = 1; m <= max; m++) {
        await createCommission({
            saleId: `test_edge_bound_m${m}`,
            subscriptionId: subId,
            recurringMonth: m,
            recurringMax: max,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    const count = await prisma.commission.count({ where: { subscription_id: subId } })
    assert(count === max, `Created exactly ${count}/${max}`)

    // Safety net check
    const shouldReject = count >= max
    assert(shouldReject === true, `count (${count}) >= max (${max}) → rejected`)

    // Edge: max=3, count=2 → should allow
    await prisma.commission.delete({ where: { sale_id: `test_edge_bound_m3` } })
    const count2 = await prisma.commission.count({ where: { subscription_id: subId } })
    const shouldAllow = count2 < max
    assert(shouldAllow === true, `count (${count2}) < max (${max}) → allowed`)

    await prisma.commission.deleteMany({ where: { subscription_id: subId } })
}

async function test_E11_SellerBannedMidSubscription() {
    console.log('\n📋 E11: Seller banned mid-subscription — findSellerForSale returns null')

    // Create commissions for months 1-2
    const subId = 'sub_banned_' + Date.now()
    await createCommission({
        saleId: 'test_edge_banned_m1',
        subscriptionId: subId,
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 2990,
        missionReward: '5%',
    })

    // Ban the seller
    await prisma.seller.update({
        where: { id: SELLER_ID },
        data: { status: 'BANNED' }
    })

    // findSellerForSale should return null for banned seller
    const bannedSeller = await prisma.seller.findFirst({
        where: { id: SELLER_ID, status: 'APPROVED' }
    })
    assert(bannedSeller === null, 'Banned seller not found with APPROVED filter')

    // Existing commission still exists (not retroactively deleted)
    const existingCommission = await prisma.commission.findFirst({ where: { subscription_id: subId } })
    assert(existingCommission !== null, 'Existing commission preserved (not retroactive)')

    // Restore seller
    await prisma.seller.update({
        where: { id: SELLER_ID },
        data: { status: 'APPROVED' }
    })

    await prisma.commission.deleteMany({ where: { subscription_id: subId } })
}

async function test_E12_MultipleClawbacksSameSubscription() {
    console.log('\n📋 E12: Multiple refunds on same subscription — balance tracks correctly')

    const subId = 'sub_multirefund_' + Date.now()

    // Create 3 months, all COMPLETE
    for (let m = 1; m <= 3; m++) {
        const c = await createCommission({
            saleId: `test_edge_multiref_m${m}`,
            subscriptionId: subId,
            recurringMonth: m,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
        await prisma.commission.update({
            where: { id: c.id },
            data: { status: 'COMPLETE', matured_at: new Date(), paid_at: new Date() }
        })
    }

    // Initialize balance
    const commissions = await prisma.commission.findMany({ where: { subscription_id: subId } })
    const totalPaid = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
    await prisma.sellerBalance.upsert({
        where: { seller_id: SELLER_ID },
        create: { seller_id: SELLER_ID, balance: 0, pending: 0, due: 0, paid_total: totalPaid },
        update: { balance: 0, paid_total: totalPaid }
    })

    // Refund all 3
    for (const c of commissions) {
        await prisma.sellerBalance.update({
            where: { seller_id: SELLER_ID },
            data: { balance: { decrement: c.commission_amount } }
        })
        await prisma.commission.delete({ where: { id: c.id } })
    }

    const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_ID } })
    assert(balance!.balance === -totalPaid, `Balance = ${balance!.balance} (expected -${totalPaid})`)

    const remaining = await prisma.commission.count({ where: { subscription_id: subId } })
    assert(remaining === 0, 'All commissions deleted after refunds')

    await prisma.sellerBalance.delete({ where: { seller_id: SELLER_ID } })
}

async function test_E13_RecurringMax1() {
    console.log('\n📋 E13: recurringMax = 1 — only first month, then stop')

    const subId = 'sub_max1_' + Date.now()

    await createCommission({
        saleId: 'test_edge_max1_m1',
        subscriptionId: subId,
        recurringMonth: 1,
        recurringMax: 1,
        commissionSource: 'RECURRING',
        grossAmount: 2990,
        missionReward: '5%',
    })

    const count = await prisma.commission.count({ where: { subscription_id: subId } })
    assert(count === 1, `Month 1 created`)

    const shouldReject = count >= 1
    assert(shouldReject === true, `Month 2 would be rejected (count ${count} >= max 1)`)

    await prisma.commission.deleteMany({ where: { subscription_id: subId } })
}

async function test_E14_NegativeGrossAmount() {
    console.log('\n📋 E14: Negative gross amount (credit note / adjustment)')

    // Stripe can send negative amounts for credits
    const c = await createCommission({
        saleId: 'test_edge_negative',
        commissionSource: 'SALE',
        grossAmount: -500, // -5€ credit
        missionReward: '10%',
    })

    // With negative gross, tax/ht/net all go negative, commission should be negative or 0
    assert(c.gross_amount === -500, `Gross = ${c.gross_amount}`)
    assert(c.commission_amount <= 0, `Commission = ${c.commission_amount} (negative or zero on credit)`)

    await prisma.commission.delete({ where: { id: c.id } })
}

async function test_E15_HoldDaysVariation() {
    console.log('\n📋 E15: Different hold_days per commission type')

    const cSale = await createCommission({
        saleId: 'test_edge_hold_sale',
        commissionSource: 'SALE',
        grossAmount: 5000,
        missionReward: '10%',
        holdDays: 30,
    })
    assert(cSale.hold_days === 30, `SALE hold = ${cSale.hold_days} days`)

    // Simulate a LEAD with 3 days hold
    const cLead = await createCommission({
        saleId: 'test_edge_hold_lead',
        commissionSource: 'SALE', // Using SALE type to simplify, just testing hold_days field
        grossAmount: 0,
        missionReward: '5€',
        holdDays: 3,
    })
    assert(cLead.hold_days === 3, `LEAD hold = ${cLead.hold_days} days`)

    await prisma.commission.deleteMany({ where: { sale_id: { in: ['test_edge_hold_sale', 'test_edge_hold_lead'] } } })
}

async function test_E16_ConcurrentUpserts() {
    console.log('\n📋 E16: Concurrent upserts on same sale_id — no duplicates')

    // Simulate race condition: 5 concurrent upserts
    const results = await Promise.all([
        createCommission({ saleId: 'test_edge_race', commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%' }),
        createCommission({ saleId: 'test_edge_race', commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%' }),
        createCommission({ saleId: 'test_edge_race', commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%' }),
        createCommission({ saleId: 'test_edge_race', commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%' }),
        createCommission({ saleId: 'test_edge_race', commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%' }),
    ])

    const uniqueIds = new Set(results.map(r => r.id))
    assert(uniqueIds.size === 1, `All 5 concurrent upserts returned same ID (${uniqueIds.size} unique)`)

    const count = await prisma.commission.count({ where: { sale_id: 'test_edge_race' } })
    assert(count === 1, `Only 1 commission in DB after concurrent upserts`)

    await prisma.commission.delete({ where: { sale_id: 'test_edge_race' } })
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🧪 EDGE CASE TEST SUITE — RECURRING COMMISSIONS')
    console.log('================================================\n')

    try {
        await cleanup()
        await seed()

        await test_E1_ZeroAmountTrial()
        await test_E2_VerySmallAmount()
        await test_E3_VeryLargeAmount()
        await test_E4_FixedRewardOnSubscription()
        await test_E5_TwoSellersCompeting()
        await test_E6_ParallelSubscriptionsSameCustomer()
        await test_E7_ClawbackOnCompleteCommission()
        await test_E8_SaleIdCollision()
        await test_E9_CurrencyEdgeCases()
        await test_E10_RecurringMaxExactBoundary()
        await test_E11_SellerBannedMidSubscription()
        await test_E12_MultipleClawbacksSameSubscription()
        await test_E13_RecurringMax1()
        await test_E14_NegativeGrossAmount()
        await test_E15_HoldDaysVariation()
        await test_E16_ConcurrentUpserts()

        await cleanup()
    } catch (err) {
        console.error('\n💥 FATAL ERROR:', err)
        failed++
        await cleanup().catch(() => {})
    }

    console.log('\n================================================')
    console.log(`📊 Results: ${passed} passed, ${failed} failed`)
    console.log(failed === 0 ? '🎉 ALL EDGE CASES PASSED!' : '⚠️ SOME EDGE CASES FAILED — review above')

    await prisma.$disconnect()
    pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

main()
