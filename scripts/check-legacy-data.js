
const { PrismaClient } = require('../lib/generated/prisma');

async function checkLegacyData() {
    try {
        const linkCount = await prisma.link.count();
        const projectCount = await prisma.project.count();

        console.log('--- Legacy Data Check ---');
        console.log(`Link table count: ${linkCount}`);
        console.log(`Project table count: ${projectCount}`);

        if (linkCount > 0 || projectCount > 0) {
            console.warn('⚠️  WARNING: Legacy data found. Do not drop tables without migration.');
        } else {
            console.log('✅ No legacy data found. Safe to drop tables.');
        }

    } catch (error) {
        console.error('Error checking legacy data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLegacyData();
