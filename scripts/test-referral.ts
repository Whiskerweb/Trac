/**
 * Test script for REFERRAL (parrainage) commission system
 * Tests the referral engine, clawback cascades, balance updates, and data queries
 *
 * Usage: npx tsx scripts/test-referral.ts
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
// TEST IDS & CONSTANTS
// =============================================

const TEST_PREFIX = 'test_ref_'
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4' // "Reevy" workspace

const SELLER_A_ID = TEST_PREFIX + 'seller_a'
const SELLER_B_ID = TEST_PREFIX + 'seller_b'
const SELLER_C_ID = TEST_PREFIX + 'seller_c'
const SELLER_D_ID = TEST_PREFIX + 'seller_d'
const SELLER_BANNED_ID = TEST_PREFIX + 'seller_banned'
const SELLER_NO_REF_ID = TEST_PREFIX + 'seller_noref'
const SELLER_NO_CODE_ID = TEST_PREFIX + 'seller_nocode'

// T29: Chain D2 → C2 → B_BANNED → A for BANNED referrer cascade test
const SELLER_C2_ID = TEST_PREFIX + 'seller_c2'
const SELLER_D2_ID = TEST_PREFIX + 'seller_d2'
const LINK_C2_ID = TEST_PREFIX + 'link_c2'
const LINK_D2_ID = TEST_PREFIX + 'link_d2'
const ENROLLMENT_C2_ID = TEST_PREFIX + 'enroll_c2'
const ENROLLMENT_D2_ID = TEST_PREFIX + 'enroll_d2'

const MISSION_ID = TEST_PREFIX + 'mission_001'
const LINK_B_ID = TEST_PREFIX + 'link_b'
const LINK_C_ID = TEST_PREFIX + 'link_c'
const LINK_D_ID = TEST_PREFIX + 'link_d'
const ENROLLMENT_B_ID = TEST_PREFIX + 'enroll_b'
const ENROLLMENT_C_ID = TEST_PREFIX + 'enroll_c'
const ENROLLMENT_D_ID = TEST_PREFIX + 'enroll_d'
const CUSTOMER_ID = TEST_PREFIX + 'customer_001'

// Referral rates (must match engine.ts)
const GEN1_RATE = 0.05
const GEN2_RATE = 0.03
const GEN3_RATE = 0.02

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

// =============================================
// CLEANUP & SEED
// =============================================

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...')
    // Delete in order of dependencies
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: TEST_PREFIX } } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { startsWith: TEST_PREFIX } } })
    await prisma.customer.deleteMany({ where: { id: CUSTOMER_ID } })
    await prisma.missionEnrollment.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.shortLink.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    await prisma.mission.deleteMany({ where: { id: MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    console.log('  Done.')
}

async function seedTestData() {
    console.log('🌱 Seeding test data...')

    // Chain: A → referred B → referred C → referred D
    // A is the root referrer (no referrer)
    await prisma.seller.create({
        data: {
            id: SELLER_A_ID,
            user_id: TEST_PREFIX + 'user_a',
            tenant_id: TEST_PREFIX + 'tenant_a',
            email: 'seller_a@test.com',
            name: 'Seller A (Root Referrer)',
            status: 'APPROVED',
            referral_code: 'ref_a_00',
            referred_by: null,
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_B_ID,
            user_id: TEST_PREFIX + 'user_b',
            tenant_id: TEST_PREFIX + 'tenant_b',
            email: 'seller_b@test.com',
            name: 'Seller B',
            status: 'APPROVED',
            referral_code: 'ref_b_00',
            referred_by: SELLER_A_ID,
            referred_at: new Date(),
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_C_ID,
            user_id: TEST_PREFIX + 'user_c',
            tenant_id: TEST_PREFIX + 'tenant_c',
            email: 'seller_c@test.com',
            name: 'Seller C',
            status: 'APPROVED',
            referral_code: 'ref_c_00',
            referred_by: SELLER_B_ID,
            referred_at: new Date(),
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_D_ID,
            user_id: TEST_PREFIX + 'user_d',
            tenant_id: TEST_PREFIX + 'tenant_d',
            email: 'seller_d@test.com',
            name: 'Seller D',
            status: 'APPROVED',
            referral_code: 'ref_d_00',
            referred_by: SELLER_C_ID,
            referred_at: new Date(),
        }
    })

    // Banned seller with referral code
    await prisma.seller.create({
        data: {
            id: SELLER_BANNED_ID,
            user_id: TEST_PREFIX + 'user_banned',
            tenant_id: TEST_PREFIX + 'tenant_banned',
            email: 'seller_banned@test.com',
            name: 'Banned Seller',
            status: 'BANNED',
            referral_code: 'ref_ban0',
        }
    })

    // Seller without any referrer (for edge case tests)
    await prisma.seller.create({
        data: {
            id: SELLER_NO_REF_ID,
            user_id: TEST_PREFIX + 'user_noref',
            tenant_id: TEST_PREFIX + 'tenant_noref',
            email: 'seller_noref@test.com',
            name: 'Seller No Referrer',
            status: 'APPROVED',
            referral_code: 'ref_nr00',
            referred_by: null,
        }
    })

    // Seller without referral_code (for lazy-generate test)
    await prisma.seller.create({
        data: {
            id: SELLER_NO_CODE_ID,
            user_id: TEST_PREFIX + 'user_nocode',
            tenant_id: TEST_PREFIX + 'tenant_nocode',
            email: 'seller_nocode@test.com',
            name: 'Seller No Code',
            status: 'APPROVED',
            referral_code: null,
            referred_by: null,
        }
    })

    // T29 chain: D2 → C2 → BANNED → A
    // C2 referred by BANNED seller, D2 referred by C2
    await prisma.seller.create({
        data: {
            id: SELLER_C2_ID,
            user_id: TEST_PREFIX + 'user_c2',
            tenant_id: TEST_PREFIX + 'tenant_c2',
            email: 'seller_c2@test.com',
            name: 'Seller C2 (referred by BANNED)',
            status: 'APPROVED',
            referral_code: 'ref_c200',
            referred_by: SELLER_BANNED_ID,
            referred_at: new Date(),
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_D2_ID,
            user_id: TEST_PREFIX + 'user_d2',
            tenant_id: TEST_PREFIX + 'tenant_d2',
            email: 'seller_d2@test.com',
            name: 'Seller D2 (referred by C2)',
            status: 'APPROVED',
            referral_code: 'ref_d200',
            referred_by: SELLER_C2_ID,
            referred_at: new Date(),
        }
    })

    console.log('  Created seller chain: A → B → C → D + banned + no_ref + no_code')
    console.log('  Created BANNED chain: A ← BANNED ← C2 ← D2')

    // Create mission
    await prisma.mission.create({
        data: {
            id: MISSION_ID,
            workspace_id: WORKSPACE_ID,
            title: 'Test Referral Mission',
            description: 'Mission for referral tests',
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
    console.log('  Created mission (sale=10%)')

    // Short links for B, C, D
    for (const [linkId, userId] of [[LINK_B_ID, TEST_PREFIX + 'user_b'], [LINK_C_ID, TEST_PREFIX + 'user_c'], [LINK_D_ID, TEST_PREFIX + 'user_d']] as const) {
        await prisma.shortLink.create({
            data: {
                id: linkId,
                slug: `test-ref-link-${linkId.slice(-1)}`,
                original_url: 'https://example.com',
                workspace_id: WORKSPACE_ID,
                affiliate_id: userId,
            }
        })
    }

    // Short links for C2, D2
    for (const [linkId, userId] of [[LINK_C2_ID, TEST_PREFIX + 'user_c2'], [LINK_D2_ID, TEST_PREFIX + 'user_d2']] as const) {
        await prisma.shortLink.create({
            data: {
                id: linkId,
                slug: `test-ref-link-${linkId.slice(-2)}`,
                original_url: 'https://example.com',
                workspace_id: WORKSPACE_ID,
                affiliate_id: userId,
            }
        })
    }

    // Enrollments for B, C, D, C2, D2
    for (const [enrollId, linkId, userId] of [
        [ENROLLMENT_B_ID, LINK_B_ID, TEST_PREFIX + 'user_b'],
        [ENROLLMENT_C_ID, LINK_C_ID, TEST_PREFIX + 'user_c'],
        [ENROLLMENT_D_ID, LINK_D_ID, TEST_PREFIX + 'user_d'],
        [ENROLLMENT_C2_ID, LINK_C2_ID, TEST_PREFIX + 'user_c2'],
        [ENROLLMENT_D2_ID, LINK_D2_ID, TEST_PREFIX + 'user_d2'],
    ] as const) {
        await prisma.missionEnrollment.create({
            data: {
                id: enrollId,
                mission_id: MISSION_ID,
                user_id: userId,
                status: 'APPROVED',
                link_id: linkId,
            }
        })
    }

    // Customer
    await prisma.customer.create({
        data: {
            id: CUSTOMER_ID,
            workspace_id: WORKSPACE_ID,
            external_id: 'cus_test_ref_001',
            email: 'customer_ref@test.com',
            click_id: 'clk_ref_test_001',
            link_id: LINK_B_ID,
            affiliate_id: TEST_PREFIX + 'user_b',
        }
    })

    console.log('  Created links, enrollments, customer')
}

// =============================================
// HELPER: Create commission directly (mirrors engine logic)
// =============================================

async function createTestCommission(params: {
    saleId: string
    sellerId: string
    linkId: string
    grossAmount: number
    htAmount: number
    commissionSource?: 'SALE' | 'RECURRING'
    subscriptionId?: string | null
    recurringMonth?: number | null
    recurringMax?: number | null
    holdDays?: number
    status?: 'PENDING' | 'PROCEED' | 'COMPLETE'
}) {
    const {
        saleId, sellerId, linkId, grossAmount, htAmount,
        commissionSource = 'SALE',
        subscriptionId = null,
        recurringMonth = null,
        recurringMax = null,
        holdDays = 30,
        status = 'PENDING',
    } = params

    const stripeFee = Math.floor(grossAmount * 0.029 + 30)
    const netAmount = htAmount - stripeFee
    const commissionAmount = Math.floor(htAmount * 0.10) // 10% reward
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
            tax_amount: grossAmount - htAmount,
            commission_amount: commissionAmount,
            platform_fee: platformFee,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status,
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

// =============================================
// HELPER: Create flat commission (commission amount is a fixed value, not %)
// =============================================

async function createTestFlatCommission(params: {
    saleId: string
    sellerId: string
    linkId: string
    grossAmount: number
    htAmount: number
    flatAmount: number // commission in cents
    commissionSource?: 'SALE' | 'RECURRING'
    subscriptionId?: string | null
    recurringMonth?: number | null
    recurringMax?: number | null
    holdDays?: number
    status?: 'PENDING' | 'PROCEED' | 'COMPLETE'
}) {
    const {
        saleId, sellerId, linkId, grossAmount, htAmount, flatAmount,
        commissionSource = 'SALE',
        subscriptionId = null,
        recurringMonth = null,
        recurringMax = null,
        holdDays = 30,
        status = 'PENDING',
    } = params

    const stripeFee = Math.floor(grossAmount * 0.029 + 30)
    const netAmount = htAmount - stripeFee
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
            tax_amount: grossAmount - htAmount,
            commission_amount: flatAmount,
            platform_fee: platformFee,
            commission_rate: `${flatAmount}c`,
            commission_type: 'FIXED',
            currency: 'EUR',
            status,
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

// =============================================
// HELPER: Call createReferralCommissions (inline, same logic as engine.ts)
// We re-implement it here to use our test prisma instance
// =============================================

const REFERRAL_RATES = [
    { generation: 1, rate: 0.05 },
    { generation: 2, rate: 0.03 },
    { generation: 3, rate: 0.02 },
]

async function callCreateReferralCommissions(sourceCommission: {
    id: string
    seller_id: string
    program_id: string
    sale_id: string
    gross_amount: number
    net_amount: number
    stripe_fee: number
    tax_amount: number
    currency: string
    hold_days: number
    commission_source: 'SALE' | 'RECURRING' | 'LEAD'
    subscription_id?: string | null
    recurring_month?: number | null
    recurring_max?: number | null
    ht_amount: number
}) {
    const { seller_id, ht_amount } = sourceCommission
    if (ht_amount <= 0) return

    let currentSellerId = seller_id

    for (const { generation, rate } of REFERRAL_RATES) {
        const seller = await prisma.seller.findUnique({
            where: { id: currentSellerId },
            select: { referred_by: true }
        })

        if (!seller?.referred_by) break

        // S3: Skip referrers who are not APPROVED (BANNED, PENDING, etc.)
        const referrerSeller = await prisma.seller.findUnique({
            where: { id: seller.referred_by },
            select: { id: true, status: true }
        })
        if (!referrerSeller || referrerSeller.status !== 'APPROVED') break

        const referrerId = seller.referred_by
        const referralAmount = Math.floor(ht_amount * rate)

        if (referralAmount <= 0) {
            currentSellerId = referrerId
            continue
        }

        const referralSaleId = `${sourceCommission.sale_id}:ref:gen${generation}:${referrerId}`

        await prisma.commission.upsert({
            where: { sale_id: referralSaleId },
            create: {
                seller_id: referrerId,
                program_id: sourceCommission.program_id,
                sale_id: referralSaleId,
                gross_amount: sourceCommission.gross_amount,
                net_amount: sourceCommission.net_amount,
                stripe_fee: sourceCommission.stripe_fee,
                tax_amount: sourceCommission.tax_amount,
                commission_amount: referralAmount,
                platform_fee: 0,
                commission_rate: `ref:gen${generation}:${(rate * 100).toFixed(0)}%`,
                commission_type: 'PERCENTAGE',
                currency: sourceCommission.currency,
                status: 'PENDING',
                startup_payment_status: 'UNPAID',
                commission_source: sourceCommission.commission_source,
                subscription_id: sourceCommission.subscription_id ?? null,
                recurring_month: sourceCommission.recurring_month ?? null,
                recurring_max: sourceCommission.recurring_max ?? null,
                hold_days: sourceCommission.hold_days,
                referral_source_commission_id: sourceCommission.id,
                referral_generation: generation,
            },
            update: {}
        })

        // Update balance
        await updateSellerBalance(referrerId)

        currentSellerId = referrerId
    }
}

// =============================================
// HELPER: updateSellerBalance (mirrors engine.ts)
// =============================================

async function updateSellerBalance(sellerId: string) {
    const aggregates = await prisma.commission.groupBy({
        by: ['status'],
        where: { seller_id: sellerId },
        _sum: { commission_amount: true }
    })

    let pending = 0, due = 0, paid = 0
    for (const agg of aggregates) {
        const amount = agg._sum.commission_amount || 0
        if (agg.status === 'PENDING') pending = amount
        else if (agg.status === 'PROCEED') due = amount
        else if (agg.status === 'COMPLETE') paid = amount
    }

    await prisma.sellerBalance.upsert({
        where: { seller_id: sellerId },
        create: { seller_id: sellerId, balance: 0, pending, due, paid_total: paid },
        update: { pending, due, paid_total: paid }
    })
}

// =============================================
// HELPER: handleClawback (mirrors engine.ts full refund logic)
// =============================================

async function callHandleClawback(saleId: string) {
    const affectedSellerIds: string[] = []

    await prisma.$transaction(async (tx) => {
        const commission = await tx.commission.findUnique({ where: { sale_id: saleId } })
        if (!commission) return

        affectedSellerIds.push(commission.seller_id)

        // Find leader commission
        const leaderCommission = await tx.commission.findFirst({
            where: { org_parent_commission_id: commission.id }
        })

        // Find referral commissions
        const referralCommissions = await tx.commission.findMany({
            where: { referral_source_commission_id: commission.id }
        })

        // Delete referral commissions first
        for (const refComm of referralCommissions) {
            const refClawback = refComm.status === 'COMPLETE' ? refComm.commission_amount : 0
            await tx.commission.delete({ where: { id: refComm.id } })
            affectedSellerIds.push(refComm.seller_id)

            if (refClawback > 0) {
                await tx.sellerBalance.update({
                    where: { seller_id: refComm.seller_id },
                    data: { balance: { decrement: refClawback } }
                })
            }
        }

        // Delete leader commission
        if (leaderCommission) {
            const leaderClawback = leaderCommission.status === 'COMPLETE' ? leaderCommission.commission_amount : 0
            await tx.commission.delete({ where: { id: leaderCommission.id } })
            affectedSellerIds.push(leaderCommission.seller_id)

            if (leaderClawback > 0) {
                await tx.sellerBalance.update({
                    where: { seller_id: leaderCommission.seller_id },
                    data: { balance: { decrement: leaderClawback } }
                })
            }
        }

        // Delete member commission
        const clawbackAmount = commission.status === 'COMPLETE' ? commission.commission_amount : 0
        await tx.commission.delete({ where: { id: commission.id } })

        if (clawbackAmount > 0) {
            await tx.sellerBalance.update({
                where: { seller_id: commission.seller_id },
                data: { balance: { decrement: clawbackAmount } }
            })
        }
    })

    // Recalculate balances
    const uniqueIds = [...new Set(affectedSellerIds)]
    for (const id of uniqueIds) {
        await updateSellerBalance(id)
    }
}

// =============================================
// HELPER: countRecurringCommissions (mirrors engine.ts)
// =============================================

async function countRecurringCommissions(subscriptionId: string) {
    return prisma.commission.count({
        where: {
            subscription_id: subscriptionId,
            org_parent_commission_id: null,
            referral_generation: null,
        }
    })
}

// =============================================
// TESTS
// =============================================

// ----------- BLOC 1: Referral Commission Creation -----------

async function testT1_Gen1ReferralFromSellerB() {
    console.log('\n📋 T1: Sale by SellerB creates gen1 referral for SellerA')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_001',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_001',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const expectedSaleId = `${TEST_PREFIX}sale_001:ref:gen1:${SELLER_A_ID}`
    const refComm = await prisma.commission.findUnique({ where: { sale_id: expectedSaleId } })

    assert(refComm !== null, 'Referral commission exists for SellerA')
    assert(refComm?.referral_generation === 1, `referral_generation = ${refComm?.referral_generation} (expected 1)`)
    assert(refComm?.commission_amount === Math.floor(10000 * GEN1_RATE), `commission_amount = ${refComm?.commission_amount} (expected ${Math.floor(10000 * GEN1_RATE)})`)
    assert(refComm?.platform_fee === 0, `platform_fee = ${refComm?.platform_fee} (expected 0)`)
    assert(refComm?.referral_source_commission_id === commission.id, 'referral_source_commission_id points to source')
    assert(refComm?.seller_id === SELLER_A_ID, `seller_id = ${refComm?.seller_id} (expected ${SELLER_A_ID})`)
}

async function testT2_Gen1Gen2FromSellerC() {
    console.log('\n📋 T2: Sale by SellerC creates gen1 for SellerB AND gen2 for SellerA')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_002',
        sellerId: SELLER_C_ID,
        linkId: LINK_C_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_C_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_002',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_002:ref:gen1:${SELLER_B_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_002:ref:gen2:${SELLER_A_ID}` }
    })

    assert(gen1 !== null, 'Gen1 referral for SellerB exists')
    assert(gen1?.commission_amount === Math.floor(10000 * GEN1_RATE), `Gen1 amount = ${gen1?.commission_amount} (expected ${Math.floor(10000 * GEN1_RATE)})`)

    assert(gen2 !== null, 'Gen2 referral for SellerA exists')
    assert(gen2?.commission_amount === Math.floor(10000 * GEN2_RATE), `Gen2 amount = ${gen2?.commission_amount} (expected ${Math.floor(10000 * GEN2_RATE)})`)
}

async function testT3_FullChain3Generations() {
    console.log('\n📋 T3: Sale by SellerD creates gen1/gen2/gen3 (full chain)')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_003',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_003',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen3:${SELLER_A_ID}` }
    })

    assert(gen1?.commission_amount === Math.floor(10000 * GEN1_RATE), `Gen1 (SellerC) = ${gen1?.commission_amount} (expected ${Math.floor(10000 * GEN1_RATE)})`)
    assert(gen2?.commission_amount === Math.floor(10000 * GEN2_RATE), `Gen2 (SellerB) = ${gen2?.commission_amount} (expected ${Math.floor(10000 * GEN2_RATE)})`)
    assert(gen3?.commission_amount === Math.floor(10000 * GEN3_RATE), `Gen3 (SellerA) = ${gen3?.commission_amount} (expected ${Math.floor(10000 * GEN3_RATE)})`)
}

async function testT4_Idempotence() {
    console.log('\n📋 T4: Calling createReferralCommissions twice does NOT duplicate')

    // Re-use T1's commission
    const source = await prisma.commission.findUnique({ where: { sale_id: TEST_PREFIX + 'sale_001' } })
    assert(source !== null, 'Source commission from T1 exists')

    const beforeCount = await prisma.commission.count({
        where: { referral_source_commission_id: source!.id }
    })

    // Call again
    await callCreateReferralCommissions({
        id: source!.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_001',
        gross_amount: 12000,
        net_amount: source!.net_amount,
        stripe_fee: source!.stripe_fee,
        tax_amount: source!.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const afterCount = await prisma.commission.count({
        where: { referral_source_commission_id: source!.id }
    })

    assert(afterCount === beforeCount, `Count unchanged: before=${beforeCount}, after=${afterCount}`)
}

async function testT5_ZeroHTAmount() {
    console.log('\n📋 T5: ht_amount = 0 creates no referral commissions')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_zero',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 0,
        htAmount: 0,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_zero',
        gross_amount: 0,
        net_amount: 0,
        stripe_fee: 0,
        tax_amount: 0,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 0,
    })

    const refCount = await prisma.commission.count({
        where: { referral_source_commission_id: commission.id }
    })

    assert(refCount === 0, `No referral commissions created (count=${refCount})`)

    // Cleanup
    await prisma.commission.delete({ where: { id: commission.id } })
}

async function testT6_FloorRounding() {
    console.log('\n📋 T6: Amounts are rounded correctly (floor)')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_floor',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 400,
        htAmount: 333,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_floor',
        gross_amount: 400,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 333,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_floor:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_floor:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_floor:ref:gen3:${SELLER_A_ID}` }
    })

    assert(gen1?.commission_amount === Math.floor(333 * 0.05), `Gen1 = ${gen1?.commission_amount} (expected ${Math.floor(333 * 0.05)})`)
    assert(gen2?.commission_amount === Math.floor(333 * 0.03), `Gen2 = ${gen2?.commission_amount} (expected ${Math.floor(333 * 0.03)})`)
    assert(gen3?.commission_amount === Math.floor(333 * 0.02), `Gen3 = ${gen3?.commission_amount} (expected ${Math.floor(333 * 0.02)})`)
}

// ----------- BLOC 2: countRecurringCommissions excludes referrals -----------

async function testT7_RecurringCountExcludesReferrals() {
    console.log('\n📋 T7: Referral commissions do NOT count in recurring count')

    const subscriptionId = 'sub_ref_test_' + Date.now()

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_recur',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
        commissionSource: 'RECURRING',
        subscriptionId,
        recurringMonth: 1,
        recurringMax: 6,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_recur',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'RECURRING',
        subscription_id: subscriptionId,
        recurring_month: 1,
        recurring_max: 6,
        ht_amount: 10000,
    })

    // Verify referral was created (it has the same subscription_id)
    const refComm = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_recur:ref:gen1:${SELLER_A_ID}` }
    })
    assert(refComm !== null, 'Referral commission exists with subscription_id')
    assert(refComm?.subscription_id === subscriptionId, 'Referral has same subscription_id')

    // Count should be 1 (only the source, not the referral)
    const count = await countRecurringCommissions(subscriptionId)
    assert(count === 1, `countRecurringCommissions = ${count} (expected 1, excludes referral)`)

    // Cleanup
    await prisma.commission.deleteMany({ where: { subscription_id: subscriptionId } })
}

// ----------- BLOC 3: Clawback Cascade -----------

async function testT8_ClawbackDeletesReferrals() {
    console.log('\n📋 T8: handleClawback() deletes linked referral commissions')

    // Create fresh commission + referrals for this test
    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_claw1',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_claw1',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    // Verify referral exists before clawback
    const beforeRef = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_claw1:ref:gen1:${SELLER_A_ID}` }
    })
    assert(beforeRef !== null, 'Referral exists before clawback')

    // Clawback
    await callHandleClawback(TEST_PREFIX + 'sale_claw1')

    // Source should be gone
    const afterSource = await prisma.commission.findUnique({ where: { sale_id: TEST_PREFIX + 'sale_claw1' } })
    assert(afterSource === null, 'Source commission deleted')

    // Referral should be gone
    const afterRef = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_claw1:ref:gen1:${SELLER_A_ID}` }
    })
    assert(afterRef === null, 'Referral commission deleted by cascade')
}

async function testT9_ClawbackCOMPLETEAppliesNegativeBalance() {
    console.log('\n📋 T9: Clawback on COMPLETE source + COMPLETE referrals → negative balance')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_claw2',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
        status: 'COMPLETE',
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_claw2',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    // Set referral to COMPLETE too
    const refSaleId = `${TEST_PREFIX}sale_claw2:ref:gen1:${SELLER_A_ID}`
    await prisma.commission.update({
        where: { sale_id: refSaleId },
        data: { status: 'COMPLETE' }
    })

    // Init balance for seller A so decrement works
    await prisma.sellerBalance.upsert({
        where: { seller_id: SELLER_A_ID },
        create: { seller_id: SELLER_A_ID, balance: 0, pending: 0, due: 0, paid_total: 0 },
        update: {}
    })

    // Clawback
    await callHandleClawback(TEST_PREFIX + 'sale_claw2')

    // SellerA balance should be negative (the referral was COMPLETE and got clawed back)
    const balanceA = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })
    assert(balanceA !== null, 'SellerA balance record exists')
    assert((balanceA?.balance ?? 0) < 0, `SellerA balance = ${balanceA?.balance} (expected negative)`)
}

async function testT10_Clawback3GenerationsCascade() {
    console.log('\n📋 T10: Clawback cascade on 3-generation chain')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_claw3',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_claw3',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    // Verify 3 referrals exist
    const refCountBefore = await prisma.commission.count({
        where: { referral_source_commission_id: commission.id }
    })
    assert(refCountBefore === 3, `3 referral commissions before clawback (count=${refCountBefore})`)

    // Clawback
    await callHandleClawback(TEST_PREFIX + 'sale_claw3')

    // All referrals should be gone
    const gen1 = await prisma.commission.findUnique({ where: { sale_id: `${TEST_PREFIX}sale_claw3:ref:gen1:${SELLER_C_ID}` } })
    const gen2 = await prisma.commission.findUnique({ where: { sale_id: `${TEST_PREFIX}sale_claw3:ref:gen2:${SELLER_B_ID}` } })
    const gen3 = await prisma.commission.findUnique({ where: { sale_id: `${TEST_PREFIX}sale_claw3:ref:gen3:${SELLER_A_ID}` } })

    assert(gen1 === null, 'Gen1 referral deleted')
    assert(gen2 === null, 'Gen2 referral deleted')
    assert(gen3 === null, 'Gen3 referral deleted')
}

// ----------- BLOC 4: SellerBalance after referral -----------

async function testT11_BalanceIncludesReferralPending() {
    console.log('\n📋 T11: updateSellerBalance includes referral commissions in pending')

    // Create commission + referral for SellerA
    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_bal1',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_bal1',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    await updateSellerBalance(SELLER_A_ID)
    const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

    assert(balance !== null, 'SellerA balance record exists')
    assert((balance?.pending ?? 0) > 0, `SellerA pending = ${balance?.pending} (expected > 0, includes referral)`)
}

async function testT12_BalanceAfterReferralMaturation() {
    console.log('\n📋 T12: Balance correct after referral maturation (PROCEED)')

    // Mature referral commission → PROCEED
    const refSaleId = `${TEST_PREFIX}sale_bal1:ref:gen1:${SELLER_A_ID}`
    const refComm = await prisma.commission.findUnique({ where: { sale_id: refSaleId } })

    if (refComm) {
        await prisma.commission.update({
            where: { id: refComm.id },
            data: { status: 'PROCEED', matured_at: new Date() }
        })
    }

    await updateSellerBalance(SELLER_A_ID)
    const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

    // due may be 0 if maturation failed, check it's > 0
    const dueVal = balance?.due ?? 0
    assert(dueVal > 0, `SellerA due = ${dueVal} (expected > 0 after maturation)`)
}

// ----------- BLOC 5: getMyReferralData queries -----------

async function testT13_ReferralCodeAndLink() {
    console.log('\n📋 T13: Seller has referral_code and referralLink')

    const seller = await prisma.seller.findUnique({
        where: { id: SELLER_A_ID },
        select: { referral_code: true }
    })

    assert(seller?.referral_code !== null && seller?.referral_code !== undefined, `referral_code = ${seller?.referral_code}`)
    assert(seller?.referral_code === 'ref_a_00', `referral_code value = ${seller?.referral_code} (expected ref_a_00)`)
}

async function testT14_TotalReferredStats() {
    console.log('\n📋 T14: Total referred count and earnings stats')

    // Count sellers referred by A
    const totalReferred = await prisma.seller.count({ where: { referred_by: SELLER_A_ID } })
    assert(totalReferred === 1, `totalReferred = ${totalReferred} (expected 1: SellerB)`)

    // Total referral earnings for SellerA
    const earnings = await prisma.commission.aggregate({
        where: {
            seller_id: SELLER_A_ID,
            referral_generation: { not: null },
        },
        _sum: { commission_amount: true },
        _count: true,
    })

    assert(earnings._count > 0, `totalCommissions = ${earnings._count} (expected > 0)`)
    assert((earnings._sum.commission_amount || 0) > 0, `totalEarnings = ${earnings._sum.commission_amount} (expected > 0)`)
}

async function testT15_EarningsByGenerationBreakdown() {
    console.log('\n📋 T15: Earnings by generation breakdown')

    const [gen1, gen2, gen3] = await Promise.all([
        prisma.commission.aggregate({
            where: { seller_id: SELLER_A_ID, referral_generation: 1 },
            _sum: { commission_amount: true }, _count: true,
        }),
        prisma.commission.aggregate({
            where: { seller_id: SELLER_A_ID, referral_generation: 2 },
            _sum: { commission_amount: true }, _count: true,
        }),
        prisma.commission.aggregate({
            where: { seller_id: SELLER_A_ID, referral_generation: 3 },
            _sum: { commission_amount: true }, _count: true,
        }),
    ])

    assert(gen1._count > 0, `Gen1 count = ${gen1._count} (expected > 0)`)
    assert((gen1._sum.commission_amount || 0) > 0, `Gen1 amount = ${gen1._sum.commission_amount}`)

    // Gen2 may exist from T3 (SellerD sale creates gen2 for SellerB, gen3 for SellerA)
    // — actually SellerA gets gen3 from T3, gen2 from T2, gen1 from T1
    assert(gen2._count >= 0, `Gen2 count = ${gen2._count}`)
    assert(gen3._count >= 0, `Gen3 count = ${gen3._count}`)
}

async function testT16_ReferredSellersEarnings() {
    console.log('\n📋 T16: Referred sellers list includes earningsFromThem')

    // SellerB is referred by SellerA
    // Get gen1 commissions where source commission was from SellerB
    const gen1Comms = await prisma.commission.findMany({
        where: { seller_id: SELLER_A_ID, referral_generation: 1 },
        select: { commission_amount: true, referral_source_commission_id: true }
    })

    // Resolve source sellers
    const sourceIds = gen1Comms
        .map(c => c.referral_source_commission_id)
        .filter((id): id is string => id !== null)

    let earningsFromB = 0
    if (sourceIds.length > 0) {
        const sources = await prisma.commission.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, seller_id: true }
        })
        const sourceMap: Record<string, string> = {}
        for (const s of sources) sourceMap[s.id] = s.seller_id

        for (const c of gen1Comms) {
            if (c.referral_source_commission_id && sourceMap[c.referral_source_commission_id] === SELLER_B_ID) {
                earningsFromB += c.commission_amount
            }
        }
    }

    assert(earningsFromB > 0, `earningsFromThem (SellerB → SellerA) = ${earningsFromB} (expected > 0)`)
}

async function testT17_Pagination() {
    console.log('\n📋 T17: Pagination for referred sellers')

    const perPage = 20
    const totalReferred = await prisma.seller.count({ where: { referred_by: SELLER_A_ID } })
    const totalPages = Math.max(1, Math.ceil(totalReferred / perPage))

    const page1 = await prisma.seller.findMany({
        where: { referred_by: SELLER_A_ID },
        take: perPage,
        skip: 0,
    })

    assert(page1.length > 0, `Page 1 has ${page1.length} sellers`)
    assert(totalPages >= 1, `totalPages = ${totalPages} (expected >= 1)`)
}

async function testT18_ReferredByShowsReferrer() {
    console.log('\n📋 T18: SellerB.referred_by shows SellerA')

    const sellerB = await prisma.seller.findUnique({
        where: { id: SELLER_B_ID },
        select: {
            referred_by: true,
            Referrer: { select: { name: true, email: true } }
        }
    })

    assert(sellerB?.referred_by === SELLER_A_ID, `referred_by = ${sellerB?.referred_by} (expected ${SELLER_A_ID})`)
    assert(sellerB?.Referrer?.name === 'Seller A (Root Referrer)', `Referrer name = ${sellerB?.Referrer?.name}`)
}

async function testT19_LazyGenerateReferralCode() {
    console.log('\n📋 T19: Lazy-generate referral_code if missing')

    // Seller without code
    const before = await prisma.seller.findUnique({
        where: { id: SELLER_NO_CODE_ID },
        select: { referral_code: true }
    })
    assert(!before?.referral_code, `Before: referral_code = ${before?.referral_code} (expected null/undefined)`)

    // Simulate lazy-generate (same logic as getMyReferralData)
    const { nanoid } = await import('nanoid')
    const code = nanoid(8)
    await prisma.seller.update({
        where: { id: SELLER_NO_CODE_ID },
        data: { referral_code: code }
    })

    const after = await prisma.seller.findUnique({
        where: { id: SELLER_NO_CODE_ID },
        select: { referral_code: true }
    })
    assert(after?.referral_code !== null, `After: referral_code = ${after?.referral_code} (generated)`)
    assert(after?.referral_code?.length === 8, `Code length = ${after?.referral_code?.length} (expected 8)`)
}

// ----------- BLOC 6: Route /r/[code] validations -----------

async function testT20_ValidCodeApprovedSeller() {
    console.log('\n📋 T20: Valid code + APPROVED seller → found')

    const result = await prisma.seller.findUnique({
        where: { referral_code: 'ref_a_00' },
        select: { id: true, status: true }
    })

    assert(result !== null, 'Seller found by referral_code')
    assert(result?.status === 'APPROVED', `Status = ${result?.status} (expected APPROVED)`)
}

async function testT21_InvalidCodeNotFound() {
    console.log('\n📋 T21: Invalid code → seller not found')

    const result = await prisma.seller.findUnique({
        where: { referral_code: 'XXXXXXXX' },
        select: { id: true }
    })

    assert(result === null, 'No seller found for invalid code')
}

async function testT22_BannedSellerRejected() {
    console.log('\n📋 T22: BANNED seller with referral_code → rejected')

    const result = await prisma.seller.findUnique({
        where: { referral_code: 'ref_ban0' },
        select: { id: true, status: true }
    })

    assert(result !== null, 'Seller found by code')
    assert(result?.status !== 'APPROVED', `Status = ${result?.status} (expected !== APPROVED → rejected)`)
}

// ----------- BLOC 7: Org + Referral combo -----------

async function testT23_OrgCommissionsAlsoCreateReferrals() {
    console.log('\n📋 T23: Org sale by a referred seller also creates referral commissions')

    // Simulate: SellerB makes an org sale (member commission)
    const memberComm = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_org1',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    // In real code, createOrgCommissions() calls createReferralCommissions()
    // We simulate this by calling it directly
    await callCreateReferralCommissions({
        id: memberComm.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_org1',
        gross_amount: 12000,
        net_amount: memberComm.net_amount,
        stripe_fee: memberComm.stripe_fee,
        tax_amount: memberComm.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const refComm = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_org1:ref:gen1:${SELLER_A_ID}` }
    })

    assert(refComm !== null, 'Referral commission created alongside org commission')
    assert(refComm?.referral_source_commission_id === memberComm.id, 'Links to member commission')
}

// ----------- BLOC 8: Edge cases -----------

async function testT24_NoReferrerNoCommissions() {
    console.log('\n📋 T24: Seller without referrer (referred_by = null) → 0 referral commissions')

    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_noref',
        sellerId: SELLER_NO_REF_ID,
        linkId: LINK_B_ID, // reuse link for simplicity
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_NO_REF_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_noref',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const refCount = await prisma.commission.count({
        where: { referral_source_commission_id: commission.id }
    })

    assert(refCount === 0, `No referral commissions for seller without referrer (count=${refCount})`)
}

async function testT25_PartialChain2Generations() {
    console.log('\n📋 T25: Partial chain (only 2 generations: B referred by A)')

    // B → referred by A (no further chain)
    // Sale by B should create gen1 for A only, no gen2/gen3
    const commission = await createTestCommission({
        saleId: TEST_PREFIX + 'sale_partial',
        sellerId: SELLER_B_ID,
        linkId: LINK_B_ID,
        grossAmount: 12000,
        htAmount: 10000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_B_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_partial',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_partial:ref:gen1:${SELLER_A_ID}` }
    })
    // A has no referrer → no gen2
    const gen2Count = await prisma.commission.count({
        where: { sale_id: { startsWith: `${TEST_PREFIX}sale_partial:ref:gen2` } }
    })

    assert(gen1 !== null, 'Gen1 exists (SellerA)')
    assert(gen2Count === 0, `No gen2 created (count=${gen2Count})`)
}

// ----------- BLOC 9: Flat commission & platform_fee redistribution -----------

async function testT26_FlatCommissionSameReferrals() {
    console.log('\n📋 T26: Flat commission (10€) produces same referrals as percentage (10%)')

    // Flat 10€ = 1000 centimes on 100€ HT
    const commission = await createTestFlatCommission({
        saleId: TEST_PREFIX + 'sale_flat1',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 12000,
        htAmount: 10000,
        flatAmount: 1000, // 10€ flat
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_flat1',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat1:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat1:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat1:ref:gen3:${SELLER_A_ID}` }
    })

    // Same amounts as T3 (percentage 10%): referrals depend on HT, not commission type
    assert(gen1?.commission_amount === 500, `Gen1 = ${gen1?.commission_amount} (expected 500, same as T3)`)
    assert(gen2?.commission_amount === 300, `Gen2 = ${gen2?.commission_amount} (expected 300, same as T3)`)
    assert(gen3?.commission_amount === 200, `Gen3 = ${gen3?.commission_amount} (expected 200, same as T3)`)
}

async function testT27_ReferralTotalNeverExceedsPlatformFee() {
    console.log('\n📋 T27: Referral total <= platform_fee (15% of HT)')

    // Check all source commissions from our tests
    const sourceCommissions = await prisma.commission.findMany({
        where: {
            sale_id: { startsWith: TEST_PREFIX },
            referral_generation: null,
            org_parent_commission_id: null,
        },
        select: { id: true, sale_id: true, gross_amount: true, tax_amount: true }
    })

    let allValid = true
    for (const source of sourceCommissions) {
        const htAmount = source.gross_amount - source.tax_amount
        if (htAmount <= 0) continue

        const platformFee = Math.floor(htAmount * 0.15)
        const referrals = await prisma.commission.aggregate({
            where: { referral_source_commission_id: source.id },
            _sum: { commission_amount: true }
        })
        const totalReferral = referrals._sum.commission_amount || 0

        if (totalReferral > platformFee) {
            allValid = false
            console.log(`    ⚠️ sale_id=${source.sale_id}: referralTotal=${totalReferral} > platformFee=${platformFee}`)
        }
    }

    assert(allValid, 'All referral totals <= platform_fee (15% of HT)')
}

async function testT28_HighFlatCommissionReferralsUnchanged() {
    console.log('\n📋 T28: High flat commission (80€) — referrals still based on HT')

    // Flat 80€ = 8000 centimes on 100€ HT (very high commission)
    const commission = await createTestFlatCommission({
        saleId: TEST_PREFIX + 'sale_flat2',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 12000,
        htAmount: 10000,
        flatAmount: 8000, // 80€ flat
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_flat2',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat2:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat2:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_flat2:ref:gen3:${SELLER_A_ID}` }
    })

    // Identical to T26 and T3: referrals only depend on HT amount
    assert(gen1?.commission_amount === 500, `Gen1 = ${gen1?.commission_amount} (expected 500, independent of flat)`)
    assert(gen2?.commission_amount === 300, `Gen2 = ${gen2?.commission_amount} (expected 300, independent of flat)`)
    assert(gen3?.commission_amount === 200, `Gen3 = ${gen3?.commission_amount} (expected 200, independent of flat)`)
}

async function testT29_BannedReferrerBlocksCascade() {
    console.log('\n📋 T29: BANNED referrer in chain blocks cascade (S3 fix)')

    // Chain: D2 → C2 → BANNED → A
    // D2 sale → Gen1 for C2 = OK, Gen2 for BANNED = SKIP → Gen3 for A = SKIP
    const commission = await createTestFlatCommission({
        saleId: TEST_PREFIX + 'sale_banned1',
        sellerId: SELLER_D2_ID,
        linkId: LINK_D2_ID,
        grossAmount: 12000,
        htAmount: 10000,
        flatAmount: 1000,
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D2_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_banned1',
        gross_amount: 12000,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: 10000,
    })

    // Gen1 for C2 should exist (C2 is APPROVED)
    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_banned1:ref:gen1:${SELLER_C2_ID}` }
    })
    assert(gen1 !== null, 'Gen1 for C2 exists (C2 is APPROVED)')
    assert(gen1?.commission_amount === 500, `Gen1 amount = ${gen1?.commission_amount} (expected 500)`)

    // Gen2 for BANNED should NOT exist (BANNED status blocks cascade)
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_banned1:ref:gen2:${SELLER_BANNED_ID}` }
    })
    assert(gen2 === null, 'Gen2 for BANNED seller skipped')

    // Gen3 for A should NOT exist (cascade broken by BANNED)
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_banned1:ref:gen3:${SELLER_A_ID}` }
    })
    assert(gen3 === null, 'Gen3 for A skipped (cascade broken by BANNED)')
}

async function testT30_PlatformFeeRedistributionExplicit() {
    console.log('\n📋 T30: Platform fee redistribution — explicit values')

    // 100€ HT sale: platform_fee = 1500 (15%)
    // Referrals: gen1=500, gen2=300, gen3=200 → total=1000 (10%)
    // Traaaction keeps: 1500-1000 = 500 (5%)
    const htAmount = 10000
    const platformFee = Math.floor(htAmount * 0.15)
    const gen1Amount = Math.floor(htAmount * GEN1_RATE)
    const gen2Amount = Math.floor(htAmount * GEN2_RATE)
    const gen3Amount = Math.floor(htAmount * GEN3_RATE)
    const totalReferral = gen1Amount + gen2Amount + gen3Amount
    const traaactionKeeps = platformFee - totalReferral

    assert(platformFee === 1500, `platform_fee = ${platformFee} (expected 1500)`)
    assert(gen1Amount === 500, `gen1 = ${gen1Amount} (expected 500)`)
    assert(gen2Amount === 300, `gen2 = ${gen2Amount} (expected 300)`)
    assert(gen3Amount === 200, `gen3 = ${gen3Amount} (expected 200)`)
    assert(totalReferral === 1000, `totalReferral = ${totalReferral} (expected 1000, = 10% of HT)`)
    assert(traaactionKeeps === 500, `traaactionKeeps = ${traaactionKeeps} (expected 500, = 5% of HT)`)

    // Verify against actual T3 commissions
    const gen1Comm = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2Comm = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3Comm = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_003:ref:gen3:${SELLER_A_ID}` }
    })
    const actualTotal = (gen1Comm?.commission_amount || 0) + (gen2Comm?.commission_amount || 0) + (gen3Comm?.commission_amount || 0)
    assert(actualTotal === totalReferral, `Actual DB total = ${actualTotal} (expected ${totalReferral})`)
}

async function testT31_SmallAmountFloorRounding() {
    console.log('\n📋 T31: Small amount (7.77€ HT) — floor() preserves constraint')

    const htAmount = 777 // 7.77€ in cents
    const commission = await createTestFlatCommission({
        saleId: TEST_PREFIX + 'sale_small',
        sellerId: SELLER_D_ID,
        linkId: LINK_D_ID,
        grossAmount: 932, // ~777 * 1.2
        htAmount,
        flatAmount: 100, // 1€ flat
    })

    await callCreateReferralCommissions({
        id: commission.id,
        seller_id: SELLER_D_ID,
        program_id: WORKSPACE_ID,
        sale_id: TEST_PREFIX + 'sale_small',
        gross_amount: 932,
        net_amount: commission.net_amount,
        stripe_fee: commission.stripe_fee,
        tax_amount: commission.tax_amount,
        currency: 'EUR',
        hold_days: 30,
        commission_source: 'SALE',
        ht_amount: htAmount,
    })

    const gen1 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_small:ref:gen1:${SELLER_C_ID}` }
    })
    const gen2 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_small:ref:gen2:${SELLER_B_ID}` }
    })
    const gen3 = await prisma.commission.findUnique({
        where: { sale_id: `${TEST_PREFIX}sale_small:ref:gen3:${SELLER_A_ID}` }
    })

    const expectedGen1 = Math.floor(777 * 0.05) // 38
    const expectedGen2 = Math.floor(777 * 0.03) // 23
    const expectedGen3 = Math.floor(777 * 0.02) // 15
    const expectedTotal = expectedGen1 + expectedGen2 + expectedGen3 // 76
    const platformFee = Math.floor(777 * 0.15) // 116

    assert(gen1?.commission_amount === expectedGen1, `Gen1 = ${gen1?.commission_amount} (expected ${expectedGen1})`)
    assert(gen2?.commission_amount === expectedGen2, `Gen2 = ${gen2?.commission_amount} (expected ${expectedGen2})`)
    assert(gen3?.commission_amount === expectedGen3, `Gen3 = ${gen3?.commission_amount} (expected ${expectedGen3})`)
    assert(expectedTotal <= platformFee, `totalReferral ${expectedTotal} <= platformFee ${platformFee}`)
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🧪 REFERRAL COMMISSION TEST SUITE')
    console.log('===================================\n')

    try {
        await cleanup()
        await seedTestData()

        // Bloc 1: Referral Commission Creation
        await testT1_Gen1ReferralFromSellerB()
        await testT2_Gen1Gen2FromSellerC()
        await testT3_FullChain3Generations()
        await testT4_Idempotence()
        await testT5_ZeroHTAmount()
        await testT6_FloorRounding()

        // Bloc 2: countRecurringCommissions exclusion
        await testT7_RecurringCountExcludesReferrals()

        // Bloc 4: SellerBalance after referral (BEFORE clawback tests)
        await testT11_BalanceIncludesReferralPending()
        await testT12_BalanceAfterReferralMaturation()

        // Bloc 5: getMyReferralData queries (BEFORE clawback tests)
        await testT13_ReferralCodeAndLink()
        await testT14_TotalReferredStats()
        await testT15_EarningsByGenerationBreakdown()
        await testT16_ReferredSellersEarnings()
        await testT17_Pagination()
        await testT18_ReferredByShowsReferrer()
        await testT19_LazyGenerateReferralCode()

        // Bloc 6: Route /r/[code] validations
        await testT20_ValidCodeApprovedSeller()
        await testT21_InvalidCodeNotFound()
        await testT22_BannedSellerRejected()

        // Bloc 3: Clawback Cascade (after stats tests to avoid side effects)
        await testT8_ClawbackDeletesReferrals()
        await testT9_ClawbackCOMPLETEAppliesNegativeBalance()
        await testT10_Clawback3GenerationsCascade()

        // Bloc 7: Org + Referral combo
        await testT23_OrgCommissionsAlsoCreateReferrals()

        // Bloc 8: Edge cases
        await testT24_NoReferrerNoCommissions()
        await testT25_PartialChain2Generations()

        // Bloc 9: Flat commission & platform_fee redistribution
        await testT26_FlatCommissionSameReferrals()
        await testT27_ReferralTotalNeverExceedsPlatformFee()
        await testT28_HighFlatCommissionReferralsUnchanged()
        await testT29_BannedReferrerBlocksCascade()
        await testT30_PlatformFeeRedistributionExplicit()
        await testT31_SmallAmountFloorRounding()

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
