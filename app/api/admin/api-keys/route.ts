import { NextRequest, NextResponse } from 'next/server'
import { createApiKeyPair, getWorkspaceApiKeys } from '@/lib/api-keys'
import { createClient } from '@/utils/supabase/server'

/**
 * Admin endpoint to manage API keys
 * GET - List keys for a workspace
 * POST - Create a new key pair
 */

const ADMIN_EMAIL = 'lucas.roncey@gmail.com'

async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user || user.email !== ADMIN_EMAIL) {
        return null
    }
    return user
}

export async function GET(request: NextRequest) {
    const user = await checkAdmin()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    const keys = await getWorkspaceApiKeys(workspaceId)
    return NextResponse.json({ keys })
}

export async function POST(request: NextRequest) {
    const user = await checkAdmin()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, name } = await request.json()

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    try {
        const result = await createApiKeyPair(workspaceId, name || 'Production Key')

        return NextResponse.json({
            success: true,
            publicKey: result.publicKey,
            secretKey: result.secretKey, // Only shown once!
            apiKeyId: result.apiKeyId
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
