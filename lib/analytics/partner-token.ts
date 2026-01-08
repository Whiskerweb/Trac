import { SignJWT, jwtVerify } from 'jose'

// =============================================
// TINYBIRD PARTNER JWT TOKEN GENERATOR
// =============================================

const TINYBIRD_JWT_SECRET = new TextEncoder().encode(
    process.env.TINYBIRD_JWT_SECRET || 'default-tinybird-jwt-secret-change-me'
)

/**
 * Generate a JWT token for Tinybird RLS filtering
 * 
 * This token contains the partner_id claim that Tinybird uses
 * to automatically inject WHERE partner_id = '...' into queries
 * 
 * @param partnerId - The partner's ID for RLS filtering
 * @param expiresIn - Token expiration (default: 1 hour)
 */
export async function generatePartnerToken(
    partnerId: string,
    expiresIn: string = '1h'
): Promise<string> {
    const token = await new SignJWT({
        partner_id: partnerId,
        type: 'partner_analytics'
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setIssuer('traaaction.com')
        .setSubject(partnerId)
        .sign(TINYBIRD_JWT_SECRET)

    return token
}

/**
 * Generate a workspace token for startup dashboard
 */
export async function generateWorkspaceToken(
    workspaceId: string,
    expiresIn: string = '1h'
): Promise<string> {
    const token = await new SignJWT({
        workspace_id: workspaceId,
        type: 'workspace_analytics'
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .setIssuer('traaaction.com')
        .setSubject(workspaceId)
        .sign(TINYBIRD_JWT_SECRET)

    return token
}

/**
 * Verify and decode a Tinybird token
 */
export async function verifyToken(token: string): Promise<{
    valid: boolean
    payload?: {
        partner_id?: string
        workspace_id?: string
        type: 'partner_analytics' | 'workspace_analytics'
    }
    error?: string
}> {
    try {
        const { payload } = await jwtVerify(token, TINYBIRD_JWT_SECRET, {
            issuer: 'traaaction.com'
        })

        return {
            valid: true,
            payload: payload as {
                partner_id?: string
                workspace_id?: string
                type: 'partner_analytics' | 'workspace_analytics'
            }
        }
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Invalid token'
        }
    }
}

/**
 * Generate token for Tinybird API calls with RLS
 * 
 * For partners: Creates token with partner_id claim
 * For startups: Creates token with workspace_id claim
 */
export function getTinybirdRLSHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
}
