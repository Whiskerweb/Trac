// Fix orphan customer with correct affiliate_id from Tinybird
import { prisma } from '../lib/db'

async function fix() {
    // Update customer with correct affiliate_id from Tinybird
    const result = await prisma.customer.update({
        where: { id: 'cmkl51l3j000004kzoblbm8up' },
        data: {
            affiliate_id: 'd2bfa268-3313-4505-a97a-e21456ea032d',
            link_id: '315eddd1-f2d4-4793-bc61-edea02febc75'
        }
    })
    console.log('✅ Fixed customer:', result)
}

fix().catch(console.error)
