/**
 * API Middleware - Scope Verification
 * 
 * Provides middleware functions for API route protection:
 * - Validates API keys and extracts workspace context
 * - Enforces scope-based access control
 * - Prevents partners from accessing admin routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/db'
import { ApiScope, API_SCOPES } from '@/lib/config/constants'

// =============================================
// TYPES
// =============================================

export interface ApiContext {
    valid: boolean
    workspaceId?: string
    apiKeyId?: string
    scopes?: string[]
    error?: string
}

// =============================================
// SCOPE VERIFICATION
// =============================================

/**
 * Verify that an API key has the required scopes
 * 
 * @param request - Next.js request object
 * @param requiredScopes - Array of scopes needed for this operation
 * @returns ApiContext with validation result
 * 
 * @example
 * const ctx = await requireScopes(request, ['links:write'])
 * if (!ctx.valid) {
 *   return NextResponse.json({ error: ctx.error }, { status: 403 })
 * }
 */
export async function requireScopes(
    request: NextRequest,
    requiredScopes: ApiScope[]
): Promise<ApiContext> {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
        return { valid: false, error: 'Missing Authorization header' }
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
        return { valid: false, error: 'Invalid Authorization format' }
    }

    // Validate the API key
    const validation = await validateApiKey(token)
    if (!validation.valid || !validation.workspaceId) {
        return { valid: false, error: 'Invalid API key' }
    }

    // Fetch the API key's scopes from database
    const apiKey = await prisma.apiKey.findUnique({
        where: { id: validation.apiKeyId },
        select: { scopes: true }
    })

    if (!apiKey) {
        return { valid: false, error: 'API key not found' }
    }

    const keyScopes = apiKey.scopes || []

    // Check if admin scope is present (grants all access)
    if (keyScopes.includes('admin:*')) {
        return {
            valid: true,
            workspaceId: validation.workspaceId,
            apiKeyId: validation.apiKeyId,
            scopes: keyScopes
        }
    }

    // Check if all required scopes are present
    const missingScopes = requiredScopes.filter(scope => !keyScopes.includes(scope))
    if (missingScopes.length > 0) {
        return {
            valid: false,
            error: `Missing required scopes: ${missingScopes.join(', ')}`,
            workspaceId: validation.workspaceId,
            apiKeyId: validation.apiKeyId,
            scopes: keyScopes
        }
    }

    return {
        valid: true,
        workspaceId: validation.workspaceId,
        apiKeyId: validation.apiKeyId,
        scopes: keyScopes
    }
}

/**
 * Verify that a request is NOT coming from a partner key
 * Use this to protect admin-only routes
 */
export async function requireAdminAccess(request: NextRequest): Promise<ApiContext> {
    const ctx = await requireScopes(request, [])

    if (!ctx.valid) {
        return ctx
    }

    // Check if this is a partner-level key (no admin scope)
    if (!ctx.scopes?.includes('admin:*')) {
        return {
            ...ctx,
            valid: false,
            error: 'Admin access required'
        }
    }

    return ctx
}

/**
 * Higher-order function to wrap API route handlers with scope verification
 * 
 * @example
 * export const POST = withScopes(['links:write'], async (request, ctx) => {
 *   // ctx.workspaceId is guaranteed to be present
 *   return NextResponse.json({ success: true })
 * })
 */
export function withScopes(
    requiredScopes: ApiScope[],
    handler: (request: NextRequest, ctx: ApiContext) => Promise<NextResponse>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const ctx = await requireScopes(request, requiredScopes)

        if (!ctx.valid) {
            return NextResponse.json(
                { error: ctx.error },
                { status: ctx.workspaceId ? 403 : 401 }
            )
        }

        return handler(request, ctx)
    }
}
