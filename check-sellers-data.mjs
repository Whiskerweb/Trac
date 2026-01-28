import pkg from './lib/generated/prisma/index.js'
const { PrismaClient } = pkg

const prisma = new PrismaClient()

async function checkSellersData() {
    console.log('\n=== Checking Sellers Data ===\n')

    // 1. Check all sellers
    const sellers = await prisma.seller.findMany({
        include: {
            Profile: true,
            Commissions: true
        }
    })
    console.log(`📊 Total sellers: ${sellers.length}`)
    sellers.forEach(seller => {
        console.log(`  - ${seller.name || 'No name'} (${seller.email})`)
        console.log(`    ID: ${seller.id}`)
        console.log(`    User ID: ${seller.user_id || 'None'}`)
        console.log(`    Status: ${seller.status}`)
        console.log(`    Commissions: ${seller.Commissions.length}`)
        console.log(`    Activity Type: ${seller.Profile?.activity_type || 'None'}`)
        console.log('')
    })

    // 2. Check enrollments
    const enrollments = await prisma.missionEnrollment.findMany({
        include: {
            ShortLink: true,
            Mission: {
                include: {
                    Workspace: true
                }
            }
        }
    })
    console.log(`\n📝 Total enrollments: ${enrollments.length}`)
    enrollments.forEach(enrollment => {
        console.log(`  - User: ${enrollment.user_id}`)
        console.log(`    Mission: ${enrollment.Mission.title}`)
        console.log(`    Workspace: ${enrollment.Mission.Workspace.name}`)
        console.log(`    Status: ${enrollment.status}`)
        console.log(`    Link ID: ${enrollment.link_id || 'None'}`)
        console.log(`    ShortLink clicks: ${enrollment.ShortLink?.clicks || 0}`)
        console.log(`    ShortLink affiliate_id: ${enrollment.ShortLink?.affiliate_id || 'None'}`)
        console.log('')
    })

    // 3. Check short links
    const links = await prisma.shortLink.findMany()
    console.log(`\n🔗 Total short links: ${links.length}`)
    links.forEach(link => {
        console.log(`  - Slug: ${link.slug}`)
        console.log(`    Affiliate ID: ${link.affiliate_id || 'None'}`)
        console.log(`    Workspace ID: ${link.workspace_id || 'None'}`)
        console.log(`    Clicks: ${link.clicks}`)
        console.log('')
    })

    // 4. Check workspaces
    const workspaces = await prisma.workspace.findMany()
    console.log(`\n🏢 Total workspaces: ${workspaces.length}`)
    workspaces.forEach(workspace => {
        console.log(`  - ${workspace.name} (${workspace.slug})`)
        console.log(`    ID: ${workspace.id}`)
        console.log('')
    })

    await prisma.$disconnect()
}

checkSellersData().catch(console.error)
