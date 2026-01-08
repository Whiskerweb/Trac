/**
 * Partner RLS (Row-Level Security) Validation
 * 
 * Ensures Tinybird queries are properly scoped to the requesting partner
 * Prevents cross-tenant data access via JWT claim validation
 */

import { verifyToken } from './partner-token'

// =============================================
// PARTNER ACCESS VALIDATION
// =============================================

/**
 * Validate that the JWT token's partner_id claim matches the requested partner
 * Use this before allowing access to partner-specific analytics
 * 
 * @param token - JWT token from request
 * @param requestedPartnerId - The partner ID the request wants to access
 * @returns Validation result with error details if failed
 * 
 * @example
 * const validation = await validatePartnerAccess(token, partnerId)
 * if (!validation.valid) {
 *   return NextResponse.json({ error: validation.error }, { status: 403 })
 * }
 */
export async function validatePartnerAccess(
    token: string,
    requestedPartnerId: string
): Promise<{ valid: boolean; error?: string }> {
    // Verify the token
    const verification = await verifyToken(token)

    if (!verification.valid) {
        return { valid: false, error: verification.error || 'Invalid token' }
    }

    const payload = verification.payload

    // Check token type
    if (payload?.type !== 'partner_analytics') {
        return { valid: false, error: 'Invalid token type for partner access' }
    }

    // Verify partner_id claim matches request
    if (payload.partner_id !== requestedPartnerId) {
        console.warn(`[RLS] ⚠️ Partner ID mismatch: token=${payload.partner_id}, requested=${requestedPartnerId}`)
        return { valid: false, error: 'Access denied: partner_id mismatch' }
    }

    return { valid: true }
}

/**
 * Validate workspace access for startup dashboard
 * 
 * @param token - JWT token from request
 * @param requestedWorkspaceId - The workspace ID the request wants to access
 */
export async function validateWorkspaceAccess(
    token: string,
    requestedWorkspaceId: string
): Promise<{ valid: boolean; error?: string }> {
    const verification = await verifyToken(token)

    if (!verification.valid) {
        return { valid: false, error: verification.error || 'Invalid token' }
    }

    const payload = verification.payload

    if (payload?.type !== 'workspace_analytics') {
        return { valid: false, error: 'Invalid token type for workspace access' }
    }

    if (payload.workspace_id !== requestedWorkspaceId) {
        console.warn(`[RLS] ⚠️ Workspace ID mismatch: token=${payload.workspace_id}, requested=${requestedWorkspaceId}`)
        return { valid: false, error: 'Access denied: workspace_id mismatch' }
    }

    return { valid: true }
}

/**
 * Extract the partner_id from a verified token
 * Use this to get the partner_id for Tinybird queries
 */
export async function extractPartnerIdFromToken(token: string): Promise<string | null> {
    const verification = await verifyToken(token)

    if (!verification.valid || verification.payload?.type !== 'partner_analytics') {
        return null
    }

    return verification.payload.partner_id || null
}

/**
 * Build Tinybird query URL with RLS token
 * The token's claims will be used by Tinybird to filter data
 */
export function buildTinybirdRLSUrl(
    pipeName: string,
    token: string,
    params?: Record<string, string>
): string {
    const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'

    const url = new URL(`${TINYBIRD_HOST}/v0/pipes/${pipeName}.json`)
    url.searchParams.set('token', token)

    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value)
        }
    }

    return url.toString()
}
