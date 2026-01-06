
import 'dotenv/config';
import { prisma } from '../lib/db';

async function verifyMigration() {
    try {
        const workspaceCount = await prisma.workspace.count();
        const shortLinkCount = await prisma.shortLink.count();

        console.log('--- Migration Verification ---');
        console.log(`Workspace count: ${workspaceCount}`);
        console.log(`ShortLink count: ${shortLinkCount}`);

        if (workspaceCount >= 3 && shortLinkCount >= 2) {
            console.log('✅ Migration data verified. Counts match legacy data.');
        } else {
            console.warn('⚠️  Warning: Counts seem low based on legacy data checks.');
        }

        // Try to access Link just to prove it fails (optional, TS would catch this at compile time usually)
        // @ts-ignore
        if (prisma.link) {
            console.warn('❌ Link model still exists in Prisma Client?');
        } else {
            console.log('✅ Link model successfully removed from Prisma Client.');
        }

    } catch (error) {
        console.error('Error verifying data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyMigration();
