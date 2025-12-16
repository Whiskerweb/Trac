import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../lib/generated/prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('🌱 Starting seed...')

    // Create Startup user
    const startupUser = await prisma.user.upsert({
        where: { email: 'startup@demo.com' },
        update: {},
        create: {
            email: 'startup@demo.com',
            password_hash: await bcrypt.hash('password123', 10),
            name: 'Demo Startup',
            role: 'STARTUP',
        },
    })
    console.log('👤 Startup user created:', startupUser.email)

    // Create Affiliate user
    const affiliateUser = await prisma.user.upsert({
        where: { email: 'affiliate@demo.com' },
        update: {},
        create: {
            email: 'affiliate@demo.com',
            password_hash: await bcrypt.hash('password123', 10),
            name: 'Demo Affiliate',
            role: 'AFFILIATE',
        },
    })
    console.log('👤 Affiliate user created:', affiliateUser.email)

    // Create Demo Project (owned by startup)
    const demoProject = await prisma.project.upsert({
        where: { public_key: 'pk_test_DEMO_KEY' },
        update: { user_id: startupUser.id }, // Update owner if exists
        create: {
            name: 'Demo Shop',
            public_key: 'pk_test_DEMO_KEY',
            website: 'https://demo.example.com',
            user_id: startupUser.id,
        },
    })
    console.log('✅ Projet créé/vérifié:', demoProject.name)
    console.log('🔑 Clé publique:', demoProject.public_key)

    // Create sample link with NanoID (claimed by affiliate)
    const sampleLink = await prisma.link.upsert({
        where: { id: 'x7z9sNm' }, // NanoID format (7 chars)
        update: {},
        create: {
            id: 'x7z9sNm',
            destination_url: 'https://demo.example.com/product?color=blue',
            project_id: demoProject.id,
            user_id: affiliateUser.id,
            name: 'Instagram Campaign',
        },
    })
    console.log('🔗 Lien de test créé:', sampleLink.id)
    console.log('📡 URL de tracking:', `${sampleLink.destination_url.includes('?') ? '&' : '?'}ref_id=${sampleLink.id}`)

    console.log('\n🎉 Seed completed!')
    console.log('Demo accounts created:')
    console.log('  Startup: startup@demo.com / password123')
    console.log('  Affiliate: affiliate@demo.com / password123')
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
