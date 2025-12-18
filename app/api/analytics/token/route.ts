import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Tinybird configuration
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'

// Hardcoded workspace for this sprint (will be dynamic from auth later)
const DEV_WORKSPACE_ID = 'ws_dev_001'

/**
 * Generate a scoped JWT token for Tinybird API access
 * POST /api/analytics/token
 * 
 * Creates a signed JWT that restricts access to a specific workspace.
 * Uses the Tinybird Admin Token as the signing secret (HS256).
 */
export async function POST() {
    // IMPORTANT: Trim the token to remove any invisible whitespace
    const adminToken = process.env.TINYBIRD_ADMIN_TOKEN?.trim()

    if (!adminToken) {
        console.error('[Analytics Token] ❌ Missing TINYBIRD_ADMIN_TOKEN')
        return NextResponse.json(
            { error: 'Server configuration error: missing admin token' },
            { status: 500 }
        )
    }

    console.log('[Analytics Token] 🔑 Admin token loaded:', adminToken.slice(0, 15) + '...')

    try {
        // Extract workspace_id from the admin token to include in our JWT
        // The admin token is itself a JWT - we need to decode it to get the workspace info
        const decodedAdmin = jwt.decode(adminToken) as { u?: string; id?: string; host?: string } | null
        console.log('[Analytics Token] 📦 Decoded admin token:', JSON.stringify(decodedAdmin))

        // JWT payload - Tinybird expects workspace_id at root level
        const payload = {
            // User ID from admin token
            u: decodedAdmin?.u,
            // Workspace/Token ID
            id: decodedAdmin?.id,
            // Host
            host: decodedAdmin?.host,
            // Scopes for read access
            scopes: [
                { type: 'PIPES:READ', resource: 'kpis' },
                { type: 'PIPES:READ', resource: 'link_stats' },
            ],
            // Workspace ID at root level (required by Tinybird)
            workspace_id: DEV_WORKSPACE_ID,
            // Issued at
            iat: Math.floor(Date.now() / 1000),
            // Expires in 1 hour
            exp: Math.floor(Date.now() / 1000) + 3600,
        }

        console.log('[Analytics Token] 📦 JWT Payload:', JSON.stringify(payload))

        // Sign the JWT with the admin token as secret (HS256)
        const signedToken = jwt.sign(payload, adminToken, {
            algorithm: 'HS256',
        })

        console.log('[Analytics Token] 🔐 Signed token:', signedToken.slice(0, 50) + '...')

        // ========================================
        // AUTO-DIAGNOSTIC: Test the token immediately
        // ========================================
        const testUrl = `${TINYBIRD_HOST}/v0/pipes/kpis.json?token=${signedToken}`
        console.log('[Analytics Token] 🧪 Testing token...')

        try {
            const testResponse = await fetch(testUrl)

            if (testResponse.ok) {
                console.log('[Analytics Token] ✅ TOKEN VALIDE!')
            } else {
                const errorText = await testResponse.text()
                console.error('[Analytics Token] 🚨 Status:', testResponse.status)
                console.error('[Analytics Token] 🚨 Error:', errorText)

                return NextResponse.json(
                    {
                        error: 'Token validation failed',
                        status: testResponse.status,
                        details: errorText,
                    },
                    { status: 500 }
                )
            }
        } catch (testError) {
            console.error('[Analytics Token] ⚠️ Test failed:', testError)
        }

        return NextResponse.json({
            token: signedToken,
            workspace_id: DEV_WORKSPACE_ID,
            expires_in: 3600,
        })

    } catch (error) {
        console.error('[Analytics Token] ❌ Error:', error)
        return NextResponse.json(
            { error: 'Failed to generate token', details: String(error) },
            { status: 500 }
        )
    }
}

export async function GET() {
    return POST()
}
