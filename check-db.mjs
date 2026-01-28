import { PrismaClient } from './lib/generated/prisma/index.js'

const prisma = new PrismaClient()

async function check() {
    try {
        const [missions, enrollments, sellers, commissions] = await Promise.all([
            prisma.mission.count(),
            prisma.missionEnrollment.count(),
            prisma.seller.count(),
            prisma.commission.count()
        ])

        console.log('=== Database Counts ===')
        console.log('Missions:', missions)
        console.log('Enrollments:', enrollments)
        console.log('Sellers:', sellers)
        console.log('Commissions:', commissions)

        if (enrollments > 0) {
            const sampleEnrollments = await prisma.missionEnrollment.findMany({
                take: 3,
                include: {
                    Mission: { select: { workspace_id: true, title: true } },
                    ShortLink: { select: { affiliate_id: true, clicks: true } }
                }
            })
            console.log('\n=== Sample Enrollments ===')
            console.log(JSON.stringify(sampleEnrollments, null, 2))
        }

        if (sellers > 0) {
            const sampleSellers = await prisma.seller.findMany({
                take: 3,
                select: { id: true, name: true, email: true, user_id: true, status: true }
            })
            console.log('\n=== Sample Sellers ===')
            console.log(JSON.stringify(sampleSellers, null, 2))
        }

        await prisma.$disconnect()
    } catch (error) {
        console.error('Error:', error.message)
        process.exit(1)
    }
}

check()
