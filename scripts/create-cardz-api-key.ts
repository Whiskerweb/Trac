// Script to create API key for cardz.dev workspace
import { createApiKeyPair } from '../lib/api-keys'

async function main() {
    const workspaceId = '4b225e9b-3470-453c-a074-00db6048e4d3' // cardz.dev workspace

    console.log('🔑 Creating API key pair for workspace:', workspaceId)

    const result = await createApiKeyPair(workspaceId, 'Cardz Production Key')

    console.log('✅ API Key Created!')
    console.log('=====================================')
    console.log('📘 Public Key (for client-side):', result.publicKey)
    console.log('🔐 Secret Key (SAVE THIS NOW):', result.secretKey)
    console.log('ID:', result.apiKeyId)
    console.log('=====================================')
    console.log('')
    console.log('Use this public key in cardz.dev trackLead() calls:')
    console.log(`headers: { 'x-publishable-key': '${result.publicKey}' }`)
}

main().catch(console.error)
