/**
 * Test script for ORGANIZATION commission calculations
 * Tests the engine (createOrgCommissions) + server action logic (acceptOrgMission)
 *
 * Covers:
 * - Percentage deals (various splits)
 * - Flat deals (various splits)
 * - Edge cases (leader 0%, leader max, negative member)
 * - Recurring with limits
 * - Clawback cascade (member + leader)
 * - acceptOrgMission validation (server action math)
 * - countRecurringCommissions excludes leader cuts
 *
 * Usage: npx tsx scripts/test-org-commissions.ts
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
// TEST IDS
// =============================================

const TP = 'test_org_' // test prefix
const WORKSPACE_ID = '1cb82621-45af-414f-b0d7-487587917fe4' // "Reevy" workspace
const MEMBER_SELLER_ID = TP + 'member_001'
const LEADER_SELLER_ID = TP + 'leader_001'
const MEMBER_USER_ID = TP + 'user_member_001'
const LEADER_USER_ID = TP + 'user_leader_001'
const MISSION_ID = TP + 'mission_001'
const LINK_ID = TP + 'link_001'
const ENROLLMENT_ID = TP + 'enrollment_001'
const ORG_ID = TP + 'org_001'
const ORG_MISSION_ID = TP + 'orgmission_001'

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

function assertApprox(actual: number, expected: number, message: string, tolerance = 1) {
    const ok = Math.abs(actual - expected) <= tolerance
    if (ok) {
        console.log(`  ✅ ${message} (${actual} ≈ ${expected})`)
        passed++
    } else {
        console.log(`  ❌ FAIL: ${message} (got ${actual}, expected ${expected})`)
        failed++
    }
}

// =============================================
// PURE CALCULATION HELPERS (mirror engine logic)
// =============================================

const PLATFORM_FEE_RATE = 0.15

function parseReward(reward: string): { type: 'PERCENTAGE' | 'FIXED'; value: number } {
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

/**
 * Simulate org commission calculation (pure, no DB)
 */
function calculateOrgSplit(htAmount: number, totalReward: string, leaderReward: string) {
    const totalParsed = parseReward(totalReward)
    const leaderParsed = parseReward(leaderReward)

    if (totalParsed.type === 'PERCENTAGE') {
        const dealPct = totalParsed.value
        const platformFeePct = 15
        const leaderPct = leaderParsed.value
        const memberPct = dealPct - platformFeePct - leaderPct

        return {
            memberAmount: Math.floor(htAmount * memberPct / 100),
            leaderAmount: Math.floor(htAmount * leaderPct / 100),
            platformFee: Math.floor(htAmount * platformFeePct / 100),
            memberPct,
            leaderPct,
            dealPct,
            type: 'PERCENTAGE' as const,
        }
    } else {
        const dealFlat = totalParsed.value
        const platformFee = Math.round(dealFlat * PLATFORM_FEE_RATE)
        const leaderAmount = leaderParsed.value
        const memberAmount = dealFlat - platformFee - leaderAmount

        return {
            memberAmount,
            leaderAmount,
            platformFee,
            dealFlat,
            type: 'FIXED' as const,
        }
    }
}

/**
 * Simulate acceptOrgMission math (server action validation)
 */
function simulateAcceptOrgMission(totalReward: string, leaderCut: string): {
    success: boolean
    memberReward?: string
    error?: string
} {
    const totalTrimmed = totalReward.trim()
    const leaderTrimmed = leaderCut.trim()

    if (totalTrimmed.endsWith('%')) {
        const dealPct = parseFloat(totalTrimmed.replace('%', ''))
        const leaderPct = parseFloat(leaderTrimmed.replace('%', ''))
        if (isNaN(dealPct) || isNaN(leaderPct)) return { success: false, error: 'Invalid reward format' }
        if (leaderPct < 0) return { success: false, error: 'Leader cut cannot be negative' }
        const orgShare = dealPct - 15
        if (leaderPct > orgShare) return { success: false, error: `Leader cut (${leaderPct}%) exceeds org share (${orgShare}%)` }
        const memberPct = orgShare - leaderPct
        return { success: true, memberReward: `${memberPct}%` }
    } else {
        const dealMatch = totalTrimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)
        const leaderMatch = leaderTrimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)
        if (!dealMatch || !leaderMatch) return { success: false, error: 'Invalid reward format' }
        const dealFlat = parseFloat(dealMatch[1] || dealMatch[2])
        const leaderFlat = parseFloat(leaderMatch[1] || leaderMatch[2])
        if (isNaN(dealFlat) || isNaN(leaderFlat)) return { success: false, error: 'Invalid reward values' }
        if (leaderFlat < 0) return { success: false, error: 'Leader cut cannot be negative' }
        const platformFee = dealFlat * 0.15
        const orgShare = dealFlat - platformFee
        if (leaderFlat > orgShare) return { success: false, error: `Leader cut exceeds org share` }
        const memberFlat = orgShare - leaderFlat
        const memberReward = memberFlat % 1 === 0 ? `${memberFlat}€` : `${memberFlat.toFixed(2)}€`
        return { success: true, memberReward }
    }
}

// =============================================
// CLEANUP & SEED
// =============================================

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...')
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: TP } } })
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: `${TP}sale` } } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { in: [MEMBER_SELLER_ID, LEADER_SELLER_ID] } } })
    await prisma.missionEnrollment.deleteMany({ where: { id: ENROLLMENT_ID } })
    await prisma.organizationMission.deleteMany({ where: { id: ORG_MISSION_ID } })
    await prisma.organizationMember.deleteMany({ where: { organization_id: ORG_ID } })
    await prisma.organization.deleteMany({ where: { id: ORG_ID } })
    await prisma.shortLink.deleteMany({ where: { id: LINK_ID } })
    await prisma.mission.deleteMany({ where: { id: MISSION_ID } })
    await prisma.seller.deleteMany({ where: { id: { in: [MEMBER_SELLER_ID, LEADER_SELLER_ID] } } })
    console.log('  Done.')
}

async function seedTestData() {
    console.log('🌱 Seeding test data...')

    // Create sellers
    await prisma.seller.create({
        data: {
            id: MEMBER_SELLER_ID, user_id: MEMBER_USER_ID,
            tenant_id: TP + 'tenant_m', email: 'testmember@example.com',
            name: 'Test Member', status: 'APPROVED',
        }
    })
    await prisma.seller.create({
        data: {
            id: LEADER_SELLER_ID, user_id: LEADER_USER_ID,
            tenant_id: TP + 'tenant_l', email: 'testleader@example.com',
            name: 'Test Leader', status: 'APPROVED',
        }
    })
    console.log('  Created sellers (member + leader)')

    // Create mission
    await prisma.mission.create({
        data: {
            id: MISSION_ID, workspace_id: WORKSPACE_ID,
            title: 'Test Org Mission', description: 'For org tests',
            target_url: 'https://example.com', reward: '30%',
            status: 'ACTIVE', reward_type: 'SALE', reward_amount: 30,
            reward_structure: 'PERCENTAGE',
            sale_enabled: true, sale_reward_amount: 30, sale_reward_structure: 'PERCENTAGE',
            recurring_enabled: true, recurring_reward_amount: 30, recurring_reward_structure: 'PERCENTAGE',
            recurring_duration_months: 6,
        }
    })
    console.log('  Created mission (30%)')

    // Create org
    await prisma.organization.create({
        data: {
            id: ORG_ID, name: 'Test Org', slug: TP + 'test-org',
            invite_code: TP + 'invite', leader_id: LEADER_SELLER_ID,
            status: 'ACTIVE', visibility: 'PUBLIC',
        }
    })
    console.log('  Created organization')

    // Create org mission
    await prisma.organizationMission.create({
        data: {
            id: ORG_MISSION_ID, organization_id: ORG_ID, mission_id: MISSION_ID,
            total_reward: '30%', leader_reward: '5%', member_reward: '10%',
            status: 'ACCEPTED', proposed_by: WORKSPACE_ID, accepted_at: new Date(),
        }
    })
    console.log('  Created org mission (30% deal, 5% leader, 10% member)')

    // Create member in org
    await prisma.organizationMember.create({
        data: {
            organization_id: ORG_ID, seller_id: MEMBER_SELLER_ID, status: 'ACTIVE',
        }
    })
    console.log('  Created org membership')

    // Create short link
    await prisma.shortLink.create({
        data: {
            id: LINK_ID, slug: TP + 'test-link',
            original_url: 'https://example.com', workspace_id: WORKSPACE_ID,
            affiliate_id: MEMBER_USER_ID,
        }
    })
    console.log('  Created short link')

    // Create enrollment linked to org mission
    await prisma.missionEnrollment.create({
        data: {
            id: ENROLLMENT_ID, mission_id: MISSION_ID,
            user_id: MEMBER_USER_ID, status: 'APPROVED', link_id: LINK_ID,
            organization_mission_id: ORG_MISSION_ID,
        }
    })
    console.log('  Created enrollment (org-linked)')
}

// =============================================
// TESTS: PURE CALCULATION (no DB)
// =============================================

async function testPureCalculations() {
    console.log('\n🧮 TEST SUITE 1: Pure Calculation Tests (no DB)')

    // --- PERCENTAGE DEALS ---
    console.log('\n  📊 Percentage deals')

    // Standard: 30% deal, 5% leader
    {
        const r = calculateOrgSplit(10000, '30%', '5%') // 100€ HT
        assert(r.memberPct === 10, 'Standard 30%: memberPct = 10%')
        assert(r.leaderPct === 5, 'Standard 30%: leaderPct = 5%')
        assertApprox(r.memberAmount, 1000, 'Standard 30%: member = 10€', 1)
        assertApprox(r.leaderAmount, 500, 'Standard 30%: leader = 5€', 1)
        assertApprox(r.platformFee, 1500, 'Standard 30%: platform = 15€', 1)
        const total = r.memberAmount + r.leaderAmount + r.platformFee
        assertApprox(total, 3000, 'Standard 30%: total = 30€ (= deal)', 1)
    }

    // Leader takes 0%
    {
        const r = calculateOrgSplit(10000, '30%', '0%')
        assert(r.memberPct === 15, 'Leader 0%: memberPct = 15%')
        assertApprox(r.memberAmount, 1500, 'Leader 0%: member = 15€', 1)
        assertApprox(r.leaderAmount, 0, 'Leader 0%: leader = 0€', 1)
    }

    // Leader takes max (orgShare = 15%, leader takes 15%)
    {
        const r = calculateOrgSplit(10000, '30%', '15%')
        assert(r.memberPct === 0, 'Leader max: memberPct = 0%')
        assertApprox(r.memberAmount, 0, 'Leader max: member = 0€', 1)
        assertApprox(r.leaderAmount, 1500, 'Leader max: leader = 15€', 1)
    }

    // High deal: 50%, leader 10%
    {
        const r = calculateOrgSplit(20000, '50%', '10%') // 200€ HT
        assert(r.memberPct === 25, 'High deal 50%: memberPct = 25%')
        assertApprox(r.memberAmount, 5000, 'High deal 50%: member = 50€', 1)
        assertApprox(r.leaderAmount, 2000, 'High deal 50%: leader = 20€', 1)
        assertApprox(r.platformFee, 3000, 'High deal 50%: platform = 30€', 1)
    }

    // Minimum deal: 16%, leader 0%
    {
        const r = calculateOrgSplit(10000, '16%', '0%')
        assert(r.memberPct === 1, 'Min deal 16%: memberPct = 1%')
        assertApprox(r.memberAmount, 100, 'Min deal 16%: member = 1€', 1)
    }

    // Small amount: 5€ HT (500 cents), 30% deal
    {
        const r = calculateOrgSplit(500, '30%', '5%')
        assertApprox(r.memberAmount, 50, 'Small HT 5€: member = 0.50€', 1)
        assertApprox(r.leaderAmount, 25, 'Small HT 5€: leader = 0.25€', 1)
        assertApprox(r.platformFee, 75, 'Small HT 5€: platform = 0.75€', 1)
    }

    // --- FLAT DEALS ---
    console.log('\n  💵 Flat deals')

    // Standard: 10€ deal, 2€ leader
    {
        const r = calculateOrgSplit(10000, '10€', '2€')
        assertApprox(r.platformFee, 150, 'Flat 10€: platform = 1.50€', 1)
        assertApprox(r.leaderAmount, 200, 'Flat 10€: leader = 2€', 1)
        assertApprox(r.memberAmount, 650, 'Flat 10€: member = 6.50€', 1)
        const total = r.memberAmount + r.leaderAmount + r.platformFee
        assertApprox(total, 1000, 'Flat 10€: total = 10€ (= deal)', 1)
    }

    // Flat: leader 0€
    {
        const r = calculateOrgSplit(10000, '10€', '0€')
        assertApprox(r.memberAmount, 850, 'Flat leader 0€: member = 8.50€', 1)
        assertApprox(r.leaderAmount, 0, 'Flat leader 0€: leader = 0€', 1)
    }

    // Flat: leader takes max (8.50€ on 10€ deal)
    {
        const r = calculateOrgSplit(10000, '10€', '8.50€')
        assertApprox(r.memberAmount, 0, 'Flat leader max: member = 0€', 1)
        assertApprox(r.leaderAmount, 850, 'Flat leader max: leader = 8.50€', 1)
    }

    // Flat: big deal 100€, leader 20€
    {
        const r = calculateOrgSplit(50000, '100€', '20€')
        assertApprox(r.platformFee, 1500, 'Flat big: platform = 15€', 1)
        assertApprox(r.leaderAmount, 2000, 'Flat big: leader = 20€', 1)
        assertApprox(r.memberAmount, 6500, 'Flat big: member = 65€', 1)
    }

    // Flat: small 1€ deal, leader 0€
    {
        const r = calculateOrgSplit(10000, '1€', '0€')
        assertApprox(r.platformFee, 15, 'Flat 1€: platform = 0.15€', 1)
        assertApprox(r.memberAmount, 85, 'Flat 1€: member = 0.85€', 1)
    }
}

// =============================================
// TESTS: SERVER ACTION VALIDATION
// =============================================

async function testAcceptOrgMissionValidation() {
    console.log('\n📋 TEST SUITE 2: acceptOrgMission Validation (pure)')

    // --- PERCENTAGE ---
    console.log('\n  📊 Percentage validation')

    {
        const r = simulateAcceptOrgMission('30%', '5%')
        assert(r.success === true, 'Accept 30%/5%: success')
        assert(r.memberReward === '10%', 'Accept 30%/5%: memberReward = 10%')
    }
    {
        const r = simulateAcceptOrgMission('30%', '0%')
        assert(r.success === true, 'Accept 30%/0%: success')
        assert(r.memberReward === '15%', 'Accept 30%/0%: memberReward = 15%')
    }
    {
        const r = simulateAcceptOrgMission('30%', '15%')
        assert(r.success === true, 'Accept 30%/15%: success')
        assert(r.memberReward === '0%', 'Accept 30%/15%: memberReward = 0%')
    }
    {
        const r = simulateAcceptOrgMission('30%', '16%')
        assert(r.success === false, 'Accept 30%/16%: rejected (exceeds org share)')
        assert(r.error?.includes('exceeds') === true, 'Accept 30%/16%: error mentions "exceeds"')
    }
    {
        const r = simulateAcceptOrgMission('16%', '1%')
        assert(r.success === true, 'Accept 16%/1%: success (min viable)')
        assert(r.memberReward === '0%', 'Accept 16%/1%: memberReward = 0%')
    }
    {
        const r = simulateAcceptOrgMission('50%', '10%')
        assert(r.success === true, 'Accept 50%/10%: success')
        assert(r.memberReward === '25%', 'Accept 50%/10%: memberReward = 25%')
    }
    {
        const r = simulateAcceptOrgMission('30%', '-1%')
        assert(r.success === false, 'Accept 30%/-1%: rejected (negative)')
    }

    // --- FLAT ---
    console.log('\n  💵 Flat validation')

    {
        const r = simulateAcceptOrgMission('10€', '2€')
        assert(r.success === true, 'Accept 10€/2€: success')
        assert(r.memberReward === '6.50€', `Accept 10€/2€: memberReward = 6.50€ (got ${r.memberReward})`)
    }
    {
        const r = simulateAcceptOrgMission('10€', '0€')
        assert(r.success === true, 'Accept 10€/0€: success')
        assert(r.memberReward === '8.50€', `Accept 10€/0€: memberReward = 8.50€ (got ${r.memberReward})`)
    }
    {
        const r = simulateAcceptOrgMission('10€', '8.50€')
        assert(r.success === true, 'Accept 10€/8.50€: success (leader takes max)')
        assert(r.memberReward === '0€', `Accept 10€/8.50€: memberReward = 0€ (got ${r.memberReward})`)
    }
    {
        const r = simulateAcceptOrgMission('10€', '9€')
        assert(r.success === false, 'Accept 10€/9€: rejected (exceeds org share)')
    }
    {
        const r = simulateAcceptOrgMission('100€', '20€')
        assert(r.success === true, 'Accept 100€/20€: success')
        assert(r.memberReward === '65€', `Accept 100€/20€: memberReward = 65€ (got ${r.memberReward})`)
    }
    {
        const r = simulateAcceptOrgMission('10€', '-1€')
        assert(r.success === false, 'Accept 10€/-1€: rejected (negative)')
    }

    // --- COHERENCE: total = platform + leader + member ---
    console.log('\n  🔗 Coherence: deal = platform + leader + member')

    for (const [deal, leader] of [['30%', '5%'], ['50%', '10%'], ['16%', '0%'], ['20%', '5%']]) {
        const result = simulateAcceptOrgMission(deal, leader)
        if (!result.success || !result.memberReward) continue
        const dealPct = parseFloat(deal.replace('%', ''))
        const leaderPct = parseFloat(leader.replace('%', ''))
        const memberPct = parseFloat(result.memberReward.replace('%', ''))
        const total = 15 + leaderPct + memberPct
        assertApprox(total, dealPct, `Coherence ${deal}/${leader}: 15% + ${leaderPct}% + ${memberPct}% = ${dealPct}%`, 0.01)
    }
}

// =============================================
// TESTS: DB — createOrgCommissions
// =============================================

async function testCreateOrgCommissions() {
    console.log('\n🗄️  TEST SUITE 3: createOrgCommissions (DB)')

    const grossAmount = 12000 // 120€ TTC
    const taxAmount = 2000    // 20€ TVA
    const htAmount = 10000    // 100€ HT
    const stripeFee = 377     // ~2.9% + 30c
    const netAmount = htAmount - stripeFee

    // --- Test 1: Percentage deal 30%, leader 5% ---
    console.log('\n  📊 DB Test 1: Percentage deal 30%, leader 5%')
    {
        const saleId = TP + 'sale_pct_001'
        // Clean any existing
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        const { createOrgCommissions } = await import('../lib/commission/engine')
        const result = await createOrgCommissions({
            memberId: MEMBER_SELLER_ID,
            leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID,
            saleId,
            linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%',
            leaderReward: '5%',
            currency: 'EUR',
            organizationMissionId: ORG_MISSION_ID,
        })

        assert(result.success === true, 'DB pct: commission created successfully')

        // Verify member commission
        const memberC = await prisma.commission.findUnique({ where: { sale_id: saleId } })
        assert(memberC !== null, 'DB pct: member commission exists')
        assertApprox(memberC!.commission_amount, 1000, 'DB pct: member = 10€ (10% of 100€)', 1)
        assertApprox(memberC!.platform_fee, 1500, 'DB pct: platform_fee = 15€', 1)
        assert(memberC!.commission_rate === '10%', `DB pct: member rate = "10%" (got "${memberC!.commission_rate}")`)
        assert(memberC!.organization_mission_id === ORG_MISSION_ID, 'DB pct: org_mission_id set on member')

        // Verify leader commission
        const leaderC = await prisma.commission.findUnique({ where: { sale_id: `${saleId}:orgcut` } })
        assert(leaderC !== null, 'DB pct: leader commission exists')
        assertApprox(leaderC!.commission_amount, 500, 'DB pct: leader = 5€', 1)
        assert(leaderC!.platform_fee === 0, 'DB pct: leader platform_fee = 0')
        assert(leaderC!.org_parent_commission_id === memberC!.id, 'DB pct: leader linked to member via org_parent_commission_id')
        assert(leaderC!.sale_id === `${saleId}:orgcut`, 'DB pct: leader sale_id has :orgcut suffix')

        // Verify total = deal
        const total = memberC!.commission_amount + leaderC!.commission_amount + memberC!.platform_fee
        assertApprox(total, 3000, 'DB pct: total charged = 30€ = deal amount', 1)

        // Cleanup
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })
    }

    // --- Test 2: Flat deal 10€, leader 2€ ---
    console.log('\n  💵 DB Test 2: Flat deal 10€, leader 2€')
    {
        const saleId = TP + 'sale_flat_001'
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        const { createOrgCommissions } = await import('../lib/commission/engine')
        const result = await createOrgCommissions({
            memberId: MEMBER_SELLER_ID,
            leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID,
            saleId,
            linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '10€',
            leaderReward: '2€',
            currency: 'EUR',
            organizationMissionId: ORG_MISSION_ID,
        })

        assert(result.success === true, 'DB flat: commission created successfully')

        const memberC = await prisma.commission.findUnique({ where: { sale_id: saleId } })
        const leaderC = await prisma.commission.findUnique({ where: { sale_id: `${saleId}:orgcut` } })

        assertApprox(memberC!.commission_amount, 650, 'DB flat: member = 6.50€', 1)
        assertApprox(memberC!.platform_fee, 150, 'DB flat: platform = 1.50€', 1)
        assertApprox(leaderC!.commission_amount, 200, 'DB flat: leader = 2€', 1)

        const total = memberC!.commission_amount + leaderC!.commission_amount + memberC!.platform_fee
        assertApprox(total, 1000, 'DB flat: total charged = 10€ = deal amount', 1)

        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })
    }

    // --- Test 3: Negative member (should fail) ---
    console.log('\n  🚫 DB Test 3: Leader cut exceeds org share (should fail)')
    {
        const saleId = TP + 'sale_fail_001'
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        const { createOrgCommissions } = await import('../lib/commission/engine')
        const result = await createOrgCommissions({
            memberId: MEMBER_SELLER_ID,
            leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID,
            saleId,
            linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '20%',
            leaderReward: '10%',
            currency: 'EUR',
            organizationMissionId: ORG_MISSION_ID,
        })

        assert(result.success === false, 'DB fail: creation rejected (member would be negative)')
        assert(result.error?.includes('negative') === true, 'DB fail: error mentions "negative"')

        // Verify no commissions created
        const count = await prisma.commission.count({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })
        assert(count === 0, 'DB fail: no commissions created')
    }

    // --- Test 4: Idempotency ---
    console.log('\n  🔁 DB Test 4: Idempotency (same sale_id = no duplicate)')
    {
        const saleId = TP + 'sale_idempotent_001'
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        const { createOrgCommissions } = await import('../lib/commission/engine')

        // Create first time
        await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
        })

        // Create second time (same saleId)
        await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
        })

        const count = await prisma.commission.count({
            where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } }
        })
        assert(count === 2, `DB idempotent: exactly 2 commissions (member + leader), got ${count}`)

        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })
    }
}

// =============================================
// TESTS: RECURRING + LIMITS
// =============================================

async function testRecurringLimits() {
    console.log('\n🔄 TEST SUITE 4: Recurring Limits')

    const grossAmount = 6000
    const taxAmount = 1000
    const htAmount = 5000
    const stripeFee = 204
    const netAmount = htAmount - stripeFee
    const subscriptionId = TP + 'sub_' + Date.now()

    const { createOrgCommissions, countRecurringCommissions } = await import('../lib/commission/engine')

    // Create 3 recurring commissions (max = 3)
    console.log('\n  📊 Creating 3 recurring org commissions (max=3)')
    for (let month = 1; month <= 3; month++) {
        const saleId = `${TP}sale_rec_${month}`
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        const result = await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
            subscriptionId, recurringMonth: month, recurringMax: 3,
            commissionSource: 'RECURRING',
        })

        assert(result.success === true, `Recurring month ${month}: created`)
    }

    // Count should be 3 (excludes leader cuts)
    const count = await countRecurringCommissions(subscriptionId)
    assert(count === 3, `countRecurringCommissions = 3 (excludes leader cuts), got ${count}`)

    // Month 4 should be rejected (limit reached)
    console.log('\n  🚫 Month 4 should be rejected')
    {
        const saleId = `${TP}sale_rec_4`
        const result = await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
            subscriptionId, recurringMonth: 4, recurringMax: 3,
            commissionSource: 'RECURRING',
        })

        assert(result.success === false, 'Recurring month 4: rejected (limit 3)')
        assert(result.error?.includes('limit') === true, 'Recurring month 4: error mentions "limit"')
    }

    // Cleanup
    for (let month = 1; month <= 4; month++) {
        const saleId = `${TP}sale_rec_${month}`
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })
    }
}

// =============================================
// TESTS: CLAWBACK CASCADE
// =============================================

async function testClawbackCascade() {
    console.log('\n💥 TEST SUITE 5: Clawback Cascade')

    const grossAmount = 12000
    const taxAmount = 2000
    const htAmount = 10000
    const stripeFee = 377
    const netAmount = htAmount - stripeFee

    const { createOrgCommissions, handleClawback, updateSellerBalance } = await import('../lib/commission/engine')

    // --- Test 1: Clawback PENDING commission ---
    console.log('\n  📊 Clawback PENDING org commission')
    {
        const saleId = TP + 'sale_clawback_pending'
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
        })

        // Verify both exist
        const before = await prisma.commission.count({
            where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } }
        })
        assert(before === 2, 'Clawback PENDING: 2 commissions before clawback')

        // Clawback via member sale_id
        await handleClawback({ saleId })

        // Member commission should be deleted
        const memberC = await prisma.commission.findUnique({ where: { sale_id: saleId } })
        assert(memberC === null, 'Clawback PENDING: member commission deleted')

        // Leader commission should also be deleted (cascade via org_parent_commission_id)
        const leaderC = await prisma.commission.findUnique({ where: { sale_id: `${saleId}:orgcut` } })
        assert(leaderC === null, 'Clawback PENDING: leader commission deleted (cascade)')
    }

    // --- Test 2: Clawback COMPLETE commission (negative balance) ---
    console.log('\n  📊 Clawback COMPLETE org commission (negative balance)')
    {
        const saleId = TP + 'sale_clawback_complete'
        await prisma.commission.deleteMany({ where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } } })

        await createOrgCommissions({
            memberId: MEMBER_SELLER_ID, leaderId: LEADER_SELLER_ID,
            programId: MISSION_ID, saleId, linkId: LINK_ID,
            grossAmount, htAmount, netAmount, stripeFee, taxAmount,
            totalReward: '30%', leaderReward: '5%',
            currency: 'EUR', organizationMissionId: ORG_MISSION_ID,
        })

        // Manually mature + complete both commissions
        await prisma.commission.updateMany({
            where: { sale_id: { in: [saleId, `${saleId}:orgcut`] } },
            data: { status: 'COMPLETE', matured_at: new Date(), startup_payment_status: 'PAID' }
        })
        await updateSellerBalance(MEMBER_SELLER_ID)
        await updateSellerBalance(LEADER_SELLER_ID)

        const memberBalBefore = await prisma.sellerBalance.findUnique({ where: { seller_id: MEMBER_SELLER_ID } })
        const leaderBalBefore = await prisma.sellerBalance.findUnique({ where: { seller_id: LEADER_SELLER_ID } })
        console.log(`    Member balance before: ${(memberBalBefore?.balance || 0) / 100}€`)
        console.log(`    Leader balance before: ${(leaderBalBefore?.balance || 0) / 100}€`)

        // Clawback
        await handleClawback({ saleId })

        // Verify commissions deleted
        const memberC = await prisma.commission.findUnique({ where: { sale_id: saleId } })
        const leaderC = await prisma.commission.findUnique({ where: { sale_id: `${saleId}:orgcut` } })
        assert(memberC === null, 'Clawback COMPLETE: member commission deleted')
        assert(leaderC === null, 'Clawback COMPLETE: leader commission deleted')

        // Verify negative balance applied
        const memberBal = await prisma.sellerBalance.findUnique({ where: { seller_id: MEMBER_SELLER_ID } })
        const leaderBal = await prisma.sellerBalance.findUnique({ where: { seller_id: LEADER_SELLER_ID } })
        assert((memberBal?.balance || 0) < (memberBalBefore?.balance || 0), 'Clawback COMPLETE: member balance decreased')
        assert((leaderBal?.balance || 0) < (leaderBalBefore?.balance || 0), 'Clawback COMPLETE: leader balance decreased')
        console.log(`    Member balance after: ${(memberBal?.balance || 0) / 100}€`)
        console.log(`    Leader balance after: ${(leaderBal?.balance || 0) / 100}€`)
    }

    // Cleanup all test commissions & balances
    await prisma.commission.deleteMany({ where: { sale_id: { startsWith: TP + 'sale_clawback' } } })
    await prisma.sellerBalance.deleteMany({ where: { seller_id: { in: [MEMBER_SELLER_ID, LEADER_SELLER_ID] } } })
}

// =============================================
// TESTS: getOrgMissionConfig
// =============================================

async function testGetOrgMissionConfig() {
    console.log('\n🔍 TEST SUITE 6: getOrgMissionConfig')

    const { getOrgMissionConfig } = await import('../lib/commission/engine')

    // Test with our org-linked enrollment
    {
        const config = await getOrgMissionConfig({ linkId: LINK_ID })
        assert(config !== null, 'Config: returns config for org-linked enrollment')
        assert(config!.isOrgEnrollment === true, 'Config: isOrgEnrollment = true')
        assert(config!.organizationMissionId === ORG_MISSION_ID, 'Config: correct orgMissionId')
        assert(config!.leaderId === LEADER_SELLER_ID, 'Config: correct leaderId')
        assert(config!.totalReward === '30%', `Config: totalReward = "30%" (got "${config!.totalReward}")`)
        assert(config!.leaderReward === '5%', `Config: leaderReward = "5%" (got "${config!.leaderReward}")`)
    }

    // Test with null linkId
    {
        const config = await getOrgMissionConfig({ linkId: null })
        assert(config === null, 'Config null linkId: returns null')
    }

    // Test with unknown linkId
    {
        const config = await getOrgMissionConfig({ linkId: 'nonexistent-link-id' })
        assert(config === null, 'Config unknown linkId: returns null')
    }
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('🚀 Organization Commission Test Suite')
    console.log('='.repeat(50))

    try {
        await cleanup()
        await seedTestData()

        // Pure calculation tests (no DB side effects)
        await testPureCalculations()
        await testAcceptOrgMissionValidation()

        // DB tests
        await testCreateOrgCommissions()
        await testRecurringLimits()
        await testClawbackCascade()
        await testGetOrgMissionConfig()

    } catch (error) {
        console.error('\n💀 Fatal error:', error)
    } finally {
        await cleanup()
        await prisma.$disconnect()
        await pool.end()
    }

    console.log('\n' + '='.repeat(50))
    console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
    if (failed > 0) {
        console.log('❌ SOME TESTS FAILED')
        process.exit(1)
    } else {
        console.log('✅ ALL TESTS PASSED')
        process.exit(0)
    }
}

main()
