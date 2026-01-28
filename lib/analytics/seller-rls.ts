/**
 * Seller RLS (Row-Level Security) Validation
 *
 * Ensures Tinybird queries are properly scoped to the requesting seller
 * Prevents cross-tenant data access via JWT claim validation
 */

import { verifyToken } from './seller-token'

// =============================================
// SELLER ACCESS VALIDATION
// =============================================

/**
 * Validate that the JWT token's seller_id claim matches the requested seller
 * Use this before allowing access to seller-specific analytics
 *
 * @param token - JWT token from request
 * @param requestedSellerId - The seller ID the request wants to access
 * @returns Validation result with error details if failed
 *
 * @example
 * const validation = await validateSellerAccess(token, sellerId)
 * if (!validation.valid) {
 *   return NextResponse.json({ error: validation.error }, { status: 403 })
 * }
 */
export async function validateSellerAccess(
    token: string,
    requestedSellerId: string
): Promise<{ valid: boolean; error?: string }> {
    // Verify the token
    const verification = await verifyToken(token)

    if (!verification.valid) {
        return { valid: false, error: verification.error || 'Invalid token' }
    }

    const payload = verification.payload

    // Check token type
    if (payload?.type !== 'seller_analytics') {
        return { valid: false, error: 'Invalid token type for seller access' }
    }

    // Verify seller_id claim matches request
    if (payload.seller_id !== requestedSellerId) {
        console.warn(`[RLS] ⚠️ Seller ID mismatch: token=${payload.seller_id}, requested=${requestedSellerId}`)
        return { valid: false, error: 'Access denied: seller_id mismatch' }
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
 * Extract the seller_id from a verified token
 * Use this to get the seller_id for Tinybird queries
 */
export async function extractSellerIdFromToken(token: string): Promise<string | null> {
    const verification = await verifyToken(token)

    if (!verification.valid || verification.payload?.type !== 'seller_analytics') {
        return null
    }

    return verification.payload.seller_id || null
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
