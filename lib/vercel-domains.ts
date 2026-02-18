import {
    VERCEL_AUTH_TOKEN,
    VERCEL_PROJECT_ID,
    VERCEL_TEAM_ID,
} from '@/lib/config/constants'

// =============================================
// TYPES
// =============================================

export interface VercelDomainResponse {
    name: string
    apexName: string
    projectId: string
    verified: boolean
    verification?: Array<{
        type: string
        domain: string
        value: string
        reason: string
    }>
    error?: {
        code: string
        message: string
    }
}

// =============================================
// HELPERS
// =============================================

export const VERCEL_API_BASE = 'https://api.vercel.com'

export function getVercelHeaders(): HeadersInit {
    return {
        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    }
}

export function getTeamQuery(): string {
    return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
}

// =============================================
// ADD DOMAIN
// =============================================

/**
 * Add a domain to Vercel project.
 * Idempotent: if the domain is already on OUR project, returns success.
 * Automatically triggers verification after adding.
 */
export async function addDomainToVercel(domainName: string): Promise<{
    success: boolean
    error?: string
    data?: VercelDomainResponse
    verified?: boolean
}> {
    console.log('[Vercel] Adding domain:', domainName, {
        hasAuthToken: !!VERCEL_AUTH_TOKEN,
        hasProjectId: !!VERCEL_PROJECT_ID,
    })

    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        console.error('[Vercel] Missing API credentials')
        return {
            success: false,
            error: 'Configuration Vercel manquante. Contactez le support.'
        }
    }

    try {
        const url = `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'POST',
            headers: getVercelHeaders(),
            body: JSON.stringify({ name: domainName }),
        })

        const data = await res.json()

        console.log('[Vercel] Add response:', {
            status: res.status,
            ok: res.ok,
            verified: data.verified,
            hasVerification: !!data.verification?.length,
        })

        if (!res.ok) {
            // Idempotent: domain_already_in_use on OUR project = success
            if (data.error?.code === 'domain_already_in_use') {
                const checkUrl = `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains/${domainName}${getTeamQuery()}`
                const checkRes = await fetch(checkUrl, { method: 'GET', headers: getVercelHeaders() })
                if (checkRes.ok) {
                    const existing = await checkRes.json()
                    console.log('[Vercel] Domain already on our project (idempotent):', domainName, { verified: existing.verified })
                    // If not verified, trigger verification
                    if (!existing.verified) {
                        await verifyDomainOnVercel(domainName)
                    }
                    return { success: true, data: existing, verified: existing.verified }
                }
                return { success: false, error: 'This domain is already used by another Vercel project' }
            }
            if (data.error?.code === 'forbidden') {
                return { success: false, error: 'Token Vercel invalide ou permissions insuffisantes' }
            }
            if (data.error?.code === 'not_found') {
                return { success: false, error: 'Vercel project not found. Check VERCEL_PROJECT_ID.' }
            }
            if (data.error?.code === 'team_not_found') {
                return { success: false, error: 'Vercel team not found. Check VERCEL_TEAM_ID.' }
            }

            return { success: false, error: data.error?.message || `Vercel error (${res.status})` }
        }

        console.log('[Vercel] Domain added:', domainName, { verified: data.verified })

        // If domain was added but not yet verified, trigger verification
        if (!data.verified) {
            console.log('[Vercel] Domain not verified, triggering verification...')
            await verifyDomainOnVercel(domainName)
        }

        return { success: true, data, verified: data.verified }
    } catch (err) {
        console.error('[Vercel] addDomain request failed:', err)
        return { success: false, error: 'Connection error to Vercel API' }
    }
}

// =============================================
// VERIFY DOMAIN
// =============================================

/**
 * Trigger domain verification on Vercel.
 * This tells Vercel to check DNS records and verify the domain.
 */
export async function verifyDomainOnVercel(domainName: string): Promise<{
    success: boolean
    verified?: boolean
    error?: string
}> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        return { success: false, error: 'Vercel API not configured' }
    }

    try {
        const url = `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains/${domainName}/verify${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'POST',
            headers: getVercelHeaders(),
        })

        const data = await res.json()

        console.log('[Vercel] Verify response:', {
            status: res.status,
            verified: data.verified,
            domain: domainName,
        })

        if (!res.ok) {
            console.warn('[Vercel] Verification request failed:', data.error?.message)
            return { success: false, error: data.error?.message || 'Verification failed' }
        }

        return { success: true, verified: data.verified }
    } catch (err) {
        console.error('[Vercel] verifyDomain request failed:', err)
        return { success: false, error: 'Connection error' }
    }
}

// =============================================
// REMOVE DOMAIN
// =============================================

/**
 * Remove a domain from Vercel project.
 * Treats 404 as success (domain already removed).
 */
export async function removeDomainFromVercel(domainName: string): Promise<{ success: boolean; error?: string }> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        console.warn('[Vercel] API not configured, skipping removal')
        return { success: true }
    }

    try {
        const url = `${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domainName}${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'DELETE',
            headers: getVercelHeaders(),
        })

        if (!res.ok && res.status !== 404) {
            const data = await res.json()
            console.error('[Vercel] Domain removal failed:', data)
            return { success: false, error: data.error?.message || 'Failed to delete' }
        }

        console.log('[Vercel] Domain removed:', domainName)
        return { success: true }
    } catch (err) {
        console.error('[Vercel] removeDomain request failed:', err)
        return { success: false, error: 'Connection error' }
    }
}
