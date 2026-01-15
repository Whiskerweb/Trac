import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

/**
 * GET /api/settings/discount
 * Fetch discount settings for current workspace
 */
export async function GET() {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const discount = await prisma.discount.findUnique({
            where: { workspace_id: workspace.workspaceId }
        })

        return NextResponse.json({ discount })
    } catch (error) {
        console.error('[settings/discount] GET error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * POST /api/settings/discount
 * Create or update discount settings
 */
export async function POST(request: NextRequest) {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, type, coupon_id, coupon_test_id, active } = body

        // Validate
        if (typeof amount !== 'number' || amount < 0 || amount > 100) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
        }
        if (!['PERCENTAGE', 'FIXED'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        }

        // Upsert discount
        const discount = await prisma.discount.upsert({
            where: { workspace_id: workspace.workspaceId },
            create: {
                workspace_id: workspace.workspaceId,
                amount,
                type,
                coupon_id: coupon_id || null,
                coupon_test_id: coupon_test_id || null,
                active: active ?? true
            },
            update: {
                amount,
                type,
                coupon_id: coupon_id || null,
                coupon_test_id: coupon_test_id || null,
                active: active ?? true
            }
        })

        return NextResponse.json({ success: true, discount })
    } catch (error) {
        console.error('[settings/discount] POST error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

