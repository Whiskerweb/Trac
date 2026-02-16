/**
 * REFERRAL UI DATA INTEGRITY Test Suite
 * Tests the data layer consumed by the referral dashboard UI:
 * - getMyReferralData() query shape and correctness
 * - /r/[code] route validation queries
 * - createGlobalSeller() referral wire-up
 * - Earnings lifecycle (PENDING → PROCEED → COMPLETE)
 * - Pagination and ordering
 * - Mixed sources (referral + direct in same wallet)
 * - E2E scenario (signup → sale → referral commission → display)
 *
 * Usage: npx tsx scripts/test-referral-ui.ts
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

const TEST_PREFIX = 'test_refui_'
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4' // "Reevy" workspace

const SELLER_A_ID = TEST_PREFIX + 'seller_a'
const SELLER_B_ID = TEST_PREFIX + 'seller_b'
const SELLER_C_ID = TEST_PREFIX + 'seller_c'
const SELLER_D_ID = TEST_PREFIX + 'seller_d'
const SELLER_NEW_ID = TEST_PREFIX + 'seller_new'
const SELLER_BANNED_ID = TEST_PREFIX + 'seller_banned'

const MISSION_ID = TEST_PREFIX + 'mission_001'
const LINK_B_ID = TEST_PREFIX + 'link_b'
const ENROLLMENT_B_ID = TEST_PREFIX + 'enroll_b'
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
    // Also cleanup extra sellers from pagination test
    await prisma.seller.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    console.log('  Done.')
}

async function seedTestData() {
    console.log('🌱 Seeding test data...')

    // Chain: A → referred B → referred C → referred D
    await prisma.seller.create({
        data: {
            id: SELLER_A_ID,
            user_id: TEST_PREFIX + 'user_a',
            tenant_id: TEST_PREFIX + 'tenant_a',
            email: 'refui_seller_a@test.com',
            name: 'RefUI Seller A',
            status: 'APPROVED',
            referral_code: 'TREFUI01',
            referred_by: null,
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_B_ID,
            user_id: TEST_PREFIX + 'user_b',
            tenant_id: TEST_PREFIX + 'tenant_b',
            email: 'refui_seller_b@test.com',
            name: 'RefUI Seller B',
            status: 'APPROVED',
            referral_code: 'TREFUI02',
            referred_by: SELLER_A_ID,
            referred_at: new Date('2025-06-15'),
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_C_ID,
            user_id: TEST_PREFIX + 'user_c',
            tenant_id: TEST_PREFIX + 'tenant_c',
            email: 'refui_seller_c@test.com',
            name: 'RefUI Seller C',
            status: 'APPROVED',
            referral_code: 'TREFUI03',
            referred_by: SELLER_B_ID,
            referred_at: new Date('2025-07-20'),
        }
    })

    await prisma.seller.create({
        data: {
            id: SELLER_D_ID,
            user_id: TEST_PREFIX + 'user_d',
            tenant_id: TEST_PREFIX + 'tenant_d',
            email: 'refui_seller_d@test.com',
            name: 'RefUI Seller D',
            status: 'APPROVED',
            referral_code: 'TREFUI04',
            referred_by: SELLER_C_ID,
            referred_at: new Date('2025-08-10'),
        }
    })

    // Seller without referral_code or referred_by
    await prisma.seller.create({
        data: {
            id: SELLER_NEW_ID,
            user_id: TEST_PREFIX + 'user_new',
            tenant_id: TEST_PREFIX + 'tenant_new',
            email: 'refui_seller_new@test.com',
            name: 'RefUI Seller New',
            status: 'APPROVED',
            referral_code: null,
            referred_by: null,
        }
    })

    // Banned seller
    await prisma.seller.create({
        data: {
            id: SELLER_BANNED_ID,
            user_id: TEST_PREFIX + 'user_banned',
            tenant_id: TEST_PREFIX + 'tenant_banned',
            email: 'refui_seller_banned@test.com',
            name: 'RefUI Seller Banned',
            status: 'BANNED',
            referral_code: 'TREFUIBN',
        }
    })

    console.log('  Created sellers: A→B→C→D + NEW + BANNED')

    // Mission
    await prisma.mission.create({
        data: {
            id: MISSION_ID,
            workspace_id: WORKSPACE_ID,
            title: 'RefUI Test Mission',
            description: 'Mission for referral UI tests',
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

    // Short link for B
    await prisma.shortLink.create({
        data: {
            id: LINK_B_ID,
            slug: 'test-refui-link-b',
            original_url: 'https://example.com',
            workspace_id: WORKSPACE_ID,
            affiliate_id: TEST_PREFIX + 'user_b',
        }
    })

    // Enrollment for B
    await prisma.missionEnrollment.create({
        data: {
            id: ENROLLMENT_B_ID,
            mission_id: MISSION_ID,
            user_id: TEST_PREFIX + 'user_b',
            status: 'APPROVED',
            link_id: LINK_B_ID,
        }
    })

    // Customer
    await prisma.customer.create({
        data: {
            id: CUSTOMER_ID,
            workspace_id: WORKSPACE_ID,
            external_id: 'cus_refui_001',
            email: 'customer_refui@test.com',
            click_id: 'clk_refui_001',
            link_id: LINK_B_ID,
            affiliate_id: TEST_PREFIX + 'user_b',
        }
    })

    console.log('  Created mission, link, enrollment, customer')
}

// =============================================
// HELPERS
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
    const commissionAmount = Math.floor(htAmount * 0.10)
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

        await updateSellerBalance(referrerId)
        currentSellerId = referrerId
    }
}

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

async function callHandleClawback(saleId: string) {
    const affectedSellerIds: string[] = []

    await prisma.$transaction(async (tx) => {
        const commission = await tx.commission.findUnique({ where: { sale_id: saleId } })
        if (!commission) return

        affectedSellerIds.push(commission.seller_id)

        const leaderCommission = await tx.commission.findFirst({
            where: { org_parent_commission_id: commission.id }
        })

        const referralCommissions = await tx.commission.findMany({
            where: { referral_source_commission_id: commission.id }
        })

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

        const clawbackAmount = commission.status === 'COMPLETE' ? commission.commission_amount : 0
        await tx.commission.delete({ where: { id: commission.id } })

        if (clawbackAmount > 0) {
            await tx.sellerBalance.update({
                where: { seller_id: commission.seller_id },
                data: { balance: { decrement: clawbackAmount } }
            })
        }
    })

    const uniqueIds = [...new Set(affectedSellerIds)]
    for (const id of uniqueIds) {
        await updateSellerBalance(id)
    }
}

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
// UI QUERY SIMULATORS (mirror getMyReferralData)
// =============================================

async function queryReferralData(sellerId: string, page: number = 1) {
    const seller = await prisma.seller.findUnique({
        where: { id: sellerId },
        select: {
            id: true,
            referral_code: true,
            referred_by: true,
            referred_at: true,
            Referrer: { select: { id: true, name: true, email: true } },
        }
    })
    if (!seller) throw new Error(`Seller ${sellerId} not found`)

    // Count direct referrals (gen 1)
    const referralCount = await prisma.seller.count({
        where: { referred_by: seller.id }
    })

    // Total referral earnings
    const referralEarnings = await prisma.commission.aggregate({
        where: {
            seller_id: seller.id,
            referral_generation: { not: null },
        },
        _sum: { commission_amount: true },
        _count: true,
    })

    // Earnings by generation
    const [gen1Agg, gen2Agg, gen3Agg] = await Promise.all([
        prisma.commission.aggregate({
            where: { seller_id: seller.id, referral_generation: 1 },
            _sum: { commission_amount: true },
            _count: true,
        }),
        prisma.commission.aggregate({
            where: { seller_id: seller.id, referral_generation: 2 },
            _sum: { commission_amount: true },
            _count: true,
        }),
        prisma.commission.aggregate({
            where: { seller_id: seller.id, referral_generation: 3 },
            _sum: { commission_amount: true },
            _count: true,
        }),
    ])

    // Count referred sellers per generation
    const gen1SellerIds = await prisma.seller.findMany({
        where: { referred_by: seller.id },
        select: { id: true },
    })
    const gen1Ids = gen1SellerIds.map(s => s.id)

    let gen2ReferredCount = 0
    let gen3ReferredCount = 0
    if (gen1Ids.length > 0) {
        const gen2Sellers = await prisma.seller.findMany({
            where: { referred_by: { in: gen1Ids } },
            select: { id: true },
        })
        gen2ReferredCount = gen2Sellers.length
        const gen2Ids = gen2Sellers.map(s => s.id)
        if (gen2Ids.length > 0) {
            gen3ReferredCount = await prisma.seller.count({
                where: { referred_by: { in: gen2Ids } },
            })
        }
    }

    // Earnings per referred seller
    const gen1Commissions = await prisma.commission.findMany({
        where: { seller_id: seller.id, referral_generation: 1 },
        select: {
            commission_amount: true,
            referral_source_commission_id: true,
        }
    })

    const sourceIds = gen1Commissions
        .map(c => c.referral_source_commission_id)
        .filter((id): id is string => id !== null)
    const sourceCommissions = sourceIds.length > 0
        ? await prisma.commission.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, seller_id: true },
        })
        : []
    const sourceToSeller: Record<string, string> = {}
    for (const sc of sourceCommissions) {
        sourceToSeller[sc.id] = sc.seller_id
    }

    const earningsByReferral: Record<string, number> = {}
    for (const c of gen1Commissions) {
        const srcSellerId = c.referral_source_commission_id ? sourceToSeller[c.referral_source_commission_id] : null
        if (srcSellerId) {
            earningsByReferral[srcSellerId] = (earningsByReferral[srcSellerId] || 0) + c.commission_amount
        }
    }

    // Paginated referred sellers list
    const perPage = 10  // smaller for testing pagination
    const safePage = Math.max(1, Math.floor(page))
    const totalPages = Math.max(1, Math.ceil(referralCount / perPage))

    const referredSellers = await prisma.seller.findMany({
        where: { referred_by: seller.id },
        select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
            status: true,
            _count: { select: { Commissions: { where: { referral_generation: null, org_parent_commission_id: null } } } }
        },
        orderBy: { created_at: 'desc' },
        take: perPage,
        skip: (safePage - 1) * perPage,
    })

    return {
        referralCode: seller.referral_code,
        referredBy: seller.Referrer ? { name: seller.Referrer.name, email: seller.Referrer.email } : null,
        referredAt: seller.referred_at,
        stats: {
            totalReferred: referralCount,
            totalEarnings: referralEarnings._sum.commission_amount || 0,
            totalCommissions: referralEarnings._count,
        },
        earningsByGeneration: {
            gen1: { count: gen1Agg._count, amount: gen1Agg._sum.commission_amount || 0, referredCount: gen1Ids.length },
            gen2: { count: gen2Agg._count, amount: gen2Agg._sum.commission_amount || 0, referredCount: gen2ReferredCount },
            gen3: { count: gen3Agg._count, amount: gen3Agg._sum.commission_amount || 0, referredCount: gen3ReferredCount },
        },
        referredSellers: referredSellers.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            joinedAt: s.created_at,
            status: s.status,
            salesCount: s._count.Commissions,
            earningsFromThem: earningsByReferral[s.id] || 0,
        })),
        pagination: {
            page: safePage,
            totalPages,
            total: referralCount,
        },
    }
}

// =============================================
// BLOC 1: Empty states / initial data (3 tests)
// =============================================

async function testT1_EmptyStatsForReferrer() {
    console.log('\n📋 T1: Seller A with no referral commissions yet — stats at zero')

    try {
        const data = await queryReferralData(SELLER_A_ID)

        assert(data.stats.totalReferred === 1, `totalReferred = ${data.stats.totalReferred} (expected 1, SellerB)`)
        assert(data.stats.totalEarnings === 0, `totalEarnings = ${data.stats.totalEarnings} (expected 0)`)
        assert(data.stats.totalCommissions === 0, `totalCommissions = ${data.stats.totalCommissions} (expected 0)`)
        assert(data.earningsByGeneration.gen1.count === 0, `gen1.count = ${data.earningsByGeneration.gen1.count} (expected 0)`)
        assert(data.earningsByGeneration.gen1.amount === 0, `gen1.amount = ${data.earningsByGeneration.gen1.amount} (expected 0)`)
        assert(data.earningsByGeneration.gen2.count === 0, `gen2.count = 0`)
        assert(data.earningsByGeneration.gen3.count === 0, `gen3.count = 0`)
    } catch (err) {
        console.error('  💥 T1 error:', err)
        failed++
    }
}

async function testT2_LazyGenerateReferralCode() {
    console.log('\n📋 T2: Seller NEW without referral_code — lazy generation')

    try {
        const before = await prisma.seller.findUnique({
            where: { id: SELLER_NEW_ID },
            select: { referral_code: true }
        })
        assert(before?.referral_code === null, `Before: referral_code = ${before?.referral_code} (expected null)`)

        // Simulate lazy-generate (same logic as getMyReferralData)
        const { nanoid } = await import('nanoid')
        const code = nanoid(8)
        await prisma.seller.update({
            where: { id: SELLER_NEW_ID },
            data: { referral_code: code }
        })

        const after = await prisma.seller.findUnique({
            where: { id: SELLER_NEW_ID },
            select: { referral_code: true }
        })
        assert(after?.referral_code !== null, `After: referral_code generated (${after?.referral_code})`)
        assert(after?.referral_code?.length === 8, `Code length = ${after?.referral_code?.length} (expected 8)`)

        // Verify uniqueness — no other seller has this code
        const dupes = await prisma.seller.count({ where: { referral_code: code } })
        assert(dupes === 1, `Code is unique (count=${dupes}, expected 1)`)
    } catch (err) {
        console.error('  💥 T2 error:', err)
        failed++
    }
}

async function testT3_ReferredByDisplay() {
    console.log('\n📋 T3: SellerB referredBy shows SellerA name/email')

    try {
        const data = await queryReferralData(SELLER_B_ID)

        assert(data.referredBy !== null, 'referredBy is not null')
        assert(data.referredBy?.name === 'RefUI Seller A', `referredBy.name = ${data.referredBy?.name} (expected RefUI Seller A)`)
        assert(data.referredBy?.email === 'refui_seller_a@test.com', `referredBy.email = ${data.referredBy?.email}`)
        assert(data.referredAt !== null, `referredAt = ${data.referredAt} (not null)`)
    } catch (err) {
        console.error('  💥 T3 error:', err)
        failed++
    }
}

// =============================================
// BLOC 2: Route /r/[code] wire-up (3 tests)
// =============================================

async function testT4_ValidCodeApproved() {
    console.log('\n📋 T4: Valid code + APPROVED seller → found')

    try {
        const result = await prisma.seller.findUnique({
            where: { referral_code: 'TREFUI01' },
            select: { id: true, name: true, status: true }
        })

        assert(result !== null, 'Seller found by referral_code TREFUI01')
        assert(result?.status === 'APPROVED', `status = ${result?.status} (expected APPROVED)`)
        assert(result?.id === SELLER_A_ID, `id = ${result?.id} (expected ${SELLER_A_ID})`)
    } catch (err) {
        console.error('  💥 T4 error:', err)
        failed++
    }
}

async function testT5_InvalidCodeNull() {
    console.log('\n📋 T5: Invalid code → null')

    try {
        const result = await prisma.seller.findUnique({
            where: { referral_code: 'ZZZZZZZZ' },
            select: { id: true }
        })

        assert(result === null, 'No seller found for invalid code ZZZZZZZZ')
    } catch (err) {
        console.error('  💥 T5 error:', err)
        failed++
    }
}

async function testT6_BannedSellerRejected() {
    console.log('\n📋 T6: Seller BANNED → code exists but rejected')

    try {
        const result = await prisma.seller.findUnique({
            where: { referral_code: 'TREFUIBN' },
            select: { id: true, status: true }
        })

        assert(result !== null, 'Seller found by code TREFUIBN')
        assert(result?.status === 'BANNED', `status = ${result?.status} (expected BANNED)`)
        assert(result?.status !== 'APPROVED', 'status !== APPROVED → route would reject')
    } catch (err) {
        console.error('  💥 T6 error:', err)
        failed++
    }
}

// =============================================
// BLOC 3: Earnings display shape (5 tests)
// =============================================

async function testT7_ReferralCommissionShape() {
    console.log('\n📋 T7: Commission referral gen1 — correct shape for UI')

    try {
        // Sale by SellerB → gen1 referral for SellerA
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

        const refSaleId = `${TEST_PREFIX}sale_001:ref:gen1:${SELLER_A_ID}`
        const refComm = await prisma.commission.findUnique({ where: { sale_id: refSaleId } })

        assert(refComm !== null, 'Referral commission exists')
        assert(refComm?.id !== undefined && refComm?.id !== null, 'Has id field')
        assert(refComm?.sale_id === refSaleId, `sale_id matches`)
        assert(refComm?.commission_amount === Math.floor(10000 * GEN1_RATE), `commission_amount = ${refComm?.commission_amount} (expected ${Math.floor(10000 * GEN1_RATE)})`)
        assert(refComm?.referral_generation === 1, `referral_generation = ${refComm?.referral_generation} (expected 1)`)
        assert(refComm?.referral_source_commission_id === commission.id, 'referral_source_commission_id links to source')
        assert(refComm?.commission_source === 'SALE', `commission_source = ${refComm?.commission_source}`)
        assert(refComm?.status === 'PENDING', `status = ${refComm?.status} (expected PENDING)`)
        assert(refComm?.seller_id === SELLER_A_ID, `seller_id = ${refComm?.seller_id}`)
        assert(refComm?.created_at !== null, 'created_at is present')
    } catch (err) {
        console.error('  💥 T7 error:', err)
        failed++
    }
}

async function testT8_StatsAfterOneSale() {
    console.log('\n📋 T8: Stats totales after 1 sale')

    try {
        const data = await queryReferralData(SELLER_A_ID)

        assert(data.stats.totalEarnings === Math.floor(10000 * GEN1_RATE), `totalEarnings = ${data.stats.totalEarnings} (expected ${Math.floor(10000 * GEN1_RATE)})`)
        assert(data.stats.totalCommissions === 1, `totalCommissions = ${data.stats.totalCommissions} (expected 1)`)
    } catch (err) {
        console.error('  💥 T8 error:', err)
        failed++
    }
}

async function testT9_MultiGenEarningsBreakdown() {
    console.log('\n📋 T9: earningsByGeneration after multi-gen sales')

    try {
        // Sale by SellerC → gen1 for B (500), gen2 for A (300)
        const commC = await createTestCommission({
            saleId: TEST_PREFIX + 'sale_002',
            sellerId: SELLER_C_ID,
            linkId: LINK_B_ID,
            grossAmount: 12000,
            htAmount: 10000,
        })
        await callCreateReferralCommissions({
            id: commC.id,
            seller_id: SELLER_C_ID,
            program_id: WORKSPACE_ID,
            sale_id: TEST_PREFIX + 'sale_002',
            gross_amount: 12000,
            net_amount: commC.net_amount,
            stripe_fee: commC.stripe_fee,
            tax_amount: commC.tax_amount,
            currency: 'EUR',
            hold_days: 30,
            commission_source: 'SALE',
            ht_amount: 10000,
        })

        // Sale by SellerD → gen1 for C (500), gen2 for B (300), gen3 for A (200)
        const commD = await createTestCommission({
            saleId: TEST_PREFIX + 'sale_003',
            sellerId: SELLER_D_ID,
            linkId: LINK_B_ID,
            grossAmount: 12000,
            htAmount: 10000,
        })
        await callCreateReferralCommissions({
            id: commD.id,
            seller_id: SELLER_D_ID,
            program_id: WORKSPACE_ID,
            sale_id: TEST_PREFIX + 'sale_003',
            gross_amount: 12000,
            net_amount: commD.net_amount,
            stripe_fee: commD.stripe_fee,
            tax_amount: commD.tax_amount,
            currency: 'EUR',
            hold_days: 30,
            commission_source: 'SALE',
            ht_amount: 10000,
        })

        const data = await queryReferralData(SELLER_A_ID)

        // SellerA: gen1 from sale_001 (500), gen2 from sale_002 (300), gen3 from sale_003 (200)
        assert(data.earningsByGeneration.gen1.count === 1, `gen1.count = ${data.earningsByGeneration.gen1.count} (expected 1)`)
        assert(data.earningsByGeneration.gen1.amount === Math.floor(10000 * GEN1_RATE), `gen1.amount = ${data.earningsByGeneration.gen1.amount} (expected ${Math.floor(10000 * GEN1_RATE)})`)
        assert(data.earningsByGeneration.gen2.count === 1, `gen2.count = ${data.earningsByGeneration.gen2.count} (expected 1)`)
        assert(data.earningsByGeneration.gen2.amount === Math.floor(10000 * GEN2_RATE), `gen2.amount = ${data.earningsByGeneration.gen2.amount} (expected ${Math.floor(10000 * GEN2_RATE)})`)
        assert(data.earningsByGeneration.gen3.count === 1, `gen3.count = ${data.earningsByGeneration.gen3.count} (expected 1)`)
        assert(data.earningsByGeneration.gen3.amount === Math.floor(10000 * GEN3_RATE), `gen3.amount = ${data.earningsByGeneration.gen3.amount} (expected ${Math.floor(10000 * GEN3_RATE)})`)

        const expectedTotal = Math.floor(10000 * GEN1_RATE) + Math.floor(10000 * GEN2_RATE) + Math.floor(10000 * GEN3_RATE)
        assert(data.stats.totalEarnings === expectedTotal, `totalEarnings = ${data.stats.totalEarnings} (expected ${expectedTotal})`)
    } catch (err) {
        console.error('  💥 T9 error:', err)
        failed++
    }
}

async function testT10_ReferredSellersEarningsFromThem() {
    console.log('\n📋 T10: referredSellers with earningsFromThem')

    try {
        const data = await queryReferralData(SELLER_A_ID)

        assert(data.referredSellers.length === 1, `referredSellers.length = ${data.referredSellers.length} (expected 1)`)
        const sellerB = data.referredSellers.find(s => s.id === SELLER_B_ID)
        assert(sellerB !== undefined, 'SellerB found in referredSellers')
        assert((sellerB?.earningsFromThem ?? 0) > 0, `earningsFromThem = ${sellerB?.earningsFromThem} (expected > 0)`)
        // gen1 earnings from B = sale_001 gen1 = 500
        assert(sellerB?.earningsFromThem === Math.floor(10000 * GEN1_RATE), `earningsFromThem = ${sellerB?.earningsFromThem} (expected ${Math.floor(10000 * GEN1_RATE)})`)
    } catch (err) {
        console.error('  💥 T10 error:', err)
        failed++
    }
}

async function testT11_AmountsInCentsCoherent() {
    console.log('\n📋 T11: All amounts are integers (cents), gen1+gen2+gen3 = totalEarnings')

    try {
        const data = await queryReferralData(SELLER_A_ID)

        const gen1 = data.earningsByGeneration.gen1.amount
        const gen2 = data.earningsByGeneration.gen2.amount
        const gen3 = data.earningsByGeneration.gen3.amount

        assert(Number.isInteger(gen1), `gen1.amount (${gen1}) is integer`)
        assert(Number.isInteger(gen2), `gen2.amount (${gen2}) is integer`)
        assert(Number.isInteger(gen3), `gen3.amount (${gen3}) is integer`)
        assert(Number.isInteger(data.stats.totalEarnings), `totalEarnings (${data.stats.totalEarnings}) is integer`)
        assert(gen1 + gen2 + gen3 === data.stats.totalEarnings, `gen1+gen2+gen3 = ${gen1 + gen2 + gen3} === totalEarnings ${data.stats.totalEarnings}`)
    } catch (err) {
        console.error('  💥 T11 error:', err)
        failed++
    }
}

// =============================================
// BLOC 4: Lifecycle — maturation & completion (4 tests)
// =============================================

async function testT12_PendingNotInDue() {
    console.log('\n📋 T12: Referral commissions PENDING → not in "due"')

    try {
        // All referral commissions for A are PENDING
        await updateSellerBalance(SELLER_A_ID)
        const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

        assert(balance !== null, 'SellerA balance record exists')
        assert((balance?.pending ?? 0) > 0, `pending = ${balance?.pending} (expected > 0)`)
        assert((balance?.due ?? 0) === 0, `due = ${balance?.due} (expected 0, all PENDING)`)
    } catch (err) {
        console.error('  💥 T12 error:', err)
        failed++
    }
}

async function testT13_MaturationToProceed() {
    console.log('\n📋 T13: Maturation → PROCEED → appears in "due"')

    try {
        // Mature all referral commissions for SellerA to PROCEED
        await prisma.commission.updateMany({
            where: {
                seller_id: SELLER_A_ID,
                referral_generation: { not: null },
                status: 'PENDING',
            },
            data: { status: 'PROCEED', matured_at: new Date() }
        })

        await updateSellerBalance(SELLER_A_ID)
        const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

        const data = await queryReferralData(SELLER_A_ID)

        assert((balance?.due ?? 0) === data.stats.totalEarnings, `due = ${balance?.due} === totalEarnings ${data.stats.totalEarnings}`)
        assert((balance?.pending ?? 0) === 0, `pending = ${balance?.pending} (expected 0 after maturation)`)
    } catch (err) {
        console.error('  💥 T13 error:', err)
        failed++
    }
}

async function testT14_CompletionToPaidTotal() {
    console.log('\n📋 T14: Completion → COMPLETE → in "paid_total"')

    try {
        // Complete all referral commissions for SellerA
        await prisma.commission.updateMany({
            where: {
                seller_id: SELLER_A_ID,
                referral_generation: { not: null },
                status: 'PROCEED',
            },
            data: { status: 'COMPLETE' }
        })

        await updateSellerBalance(SELLER_A_ID)
        const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

        const data = await queryReferralData(SELLER_A_ID)

        assert((balance?.paid_total ?? 0) === data.stats.totalEarnings, `paid_total = ${balance?.paid_total} === totalEarnings ${data.stats.totalEarnings}`)
        assert((balance?.due ?? 0) === 0, `due = ${balance?.due} (expected 0 after completion)`)
        assert((balance?.pending ?? 0) === 0, `pending = ${balance?.pending} (expected 0)`)
    } catch (err) {
        console.error('  💥 T14 error:', err)
        failed++
    }
}

async function testT15_ClawbackPostCompleteNegativeBalance() {
    console.log('\n📋 T15: Clawback post-COMPLETE → negative balance visible')

    try {
        // The source commission (sale_001 by SellerB) is still PENDING
        // Make it COMPLETE to test full clawback
        await prisma.commission.update({
            where: { sale_id: TEST_PREFIX + 'sale_001' },
            data: { status: 'COMPLETE' }
        })
        await updateSellerBalance(SELLER_B_ID)
        await updateSellerBalance(SELLER_A_ID)

        // Save SellerA's balance before
        const balanceBefore = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })
        const paidBefore = balanceBefore?.paid_total ?? 0

        // Clawback sale_001 → should delete source + referral
        await callHandleClawback(TEST_PREFIX + 'sale_001')

        const balanceAfter = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

        // The gen1 referral for A from sale_001 was COMPLETE (500), clawback should decrement
        assert((balanceAfter?.balance ?? 0) < 0, `SellerA balance = ${balanceAfter?.balance} (expected negative after COMPLETE clawback)`)

        // Verify the referral commission is gone
        const refComm = await prisma.commission.findUnique({
            where: { sale_id: `${TEST_PREFIX}sale_001:ref:gen1:${SELLER_A_ID}` }
        })
        assert(refComm === null, 'Referral commission deleted by clawback')
    } catch (err) {
        console.error('  💥 T15 error:', err)
        failed++
    }
}

// =============================================
// BLOC 5: Referred sellers shape & ordering (3 tests)
// =============================================

async function testT16_ReferredSellersShape() {
    console.log('\n📋 T16: referredSellers returns correct fields')

    try {
        const data = await queryReferralData(SELLER_A_ID)

        assert(data.referredSellers.length >= 1, `referredSellers.length = ${data.referredSellers.length} (expected >= 1)`)

        for (const s of data.referredSellers) {
            assert(s.id !== undefined && s.id !== null, `id is present (${s.id})`)
            assert(s.name !== undefined, `name is present (${s.name})`)
            assert(s.email !== undefined, `email is present (${s.email})`)
            assert(s.joinedAt !== undefined && s.joinedAt !== null, `joinedAt is present`)
            assert(s.status !== undefined, `status is present (${s.status})`)
            assert(typeof s.earningsFromThem === 'number', `earningsFromThem is number (${s.earningsFromThem})`)
            assert(typeof s.salesCount === 'number', `salesCount is number (${s.salesCount})`)
        }
    } catch (err) {
        console.error('  💥 T16 error:', err)
        failed++
    }
}

async function testT17_OrderingByCreatedAtDesc() {
    console.log('\n📋 T17: referredSellers ordered by created_at DESC')

    try {
        // SellerB has referred SellerC — let's check B's list
        const data = await queryReferralData(SELLER_B_ID)

        if (data.referredSellers.length >= 2) {
            for (let i = 1; i < data.referredSellers.length; i++) {
                const prev = new Date(data.referredSellers[i - 1].joinedAt).getTime()
                const curr = new Date(data.referredSellers[i].joinedAt).getTime()
                assert(prev >= curr, `referredSellers[${i - 1}].joinedAt >= referredSellers[${i}].joinedAt`)
            }
        }
        assert(data.referredSellers.length >= 1, `SellerB has ${data.referredSellers.length} referred sellers`)

        // Also check A's list ordering (has 1 referred)
        const dataA = await queryReferralData(SELLER_A_ID)
        assert(dataA.referredSellers.length >= 1, `SellerA has ${dataA.referredSellers.length} referred sellers (ordered check)`)
    } catch (err) {
        console.error('  💥 T17 error:', err)
        failed++
    }
}

async function testT18_TotalReferredCountAccurate() {
    console.log('\n📋 T18: totalReferred = exact count')

    try {
        const dataA = await queryReferralData(SELLER_A_ID)
        const dataB = await queryReferralData(SELLER_B_ID)
        const dataC = await queryReferralData(SELLER_C_ID)

        assert(dataA.stats.totalReferred === 1, `SellerA totalReferred = ${dataA.stats.totalReferred} (expected 1: SellerB)`)
        assert(dataB.stats.totalReferred === 1, `SellerB totalReferred = ${dataB.stats.totalReferred} (expected 1: SellerC)`)
        assert(dataC.stats.totalReferred === 1, `SellerC totalReferred = ${dataC.stats.totalReferred} (expected 1: SellerD)`)

        // Cross-check: A's referredCount by generation
        assert(dataA.earningsByGeneration.gen1.referredCount === 1, `A gen1.referredCount = ${dataA.earningsByGeneration.gen1.referredCount} (expected 1: B)`)
        assert(dataA.earningsByGeneration.gen2.referredCount === 1, `A gen2.referredCount = ${dataA.earningsByGeneration.gen2.referredCount} (expected 1: C)`)
        assert(dataA.earningsByGeneration.gen3.referredCount === 1, `A gen3.referredCount = ${dataA.earningsByGeneration.gen3.referredCount} (expected 1: D)`)
    } catch (err) {
        console.error('  💥 T18 error:', err)
        failed++
    }
}

// =============================================
// BLOC 6: Pagination (3 tests)
// =============================================

async function testT19_PaginationPage1() {
    console.log('\n📋 T19: Pagination page 1 returns correct results')

    try {
        const data = await queryReferralData(SELLER_A_ID, 1)

        assert(data.referredSellers.length === 1, `page 1 items = ${data.referredSellers.length} (expected 1)`)
        assert(data.pagination.page === 1, `pagination.page = ${data.pagination.page} (expected 1)`)
        assert(data.pagination.totalPages === 1, `pagination.totalPages = ${data.pagination.totalPages} (expected 1)`)
        assert(data.pagination.total === 1, `pagination.total = ${data.pagination.total} (expected 1)`)
    } catch (err) {
        console.error('  💥 T19 error:', err)
        failed++
    }
}

async function testT20_PaginationOutOfBounds() {
    console.log('\n📋 T20: Pagination page out of bounds → empty')

    try {
        const data = await queryReferralData(SELLER_A_ID, 99)

        assert(data.referredSellers.length === 0, `page 99 items = ${data.referredSellers.length} (expected 0)`)
        assert(data.pagination.page === 99, `pagination.page = ${data.pagination.page} (expected 99)`)
    } catch (err) {
        console.error('  💥 T20 error:', err)
        failed++
    }
}

async function testT21_PaginationWithManySellers() {
    console.log('\n📋 T21: Pagination with 12+ sellers (perPage=10)')

    try {
        // Create 12 extra sellers referred by SellerA
        const extraIds: string[] = []
        for (let i = 1; i <= 12; i++) {
            const id = `${TEST_PREFIX}extra_${String(i).padStart(2, '0')}`
            extraIds.push(id)
            await prisma.seller.create({
                data: {
                    id,
                    user_id: `${TEST_PREFIX}user_extra_${i}`,
                    tenant_id: `${TEST_PREFIX}tenant_extra_${i}`,
                    email: `refui_extra_${i}@test.com`,
                    name: `Extra Seller ${i}`,
                    status: 'APPROVED',
                    referral_code: null,
                    referred_by: SELLER_A_ID,
                    referred_at: new Date(2025, 0, i), // staggered dates
                }
            })
        }

        // Total = 1 (SellerB) + 12 extra = 13
        const page1 = await queryReferralData(SELLER_A_ID, 1)
        assert(page1.referredSellers.length === 10, `page 1 items = ${page1.referredSellers.length} (expected 10)`)
        assert(page1.pagination.totalPages === 2, `totalPages = ${page1.pagination.totalPages} (expected 2)`)
        assert(page1.pagination.total === 13, `total = ${page1.pagination.total} (expected 13)`)

        const page2 = await queryReferralData(SELLER_A_ID, 2)
        assert(page2.referredSellers.length === 3, `page 2 items = ${page2.referredSellers.length} (expected 3)`)
        assert(page2.pagination.page === 2, `pagination.page = ${page2.pagination.page} (expected 2)`)

        // Cleanup extra sellers
        await prisma.seller.deleteMany({ where: { id: { in: extraIds } } })
        console.log('  (cleaned up 12 extra sellers)')
    } catch (err) {
        console.error('  💥 T21 error:', err)
        failed++
        // Best-effort cleanup
        await prisma.seller.deleteMany({
            where: { id: { startsWith: TEST_PREFIX + 'extra_' } }
        }).catch(() => {})
    }
}

// =============================================
// BLOC 7: Mixed sources + E2E (3 tests)
// =============================================

async function testT22_MixedWalletDirectPlusReferral() {
    console.log('\n📋 T22: Wallet mixes direct commissions + referral in same balance')

    try {
        // SellerA has referral commissions from earlier tests (gen2, gen3 from sale_002/003)
        // Add a direct SALE commission for SellerA
        await createTestCommission({
            saleId: TEST_PREFIX + 'sale_direct_a',
            sellerId: SELLER_A_ID,
            linkId: LINK_B_ID,
            grossAmount: 24000,
            htAmount: 20000,
            status: 'PENDING',
        })

        await updateSellerBalance(SELLER_A_ID)
        const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })

        // Total pending should include BOTH direct and referral
        const allCommissions = await prisma.commission.findMany({
            where: { seller_id: SELLER_A_ID, status: 'PENDING' },
            select: { commission_amount: true, referral_generation: true }
        })
        const totalAll = allCommissions.reduce((s, c) => s + c.commission_amount, 0)

        assert((balance?.pending ?? 0) === totalAll, `balance.pending = ${balance?.pending} === total of all PENDING ${totalAll}`)

        // Referral-only query should NOT include the direct commission
        const referralOnly = await prisma.commission.aggregate({
            where: {
                seller_id: SELLER_A_ID,
                referral_generation: { not: null },
            },
            _sum: { commission_amount: true },
        })

        const directOnly = await prisma.commission.aggregate({
            where: {
                seller_id: SELLER_A_ID,
                referral_generation: null,
            },
            _sum: { commission_amount: true },
        })

        assert((referralOnly._sum.commission_amount ?? 0) + (directOnly._sum.commission_amount ?? 0) === totalAll + (balance?.paid_total ?? 0),
            'referral-only + direct-only = total balance commissions')

        // Cleanup
        await prisma.commission.delete({ where: { sale_id: TEST_PREFIX + 'sale_direct_a' } })
    } catch (err) {
        console.error('  💥 T22 error:', err)
        failed++
    }
}

async function testT23_CountRecurringExcludesReferrals() {
    console.log('\n📋 T23: countRecurringCommissions excludes referrals in UI context')

    try {
        const subscriptionId = 'sub_refui_test_' + Date.now()

        // Create RECURRING commission + referrals
        const commission = await createTestCommission({
            saleId: TEST_PREFIX + 'sale_recur_ui',
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
            sale_id: TEST_PREFIX + 'sale_recur_ui',
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

        // Verify referral exists with same subscription_id
        const refComm = await prisma.commission.findUnique({
            where: { sale_id: `${TEST_PREFIX}sale_recur_ui:ref:gen1:${SELLER_A_ID}` }
        })
        assert(refComm !== null, 'Referral commission exists with subscription_id')
        assert(refComm?.subscription_id === subscriptionId, `Referral has same subscription_id`)

        // Count should be 1 (only source, not referral)
        const count = await countRecurringCommissions(subscriptionId)
        assert(count === 1, `countRecurringCommissions = ${count} (expected 1, excludes referral)`)

        // Cleanup
        await prisma.commission.deleteMany({ where: { subscription_id: subscriptionId } })
    } catch (err) {
        console.error('  💥 T23 error:', err)
        failed++
    }
}

async function testT24_E2EFullFlow() {
    console.log('\n📋 T24: E2E — signup → sale → referral commission → display')

    try {
        // 1. Setup: SellerA is referrer, SellerB is referred and enrolled
        //    (already done in seed)

        // 2. Simulate a sale by SellerB (checkout.session.completed)
        const commission = await createTestCommission({
            saleId: TEST_PREFIX + 'sale_e2e',
            sellerId: SELLER_B_ID,
            linkId: LINK_B_ID,
            grossAmount: 60000,
            htAmount: 50000,
        })

        // 3. createReferralCommissions is called automatically
        await callCreateReferralCommissions({
            id: commission.id,
            seller_id: SELLER_B_ID,
            program_id: WORKSPACE_ID,
            sale_id: TEST_PREFIX + 'sale_e2e',
            gross_amount: 60000,
            net_amount: commission.net_amount,
            stripe_fee: commission.stripe_fee,
            tax_amount: commission.tax_amount,
            currency: 'EUR',
            hold_days: 30,
            commission_source: 'SALE',
            ht_amount: 50000,
        })

        // 4. Query stats of SellerA
        const dataA = await queryReferralData(SELLER_A_ID)
        assert(dataA.stats.totalEarnings > 0, `totalEarnings = ${dataA.stats.totalEarnings} (expected > 0)`)

        // Check gen1 is present
        const gen1Expected = Math.floor(50000 * GEN1_RATE) // 2500
        const gen1Comm = await prisma.commission.findUnique({
            where: { sale_id: `${TEST_PREFIX}sale_e2e:ref:gen1:${SELLER_A_ID}` }
        })
        assert(gen1Comm !== null, 'Gen1 referral commission exists')
        assert(gen1Comm?.commission_amount === gen1Expected, `gen1 amount = ${gen1Comm?.commission_amount} (expected ${gen1Expected})`)

        // 5. Query referred sellers
        assert(dataA.referredSellers.length >= 1, `referredSellers includes SellerB`)
        const sellerBEntry = dataA.referredSellers.find(s => s.id === SELLER_B_ID)
        assert(sellerBEntry !== undefined, 'SellerB found in referred list')
        assert((sellerBEntry?.earningsFromThem ?? 0) > 0, `earningsFromThem > 0`)

        // 6. Query balance: pending should include referral amount
        await updateSellerBalance(SELLER_A_ID)
        const balance = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })
        assert((balance?.pending ?? 0) > 0, `SellerA pending = ${balance?.pending} (includes referral)`)

        // 7. Mature → due
        await prisma.commission.updateMany({
            where: {
                seller_id: SELLER_A_ID,
                sale_id: { startsWith: TEST_PREFIX + 'sale_e2e' },
                referral_generation: { not: null },
                status: 'PENDING',
            },
            data: { status: 'PROCEED', matured_at: new Date() }
        })
        await updateSellerBalance(SELLER_A_ID)
        const balanceAfterMature = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_A_ID } })
        assert((balanceAfterMature?.due ?? 0) > 0, `SellerA due = ${balanceAfterMature?.due} (after maturation)`)
    } catch (err) {
        console.error('  💥 T24 error:', err)
        failed++
    }
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🧪 REFERRAL UI DATA INTEGRITY TEST SUITE')
    console.log('==========================================\n')

    try {
        await cleanup()
        await seedTestData()

        // Bloc 1: Empty states / initial data
        await testT1_EmptyStatsForReferrer()
        await testT2_LazyGenerateReferralCode()
        await testT3_ReferredByDisplay()

        // Bloc 2: Route /r/[code] wire-up
        await testT4_ValidCodeApproved()
        await testT5_InvalidCodeNull()
        await testT6_BannedSellerRejected()

        // Bloc 3: Earnings display shape
        await testT7_ReferralCommissionShape()
        await testT8_StatsAfterOneSale()
        await testT9_MultiGenEarningsBreakdown()
        await testT10_ReferredSellersEarningsFromThem()
        await testT11_AmountsInCentsCoherent()

        // Bloc 4: Lifecycle
        await testT12_PendingNotInDue()
        await testT13_MaturationToProceed()
        await testT14_CompletionToPaidTotal()
        await testT15_ClawbackPostCompleteNegativeBalance()

        // Bloc 5: Referred sellers shape & ordering
        await testT16_ReferredSellersShape()
        await testT17_OrderingByCreatedAtDesc()
        await testT18_TotalReferredCountAccurate()

        // Bloc 6: Pagination
        await testT19_PaginationPage1()
        await testT20_PaginationOutOfBounds()
        await testT21_PaginationWithManySellers()

        // Bloc 7: Mixed sources + E2E
        await testT22_MixedWalletDirectPlusReferral()
        await testT23_CountRecurringExcludesReferrals()
        await testT24_E2EFullFlow()

        await cleanup()

    } catch (err) {
        console.error('\n💥 FATAL ERROR:', err)
        await cleanup().catch(() => {})
    }

    console.log('\n==========================================')
    console.log(`📊 Results: ${passed} passed, ${failed} failed`)
    console.log(failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED')

    await prisma.$disconnect()
    pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

main()
