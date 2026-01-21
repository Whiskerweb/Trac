/**
 * API Key Management Library (Traaaction Style)
 * 
 * Security Model:
 * - Public keys (pk_*): Stored in plain text, for client-side tracking
 * - Secret keys (trac_live_*): Only SHA-256 hash stored, for server-side API access
 * 
 * Key Formats:
 * - Public: pk_<24 character nanoid>
 * - Secret: trac_live_<32 character nanoid>
 */

import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { createHash } from 'crypto'

// =============================================
// KEY GENERATION
// =============================================

/**
 * Generate a public API key (client-side tracking)
 * Format: pk_<24 chars>
 */
export function generatePublicKey(): string {
    return `pk_${nanoid(24)}`
}

/**
 * Generate a secret API key with its hash (server-side API access)
 * Format: trac_live_<32 chars> or trac_ws_<32 chars> for workspace-scoped
 * 
 * Returns both the plaintext key (show once) and hash (store in DB)
 */
export function generateSecretKey(type: 'live' | 'workspace' = 'live'): { key: string; hash: string } {
    const prefix = type === 'workspace' ? 'trac_ws_' : 'trac_live_'
    const key = `${prefix}${nanoid(32)}`
    const hash = hashSecretKey(key)
    return { key, hash }
}

/**
 * Hash a secret key using SHA-256
 * Used for storage and lookup
 */
export function hashSecretKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
}

// =============================================
// KEY VALIDATION
// =============================================

export interface ValidationResult {
    valid: boolean
    workspaceId?: string
    keyType?: 'public' | 'secret'
    apiKeyId?: string
}

/**
 * Validate any API key (auto-detects type by prefix)
 * Updates last_used_at timestamp on successful validation
 */
export async function validateApiKey(token: string): Promise<ValidationResult> {
    if (!token) {
        return { valid: false }
    }

    // Detect key type by prefix
    if (token.startsWith('trac_live_') || token.startsWith('trac_ws_')) {
        return validateSecretKey(token)
    } else if (token.startsWith('pk_')) {
        return validatePublicKey(token)
    }

    return { valid: false }
}

/**
 * Validate a secret key by computing its hash and looking up
 */
export async function validateSecretKey(token: string): Promise<ValidationResult> {
    if (!token || (!token.startsWith('trac_live_') && !token.startsWith('trac_ws_'))) {
        return { valid: false }
    }

    try {
        const hash = hashSecretKey(token)

        const apiKey = await prisma.apiKey.findFirst({
            where: { secret_hash: hash },
            select: { id: true, workspace_id: true }
        })

        if (!apiKey) {
            return { valid: false }
        }

        // Update last_used_at (fire-and-forget)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { last_used_at: new Date() }
        }).catch(console.error)

        return {
            valid: true,
            workspaceId: apiKey.workspace_id,
            keyType: 'secret',
            apiKeyId: apiKey.id
        }
    } catch (error) {
        console.error('[ApiKey] ❌ Secret validation error:', error)
        return { valid: false }
    }
}

/**
 * Validate a public key by direct lookup
 */
export async function validatePublicKey(token: string): Promise<ValidationResult> {
    if (!token || !token.startsWith('pk_')) {
        return { valid: false }
    }

    try {
        const apiKey = await prisma.apiKey.findUnique({
            where: { public_key: token },
            select: { id: true, workspace_id: true }
        })

        if (!apiKey) {
            return { valid: false }
        }

        // Update last_used_at (fire-and-forget)
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { last_used_at: new Date() }
        }).catch(console.error)

        return {
            valid: true,
            workspaceId: apiKey.workspace_id,
            keyType: 'public',
            apiKeyId: apiKey.id
        }
    } catch (error) {
        console.error('[ApiKey] ❌ Public key validation error:', error)
        return { valid: false }
    }
}

// =============================================
// KEY MANAGEMENT (for server actions)
// =============================================

/**
 * Create a new API key pair for a workspace
 * Returns the secret key plaintext ONCE - it cannot be recovered
 */
export async function createApiKeyPair(
    workspaceId: string,
    name: string = 'Default Key'
): Promise<{
    publicKey: string
    secretKey: string  // Only returned once!
    apiKeyId: string
}> {
    const publicKey = generatePublicKey()
    const { key: secretKey, hash: secretHash } = generateSecretKey()

    const apiKey = await prisma.apiKey.create({
        data: {
            workspace_id: workspaceId,
            name,
            public_key: publicKey,
            secret_hash: secretHash,
        }
    })

    console.log('[ApiKey] ✅ Created new key pair for workspace:', workspaceId)

    return {
        publicKey,
        secretKey,
        apiKeyId: apiKey.id
    }
}

/**
 * Regenerate secret key for an existing API key
 * Returns new secret key plaintext ONCE
 */
export async function regenerateSecretKey(apiKeyId: string): Promise<{
    secretKey: string
} | null> {
    const { key: secretKey, hash: secretHash } = generateSecretKey()

    try {
        await prisma.apiKey.update({
            where: { id: apiKeyId },
            data: {
                secret_hash: secretHash,
                created_at: new Date() // Reset creation date
            }
        })

        console.log('[ApiKey] 🔄 Regenerated secret for:', apiKeyId)
        return { secretKey }
    } catch (error) {
        console.error('[ApiKey] ❌ Regeneration error:', error)
        return null
    }
}

/**
 * Get all API keys for a workspace (without secrets)
 */
export async function getWorkspaceApiKeys(workspaceId: string) {
    return prisma.apiKey.findMany({
        where: { workspace_id: workspaceId },
        select: {
            id: true,
            name: true,
            public_key: true,
            created_at: true,
            last_used_at: true,
            // Never expose secret_hash!
        },
        orderBy: { created_at: 'desc' }
    })
}
