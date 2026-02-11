/**
 * Admin User Detail API
 *
 * GET /api/admin/users/[userId] - Get full profile for a single user
 */

import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const { userId } = await params

        // Fetch Supabase auth user via service role (anon key can't access admin API)
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId)

        // Fetch Prisma data in parallel
        const [seller, workspaceMemberships, missions] = await Promise.all([
            prisma.seller.findFirst({
                where: { user_id: userId },
                include: {
                    Profile: true,
                    _count: {
                        select: { Commissions: true }
                    }
                }
            }),
            prisma.workspaceMember.findMany({
                where: { user_id: userId },
                include: {
                    Workspace: {
                        include: {
                            Profile: true,
                            _count: {
                                select: { Mission: true, Seller: true }
                            }
                        }
                    }
                }
            }),
            // Missions created by this user's workspaces
            prisma.mission.findMany({
                where: {
                    Workspace: {
                        WorkspaceMember: { some: { user_id: userId } }
                    }
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    reward: true,
                    visibility: true,
                    created_at: true,
                    _count: { select: { MissionEnrollment: true } }
                },
                orderBy: { created_at: 'desc' },
                take: 20,
            }),
        ])

        // Fetch balance separately (standalone model, not a Seller relation)
        const sellerBalance = seller
            ? await prisma.sellerBalance.findUnique({ where: { seller_id: seller.id } })
            : null

        // Build response
        const profile = {
            // Auth info
            userId,
            email: authUser?.email || seller?.email || null,
            name: authUser?.user_metadata?.full_name || seller?.name || null,
            avatarUrl: authUser?.user_metadata?.avatar_url || null,
            provider: authUser?.app_metadata?.provider || 'email',
            createdAt: authUser?.created_at || null,
            lastSignIn: authUser?.last_sign_in_at || null,
            emailConfirmed: authUser?.email_confirmed_at || null,

            // Role
            role: seller && workspaceMemberships.length > 0 ? 'BOTH'
                : seller ? 'SELLER'
                : workspaceMemberships.length > 0 ? 'STARTUP'
                : 'NO_ROLE',

            // Seller info
            seller: seller ? {
                id: seller.id,
                status: seller.status,
                payoutMethod: seller.payout_method,
                stripeConnectId: seller.stripe_connect_id,
                onboardingStep: seller.onboarding_step,
                totalCommissions: seller._count.Commissions,
                balance: sellerBalance ? {
                    balance: sellerBalance.balance,
                    pending: sellerBalance.pending,
                    due: sellerBalance.due,
                    paidTotal: sellerBalance.paid_total,
                } : null,
                profile: seller.Profile ? {
                    bio: seller.Profile.bio,
                    country: seller.Profile.country,
                    profileType: seller.Profile.profile_type,
                    website: seller.Profile.website_url,
                    twitter: seller.Profile.twitter_url,
                    instagram: seller.Profile.instagram_url,
                    tiktok: seller.Profile.tiktok_url,
                    youtube: seller.Profile.youtube_url,
                    linkedin: seller.Profile.linkedin_url,
                    avatarUrl: seller.Profile.avatar_url,
                } : null,
            } : null,

            // Startup info
            workspaces: workspaceMemberships.map(wm => ({
                id: wm.Workspace.id,
                name: wm.Workspace.name,
                slug: wm.Workspace.slug,
                role: wm.role,
                joinedAt: wm.created_at.toISOString(),
                missionsCount: wm.Workspace._count.Mission,
                sellersCount: wm.Workspace._count.Seller,
                profile: wm.Workspace.Profile ? {
                    description: wm.Workspace.Profile.description,
                    logoUrl: wm.Workspace.Profile.logo_url,
                    website: wm.Workspace.Profile.website_url,
                    industry: wm.Workspace.Profile.industry,
                    companySize: wm.Workspace.Profile.company_size,
                    foundedYear: wm.Workspace.Profile.founded_year,
                    headquarters: wm.Workspace.Profile.headquarters,
                } : null,
            })),

            // Missions (for startups)
            missions: missions.map(m => ({
                id: m.id,
                title: m.title,
                status: m.status,
                reward: m.reward,
                visibility: m.visibility,
                createdAt: m.created_at.toISOString(),
                enrollments: m._count.MissionEnrollment,
            })),
        }

        return NextResponse.json({ success: true, profile })

    } catch (error) {
        console.error('[AdminUserDetail] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
