import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/workspaces/[workspaceId]/partners
 * 
 * List all partners for a workspace (startup program)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { workspaceId } = await params

        // Verify user has access to this workspace
        const workspace = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { owner_id: user.id },
                    { WorkspaceMember: { some: { user_id: user.id } } }
                ]
            }
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Fetch partners with aggregated commission stats
        const partners = await prisma.partner.findMany({
            where: { program_id: workspaceId },
            include: {
                Profile: {
                    select: {
                        bio: true,
                        tiktok_url: true,
                        instagram_url: true,
                        profile_score: true
                    }
                },
                Commissions: {
                    select: {
                        commission_amount: true,
                        status: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Calculate stats for each partner
        const enrichedPartners = partners.map(partner => {
            const totalEarnings = partner.Commissions.reduce(
                (sum, c) => sum + c.commission_amount,
                0
            )
            const conversions = partner.Commissions.length

            return {
                id: partner.id,
                email: partner.email,
                name: partner.name,
                status: partner.status,
                created_at: partner.created_at,
                onboarding_step: partner.onboarding_step,
                stripe_connected: !!partner.stripe_connect_id,
                payouts_enabled: !!partner.payouts_enabled_at,
                profile: partner.Profile,
                totalEarnings,
                conversions
            }
        })

        return NextResponse.json({ partners: enrichedPartners })

    } catch (error) {
        console.error('[API] ❌ Failed to fetch partners:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/workspaces/[workspaceId]/partners/[partnerId]
 * 
 * Update partner status (approve/ban)
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { workspaceId } = await params
        const body = await request.json()
        const { partnerId, status } = body

        // Verify workspace ownership
        const workspace = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                owner_id: user.id // Only owner can approve/ban
            }
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Update partner status
        const partner = await prisma.partner.update({
            where: {
                id: partnerId,
                program_id: workspaceId // Ensure partner belongs to this workspace
            },
            data: { status }
        })

        console.log(`[Partners] ✅ Updated partner ${partnerId} status to ${status}`)

        return NextResponse.json({ partner })

    } catch (error) {
        console.error('[API] ❌ Failed to update partner:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
