/**
 * Debug script for saler@saler.com attribution
 * Run with: npx tsx debug-saler-attribution.ts
 */

import { prisma } from './lib/db'

async function debugSalerAttribution() {
    console.log('🔍 Debugging Attribution for saler@saler.com\n')
    console.log('=' .repeat(60))

    // 1. Find the seller
    console.log('\n📧 Step 1: Finding Seller Account')
    const seller = await prisma.seller.findFirst({
        where: { email: 'saler@saler.com' }
    })

    if (!seller) {
        console.log('❌ Seller not found with email saler@saler.com')
        await prisma.$disconnect()
        return
    }

    console.log('✅ Seller found:')
    console.log(`   - User ID: ${seller.user_id}`)
    console.log(`   - Name: ${seller.name || 'N/A'}`)
    console.log(`   - Email: ${seller.email}`)
    console.log(`   - Status: ${seller.status}`)

    // Also get the user info
    const user = seller.user_id ? await prisma.user.findUnique({
        where: { id: seller.user_id },
        select: { id: true, email: true }
    }) : null
    if (user) {
        console.log(`   - User Email: ${user.email}`)
    }

    // 2. Find the mission "final test"
    console.log('\n🎯 Step 2: Finding Mission "final test"')
    const mission = await prisma.mission.findFirst({
        where: {
            OR: [
                { title: { contains: 'final test', mode: 'insensitive' } },
                { title: { contains: 'finaltest', mode: 'insensitive' } }
            ]
        }
    })

    if (!mission) {
        console.log('❌ Mission "final test" not found')
    } else {
        console.log('✅ Mission found:')
        console.log(`   - ID: ${mission.id}`)
        console.log(`   - Title: ${mission.title}`)
        console.log(`   - Status: ${mission.status}`)
        console.log(`   - Workspace ID: ${mission.workspace_id}`)
    }

    // 3. Check enrollment
    console.log('\n📝 Step 3: Checking Enrollment')
    const enrollment = seller.user_id ? await prisma.missionEnrollment.findFirst({
        where: {
            user_id: seller.user_id,
            mission_id: mission?.id
        },
        include: {
            ShortLink: true
        }
    }) : null

    if (!enrollment) {
        console.log('❌ No enrollment found for this seller and mission')
    } else {
        console.log('✅ Enrollment found:')
        console.log(`   - Enrollment ID: ${enrollment.id}`)
        console.log(`   - Status: ${enrollment.status}`)
        console.log(`   - Link ID: ${enrollment.link_id}`)

        if (enrollment.ShortLink) {
            console.log(`   - Link Slug: ${enrollment.ShortLink.slug}`)
            console.log(`   - Link affiliate_id: ${enrollment.ShortLink.affiliate_id || '❌ NULL'}`)
            console.log(`   - Match: ${enrollment.ShortLink.affiliate_id === seller.user_id ? '✅' : '❌'}`)
        }
    }

    // 4. Find the specific link by slug
    console.log('\n🔗 Step 4: Finding ShortLink "finaltest/2767989e"')
    const link = await prisma.shortLink.findFirst({
        where: {
            slug: { contains: 'finaltest' }
        }
    })

    if (!link) {
        console.log('❌ Link not found')
    } else {
        console.log('✅ Link found:')
        console.log(`   - ID: ${link.id}`)
        console.log(`   - Slug: ${link.slug}`)
        console.log(`   - Original URL: ${link.original_url}`)
        console.log(`   - Workspace ID: ${link.workspace_id}`)
        console.log(`   - Affiliate ID: ${link.affiliate_id || '❌ NULL (THIS IS THE PROBLEM!)'}`)
        console.log(`   - Clicks: ${link.clicks}`)
        console.log(`   - Created: ${link.created_at.toISOString()}`)

        if (link.affiliate_id === seller.user_id) {
            console.log('   ✅ Link is correctly attributed to seller')
        } else if (!link.affiliate_id) {
            console.log('   ❌ Link has NO affiliate_id - this is why it shows "Anonymous"!')
        } else {
            console.log(`   ⚠️  Link is attributed to different user: ${link.affiliate_id}`)
        }
    }

    // 5. Check if there are any clicks data
    console.log('\n📊 Step 5: Summary')
    console.log('=' .repeat(60))

    if (link && !link.affiliate_id) {
        console.log('\n🔴 PROBLEM IDENTIFIED:')
        console.log('   The link exists but has NO affiliate_id!')
        console.log('   This means clicks are logged without seller attribution.')
        console.log('\n💡 SOLUTION:')
        console.log('   We need to update this link to add the affiliate_id.')
        console.log(`   Run this SQL:`)
        console.log(`   UPDATE "ShortLink" SET affiliate_id = '${seller.user_id}' WHERE id = '${link.id}';`)
        console.log('\n   Also need to update Redis cache after fixing.')
    } else if (link && link.affiliate_id === seller.user_id) {
        console.log('\n🟢 Attribution is CORRECT in database!')
        console.log('   The issue might be in:')
        console.log('   1. Redis cache not updated')
        console.log('   2. Tinybird not receiving affiliate_id')
        console.log('   3. Activity API enrichment logic')
    }

    console.log('\n')
    await prisma.$disconnect()
}

debugSalerAttribution().catch(console.error)
