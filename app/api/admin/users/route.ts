/**
 * Admin Users API
 *
 * GET /api/admin/users - List all platform users with their role (seller/startup/both/none)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { isAdmin } from '@/lib/admin'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!isAdmin(user.email)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Get all sellers and workspace members from Prisma
        const [sellers, workspaceMembers, sellerCount, startupCount] = await Promise.all([
            prisma.seller.findMany({
                where: { user_id: { not: null } },
                select: {
                    id: true,
                    user_id: true,
                    email: true,
                    name: true,
                    status: true,
                    payout_method: true,
                    created_at: true,
                }
            }),
            prisma.workspaceMember.findMany({
                select: {
                    user_id: true,
                    created_at: true,
                    Workspace: {
                        select: { id: true, name: true, slug: true }
                    }
                }
            }),
            prisma.seller.count({ where: { user_id: { not: null } } }),
            prisma.workspaceMember.groupBy({
                by: ['user_id'],
                _count: true,
            }),
        ])

        // Build user map: userId -> { seller info, workspace info }
        const userMap = new Map<string, {
            userId: string
            email: string
            name: string | null
            role: 'SELLER' | 'STARTUP' | 'BOTH' | 'NO_ROLE'
            sellerStatus: string | null
            sellerPayoutMethod: string | null
            workspaceName: string | null
            workspaceSlug: string | null
            createdAt: string
        }>()

        // Add sellers
        for (const s of sellers) {
            if (!s.user_id) continue
            userMap.set(s.user_id, {
                userId: s.user_id,
                email: s.email,
                name: s.name,
                role: 'SELLER',
                sellerStatus: s.status,
                sellerPayoutMethod: s.payout_method,
                workspaceName: null,
                workspaceSlug: null,
                createdAt: s.created_at.toISOString(),
            })
        }

        // Add workspace members (startups)
        for (const wm of workspaceMembers) {
            const existing = userMap.get(wm.user_id)
            if (existing) {
                // User is both seller and startup
                existing.role = 'BOTH'
                existing.workspaceName = wm.Workspace.name
                existing.workspaceSlug = wm.Workspace.slug
            } else {
                userMap.set(wm.user_id, {
                    userId: wm.user_id,
                    email: '', // will be filled from Supabase if needed
                    name: null,
                    role: 'STARTUP',
                    sellerStatus: null,
                    sellerPayoutMethod: null,
                    workspaceName: wm.Workspace.name,
                    workspaceSlug: wm.Workspace.slug,
                    createdAt: wm.created_at.toISOString(),
                })
            }
        }

        // Get emails for startup-only users from Supabase
        const startupOnlyUserIds = Array.from(userMap.values())
            .filter(u => u.role === 'STARTUP' && !u.email)
            .map(u => u.userId)

        if (startupOnlyUserIds.length > 0) {
            // Fetch from Supabase admin — batch by querying user metadata
            // Since we don't have admin API in server action, use workspace owner email as fallback
            const workspacesWithOwners = await prisma.workspace.findMany({
                where: { owner_id: { in: startupOnlyUserIds } },
                select: { owner_id: true, name: true }
            })

            // Try getting emails from any seller record that might reference same email
            // Otherwise, show workspace name as identifier
            for (const ws of workspacesWithOwners) {
                const u = userMap.get(ws.owner_id)
                if (u && !u.email) {
                    u.name = u.name || ws.name
                }
            }
        }

        // Fetch emails for startup users via Supabase auth admin (requires service role key)
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        const { data: { users: supabaseUsers } } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000,
        })

        if (supabaseUsers) {
            for (const su of supabaseUsers) {
                const u = userMap.get(su.id)
                if (u) {
                    if (!u.email && su.email) u.email = su.email
                    if (!u.name && su.user_metadata?.full_name) u.name = su.user_metadata.full_name
                    if (!u.createdAt || u.role === 'STARTUP') u.createdAt = su.created_at
                }

                // Users with Supabase account but no Prisma records
                if (!u && su.email) {
                    userMap.set(su.id, {
                        userId: su.id,
                        email: su.email,
                        name: su.user_metadata?.full_name || null,
                        role: 'NO_ROLE',
                        sellerStatus: null,
                        sellerPayoutMethod: null,
                        workspaceName: null,
                        workspaceSlug: null,
                        createdAt: su.created_at,
                    })
                }
            }
        }

        const users = Array.from(userMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Summary
        const summary = {
            total: users.length,
            sellers: users.filter(u => u.role === 'SELLER' || u.role === 'BOTH').length,
            startups: users.filter(u => u.role === 'STARTUP' || u.role === 'BOTH').length,
            both: users.filter(u => u.role === 'BOTH').length,
            noRole: users.filter(u => u.role === 'NO_ROLE').length,
        }

        return NextResponse.json({ success: true, users, summary })

    } catch (error) {
        console.error('[AdminUsers] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export const dynamic = 'force-dynamic'
