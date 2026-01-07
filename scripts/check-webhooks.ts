import { prisma } from './lib/db'

async function main() {
  console.log('=== WEBHOOK ENDPOINTS ===')
  const endpoints = await prisma.webhookEndpoint.findMany()
  endpoints.forEach(e => {
    console.log(`ID: ${e.id}`)
    console.log(`  Workspace: ${e.workspace_id}`)
    console.log(`  Has Secret: ${!!e.secret}`)
    console.log(`  Secret starts with: ${e.secret?.slice(0, 10)}...`)
    console.log('')
  })

  console.log('=== LAST 5 PROCESSED EVENTS ===')
  const events = await prisma.processedEvent.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  })
  events.forEach(e => {
    console.log(`ID: ${e.event_id}`)
    console.log(`  Type: ${e.event_type}`)
    console.log(`  Workspace: ${e.workspace_id}`)
    console.log(`  Created: ${e.created_at}`)
    console.log('')
  })
}

main().finally(() => process.exit())
