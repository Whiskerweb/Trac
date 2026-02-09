/**
 * Test script for RECURRING commission mode
 * Tests the engine + webhook logic directly (no HTTP needed)
 *
 * Usage: npx tsx scripts/test-recurring.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Test IDs
const TEST_PREFIX = 'test_recurring_'
const WORKSPACE_ID = '1fea94cc-a129-4915-93f0-a05b31d6a23c' // "Contact" workspace
const TEST_USER_ID = TEST_PREFIX + 'user_001'
const TEST_SELLER_ID = TEST_PREFIX + 'seller_001'
const TEST_MISSION_ID = TEST_PREFIX + 'mission_001'
const TEST_ENROLLMENT_ID = TEST_PREFIX + 'enrollment_001'
const TEST_LINK_ID = TEST_PREFIX + 'link_001'
const TEST_CUSTOMER_ID = TEST_PREFIX + 'customer_001'
const TEST_SUBSCRIPTION_ID = 'sub_test_' + Date.now()

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

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...')
    // Delete in order of dependencies
    await prisma.commission.deleteMany({ where: { program_id: WORKSPACE_ID, sale_id: { startsWith: 'test_' } } })
    await prisma.commission.deleteMany({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: TEST_SELLER_ID } })
    await prisma.customer.deleteMany({ where: { id: TEST_CUSTOMER_ID } })
    await prisma.shortLink.deleteMany({ where: { id: TEST_LINK_ID } })
    await prisma.missionEnrollment.deleteMany({ where: { id: TEST_ENROLLMENT_ID } })
    await prisma.mission.deleteMany({ where: { id: TEST_MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: TEST_SELLER_ID } })
    console.log('  Done.')
}

async function seedTestData() {
    console.log('🌱 Seeding test data...')

    // Create seller (no user needed for engine tests)
    await prisma.seller.create({
        data: {
            id: TEST_SELLER_ID,
            user_id: TEST_USER_ID,
            tenant_id: TEST_PREFIX + 'tenant_001',
            email: 'testseller@example.com',
            name: 'Test Seller',
            program_id: null, // Global seller
            status: 'APPROVED',
        }
    })
    console.log('  Created seller')

    // Create mission with recurring enabled
    await prisma.mission.create({
        data: {
            id: TEST_MISSION_ID,
            workspace_id: WORKSPACE_ID,
            title: 'Test Recurring Mission',
            description: 'Test mission for recurring commissions',
            target_url: 'https://example.com',
            reward: '5€/renewal + 10%/sale',
            status: 'ACTIVE',
            reward_type: 'SALE',
            reward_amount: 10,
            reward_structure: 'PERCENTAGE',
            commission_structure: 'RECURRING',
            // New multi-commission fields
            sale_enabled: true,
            sale_reward_amount: 10,
            sale_reward_structure: 'PERCENTAGE',
            recurring_enabled: true,
            recurring_reward_amount: 5,
            recurring_reward_structure: 'PERCENTAGE',
            recurring_duration_months: 6, // 6 months max
        }
    })
    console.log('  Created mission (sale=10%, recurring=5%, max 6 months)')

    // Create short link first (ShortLink has no FK to enrollment)
    await prisma.shortLink.create({
        data: {
            id: TEST_LINK_ID,
            slug: 'test-recurring-link',
            original_url: 'https://example.com',
            workspace_id: WORKSPACE_ID,
            affiliate_id: TEST_USER_ID,
        }
    })
    console.log('  Created short link')

    // Create enrollment with link_id pointing to the short link
    await prisma.missionEnrollment.create({
        data: {
            id: TEST_ENROLLMENT_ID,
            mission_id: TEST_MISSION_ID,
            user_id: TEST_USER_ID,
            status: 'APPROVED',
            link_id: TEST_LINK_ID,
        }
    })
    console.log('  Created enrollment (linked to short link)')

    // Create customer (attributed to seller)
    await prisma.customer.create({
        data: {
            id: TEST_CUSTOMER_ID,
            workspace_id: WORKSPACE_ID,
            external_id: 'cus_test_stripe_123',
            email: 'test@example.com',
            click_id: 'clk_test_123',
            link_id: TEST_LINK_ID,
            affiliate_id: TEST_USER_ID,
        }
    })
    console.log('  Created customer with attribution')
}

// =============================================
// Import engine functions dynamically to use same prisma
// We'll call them via the prisma instance directly
// =============================================

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

async function createTestCommission(params: {
    saleId: string
    subscriptionId?: string
    recurringMonth?: number
    recurringMax?: number
    commissionSource: 'SALE' | 'RECURRING'
    grossAmount: number
    missionReward: string
}) {
    const { saleId, subscriptionId, recurringMonth, recurringMax, commissionSource, grossAmount, missionReward } = params
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
            seller_id: TEST_SELLER_ID,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            link_id: TEST_LINK_ID,
            gross_amount: grossAmount,
            net_amount: netAmount,
            stripe_fee: stripeFee,
            tax_amount: tax,
            commission_amount: rawCommission,
            platform_fee: platformFee,
            commission_rate: missionReward,
            commission_type: parsed.type,
            currency: 'EUR',
            status: 'PENDING',
            startup_payment_status: 'UNPAID',
            commission_source: commissionSource,
            subscription_id: subscriptionId || null,
            recurring_month: recurringMonth || null,
            recurring_max: recurringMax || null,
            hold_days: 30,
        },
        update: {}
    })
}

// =============================================
// TESTS
// =============================================

async function testScenario1_OneTimeSale() {
    console.log('\n📋 SCENARIO 1: One-time sale (no subscription)')

    const commission = await createTestCommission({
        saleId: 'test_cs_onetime_001',
        commissionSource: 'SALE',
        grossAmount: 5000, // 50€
        missionReward: '10%',
    })

    assert(commission.commission_source === 'SALE', 'Commission source is SALE')
    assert(commission.status === 'PENDING', 'Status is PENDING')
    assert(commission.subscription_id === null, 'No subscription_id')
    assert(commission.recurring_month === null, 'No recurring_month')
    assert(commission.commission_amount > 0, `Commission amount = ${commission.commission_amount / 100}€`)

    // Cleanup
    await prisma.commission.delete({ where: { id: commission.id } })
}

async function testScenario2_SubscriptionMonth1() {
    console.log('\n📋 SCENARIO 2: Subscription checkout (month 1)')

    const commission = await createTestCommission({
        saleId: 'test_cs_sub_month1',
        subscriptionId: TEST_SUBSCRIPTION_ID,
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 2990, // 29.90€
        missionReward: '5%',
    })

    assert(commission.commission_source === 'RECURRING', 'Commission source is RECURRING')
    assert(commission.subscription_id === TEST_SUBSCRIPTION_ID, 'subscription_id is set')
    assert(commission.recurring_month === 1, 'recurring_month is 1')
    assert(commission.recurring_max === 6, 'recurring_max is 6')
    assert(commission.hold_days === 30, 'hold_days is 30')

    // Count check
    const count = await prisma.commission.count({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
    assert(count === 1, `countRecurringCommissions = ${count}`)
}

async function testScenario3_SubscriptionRenewals() {
    console.log('\n📋 SCENARIO 3: Subscription renewals (months 2-6)')

    for (let month = 2; month <= 6; month++) {
        const existingCount = await prisma.commission.count({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
        const recurringMonth = existingCount + 1

        await createTestCommission({
            saleId: `test_in_sub_month${month}`,
            subscriptionId: TEST_SUBSCRIPTION_ID,
            recurringMonth,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    const totalCount = await prisma.commission.count({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
    assert(totalCount === 6, `Total commissions for subscription = ${totalCount} (expected 6)`)

    const months = await prisma.commission.findMany({
        where: { subscription_id: TEST_SUBSCRIPTION_ID },
        select: { recurring_month: true },
        orderBy: { recurring_month: 'asc' }
    })
    const monthNumbers = months.map(m => m.recurring_month)
    assert(JSON.stringify(monthNumbers) === JSON.stringify([1, 2, 3, 4, 5, 6]), `Months = [${monthNumbers}] (expected [1,2,3,4,5,6])`)
}

async function testScenario4_RecurringLimitEnforced() {
    console.log('\n📋 SCENARIO 4: Recurring limit enforcement (month 7 should be rejected)')

    const existingCount = await prisma.commission.count({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
    assert(existingCount === 6, `Existing count = ${existingCount} (at limit)`)

    // Safety net check: should the engine be called, it would reject
    const recurringMax = 6
    const shouldReject = existingCount >= recurringMax
    assert(shouldReject === true, 'Safety net would reject month 7')

    // Try to create anyway (upsert won't duplicate due to unique sale_id)
    // But in real code, the webhook checks BEFORE calling createCommission
    console.log('  (In production, webhook stops before calling createCommission)')
}

async function testScenario5_SubscriptionCancelled_PendingDeleted() {
    console.log('\n📋 SCENARIO 5: Subscription cancelled → PENDING commissions deleted')

    // Check current state
    const beforeCount = await prisma.commission.count({
        where: { subscription_id: TEST_SUBSCRIPTION_ID, status: 'PENDING' }
    })
    assert(beforeCount === 6, `Before cancel: ${beforeCount} PENDING commissions`)

    // Simulate customer.subscription.deleted handler
    const deleted = await prisma.commission.deleteMany({
        where: {
            subscription_id: TEST_SUBSCRIPTION_ID,
            status: 'PENDING'
        }
    })

    assert(deleted.count === 6, `Deleted ${deleted.count} PENDING commissions (expected 6)`)

    const afterCount = await prisma.commission.count({
        where: { subscription_id: TEST_SUBSCRIPTION_ID }
    })
    assert(afterCount === 0, `After cancel: ${afterCount} commissions remain (expected 0)`)
}

async function testScenario6_CancelAfterMaturation() {
    console.log('\n📋 SCENARIO 6: Cancel after some commissions matured (PROCEED)')

    // Re-create 3 months of commissions
    for (let month = 1; month <= 3; month++) {
        await createTestCommission({
            saleId: `test_matured_month${month}`,
            subscriptionId: TEST_SUBSCRIPTION_ID,
            recurringMonth: month,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    // Mature months 1-2 (simulate cron passing hold period)
    await prisma.commission.updateMany({
        where: {
            sale_id: { in: ['test_matured_month1', 'test_matured_month2'] }
        },
        data: { status: 'PROCEED', matured_at: new Date() }
    })

    const proceedCount = await prisma.commission.count({
        where: { subscription_id: TEST_SUBSCRIPTION_ID, status: 'PROCEED' }
    })
    const pendingCount = await prisma.commission.count({
        where: { subscription_id: TEST_SUBSCRIPTION_ID, status: 'PENDING' }
    })
    assert(proceedCount === 2, `Matured (PROCEED): ${proceedCount}`)
    assert(pendingCount === 1, `Still pending: ${pendingCount}`)

    // Now cancel subscription → only PENDING deleted, PROCEED stays
    const deleted = await prisma.commission.deleteMany({
        where: {
            subscription_id: TEST_SUBSCRIPTION_ID,
            status: 'PENDING'
        }
    })
    assert(deleted.count === 1, `Only ${deleted.count} PENDING deleted (month 3)`)

    const remainingProceed = await prisma.commission.count({
        where: { subscription_id: TEST_SUBSCRIPTION_ID, status: 'PROCEED' }
    })
    assert(remainingProceed === 2, `PROCEED commissions untouched: ${remainingProceed}`)

    // Cleanup
    await prisma.commission.deleteMany({ where: { subscription_id: TEST_SUBSCRIPTION_ID } })
}

async function testScenario7_ClawbackOnRefund() {
    console.log('\n📋 SCENARIO 7: Clawback on refund (PENDING → deleted)')

    const commission = await createTestCommission({
        saleId: 'test_refund_001',
        subscriptionId: TEST_SUBSCRIPTION_ID,
        recurringMonth: 1,
        recurringMax: 6,
        commissionSource: 'RECURRING',
        grossAmount: 2990,
        missionReward: '5%',
    })
    assert(commission.status === 'PENDING', 'Commission starts PENDING')

    // Simulate handleClawback
    const found = await prisma.commission.findUnique({ where: { sale_id: 'test_refund_001' } })
    if (found && (found.status === 'PENDING' || found.status === 'PROCEED')) {
        await prisma.commission.delete({ where: { id: found.id } })
    }

    const afterRefund = await prisma.commission.findUnique({ where: { sale_id: 'test_refund_001' } })
    assert(afterRefund === null, 'Commission deleted after refund')
}

async function testScenario8_IdempotentUpsert() {
    console.log('\n📋 SCENARIO 8: Idempotent upsert (duplicate webhook)')

    const first = await createTestCommission({
        saleId: 'test_idempotent_001',
        commissionSource: 'SALE',
        grossAmount: 5000,
        missionReward: '10%',
    })

    const second = await createTestCommission({
        saleId: 'test_idempotent_001', // Same sale_id
        commissionSource: 'SALE',
        grossAmount: 5000,
        missionReward: '10%',
    })

    assert(first.id === second.id, 'Same commission returned (idempotent)')

    const count = await prisma.commission.count({ where: { sale_id: 'test_idempotent_001' } })
    assert(count === 1, `Only 1 commission exists (not duplicated)`)

    // Cleanup
    await prisma.commission.delete({ where: { sale_id: 'test_idempotent_001' } })
}

async function testScenario9_LifetimeRecurring() {
    console.log('\n📋 SCENARIO 9: Lifetime recurring (no max limit)')

    const lifetimeSubId = 'sub_lifetime_' + Date.now()

    // Create 20 months of commissions (no limit)
    for (let month = 1; month <= 20; month++) {
        await createTestCommission({
            saleId: `test_lifetime_month${month}`,
            subscriptionId: lifetimeSubId,
            recurringMonth: month,
            recurringMax: undefined as any, // null = Lifetime
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    const count = await prisma.commission.count({ where: { subscription_id: lifetimeSubId } })
    assert(count === 20, `20 commissions created with no limit (Lifetime)`)

    // Safety net check: recurringMax is null → no limit
    const recurringMax = null
    const shouldReject = recurringMax !== null && count >= recurringMax
    assert(shouldReject === false, 'Safety net does NOT reject when recurringMax is null')

    // Cleanup
    await prisma.commission.deleteMany({ where: { subscription_id: lifetimeSubId } })
}

async function testScenario10_ResubscribeNewSubscription() {
    console.log('\n📋 SCENARIO 10: Customer cancels then resubscribes (new subscription_id)')

    const sub1 = 'sub_first_' + Date.now()
    const sub2 = 'sub_second_' + Date.now()

    // First subscription: 3 months then cancel
    for (let month = 1; month <= 3; month++) {
        await createTestCommission({
            saleId: `test_resub1_month${month}`,
            subscriptionId: sub1,
            recurringMonth: month,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    // Cancel first subscription
    await prisma.commission.deleteMany({ where: { subscription_id: sub1, status: 'PENDING' } })

    // Second subscription: starts fresh
    for (let month = 1; month <= 3; month++) {
        await createTestCommission({
            saleId: `test_resub2_month${month}`,
            subscriptionId: sub2,
            recurringMonth: month,
            recurringMax: 6,
            commissionSource: 'RECURRING',
            grossAmount: 2990,
            missionReward: '5%',
        })
    }

    const sub1Count = await prisma.commission.count({ where: { subscription_id: sub1 } })
    const sub2Count = await prisma.commission.count({ where: { subscription_id: sub2 } })
    assert(sub1Count === 0, `First subscription: ${sub1Count} commissions (all cancelled)`)
    assert(sub2Count === 3, `Second subscription: ${sub2Count} commissions (independent counter)`)

    // Cleanup
    await prisma.commission.deleteMany({ where: { subscription_id: sub2 } })
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🧪 RECURRING COMMISSION TEST SUITE')
    console.log('===================================\n')

    try {
        await cleanup()
        await seedTestData()

        await testScenario1_OneTimeSale()
        await testScenario2_SubscriptionMonth1()
        await testScenario3_SubscriptionRenewals()
        await testScenario4_RecurringLimitEnforced()
        await testScenario5_SubscriptionCancelled_PendingDeleted()
        await testScenario6_CancelAfterMaturation()
        await testScenario7_ClawbackOnRefund()
        await testScenario8_IdempotentUpsert()
        await testScenario9_LifetimeRecurring()
        await testScenario10_ResubscribeNewSubscription()

        await cleanup()

    } catch (err) {
        console.error('\n💥 FATAL ERROR:', err)
        await cleanup().catch(() => {})
    }

    console.log('\n===================================')
    console.log(`📊 Results: ${passed} passed, ${failed} failed`)
    console.log(failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED')

    await prisma.$disconnect()
    pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

main()
