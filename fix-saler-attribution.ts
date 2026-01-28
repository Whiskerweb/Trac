/**
 * Fix script to assign affiliate_id to the link
 * Run ONLY AFTER running debug-saler-attribution.ts
 * Run with: npx tsx fix-saler-attribution.ts
 */

import { prisma } from './lib/db'
import { redis } from './lib/redis'

async function fixSalerAttribution() {
    console.log('🔧 Fixing Attribution for saler@saler.com\n')

    // 1. Find the seller
    const seller = await prisma.seller.findFirst({
        where: { email: 'saler@saler.com' }
    })

    if (!seller) {
        console.log('❌ Seller not found')
        await prisma.$disconnect()
        return
    }

    console.log(`✅ Found seller: ${seller.user_id}`)

    // 2. Find the link
    const link = await prisma.shortLink.findFirst({
        where: {
            slug: { contains: 'finaltest' }
        }
    })

    if (!link) {
        console.log('❌ Link not found')
        await prisma.$disconnect()
        return
    }

    console.log(`✅ Found link: ${link.slug} (ID: ${link.id})`)

    if (link.affiliate_id === seller.user_id) {
        console.log('✅ Link already has correct affiliate_id!')
        await prisma.$disconnect()
        return
    }

    // 3. Update the link
    console.log(`\n🔄 Updating link to add affiliate_id...`)
    const updated = await prisma.shortLink.update({
        where: { id: link.id },
        data: {
            affiliate_id: seller.user_id
        }
    })

    console.log(`✅ Database updated!`)
    console.log(`   - Link: ${updated.slug}`)
    console.log(`   - New affiliate_id: ${updated.affiliate_id}`)

    // 4. Update Redis cache
    console.log(`\n🔄 Updating Redis cache...`)

    const { setLinkInRedis } = await import('./lib/redis')

    try {
        await setLinkInRedis(updated.slug, {
            url: updated.original_url,
            linkId: updated.id,
            workspaceId: updated.workspace_id,
            sellerId: updated.affiliate_id,
        })
        console.log(`✅ Redis cache updated!`)
    } catch (error) {
        console.error(`❌ Redis update failed:`, error)
        console.log(`   Manual Redis update needed`)
    }

    console.log(`\n✅ Fix complete!`)
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Clear your browser and reload the dashboard`)
    console.log(`   2. Create a new test click on: https://dodo.cardz.dev/s/${updated.slug}`)
    console.log(`   3. Check if the activity feed now shows the seller name`)
    console.log(`\n💡 Note: Old clicks in Tinybird won't be updated retroactively.`)
    console.log(`   They were logged without affiliate_id and will still show "Anonymous".`)
    console.log(`   Only NEW clicks after this fix will show the seller name.`)

    await prisma.$disconnect()
}

fixSalerAttribution().catch(console.error)
