/**
 * Debug script to check seller attribution
 * Run with: npx tsx debug-seller-attribution.ts
 */

import { prisma } from './lib/db'

async function debugSellerAttribution() {
    console.log('🔍 Debugging Seller Attribution\n')

    // 1. Check all ShortLinks
    console.log('📋 All ShortLinks:')
    const links = await prisma.shortLink.findMany({
        select: {
            id: true,
            slug: true,
            affiliate_id: true,
            workspace_id: true,
            clicks: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10
    })

    links.forEach(link => {
        console.log(`  • ${link.slug}`)
        console.log(`    - Link ID: ${link.id}`)
        console.log(`    - Affiliate ID: ${link.affiliate_id || '❌ NULL (no seller!)'}`)
        console.log(`    - Workspace ID: ${link.workspace_id}`)
        console.log(`    - Clicks: ${link.clicks}`)
        console.log()
    })

    // 2. Check all Sellers
    console.log('\n👥 All Sellers:')
    const sellers = await prisma.seller.findMany({
        select: {
            user_id: true,
            name: true,
            email: true,
            status: true,
        },
        take: 10
    })

    sellers.forEach(seller => {
        console.log(`  • ${seller.name || seller.email}`)
        console.log(`    - User ID: ${seller.user_id}`)
        console.log(`    - Status: ${seller.status}`)
        console.log()
    })

    // 3. Check MissionEnrollments
    console.log('\n📝 Mission Enrollments:')
    const enrollments = await prisma.missionEnrollment.findMany({
        include: {
            Mission: { select: { title: true } },
            ShortLink: { select: { slug: true, affiliate_id: true } }
        },
        take: 10
    })

    for (const enrollment of enrollments) {
        const enrollmentUser = await prisma.user.findUnique({
            where: { id: enrollment.user_id },
            select: { email: true }
        })
        console.log(`  • ${enrollmentUser?.email || 'Unknown'} joined "${enrollment.Mission.title}"`)
        console.log(`    - Link: ${enrollment.ShortLink?.slug || 'no link'}`)
        console.log(`    - Affiliate ID in link: ${enrollment.ShortLink?.affiliate_id || '❌ NULL'}`)
        console.log(`    - Match: ${enrollment.ShortLink?.affiliate_id === enrollment.user_id ? '✅ Yes' : '❌ No'}`)
        console.log()
    }

    // 4. Find missing attributions
    console.log('\n⚠️  Links without affiliate_id:')
    const orphanLinks = await prisma.shortLink.findMany({
        where: {
            affiliate_id: null
        },
        select: {
            slug: true,
            workspace_id: true,
            clicks: true,
            created_at: true
        }
    })

    if (orphanLinks.length === 0) {
        console.log('  ✅ All links have affiliate_id!')
    } else {
        orphanLinks.forEach(link => {
            console.log(`  ❌ ${link.slug} (${link.clicks} clicks, created ${link.created_at.toISOString()})`)
        })
    }

    await prisma.$disconnect()
}

debugSellerAttribution().catch(console.error)
