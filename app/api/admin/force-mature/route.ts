/**
 * Admin: Force Mature Commission
 *
 * POST /api/admin/force-mature
 * Body: { commissionId: string } or { sellerId: string } (mature all for seller)
 *
 * DEV/TEST ONLY - Forces PENDING commissions to PROCEED status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { updateSellerBalance } from '@/lib/commission/engine'

export async function POST(request: NextRequest) {
    try {
        // Auth check - must be logged in
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is a startup owner (has workspace)
        const workspaceMember = await prisma.workspaceMember.findFirst({
            where: { user_id: user.id, role: 'OWNER' }
        })

        if (!workspaceMember) {
            return NextResponse.json({ error: 'Not a workspace owner' }, { status: 403 })
        }

        const body = await request.json()
        const { commissionId, sellerId } = body

        const now = new Date()
        let matured = 0

        if (commissionId) {
            // Mature specific commission
            const commission = await prisma.commission.findUnique({
                where: { id: commissionId }
            })

            if (!commission) {
                return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
            }

            if (commission.status !== 'PENDING') {
                return NextResponse.json({
                    error: `Commission is not PENDING (current: ${commission.status})`
                }, { status: 400 })
            }

            // Verify commission belongs to workspace
            if (commission.program_id !== workspaceMember.workspace_id) {
                return NextResponse.json({ error: 'Commission not in your workspace' }, { status: 403 })
            }

            await prisma.commission.update({
                where: { id: commissionId },
                data: {
                    status: 'PROCEED',
                    matured_at: now
                }
            })

            await updateSellerBalance(commission.seller_id)
            matured = 1

        } else if (sellerId) {
            // Mature all PENDING commissions for a seller in this workspace
            const commissions = await prisma.commission.findMany({
                where: {
                    seller_id: sellerId,
                    program_id: workspaceMember.workspace_id,
                    status: 'PENDING'
                }
            })

            for (const commission of commissions) {
                await prisma.commission.update({
                    where: { id: commission.id },
                    data: {
                        status: 'PROCEED',
                        matured_at: now
                    }
                })
                matured++
            }

            if (matured > 0) {
                await updateSellerBalance(sellerId)
            }
        } else {
            return NextResponse.json({
                error: 'Provide commissionId or sellerId'
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            matured,
            message: `${matured} commission(s) matured to PROCEED`
        })

    } catch (error) {
        console.error('[Admin/ForceMature] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
