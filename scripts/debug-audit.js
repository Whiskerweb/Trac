const { PrismaClient } = require('../lib/generated/prisma/client')

const prisma = new PrismaClient()

async function main() {
    try {
        // Get all webhooks
        const webhooks = await prisma.webhookEndpoint.findMany()
        console.log('=== WEBHOOK ENDPOINTS ===')
        webhooks.forEach(w => console.log(`ID: ${w.id}\n  Workspace: ${w.workspace_id}\n  Active: ${w.active}\n  Secret: ${w.secret?.slice(0, 20)}...`))

        // Check workspaces
        const workspaces = await prisma.workspace.findMany({
            include: { Domain: true },
            take: 5
        })
        console.log('\n=== WORKSPACES ===')
        workspaces.forEach(w => console.log(`ID: ${w.id}\n  Name: ${w.name}\n  Domains: ${w.Domain?.map(d => d.name).join(', ') || 'none'}`))

        // Check customers
        const customers = await prisma.customer.findMany({ take: 5, orderBy: { created_at: 'desc' } })
        console.log('\n=== RECENT CUSTOMERS ===')
        if (customers.length === 0) console.log('  (no customers found)')
        customers.forEach(c => console.log(`  External: ${c.external_id}, Click: ${c.click_id}, Workspace: ${c.workspace_id}`))

        // Check commissions
        const commissions = await prisma.commission.findMany({ take: 5, orderBy: { created_at: 'desc' } })
        console.log('\n=== RECENT COMMISSIONS ===')
        if (commissions.length === 0) console.log('  (no commissions found)')
        commissions.forEach(c => console.log(`  Amount: ${c.commission_amount}, Status: ${c.status}, SaleID: ${c.sale_id}`))

        // Check processed events (to see if webhook was called)
        const events = await prisma.processedEvent.findMany({ take: 5, orderBy: { processed_at: 'desc' } })
        console.log('\n=== PROCESSED STRIPE EVENTS ===')
        if (events.length === 0) console.log('  (no processed events found)')
        events.forEach(e => console.log(`  EventID: ${e.event_id}, At: ${e.processed_at}`))

        // Check short links
        const links = await prisma.shortLink.findMany({ take: 5, orderBy: { created_at: 'desc' } })
        console.log('\n=== RECENT SHORT LINKS ===')
        links.forEach(l => console.log(`  ID: ${l.id}\n  Slug: ${l.slug}\n  Affiliate: ${l.affiliate_id}\n  Workspace: ${l.workspace_id}`))

    } finally {
        await prisma.$disconnect()
    }
}

main().catch(e => { console.error(e); process.exit(1) })
