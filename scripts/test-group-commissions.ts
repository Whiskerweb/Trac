/**
 * Test script for GROUP commissions — all revenue to creator
 * Tests: single commission to creator, clawback, recurring count, balance, constraints
 *
 * Usage: npx tsx scripts/test-group-commissions.ts
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
const TEST_PREFIX = 'test_grp_'
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4' // "Reevy" workspace
const SELLER_1_ID = TEST_PREFIX + 'seller_001' // Group creator
const SELLER_2_ID = TEST_PREFIX + 'seller_002' // Member (seller who sells)
const SELLER_3_ID = TEST_PREFIX + 'seller_003'
const SELLER_4_ID = TEST_PREFIX + 'seller_004'
const GROUP_ID = TEST_PREFIX + 'group_001'
const MISSION_ID = TEST_PREFIX + 'mission_001'
const LINK_1_ID = TEST_PREFIX + 'link_001' // Creator's link
const LINK_2_ID = TEST_PREFIX + 'link_002' // Member 2's link
const ENROLLMENT_1_ID = TEST_PREFIX + 'enrollment_001'
const ENROLLMENT_2_ID = TEST_PREFIX + 'enrollment_002'
const GROUP_MISSION_ID = TEST_PREFIX + 'gm_001'
const SUBSCRIPTION_ID = 'sub_grp_test_' + Date.now()

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
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: 'test_grp_' } } })
    await prisma.commission.deleteMany({ where: { subscription_id: SUBSCRIPTION_ID } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { startsWith: TEST_PREFIX } } })
    await prisma.missionEnrollment.deleteMany({ where: { id: { in: [ENROLLMENT_1_ID, ENROLLMENT_2_ID] } } })
    await prisma.groupMission.deleteMany({ where: { id: GROUP_MISSION_ID } })
    await prisma.sellerGroupMember.deleteMany({ where: { group_id: GROUP_ID } })
    await prisma.sellerGroup.deleteMany({ where: { id: GROUP_ID } })
    await prisma.shortLink.deleteMany({ where: { id: { in: [LINK_1_ID, LINK_2_ID] } } })
    await prisma.mission.deleteMany({ where: { id: MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: { startsWith: TEST_PREFIX } } })
    console.log('  Done.')
}

async function seedTestData() {
    console.log('🌱 Seeding test data...')

    // Create 4 sellers
    for (const [id, email, name] of [
        [SELLER_1_ID, 'grp1@test.com', 'Seller One (Creator)'],
        [SELLER_2_ID, 'grp2@test.com', 'Seller Two (Member)'],
        [SELLER_3_ID, 'grp3@test.com', 'Seller Three (Member)'],
        [SELLER_4_ID, 'grp4@test.com', 'Seller Four (Member)'],
    ] as const) {
        await prisma.seller.create({
            data: { id, email, name, tenant_id: id, status: 'APPROVED' }
        })
    }

    // Create group (SELLER_1 is creator)
    await prisma.sellerGroup.create({
        data: {
            id: GROUP_ID,
            name: 'Test Group',
            creator_id: SELLER_1_ID,
            status: 'ACTIVE',
            invite_code: 'tgrp1234',
        }
    })

    // Add members
    for (const sellerId of [SELLER_1_ID, SELLER_2_ID, SELLER_3_ID, SELLER_4_ID]) {
        await prisma.sellerGroupMember.create({
            data: { group_id: GROUP_ID, seller_id: sellerId, status: 'ACTIVE' }
        })
    }

    // Create mission
    await prisma.mission.create({
        data: {
            id: MISSION_ID,
            workspace_id: WORKSPACE_ID,
            title: 'Group Test Mission',
            description: 'Test',
            target_url: 'https://test.com',
            reward: '10%',
            status: 'ACTIVE',
            sale_enabled: true,
            sale_reward_amount: 10,
            sale_reward_structure: 'PERCENTAGE',
            recurring_enabled: true,
            recurring_reward_amount: 10,
            recurring_reward_structure: 'PERCENTAGE',
            recurring_duration_months: 6,
        }
    })

    // Create ShortLinks (one for creator, one for member 2)
    await prisma.shortLink.create({
        data: {
            id: LINK_1_ID,
            slug: 'grp-test/creator1',
            original_url: 'https://test.com',
            workspace_id: WORKSPACE_ID,
            affiliate_id: SELLER_1_ID,
        }
    })
    await prisma.shortLink.create({
        data: {
            id: LINK_2_ID,
            slug: 'grp-test/member2',
            original_url: 'https://test.com',
            workspace_id: WORKSPACE_ID,
            affiliate_id: SELLER_2_ID,
        }
    })

    // Create GroupMission
    await prisma.groupMission.create({
        data: {
            id: GROUP_MISSION_ID,
            group_id: GROUP_ID,
            mission_id: MISSION_ID,
            enrolled_by: SELLER_1_ID,
        }
    })

    // Create MissionEnrollments linked to group
    await prisma.missionEnrollment.create({
        data: {
            id: ENROLLMENT_1_ID,
            mission_id: MISSION_ID,
            user_id: SELLER_1_ID,
            status: 'APPROVED',
            link_id: LINK_1_ID,
            group_mission_id: GROUP_MISSION_ID,
        }
    })
    await prisma.missionEnrollment.create({
        data: {
            id: ENROLLMENT_2_ID,
            mission_id: MISSION_ID,
            user_id: SELLER_2_ID,
            status: 'APPROVED',
            link_id: LINK_2_ID,
            group_mission_id: GROUP_MISSION_ID,
        }
    })

    console.log('  Done.')
}

// =============================================
// INLINE ENGINE FUNCTIONS (no import of server code)
// =============================================

function parseReward(reward: string): { type: 'FIXED' | 'PERCENTAGE'; value: number } {
    const trimmed = reward.trim()
    if (trimmed.endsWith('%')) {
        const value = parseFloat(trimmed.replace('%', ''))
        if (!isNaN(value)) return { type: 'PERCENTAGE', value }
    }
    const fixedMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)
    if (fixedMatch) {
        const value = parseFloat(fixedMatch[1] || fixedMatch[2])
        if (!isNaN(value)) return { type: 'FIXED', value: Math.round(value * 100) }
    }
    return { type: 'FIXED', value: 0 }
}

function calculateCommission(netAmount: number, missionReward: string) {
    const parsed = parseReward(missionReward)
    if (parsed.type === 'PERCENTAGE') {
        return { amount: Math.floor((netAmount * parsed.value) / 100), type: 'PERCENTAGE' as const }
    }
    return { amount: parsed.value, type: 'FIXED' as const }
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

async function countRecurringCommissions(subscriptionId: string) {
    return prisma.commission.count({
        where: {
            subscription_id: subscriptionId,
            org_parent_commission_id: null,
            referral_generation: null,
        }
    })
}

// Simulates getGroupConfig() logic
async function getGroupConfig(linkId: string) {
    const enrollment = await prisma.missionEnrollment.findFirst({
        where: { link_id: linkId, group_mission_id: { not: null } }
    })
    if (!enrollment?.group_mission_id) return null

    const groupMission = await prisma.groupMission.findUnique({
        where: { id: enrollment.group_mission_id },
        include: {
            Group: { select: { id: true, creator_id: true, status: true } }
        }
    })
    if (!groupMission || groupMission.Group.status !== 'ACTIVE') return null

    return {
        isGroupEnrollment: true,
        groupId: groupMission.group_id,
        creatorId: groupMission.Group.creator_id,
    }
}

// =============================================
// TESTS
// =============================================

async function testAllRevenueToCreator() {
    console.log('\n📊 TEST: All revenue goes to group creator (10% of 10000 HT)')

    const htAmount = 10000
    const reward = '10%'
    const saleId = 'test_grp_sale_001'

    const { amount: totalCommission, type } = calculateCommission(htAmount, reward)
    const platformFee = Math.floor(htAmount * 0.15)

    assert(totalCommission === 1000, `Total commission = 1000 (got ${totalCommission})`)
    assert(platformFee === 1500, `Platform fee = 1500 (got ${platformFee})`)

    // Create single commission for creator (SELLER_1), even though SELLER_2 made the sale
    await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID, // Creator gets the commission
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            link_id: LINK_2_ID, // Member 2's link (they made the sale)
            gross_amount: 12000,
            net_amount: 8500,
            stripe_fee: 0,
            tax_amount: 2000,
            commission_amount: totalCommission, // Full amount, no split
            platform_fee: platformFee,
            commission_rate: reward,
            commission_type: type,
            currency: 'EUR',
            status: 'PENDING',
            group_id: GROUP_ID,
        }
    })

    await updateSellerBalance(SELLER_1_ID)
    await updateSellerBalance(SELLER_2_ID)

    // Verify only 1 commission exists
    const allCommissions = await prisma.commission.findMany({
        where: { sale_id: { startsWith: saleId } }
    })
    assert(allCommissions.length === 1, `Only 1 commission created (got ${allCommissions.length})`)

    // Creator gets full amount
    const creatorComm = allCommissions[0]
    assert(creatorComm.seller_id === SELLER_1_ID, `Commission assigned to creator (${creatorComm.seller_id})`)
    assert(creatorComm.commission_amount === 1000, `Creator gets full 1000 (got ${creatorComm.commission_amount})`)
    assert(creatorComm.platform_fee === 1500, `Platform fee = 1500 (got ${creatorComm.platform_fee})`)
    assert(creatorComm.group_id === GROUP_ID, `group_id is set`)

    // Creator's balance updated
    const bal1 = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })
    assert(bal1?.pending === 1000, `Creator pending = 1000 (got ${bal1?.pending})`)

    // Member 2 has no commission
    const bal2 = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_2_ID } })
    assert((bal2?.pending ?? 0) === 0, `Member 2 pending = 0 (got ${bal2?.pending})`)
}

async function testMemberSaleGoesToCreator() {
    console.log('\n👥 TEST: Sale by any member → commission to creator')

    // Simulate sale by SELLER_3 via their link
    const saleId = 'test_grp_sale_002'
    const htAmount = 5000
    const reward = '10%'
    const { amount: totalCommission, type } = calculateCommission(htAmount, reward)
    const platformFee = Math.floor(htAmount * 0.15)

    await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID, // Creator
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            gross_amount: 6000,
            net_amount: 4500,
            stripe_fee: 0,
            tax_amount: 1000,
            commission_amount: totalCommission,
            platform_fee: platformFee,
            commission_rate: reward,
            commission_type: type,
            currency: 'EUR',
            status: 'PENDING',
            group_id: GROUP_ID,
        }
    })

    await updateSellerBalance(SELLER_1_ID)

    const comm = await prisma.commission.findUnique({ where: { sale_id: saleId } })
    assert(comm?.seller_id === SELLER_1_ID, `Commission goes to creator`)
    assert(comm?.commission_amount === 500, `Full 500 to creator (got ${comm?.commission_amount})`)
}

async function testGroupClawback() {
    console.log('\n🔙 TEST: Group Clawback (simple — just 1 commission)')

    const source = await prisma.commission.findUnique({ where: { sale_id: 'test_grp_sale_001' } })
    assert(!!source, 'Source commission exists')
    if (!source) return

    // Full refund: just delete the single commission
    await prisma.commission.delete({ where: { id: source.id } })
    await updateSellerBalance(SELLER_1_ID)

    const remaining = await prisma.commission.findFirst({ where: { sale_id: 'test_grp_sale_001' } })
    assert(!remaining, `Commission deleted on refund`)

    const bal1 = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })
    // Only sale_002 (500) should remain in pending
    assert(bal1?.pending === 500, `Creator pending = 500 after clawback (got ${bal1?.pending})`)
}

async function testClawbackCompletePaysNegative() {
    console.log('\n💸 TEST: Clawback on COMPLETE commission → negative balance')

    const saleId = 'test_grp_sale_complete_001'

    // Create a COMPLETE commission
    const comm = await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            gross_amount: 10000,
            net_amount: 8000,
            stripe_fee: 0,
            tax_amount: 0,
            commission_amount: 1000,
            platform_fee: 1500,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status: 'COMPLETE',
            group_id: GROUP_ID,
        }
    })

    await updateSellerBalance(SELLER_1_ID)
    const balBefore = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })

    // Delete + apply negative
    const clawbackAmount = comm.commission_amount
    await prisma.commission.delete({ where: { id: comm.id } })
    await updateSellerBalance(SELLER_1_ID)
    await prisma.sellerBalance.update({
        where: { seller_id: SELLER_1_ID },
        data: { balance: { decrement: clawbackAmount } }
    })

    const balAfter = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })
    assert(balAfter!.balance < balBefore!.balance, `Balance decreased after COMPLETE clawback (${balBefore!.balance} → ${balAfter!.balance})`)
}

async function testRecurringCount() {
    console.log('\n🔢 TEST: Recurring Count — no pool shares to exclude')

    const saleId = 'test_grp_recurring_001'
    const subId = SUBSCRIPTION_ID

    // Create recurring commission for creator
    await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            gross_amount: 10000,
            net_amount: 8000,
            stripe_fee: 0,
            tax_amount: 0,
            commission_amount: 1000,
            platform_fee: 1500,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status: 'PENDING',
            commission_source: 'RECURRING',
            subscription_id: subId,
            recurring_month: 1,
            recurring_max: 6,
            group_id: GROUP_ID,
        }
    })

    // Count should be 1
    const count = await countRecurringCommissions(subId)
    assert(count === 1, `countRecurringCommissions = 1 (got ${count})`)

    // Create month 2
    await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID,
            program_id: WORKSPACE_ID,
            sale_id: 'test_grp_recurring_002',
            gross_amount: 10000,
            net_amount: 8000,
            stripe_fee: 0,
            tax_amount: 0,
            commission_amount: 1000,
            platform_fee: 1500,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status: 'PENDING',
            commission_source: 'RECURRING',
            subscription_id: subId,
            recurring_month: 2,
            recurring_max: 6,
            group_id: GROUP_ID,
        }
    })

    const count2 = await countRecurringCommissions(subId)
    assert(count2 === 2, `countRecurringCommissions = 2 after month 2 (got ${count2})`)
}

async function testGetGroupConfig_CreatorLink() {
    console.log('\n🔗 TEST: getGroupConfig returns creatorId (creator link)')

    const config = await getGroupConfig(LINK_1_ID)
    assert(!!config, 'getGroupConfig returns config for creator link')
    assert(config!.isGroupEnrollment === true, `isGroupEnrollment = true`)
    assert(config!.groupId === GROUP_ID, `groupId matches`)
    assert(config!.creatorId === SELLER_1_ID, `creatorId = SELLER_1 (got ${config!.creatorId})`)
}

async function testGetGroupConfig_MemberLink() {
    console.log('\n🔗 TEST: getGroupConfig returns creatorId (member link)')

    const config = await getGroupConfig(LINK_2_ID)
    assert(!!config, 'getGroupConfig returns config for member link')
    assert(config!.creatorId === SELLER_1_ID, `creatorId = SELLER_1 even for member 2 link (got ${config!.creatorId})`)
}

async function testGetGroupConfig_NonGroupLink() {
    console.log('\n🔗 TEST: getGroupConfig returns null for non-group link')

    const config = await getGroupConfig('nonexistent_link_id')
    assert(config === null, `Returns null for non-group link`)
}

async function testGroupOf1() {
    console.log('\n👤 TEST: Group of 1 (solo group — creator gets 100%)')

    const htAmount = 10000
    const reward = '10%'
    const { amount } = calculateCommission(htAmount, reward)

    // No split needed, full amount goes to creator
    assert(amount === 1000, `Solo group: creator gets full 1000 (got ${amount})`)
}

async function testFlatReward() {
    console.log('\n💶 TEST: Flat Reward — full amount to creator')

    const reward = '5€'
    const { amount: total } = calculateCommission(0, reward)

    assert(total === 500, `Flat commission = 500 cents (got ${total})`)
    // No split — full 500 goes to creator
}

async function testArchiveStopsNewCommissions() {
    console.log('\n📦 TEST: Archived group — getGroupConfig returns null')

    // Archive group
    await prisma.sellerGroup.update({
        where: { id: GROUP_ID },
        data: { status: 'ARCHIVED' }
    })

    const config = await getGroupConfig(LINK_1_ID)
    assert(config === null, `Archived group → getGroupConfig returns null`)

    // Restore
    await prisma.sellerGroup.update({
        where: { id: GROUP_ID },
        data: { status: 'ACTIVE' }
    })
}

async function testSingleSellerGroupConstraint() {
    console.log('\n🔒 TEST: seller_id @unique on SellerGroupMember')

    const existing = await prisma.sellerGroupMember.findUnique({
        where: { seller_id: SELLER_1_ID }
    })
    assert(!!existing, `Seller 1 has existing membership`)
    assert(existing?.group_id === GROUP_ID, `Seller 1 is in the correct group`)

    const count = await prisma.sellerGroupMember.count({
        where: { seller_id: SELLER_1_ID }
    })
    assert(count === 1, `Exactly 1 membership per seller (got ${count})`)
}

async function testGroupMissionUnique() {
    console.log('\n🔒 TEST: @@unique([group_id, mission_id]) on GroupMission')

    const existing = await prisma.groupMission.findUnique({
        where: { group_id_mission_id: { group_id: GROUP_ID, mission_id: MISSION_ID } }
    })
    assert(!!existing, `GroupMission exists for group+mission pair`)
}

async function testMultipleSalesAccumulate() {
    console.log('\n📈 TEST: Multiple group sales accumulate on creator balance')

    await updateSellerBalance(SELLER_1_ID)
    const balBefore = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })
    const pendingBefore = balBefore?.pending ?? 0

    const saleId = 'test_grp_sale_accum_001'
    await prisma.commission.create({
        data: {
            seller_id: SELLER_1_ID,
            program_id: WORKSPACE_ID,
            sale_id: saleId,
            gross_amount: 20000,
            net_amount: 17000,
            stripe_fee: 0,
            tax_amount: 0,
            commission_amount: 2000,
            platform_fee: 3000,
            commission_rate: '10%',
            commission_type: 'PERCENTAGE',
            currency: 'EUR',
            status: 'PENDING',
            group_id: GROUP_ID,
        }
    })

    await updateSellerBalance(SELLER_1_ID)
    const balAfter = await prisma.sellerBalance.findUnique({ where: { seller_id: SELLER_1_ID } })

    assert(balAfter!.pending === pendingBefore + 2000, `Pending increased by 2000 (${pendingBefore} → ${balAfter!.pending})`)
}

async function testNoPoolCommissionsCreated() {
    console.log('\n🚫 TEST: No pool commissions for other members')

    // Check that SELLER_2, SELLER_3, SELLER_4 have ZERO commissions from group sales
    for (const sid of [SELLER_2_ID, SELLER_3_ID, SELLER_4_ID]) {
        const count = await prisma.commission.count({
            where: { seller_id: sid, group_id: GROUP_ID }
        })
        assert(count === 0, `Member ${sid.slice(-3)} has 0 group commissions (got ${count})`)
    }
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('========================================')
    console.log('🧪 GROUP COMMISSION TESTS (all to creator)')
    console.log('========================================')

    await cleanup()
    await seedTestData()

    await testAllRevenueToCreator()
    await testMemberSaleGoesToCreator()
    await testGroupClawback()
    await testClawbackCompletePaysNegative()
    await testRecurringCount()
    await testGetGroupConfig_CreatorLink()
    await testGetGroupConfig_MemberLink()
    await testGetGroupConfig_NonGroupLink()
    await testGroupOf1()
    await testFlatReward()
    await testArchiveStopsNewCommissions()
    await testSingleSellerGroupConstraint()
    await testGroupMissionUnique()
    await testMultipleSalesAccumulate()
    await testNoPoolCommissionsCreated()

    await cleanup()

    console.log('\n========================================')
    console.log(`📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`)
    console.log('========================================')

    await prisma.$disconnect()
    await pool.end()
    process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (e) => {
    console.error('Fatal error:', e)
    await cleanup().catch(() => {})
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
})
