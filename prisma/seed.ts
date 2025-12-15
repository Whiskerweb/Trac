import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import 'dotenv/config'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🌱 Starting seed...')

    // Upsert Demo Project (pour ne pas dupliquer si déjà existant)
    const demoProject = await prisma.project.upsert({
        where: { public_key: 'pk_test_DEMO_KEY' },
        update: {},
        create: {
            name: 'Demo Shop',
            public_key: 'pk_test_DEMO_KEY',
            website: 'https://demo.example.com',
        },
    })

    console.log('✅ Projet créé/vérifié:', demoProject)
    console.log('🔑 Clé publique:', demoProject.public_key)

    // Create sample link for testing
    const sampleLink = await prisma.link.upsert({
        where: { id: 'sample-link-uuid' },
        update: {},
        create: {
            id: 'sample-link-uuid',
            destination_url: 'https://demo.example.com/product?color=blue',
            project_id: demoProject.id,
            user_id: 'test_affiliate_123',
            name: 'Sample Test Link',
        },
    })

    console.log('🔗 Lien de test créé:', sampleLink)
    console.log('📡 URL de tracking:', `${sampleLink.destination_url.includes('?') ? '&' : '?'}ref_id=${sampleLink.id}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
        console.log('🌱 Seed terminé avec succès!')
    })
    .catch(async (e) => {
        console.error('❌ Erreur lors du seed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
