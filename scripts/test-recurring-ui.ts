/**
 * UI DATA INTEGRITY Test Suite
 * Verifies that commission lifecycle changes propagate correctly
 * to all dashboard queries (startup commissions, seller wallet, balances)
 *
 * Usage: npx tsx scripts/test-recurring-ui.ts
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const TEST_PREFIX = 'test_ui_'
const WORKSPACE_ID = '1fea94cc-a129-4915-93f0-a05b31d6a23c'
const SELLER_ID = TEST_PREFIX + 'seller_001'
const MISSION_ID = TEST_PREFIX + 'mission_001'
const ENROLLMENT_ID = TEST_PREFIX + 'enrollment_001'
const LINK_ID = TEST_PREFIX + 'link_001'
const CUSTOMER_ID = TEST_PREFIX + 'customer_001'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
    if (condition) { console.log(`  ✅ ${message}`); passed++ }
    else { console.log(`  ❌ FAIL: ${message}`); failed++ }
}

// =============================================
// SIMULATE THE SAME QUERIES THE UI MAKES
// =============================================

/** Simulates getWorkspaceCommissions() — what the startup dashboard shows */
async function queryStartupDashboard() {
    const commissions = await prisma.commission.findMany({
        where: { program_id: WORKSPACE_ID },
        include: {
            Seller: { select: { id: true, email: true, name: true, status: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 100
    })

    const total = commissions.reduce((s, c) => s + c.commission_amount, 0)
    const pending = commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commission_amount, 0)
    const proceed = commissions.filter(c => c.status === 'PROCEED').reduce((s, c) => s + c.commission_amount, 0)
    const complete = commissions.filter(c => c.status === 'COMPLETE').reduce((s, c) => s + c.commission_amount, 0)
    const platformFees = commissions.reduce((s, c) => s + c.platform_fee, 0)

    return {
        commissions,
        count: commissions.length,
        stats: { total, pending, proceed, complete, platformFees }
    }
}

/** Simulates getSellerWallet() — what the seller wallet shows */
async function querySellerWallet() {
    const [balance, commissions] = await Promise.all([
        prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_ID } }),
        prisma.commission.findMany({
            where: { seller_id: SELLER_ID },
            select: {
                id: true, sale_id: true, gross_amount: true, commission_amount: true,
                status: true, created_at: true, matured_at: true, hold_days: true,
                commission_source: true, subscription_id: true, recurring_month: true,
            },
            orderBy: { created_at: 'desc' },
            take: 50
        })
    ])

    return {
        balance: balance?.balance || 0,
        pending: balance?.pending || 0,
        due: balance?.due || 0,
        paid_total: balance?.paid_total || 0,
        commissions,
        commissionCount: commissions.length,
    }
}

/** Simulates getUnpaidCommissions() — what the startup payout page shows */
async function queryStartupPayouts() {
    const unpaid = await prisma.commission.findMany({
        where: {
            program_id: WORKSPACE_ID,
            status: 'PROCEED',
            startup_payment_status: 'UNPAID'
        },
        include: { Seller: { select: { id: true, email: true, name: true } } }
    })

    // Group by seller
    const bySellerMap = new Map<string, { sellerId: string, email: string, total: number, count: number }>()
    for (const c of unpaid) {
        const existing = bySellerMap.get(c.seller_id)
        if (existing) {
            existing.total += c.commission_amount
            existing.count++
        } else {
            bySellerMap.set(c.seller_id, {
                sellerId: c.seller_id,
                email: c.Seller?.email || '',
                total: c.commission_amount,
                count: 1,
            })
        }
    }

    const bySeller = Array.from(bySellerMap.values())
    const eligible = bySeller.filter(s => s.total >= 1000) // >=10€
    const ineligible = bySeller.filter(s => s.total < 1000) // <10€

    return { unpaid, bySeller, eligible, ineligible }
}

/** Simulates updateSellerBalance() from engine.ts */
async function recalculateSellerBalance() {
    const aggregates = await prisma.commission.groupBy({
        by: ['status'],
        where: { seller_id: SELLER_ID },
        _sum: { commission_amount: true }
    })

    let pendingAmt = 0, dueAmt = 0, paidAmt = 0
    for (const agg of aggregates) {
        const amount = agg._sum.commission_amount || 0
        if (agg.status === 'PENDING') pendingAmt = amount
        else if (agg.status === 'PROCEED') dueAmt = amount
        else if (agg.status === 'COMPLETE') paidAmt = amount
    }

    await prisma.sellerBalance.upsert({
        where: { seller_id: SELLER_ID },
        create: { seller_id: SELLER_ID, balance: dueAmt, pending: pendingAmt, due: dueAmt, paid_total: paidAmt },
        update: { pending: pendingAmt, due: dueAmt, balance: dueAmt, paid_total: paidAmt }
    })

    return { pending: pendingAmt, due: dueAmt, paid_total: paidAmt }
}

function parseReward(reward: string): { type: 'PERCENTAGE' | 'FIXED'; value: number } {
    const trimmed = reward.trim()
    if (trimmed.endsWith('%')) return { type: 'PERCENTAGE', value: parseFloat(trimmed.replace('%', '')) }
    return { type: 'FIXED', value: Math.round(parseFloat(trimmed) * 100) }
}

async function createTestCommission(saleId: string, opts: {
    subscriptionId?: string | null, recurringMonth?: number | null,
    recurringMax?: number | null, commissionSource: 'SALE' | 'RECURRING',
    grossAmount: number, missionReward: string
}) {
    const { subscriptionId = null, recurringMonth = null, recurringMax = null, commissionSource, grossAmount, missionReward } = opts
    const tax = Math.round(grossAmount * 0.1667)
    const htAmount = grossAmount - tax
    const stripeFee = Math.floor(grossAmount * 0.029 + 30)
    const netAmount = htAmount - stripeFee
    const parsed = parseReward(missionReward)
    const rawCommission = parsed.type === 'PERCENTAGE' ? Math.floor((htAmount * parsed.value) / 100) : parsed.value
    const platformFee = Math.floor(htAmount * 0.15)

    const c = await prisma.commission.upsert({
        where: { sale_id: saleId },
        create: {
            seller_id: SELLER_ID, program_id: WORKSPACE_ID, sale_id: saleId, link_id: LINK_ID,
            gross_amount: grossAmount, net_amount: netAmount, stripe_fee: stripeFee, tax_amount: tax,
            commission_amount: rawCommission, platform_fee: platformFee, commission_rate: missionReward,
            commission_type: parsed.type, currency: 'EUR', status: 'PENDING', startup_payment_status: 'UNPAID',
            commission_source: commissionSource, subscription_id: subscriptionId,
            recurring_month: recurringMonth, recurring_max: recurringMax, hold_days: 30,
        },
        update: {}
    })
    await recalculateSellerBalance()
    return c
}

async function cleanup() {
    console.log('\n🧹 Cleaning up...')
    await prisma.commission.deleteMany({ where: { OR: [{ sale_id: { startsWith: 'test_ui_' } }, { seller_id: SELLER_ID }] } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: SELLER_ID } })
    await prisma.customer.deleteMany({ where: { id: CUSTOMER_ID } })
    await prisma.missionEnrollment.deleteMany({ where: { id: ENROLLMENT_ID } })
    await prisma.shortLink.deleteMany({ where: { id: LINK_ID } })
    await prisma.mission.deleteMany({ where: { id: MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: SELLER_ID } })
    console.log('  Done.')
}

async function seed() {
    console.log('🌱 Seeding...')
    await prisma.seller.create({
        data: { id: SELLER_ID, user_id: TEST_PREFIX + 'user_001', tenant_id: TEST_PREFIX + 'tenant_001', email: 'uiseller@test.com', name: 'UI Test Seller', status: 'APPROVED' }
    })
    await prisma.mission.create({
        data: {
            id: MISSION_ID, workspace_id: WORKSPACE_ID, title: 'UI Test Mission',
            description: 'test', target_url: 'https://example.com', reward: '5%',
            status: 'ACTIVE', reward_type: 'SALE', reward_amount: 10, reward_structure: 'PERCENTAGE',
            sale_enabled: true, sale_reward_amount: 10, sale_reward_structure: 'PERCENTAGE',
            recurring_enabled: true, recurring_reward_amount: 5, recurring_reward_structure: 'PERCENTAGE',
            recurring_duration_months: 6,
        }
    })
    await prisma.shortLink.create({
        data: { id: LINK_ID, slug: 'test-ui-link', original_url: 'https://example.com', workspace_id: WORKSPACE_ID, affiliate_id: TEST_PREFIX + 'user_001' }
    })
    await prisma.missionEnrollment.create({
        data: { id: ENROLLMENT_ID, mission_id: MISSION_ID, user_id: TEST_PREFIX + 'user_001', status: 'APPROVED', link_id: LINK_ID }
    })
    console.log('  Done.\n')
}

// =============================================
// UI TESTS
// =============================================

async function test_UI1_EmptyDashboard() {
    console.log('📋 UI1: Empty state — startup and seller dashboards')

    const dash = await queryStartupDashboard()
    assert(dash.count === 0, 'Startup dashboard: 0 commissions')
    assert(dash.stats.total === 0, 'Stats total = 0')

    const wallet = await querySellerWallet()
    assert(wallet.commissionCount === 0, 'Seller wallet: 0 commissions')
    assert(wallet.pending === 0, 'Seller pending = 0')
    assert(wallet.due === 0, 'Seller due = 0')

    const payouts = await queryStartupPayouts()
    assert(payouts.unpaid.length === 0, 'Startup payouts: 0 unpaid')
}

async function test_UI2_AfterSaleCreation() {
    console.log('\n📋 UI2: After SALE commission creation')

    await createTestCommission('test_ui_sale_001', {
        commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%'
    })

    const dash = await queryStartupDashboard()
    assert(dash.count === 1, `Startup: ${dash.count} commission`)
    assert(dash.commissions[0].status === 'PENDING', 'Status = PENDING')
    assert(dash.commissions[0].commission_source === 'SALE', 'Source = SALE')
    assert(dash.stats.pending > 0, `Pending = ${dash.stats.pending / 100}€`)
    assert(dash.stats.proceed === 0, 'Proceed = 0 (not matured)')
    assert(dash.stats.complete === 0, 'Complete = 0 (not paid)')

    const wallet = await querySellerWallet()
    assert(wallet.commissionCount === 1, `Seller wallet: ${wallet.commissionCount} commission`)
    assert(wallet.pending > 0, `Seller pending = ${wallet.pending / 100}€`)
    assert(wallet.due === 0, 'Seller due = 0')

    const payouts = await queryStartupPayouts()
    assert(payouts.unpaid.length === 0, 'No unpaid payouts yet (still PENDING)')
}

async function test_UI3_AfterRecurringSubscription() {
    console.log('\n📋 UI3: After subscription with recurring commissions (3 months)')

    const subId = 'sub_ui_' + Date.now()
    for (let m = 1; m <= 3; m++) {
        await createTestCommission(`test_ui_sub_m${m}`, {
            subscriptionId: subId, recurringMonth: m, recurringMax: 6,
            commissionSource: 'RECURRING', grossAmount: 2990, missionReward: '5%'
        })
    }

    const dash = await queryStartupDashboard()
    assert(dash.count === 4, `Startup: ${dash.count} commissions (1 SALE + 3 RECURRING)`)

    const recurringCommissions = dash.commissions.filter(c => c.commission_source === 'RECURRING')
    assert(recurringCommissions.length === 3, `3 RECURRING commissions visible`)

    const saleCommissions = dash.commissions.filter(c => c.commission_source === 'SALE')
    assert(saleCommissions.length === 1, `1 SALE commission visible`)

    const wallet = await querySellerWallet()
    assert(wallet.commissionCount === 4, `Seller sees ${wallet.commissionCount} commissions`)
    assert(wallet.pending > 0, `All in pending: ${wallet.pending / 100}€`)
    assert(wallet.due === 0, 'Nothing due yet')

    // Verify recurring months display
    const recurringInWallet = wallet.commissions.filter(c => c.commission_source === 'RECURRING')
    const months = recurringInWallet.map(c => c.recurring_month).sort()
    assert(JSON.stringify(months) === JSON.stringify([1, 2, 3]), `Months visible: [${months}]`)
}

async function test_UI4_AfterMaturation() {
    console.log('\n📋 UI4: After maturation (PENDING → PROCEED)')

    // Mature the SALE commission
    await prisma.commission.updateMany({
        where: { sale_id: 'test_ui_sale_001' },
        data: { status: 'PROCEED', matured_at: new Date() }
    })
    await recalculateSellerBalance()

    const dash = await queryStartupDashboard()
    assert(dash.stats.proceed > 0, `Proceed stat = ${dash.stats.proceed / 100}€`)

    const wallet = await querySellerWallet()
    assert(wallet.due > 0, `Seller due = ${wallet.due / 100}€ (matured commission)`)
    assert(wallet.pending > 0, `Seller still has pending: ${wallet.pending / 100}€ (recurring)`)

    // Matured commission shows in wallet with matured_at
    const maturedInWallet = wallet.commissions.find(c => c.sale_id === 'test_ui_sale_001')
    assert(maturedInWallet?.status === 'PROCEED', 'Matured commission status = PROCEED in wallet')
    assert(maturedInWallet?.matured_at !== null, 'matured_at is set')

    // Should appear in startup payouts now
    const payouts = await queryStartupPayouts()
    assert(payouts.unpaid.length === 1, `1 unpaid commission ready for payout`)
}

async function test_UI5_AfterSubscriptionCancel() {
    console.log('\n📋 UI5: Subscription cancelled → PENDING recurring deleted, PROCEED stays')

    // Cancel: delete all PENDING for this subscription
    const subCommissions = await prisma.commission.findMany({
        where: { seller_id: SELLER_ID, commission_source: 'RECURRING' },
        select: { subscription_id: true }
    })
    const subId = subCommissions[0]?.subscription_id

    if (subId) {
        const deleted = await prisma.commission.deleteMany({
            where: { subscription_id: subId, status: 'PENDING' }
        })
        console.log(`  (Deleted ${deleted.count} PENDING recurring commissions)`)
    }
    await recalculateSellerBalance()

    const dash = await queryStartupDashboard()
    const recurringLeft = dash.commissions.filter(c => c.commission_source === 'RECURRING')
    assert(recurringLeft.length === 0, `Recurring commissions: ${recurringLeft.length} (all PENDING → deleted)`)

    // SALE commission (PROCEED) should still be there
    assert(dash.count === 1, `Only ${dash.count} commission left (the matured SALE)`)
    assert(dash.commissions[0].status === 'PROCEED', 'Remaining is PROCEED')

    const wallet = await querySellerWallet()
    assert(wallet.commissionCount === 1, `Seller wallet: ${wallet.commissionCount} commission`)
    assert(wallet.pending === 0, 'Pending = 0 (recurring deleted)')
    assert(wallet.due > 0, 'Due > 0 (matured SALE survives)')

    const payouts = await queryStartupPayouts()
    assert(payouts.unpaid.length === 1, 'Still 1 unpaid (the PROCEED SALE)')
}

async function test_UI6_AfterRefund_PendingCommission() {
    console.log('\n📋 UI6: Refund on PENDING commission → disappears completely')

    // Create a new SALE that's still PENDING
    const c = await createTestCommission('test_ui_refund_pending', {
        commissionSource: 'SALE', grossAmount: 3000, missionReward: '10%'
    })

    const dashBefore = await queryStartupDashboard()
    assert(dashBefore.count === 2, `Before refund: ${dashBefore.count} commissions`)

    // Simulate clawback: delete PENDING
    await prisma.commission.delete({ where: { id: c.id } })
    await recalculateSellerBalance()

    const dashAfter = await queryStartupDashboard()
    assert(dashAfter.count === 1, `After refund: ${dashAfter.count} commission (refunded one gone)`)

    const wallet = await querySellerWallet()
    assert(wallet.commissionCount === 1, 'Seller wallet: only matured SALE remains')
}

async function test_UI7_AfterRefund_CompleteCommission() {
    console.log('\n📋 UI7: Refund on COMPLETE commission → negative balance')

    // Mark the remaining commission as COMPLETE (paid)
    const remaining = await prisma.commission.findFirst({ where: { seller_id: SELLER_ID } })
    if (!remaining) { assert(false, 'No remaining commission'); return }

    await prisma.commission.update({
        where: { id: remaining.id },
        data: { status: 'COMPLETE', paid_at: new Date() }
    })
    await recalculateSellerBalance()

    const walletBefore = await querySellerWallet()
    assert(walletBefore.paid_total > 0, `Before refund: paid_total = ${walletBefore.paid_total / 100}€`)

    // Simulate clawback on COMPLETE: delete, recalculate, THEN apply negative
    const commissionAmount = remaining.commission_amount
    await prisma.commission.delete({ where: { id: remaining.id } })
    await recalculateSellerBalance()
    await prisma.sellerBalance.update({
        where: { seller_id: SELLER_ID },
        data: { balance: { decrement: commissionAmount } }
    })

    const dashAfter = await queryStartupDashboard()
    assert(dashAfter.count === 0, 'Startup: 0 commissions (all refunded/cancelled)')
    assert(dashAfter.stats.total === 0, 'Stats total = 0')

    const walletAfter = await querySellerWallet()
    assert(walletAfter.commissionCount === 0, 'Seller: 0 commissions')
    assert(walletAfter.balance < 0, `Balance went negative: ${walletAfter.balance / 100}€`)
    assert(walletAfter.due === 0, 'Due = 0')
    assert(walletAfter.pending === 0, 'Pending = 0')

    const payoutsAfter = await queryStartupPayouts()
    assert(payoutsAfter.unpaid.length === 0, 'No unpaid payouts')
    assert(payoutsAfter.eligible.length === 0, 'No eligible sellers')
}

async function test_UI8_PayoutThreshold() {
    console.log('\n📋 UI8: Payout threshold — eligible vs ineligible sellers')

    // Create small commission (below 10€ threshold)
    await createTestCommission('test_ui_small_payout', {
        commissionSource: 'SALE', grossAmount: 500, missionReward: '10%' // ~0.42€ commission
    })
    await prisma.commission.update({
        where: { sale_id: 'test_ui_small_payout' },
        data: { status: 'PROCEED', matured_at: new Date() }
    })
    await recalculateSellerBalance()

    const payouts1 = await queryStartupPayouts()
    assert(payouts1.eligible.length === 0, 'Small commission: seller NOT eligible (< 10€)')
    assert(payouts1.ineligible.length === 1, 'Shows in ineligible list')

    // Add bigger commission to push over threshold
    await createTestCommission('test_ui_big_payout', {
        commissionSource: 'SALE', grossAmount: 20000, missionReward: '10%' // ~16.67€ commission
    })
    await prisma.commission.update({
        where: { sale_id: 'test_ui_big_payout' },
        data: { status: 'PROCEED', matured_at: new Date() }
    })
    await recalculateSellerBalance()

    const payouts2 = await queryStartupPayouts()
    assert(payouts2.eligible.length === 1, 'With bigger commission: seller IS eligible (>= 10€)')
    assert(payouts2.ineligible.length === 0, 'No longer in ineligible list')

    // Clean these test commissions
    await prisma.commission.deleteMany({ where: { sale_id: { in: ['test_ui_small_payout', 'test_ui_big_payout'] } } })
    await recalculateSellerBalance()
}

async function test_UI9_CommissionSourceFilter() {
    console.log('\n📋 UI9: Commission source display (SALE vs RECURRING vs LEAD)')

    const subId = 'sub_uifilter_' + Date.now()

    await createTestCommission('test_ui_filter_sale', {
        commissionSource: 'SALE', grossAmount: 5000, missionReward: '10%'
    })
    await createTestCommission('test_ui_filter_recurring', {
        subscriptionId: subId, recurringMonth: 1, recurringMax: 6,
        commissionSource: 'RECURRING', grossAmount: 2990, missionReward: '5%'
    })

    const dash = await queryStartupDashboard()
    const sources = dash.commissions.map(c => c.commission_source)
    assert(sources.includes('SALE'), 'SALE visible in dashboard')
    assert(sources.includes('RECURRING'), 'RECURRING visible in dashboard')

    // Verify the seller wallet shows source too
    const wallet = await querySellerWallet()
    const walletSources = wallet.commissions.map(c => c.commission_source)
    assert(walletSources.includes('SALE'), 'SALE visible in seller wallet')
    assert(walletSources.includes('RECURRING'), 'RECURRING visible in seller wallet')

    // Recurring shows subscription_id and month
    const recurringInWallet = wallet.commissions.find(c => c.commission_source === 'RECURRING')
    assert(recurringInWallet?.subscription_id === subId, 'subscription_id visible in wallet')
    assert(recurringInWallet?.recurring_month === 1, 'recurring_month visible in wallet')

    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: 'test_ui_filter_' } } })
    await recalculateSellerBalance()
}

async function test_UI10_FullCycleEndToEnd() {
    console.log('\n📋 UI10: Full E2E cycle — create → mature → pay → refund → verify empty')

    // Step 1: Create
    const c = await createTestCommission('test_ui_e2e', {
        commissionSource: 'SALE', grossAmount: 10000, missionReward: '10%'
    })
    let dash = await queryStartupDashboard()
    let wallet = await querySellerWallet()
    assert(dash.count === 1 && wallet.pending > 0, 'Step 1 (create): 1 commission, pending > 0')

    // Step 2: Mature
    await prisma.commission.update({ where: { id: c.id }, data: { status: 'PROCEED', matured_at: new Date() } })
    await recalculateSellerBalance()
    dash = await queryStartupDashboard()
    wallet = await querySellerWallet()
    let payouts = await queryStartupPayouts()
    assert(dash.stats.proceed > 0, 'Step 2 (mature): proceed > 0')
    assert(wallet.due > 0, 'Step 2: seller due > 0')
    assert(payouts.unpaid.length === 1, 'Step 2: 1 unpaid payout')

    // Step 3: Pay (startup pays seller)
    await prisma.commission.update({ where: { id: c.id }, data: { status: 'COMPLETE', paid_at: new Date(), startup_payment_status: 'PAID' } })
    await recalculateSellerBalance()
    dash = await queryStartupDashboard()
    wallet = await querySellerWallet()
    payouts = await queryStartupPayouts()
    assert(dash.stats.complete > 0, 'Step 3 (pay): complete > 0')
    assert(wallet.paid_total > 0, 'Step 3: seller paid_total > 0')
    assert(payouts.unpaid.length === 0, 'Step 3: 0 unpaid (already paid)')

    // Step 4: Refund (customer refunds) — delete, recalculate, THEN apply negative
    const amount = c.commission_amount
    await prisma.commission.delete({ where: { id: c.id } })
    await recalculateSellerBalance()
    await prisma.sellerBalance.update({ where: { seller_id: SELLER_ID }, data: { balance: { decrement: amount } } })
    dash = await queryStartupDashboard()
    wallet = await querySellerWallet()
    assert(dash.count === 0, 'Step 4 (refund): 0 commissions')
    assert(dash.stats.total === 0, 'Step 4: stats all zeroed')
    assert(wallet.commissionCount === 0, 'Step 4: seller sees 0')
    assert(wallet.balance < 0, `Step 4: negative balance (${wallet.balance / 100}€)`)
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🧪 UI DATA INTEGRITY TEST SUITE')
    console.log('================================\n')

    try {
        await cleanup()
        await seed()

        await test_UI1_EmptyDashboard()
        await test_UI2_AfterSaleCreation()
        await test_UI3_AfterRecurringSubscription()
        await test_UI4_AfterMaturation()
        await test_UI5_AfterSubscriptionCancel()
        await test_UI6_AfterRefund_PendingCommission()
        await test_UI7_AfterRefund_CompleteCommission()
        await test_UI8_PayoutThreshold()
        await test_UI9_CommissionSourceFilter()
        await test_UI10_FullCycleEndToEnd()

        await cleanup()
    } catch (err) {
        console.error('\n💥 FATAL ERROR:', err)
        await cleanup().catch(() => {})
    }

    console.log('\n================================')
    console.log(`📊 Results: ${passed} passed, ${failed} failed`)
    console.log(failed === 0 ? '🎉 ALL UI TESTS PASSED!' : '⚠️ SOME UI TESTS FAILED')

    await prisma.$disconnect()
    pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

main()
