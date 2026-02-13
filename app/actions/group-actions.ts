'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'

// =============================================
// SELLER GROUP SERVER ACTIONS
// =============================================

// ---- Helpers ----

async function getSellerForCurrentUser() {
    const user = await getCurrentUser()
    if (!user) return null
    const seller = await prisma.seller.findFirst({
        where: { user_id: user.userId, status: 'APPROVED' }
    })
    return seller
}

// =============================================
// HELPER: Deactivate group enrollments on leave/remove
// =============================================

async function deactivateGroupEnrollments(userId: string, groupId: string) {
    try {
        // Find all GroupMissions for this group
        const groupMissions = await prisma.groupMission.findMany({
            where: { group_id: groupId },
            select: { id: true }
        })

        if (groupMissions.length === 0) return

        const groupMissionIds = groupMissions.map(gm => gm.id)

        // Find APPROVED enrollments for this user linked to these group missions
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: userId,
                group_mission_id: { in: groupMissionIds },
                status: 'APPROVED'
            },
            include: { ShortLink: true }
        })

        if (enrollments.length === 0) return

        // Archive enrollments
        await prisma.missionEnrollment.updateMany({
            where: { id: { in: enrollments.map(e => e.id) } },
            data: { status: 'ARCHIVED' }
        })

        // Delete from Redis to stop tracking immediately
        const { deleteLinkFromRedis } = await import('@/lib/redis')
        for (const enrollment of enrollments) {
            if (enrollment.ShortLink?.slug) {
                await deleteLinkFromRedis(enrollment.ShortLink.slug)
            }
        }

        console.log(`[Group] Archived ${enrollments.length} group enrollments for user ${userId} in group ${groupId}`)
    } catch (error) {
        console.error(`[Group] Failed to deactivate enrollments for user ${userId}:`, error)
    }
}

// =============================================
// GET MY GROUP
// =============================================

export async function getMyGroup() {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Check if seller is in a group
        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: {
                Group: {
                    include: {
                        Members: {
                            where: { status: 'ACTIVE' },
                            include: {
                                Seller: {
                                    select: { id: true, name: true, email: true, Profile: { select: { avatar_url: true } } }
                                }
                            },
                            orderBy: { joined_at: 'asc' }
                        },
                        Missions: {
                            include: {
                                Mission: {
                                    select: { id: true, title: true, company_name: true, logo_url: true, reward: true, status: true }
                                }
                            }
                        },
                        _count: { select: { Members: { where: { status: 'ACTIVE' } } } }
                    }
                }
            }
        })

        if (!membership || membership.status === 'REMOVED') {
            return { success: true, group: null, sellerId: seller.id }
        }

        return {
            success: true,
            group: membership.Group,
            isCreator: membership.Group.creator_id === seller.id,
            sellerId: seller.id,
        }
    } catch (error) {
        console.error('[Group] Failed to get group:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// CREATE GROUP
// =============================================

export async function createGroup(params: {
    name: string
    description?: string
}): Promise<{ success: boolean; groupId?: string; inviteCode?: string; error?: string }> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Stripe Connect required to receive group commissions
        if (!seller.stripe_connect_id || !seller.payouts_enabled_at) {
            return { success: false, error: 'stripe_required' }
        }

        // Check if already in a group
        const existingMembership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id }
        })
        if (existingMembership && existingMembership.status === 'ACTIVE') {
            return { success: false, error: 'You are already in a group' }
        }

        const inviteCode = nanoid(8)

        // Create group + membership in transaction
        const group = await prisma.$transaction(async (tx) => {
            // Remove stale REMOVED membership if exists
            if (existingMembership) {
                await tx.sellerGroupMember.delete({ where: { id: existingMembership.id } })
            }

            const g = await tx.sellerGroup.create({
                data: {
                    name: params.name.trim(),
                    description: params.description?.trim() || null,
                    creator_id: seller.id,
                    invite_code: inviteCode,
                    status: 'ACTIVE',
                }
            })

            await tx.sellerGroupMember.create({
                data: {
                    group_id: g.id,
                    seller_id: seller.id,
                    status: 'ACTIVE',
                }
            })

            return g
        })

        revalidatePath('/seller/groups')
        return { success: true, groupId: group.id, inviteCode }

    } catch (error) {
        console.error('[Group] Failed to create group:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// JOIN GROUP VIA INVITE CODE
// =============================================

export async function joinGroup(inviteCode: string): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Check if already in a group
        const existingMembership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id }
        })
        if (existingMembership && existingMembership.status === 'ACTIVE') {
            return { success: false, error: 'You are already in a group. Leave your current group first.' }
        }

        // Find group by invite code
        const group = await prisma.sellerGroup.findUnique({
            where: { invite_code: inviteCode },
            include: { _count: { select: { Members: { where: { status: 'ACTIVE' } } } } }
        })

        if (!group) return { success: false, error: 'Invalid invite code' }
        if (group.status !== 'ACTIVE') return { success: false, error: 'This group is no longer active' }
        if (group._count.Members >= group.max_members) return { success: false, error: 'Group is full' }

        await prisma.$transaction(async (tx) => {
            // Remove stale REMOVED membership if exists
            if (existingMembership) {
                await tx.sellerGroupMember.delete({ where: { id: existingMembership.id } })
            }

            // Create membership
            await tx.sellerGroupMember.create({
                data: {
                    group_id: group.id,
                    seller_id: seller.id,
                    status: 'ACTIVE',
                }
            })
        })

        // Auto-enroll in all existing group missions
        const groupMissions = await prisma.groupMission.findMany({
            where: { group_id: group.id },
            include: { Mission: true }
        })

        const user = await getCurrentUser()
        if (user) {
            for (const gm of groupMissions) {
                await enrollSellerInGroupMission(seller, user.userId, gm)
            }
        }

        revalidatePath('/seller/groups')
        return { success: true, groupId: group.id }

    } catch (error) {
        console.error('[Group] Failed to join group:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// LEAVE GROUP
// =============================================

export async function leaveGroup(): Promise<{ success: boolean; error?: string }> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: { Group: true }
        })

        if (!membership || membership.status !== 'ACTIVE') {
            return { success: false, error: 'Not in a group' }
        }

        const isCreator = membership.Group.creator_id === seller.id
        const groupId = membership.Group.id

        await prisma.$transaction(async (tx) => {
            // Mark member as REMOVED
            await tx.sellerGroupMember.update({
                where: { id: membership.id },
                data: { status: 'REMOVED' }
            })

            // If creator leaves → archive the group
            if (isCreator) {
                await tx.sellerGroup.update({
                    where: { id: groupId },
                    data: { status: 'ARCHIVED' }
                })
                console.log(`[Group] Creator ${seller.id} left → group ${groupId} archived`)
            }
        })

        // Deactivate group enrollments for the leaving seller
        await deactivateGroupEnrollments(seller.user_id!, groupId)

        // If creator left (group archived), deactivate ALL remaining active members' enrollments
        if (isCreator) {
            const remainingMembers = await prisma.sellerGroupMember.findMany({
                where: { group_id: groupId, status: 'ACTIVE' },
                include: { Seller: { select: { user_id: true } } }
            })
            for (const member of remainingMembers) {
                if (member.Seller.user_id) {
                    await deactivateGroupEnrollments(member.Seller.user_id, groupId)
                }
            }
        }

        revalidatePath('/seller/groups')
        revalidatePath('/seller')
        return { success: true }

    } catch (error) {
        console.error('[Group] Failed to leave group:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// REMOVE MEMBER (Creator only)
// =============================================

export async function removeGroupMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Find the membership to remove
        const targetMembership = await prisma.sellerGroupMember.findFirst({
            where: { seller_id: memberId, status: 'ACTIVE' },
            include: { Group: true }
        })

        if (!targetMembership) return { success: false, error: 'Member not found' }

        // Only creator can remove members
        if (targetMembership.Group.creator_id !== seller.id) {
            return { success: false, error: 'Only the group creator can remove members' }
        }

        // Cannot remove yourself (use leaveGroup instead)
        if (memberId === seller.id) {
            return { success: false, error: 'Use "Leave Group" to leave' }
        }

        await prisma.sellerGroupMember.update({
            where: { id: targetMembership.id },
            data: { status: 'REMOVED' }
        })

        // Deactivate group enrollments for the removed member
        const removedSeller = await prisma.seller.findFirst({
            where: { id: memberId },
            select: { user_id: true }
        })
        if (removedSeller?.user_id) {
            await deactivateGroupEnrollments(removedSeller.user_id, targetMembership.Group.id)
        }

        revalidatePath('/seller/groups')
        revalidatePath('/seller')
        return { success: true }

    } catch (error) {
        console.error('[Group] Failed to remove member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// ENROLL GROUP IN MISSION
// =============================================

export async function enrollGroupInMission(missionId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Verify seller is in an active group
        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: {
                Group: {
                    include: {
                        Members: { where: { status: 'ACTIVE' }, include: { Seller: true } }
                    }
                }
            }
        })

        if (!membership || membership.status !== 'ACTIVE' || membership.Group.status !== 'ACTIVE') {
            return { success: false, error: 'Not in an active group' }
        }

        const group = membership.Group

        // Only the group creator can enroll the group in missions
        if (group.creator_id !== seller.id) {
            return { success: false, error: 'Only the group creator can enroll the group in missions' }
        }

        // Verify mission exists and is active (visibility doesn't matter — creator is already approved solo)
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, status: 'ACTIVE' }
        })
        if (!mission) return { success: false, error: 'Mission not found or inactive' }

        // Check if group already enrolled in this mission
        const existingGroupMission = await prisma.groupMission.findUnique({
            where: { group_id_mission_id: { group_id: group.id, mission_id: missionId } }
        })
        if (existingGroupMission) return { success: false, error: 'Group already enrolled in this mission' }

        // Create GroupMission
        const groupMission = await prisma.groupMission.create({
            data: {
                group_id: group.id,
                mission_id: missionId,
                enrolled_by: seller.id,
            },
            include: { Mission: true }
        })

        // Enroll all active members
        for (const member of group.Members) {
            const memberUserId = member.Seller.user_id
            if (!memberUserId) continue

            await enrollSellerInGroupMission(member.Seller, memberUserId, groupMission)
        }

        revalidatePath('/seller/groups')
        revalidatePath('/seller/marketplace')
        return { success: true }

    } catch (error) {
        console.error('[Group] Failed to enroll group in mission:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// GET GROUP DETAIL
// =============================================

export async function getGroupDetail(groupId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const group = await prisma.sellerGroup.findUnique({
            where: { id: groupId },
            include: {
                Members: {
                    where: { status: 'ACTIVE' },
                    include: {
                        Seller: {
                            select: { id: true, name: true, email: true },
                            include: { Profile: { select: { avatar_url: true } } }
                        }
                    },
                    orderBy: { joined_at: 'asc' }
                },
                Missions: {
                    include: {
                        Mission: {
                            select: { id: true, title: true, company_name: true, logo_url: true, reward: true, status: true }
                        }
                    }
                },
                _count: { select: { Members: { where: { status: 'ACTIVE' } } } }
            }
        })

        if (!group) return { success: false, error: 'Group not found' }

        // Verify caller is a member
        const isMember = group.Members.some(m => m.Seller.id === seller.id)
        if (!isMember) return { success: false, error: 'Not a member of this group' }

        return {
            success: true,
            group,
            isCreator: group.creator_id === seller.id,
            sellerId: seller.id,
        }
    } catch (error) {
        console.error('[Group] Failed to get group detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// HELPER: Enroll a single seller in a group mission
// =============================================

async function enrollSellerInGroupMission(
    seller: { id: string; user_id: string | null },
    userId: string,
    groupMission: { id: string; mission_id: string; Mission: { workspace_id: string; target_url: string; title: string } }
) {
    try {
        // Check if already enrolled in this mission VIA THIS GROUP (solo enrollment is OK)
        const existing = await prisma.missionEnrollment.findFirst({
            where: { mission_id: groupMission.mission_id, user_id: userId, group_mission_id: groupMission.id }
        })
        if (existing && existing.status === 'ARCHIVED') {
            // Try to reuse old ShortLink to preserve Tinybird history (clicks/leads/sales)
            if (existing.link_id) {
                const oldLink = await prisma.shortLink.findUnique({
                    where: { id: existing.link_id }
                })
                if (oldLink) {
                    // Re-add old link to Redis and reactivate enrollment with same link_id
                    const verifiedDomainOld = await prisma.domain.findFirst({
                        where: { workspace_id: groupMission.Mission.workspace_id, verified: true }
                    })
                    const { setLinkInRedis } = await import('@/lib/redis')
                    await setLinkInRedis(oldLink.slug, {
                        url: oldLink.original_url,
                        linkId: oldLink.id,
                        workspaceId: oldLink.workspace_id,
                        sellerId: oldLink.affiliate_id,
                    }, verifiedDomainOld?.name || undefined)

                    await prisma.missionEnrollment.update({
                        where: { id: existing.id },
                        data: { status: 'APPROVED' }
                    })

                    console.log(`[Group] ♻️ Reactivated ARCHIVED group enrollment for seller ${seller.id} in mission ${groupMission.mission_id} (reused old ShortLink)`)
                    return
                }
            }

            // Fallback: old ShortLink was deleted, create a new one
            const verifiedDomainReactivate = await prisma.domain.findFirst({
                where: { workspace_id: groupMission.Mission.workspace_id, verified: true }
            })
            const customDomainReactivate = verifiedDomainReactivate?.name || null

            const missionSlugReactivate = groupMission.Mission.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 20)
            const affiliateCodeReactivate = userId.slice(0, 8)
            let fullSlugReactivate = `${missionSlugReactivate}/${affiliateCodeReactivate}-g`

            let shortLinkReactivate
            try {
                shortLinkReactivate = await prisma.shortLink.create({
                    data: {
                        slug: fullSlugReactivate,
                        original_url: groupMission.Mission.target_url,
                        workspace_id: groupMission.Mission.workspace_id,
                        affiliate_id: userId,
                        clicks: 0,
                    }
                })
            } catch (slugError: any) {
                if (slugError?.code === 'P2002') {
                    fullSlugReactivate = `${missionSlugReactivate}/${affiliateCodeReactivate}-g-${nanoid(4)}`
                    shortLinkReactivate = await prisma.shortLink.create({
                        data: {
                            slug: fullSlugReactivate,
                            original_url: groupMission.Mission.target_url,
                            workspace_id: groupMission.Mission.workspace_id,
                            affiliate_id: userId,
                            clicks: 0,
                        }
                    })
                } else {
                    throw slugError
                }
            }

            const { setLinkInRedis: setLinkInRedisFallback } = await import('@/lib/redis')
            await setLinkInRedisFallback(shortLinkReactivate.slug, {
                url: shortLinkReactivate.original_url,
                linkId: shortLinkReactivate.id,
                workspaceId: shortLinkReactivate.workspace_id,
                sellerId: shortLinkReactivate.affiliate_id,
            }, customDomainReactivate || undefined)

            await prisma.missionEnrollment.update({
                where: { id: existing.id },
                data: { status: 'APPROVED', link_id: shortLinkReactivate.id }
            })

            console.log(`[Group] ♻️ Reactivated ARCHIVED group enrollment for seller ${seller.id} in mission ${groupMission.mission_id} (new ShortLink)`)
            return
        }
        if (existing) {
            console.log(`[Group] Seller ${seller.id} already enrolled in mission ${groupMission.mission_id} via group, skipping`)
            return
        }

        // Generate slug with -g suffix to differentiate from solo link
        const missionSlug = groupMission.Mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = userId.slice(0, 8)
        let fullSlug = `${missionSlug}/${affiliateCode}-g`

        // Check for custom domain
        const verifiedDomain = await prisma.domain.findFirst({
            where: { workspace_id: groupMission.Mission.workspace_id, verified: true }
        })
        const customDomain = verifiedDomain?.name || null

        // Create ShortLink (handle slug collision with nanoid fallback)
        let shortLink
        try {
            shortLink = await prisma.shortLink.create({
                data: {
                    slug: fullSlug,
                    original_url: groupMission.Mission.target_url,
                    workspace_id: groupMission.Mission.workspace_id,
                    affiliate_id: userId,
                    clicks: 0,
                }
            })
        } catch (slugError: any) {
            if (slugError?.code === 'P2002') {
                // Slug collision — append nanoid
                fullSlug = `${missionSlug}/${affiliateCode}-g-${nanoid(4)}`
                shortLink = await prisma.shortLink.create({
                    data: {
                        slug: fullSlug,
                        original_url: groupMission.Mission.target_url,
                        workspace_id: groupMission.Mission.workspace_id,
                        affiliate_id: userId,
                        clicks: 0,
                    }
                })
            } else {
                throw slugError
            }
        }

        // Set in Redis
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            sellerId: shortLink.affiliate_id,
        }, customDomain || undefined)

        // Create enrollment
        await prisma.missionEnrollment.create({
            data: {
                mission_id: groupMission.mission_id,
                user_id: userId,
                status: 'APPROVED',
                link_id: shortLink.id,
                group_mission_id: groupMission.id,
            }
        })

        console.log(`[Group] ✅ Enrolled seller ${seller.id} in mission ${groupMission.mission_id} (group)`)
    } catch (error) {
        console.error(`[Group] ❌ Failed to enroll seller ${seller.id}:`, error)
    }
}

// =============================================
// GET GROUP STATS
// =============================================

type MemberMissionStats = {
    missionId: string
    missionTitle: string
    revenue: number
    salesCount: number
    leadsCount: number
}

type GroupMemberStats = {
    sellerId: string
    name: string
    avatarUrl: string | null
    isCreator: boolean
    totalRevenue: number
    salesCount: number
    leadsCount: number
    byMission: MemberMissionStats[]
}

type MissionMemberBreakdown = {
    sellerId: string
    name: string
    avatarUrl: string | null
    revenue: number
    salesCount: number
    leadsCount: number
    clicks: number
}

type GroupMissionStats = {
    missionId: string
    missionTitle: string
    companyName: string | null
    logoUrl: string | null
    reward: string | null
    totalRevenue: number
    totalSales: number
    totalLeads: number
    clicks: number
    tinybirdLeads: number
    tinybirdSales: number
    tinybirdRevenue: number
    memberBreakdown: MissionMemberBreakdown[]
}

export type GroupStats = {
    totalRevenue: number
    totalSales: number
    totalLeads: number
    members: GroupMemberStats[]
    missions: GroupMissionStats[]
}

export async function getGroupStats(): Promise<{
    success: boolean
    stats?: GroupStats
    error?: string
}> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Check membership
        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: {
                Group: {
                    include: {
                        Members: {
                            where: { status: 'ACTIVE' },
                            include: {
                                Seller: {
                                    select: {
                                        id: true, user_id: true, name: true, email: true,
                                        Profile: { select: { avatar_url: true } }
                                    }
                                }
                            }
                        },
                        Missions: {
                            include: {
                                Mission: {
                                    select: { id: true, title: true, company_name: true, logo_url: true, reward: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!membership || membership.status === 'REMOVED') {
            return { success: false, error: 'Not in a group' }
        }

        const group = membership.Group
        const groupId = group.id

        // Fetch all group commissions (exclude referral cuts and org leader cuts)
        const commissions = await prisma.commission.findMany({
            where: {
                group_id: groupId,
                referral_generation: null,
                org_parent_commission_id: null,
            },
            select: {
                id: true,
                link_id: true,
                program_id: true,
                commission_amount: true,
                commission_source: true,
            }
        })

        // Batch-lookup ShortLinks to resolve link_id → affiliate_id
        const linkIds = [...new Set(commissions.map(c => c.link_id).filter(Boolean))] as string[]
        const shortLinks = linkIds.length > 0
            ? await prisma.shortLink.findMany({
                where: { id: { in: linkIds } },
                select: { id: true, affiliate_id: true }
            })
            : []

        const linkToAffiliate = new Map(shortLinks.map(sl => [sl.id, sl.affiliate_id]))

        // Build member map: user_id → member info
        const membersByUserId = new Map(
            group.Members.map(m => [m.Seller.user_id, {
                sellerId: m.Seller.id,
                name: m.Seller.name || m.Seller.email || '',
                avatarUrl: m.Seller.Profile?.avatar_url || null,
                isCreator: m.seller_id === group.creator_id,
            }])
        )

        // Find creator user_id for fallback
        const creatorMember = group.Members.find(m => m.seller_id === group.creator_id)
        const creatorUserId = creatorMember?.Seller.user_id || null

        // Build mission map from group missions
        const missionMap = new Map(
            group.Missions.map(gm => [gm.Mission.id, {
                missionId: gm.Mission.id,
                missionTitle: gm.Mission.title,
                companyName: gm.Mission.company_name,
                logoUrl: gm.Mission.logo_url,
                reward: gm.Mission.reward,
            }])
        )

        // Aggregate by member and mission
        // memberAgg: userId → { total, sales, leads, byMission: missionId → { revenue, sales, leads } }
        const memberAgg = new Map<string, { total: number; sales: number; leads: number; byMission: Map<string, { revenue: number; sales: number; leads: number }> }>()
        // missionAgg: missionId → { total, sales, leads, byMember: userId → { revenue, sales, leads } }
        const missionAgg = new Map<string, { total: number; sales: number; leads: number; byMember: Map<string, { revenue: number; sales: number; leads: number }> }>()

        for (const c of commissions) {
            // Resolve which member generated this commission
            let affiliateUserId: string | null = null
            if (c.link_id) {
                affiliateUserId = linkToAffiliate.get(c.link_id) || null
            }
            // Fallback: attribute to creator
            if (!affiliateUserId) {
                affiliateUserId = creatorUserId
            }
            if (!affiliateUserId) continue

            const isLead = c.commission_source === 'LEAD'
            const isSaleOrRecurring = c.commission_source === 'SALE' || c.commission_source === 'RECURRING'

            // Member aggregation
            if (!memberAgg.has(affiliateUserId)) {
                memberAgg.set(affiliateUserId, { total: 0, sales: 0, leads: 0, byMission: new Map() })
            }
            const ma = memberAgg.get(affiliateUserId)!
            ma.total += c.commission_amount
            if (isLead) ma.leads++
            if (isSaleOrRecurring) ma.sales++

            // Per-mission within member
            if (!ma.byMission.has(c.program_id)) {
                ma.byMission.set(c.program_id, { revenue: 0, sales: 0, leads: 0 })
            }
            const mmAgg = ma.byMission.get(c.program_id)!
            mmAgg.revenue += c.commission_amount
            if (isLead) mmAgg.leads++
            if (isSaleOrRecurring) mmAgg.sales++

            // Mission aggregation
            if (!missionAgg.has(c.program_id)) {
                missionAgg.set(c.program_id, { total: 0, sales: 0, leads: 0, byMember: new Map() })
            }
            const mAgg = missionAgg.get(c.program_id)!
            mAgg.total += c.commission_amount
            if (isLead) mAgg.leads++
            if (isSaleOrRecurring) mAgg.sales++

            // Per-member within mission
            if (!mAgg.byMember.has(affiliateUserId)) {
                mAgg.byMember.set(affiliateUserId, { revenue: 0, sales: 0, leads: 0 })
            }
            const mbAgg = mAgg.byMember.get(affiliateUserId)!
            mbAgg.revenue += c.commission_amount
            if (isLead) mbAgg.leads++
            if (isSaleOrRecurring) mbAgg.sales++
        }

        // Build member stats (all active members, even those with 0 commissions)
        const members: GroupMemberStats[] = []
        for (const m of group.Members) {
            const userId = m.Seller.user_id
            if (!userId) continue
            const agg = memberAgg.get(userId)
            const info = membersByUserId.get(userId)!

            const byMission: MemberMissionStats[] = []
            if (agg) {
                for (const [missionId, mStats] of agg.byMission) {
                    const mInfo = missionMap.get(missionId)
                    byMission.push({
                        missionId,
                        missionTitle: mInfo?.missionTitle || missionId,
                        revenue: mStats.revenue,
                        salesCount: mStats.sales,
                        leadsCount: mStats.leads,
                    })
                }
                byMission.sort((a, b) => b.revenue - a.revenue)
            }

            members.push({
                ...info,
                totalRevenue: agg?.total || 0,
                salesCount: agg?.sales || 0,
                leadsCount: agg?.leads || 0,
                byMission,
            })
        }
        members.sort((a, b) => b.totalRevenue - a.totalRevenue)

        // =============================================
        // TINYBIRD STATS: Fetch real clicks/leads/sales per link
        // =============================================
        const { getAffiliateStatsFromTinybird } = await import('@/app/actions/marketplace')

        // Get all MissionEnrollments linked to GroupMissions
        const groupMissionIds = group.Missions.map(gm => gm.id)
        const groupEnrollments = groupMissionIds.length > 0
            ? await prisma.missionEnrollment.findMany({
                where: {
                    group_mission_id: { in: groupMissionIds },
                    status: 'APPROVED',
                },
                select: {
                    id: true,
                    user_id: true,
                    mission_id: true,
                    link_id: true,
                    group_mission_id: true,
                }
            })
            : []

        // Collect all link IDs for Tinybird lookup
        const allEnrollmentLinkIds = groupEnrollments
            .map(e => e.link_id)
            .filter((id): id is string => !!id)

        const tinybirdStats = await getAffiliateStatsFromTinybird(allEnrollmentLinkIds)

        // Build a map: missionId → userId → tinybird stats (aggregated from all links)
        const tinybirdByMissionMember = new Map<string, Map<string, { clicks: number; leads: number; sales: number; revenue: number }>>()
        for (const enrollment of groupEnrollments) {
            if (!enrollment.link_id) continue
            const stats = tinybirdStats.get(enrollment.link_id)
            if (!stats) continue

            if (!tinybirdByMissionMember.has(enrollment.mission_id)) {
                tinybirdByMissionMember.set(enrollment.mission_id, new Map())
            }
            const missionMap2 = tinybirdByMissionMember.get(enrollment.mission_id)!
            const existing = missionMap2.get(enrollment.user_id) || { clicks: 0, leads: 0, sales: 0, revenue: 0 }
            existing.clicks += stats.clicks
            existing.leads += stats.leads
            existing.sales += stats.sales
            existing.revenue += stats.revenue
            missionMap2.set(enrollment.user_id, existing)
        }

        // Build mission stats (all group missions, even those with 0 commissions)
        const missions: GroupMissionStats[] = []
        for (const gm of group.Missions) {
            const missionId = gm.Mission.id
            const agg = missionAgg.get(missionId)
            const mInfo = missionMap.get(missionId)!
            const tinybirdMission = tinybirdByMissionMember.get(missionId)

            // Aggregate Tinybird stats for mission total
            let missionClicks = 0, missionTbLeads = 0, missionTbSales = 0, missionTbRevenue = 0
            if (tinybirdMission) {
                for (const [, tbStats] of tinybirdMission) {
                    missionClicks += tbStats.clicks
                    missionTbLeads += tbStats.leads
                    missionTbSales += tbStats.sales
                    missionTbRevenue += tbStats.revenue
                }
            }

            const memberBreakdown: MissionMemberBreakdown[] = []
            // Merge commission-based and tinybird-based member data
            const allMemberUserIds = new Set<string>()
            if (agg) {
                for (const userId of agg.byMember.keys()) allMemberUserIds.add(userId)
            }
            if (tinybirdMission) {
                for (const userId of tinybirdMission.keys()) allMemberUserIds.add(userId)
            }

            for (const userId of allMemberUserIds) {
                const info = membersByUserId.get(userId)
                const commStats = agg?.byMember.get(userId)
                const tbStats = tinybirdMission?.get(userId)
                memberBreakdown.push({
                    sellerId: info?.sellerId || userId,
                    name: info?.name || userId,
                    avatarUrl: info?.avatarUrl || null,
                    revenue: commStats?.revenue || 0,
                    salesCount: commStats?.sales || 0,
                    leadsCount: commStats?.leads || 0,
                    clicks: tbStats?.clicks || 0,
                })
            }
            memberBreakdown.sort((a, b) => b.revenue - a.revenue)

            missions.push({
                ...mInfo,
                totalRevenue: agg?.total || 0,
                totalSales: agg?.sales || 0,
                totalLeads: agg?.leads || 0,
                clicks: missionClicks,
                tinybirdLeads: missionTbLeads,
                tinybirdSales: missionTbSales,
                tinybirdRevenue: missionTbRevenue,
                memberBreakdown,
            })
        }
        missions.sort((a, b) => b.tinybirdRevenue - a.tinybirdRevenue || b.totalRevenue - a.totalRevenue)

        const totalRevenue = commissions.reduce((sum, c) => sum + c.commission_amount, 0)
        const totalSales = commissions.filter(c => c.commission_source === 'SALE' || c.commission_source === 'RECURRING').length
        const totalLeads = commissions.filter(c => c.commission_source === 'LEAD').length

        return {
            success: true,
            stats: { totalRevenue, totalSales, totalLeads, members, missions }
        }
    } catch (error) {
        console.error('[Group] Failed to get group stats:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// GET AVAILABLE MISSIONS FOR GROUP
// Returns solo-enrolled missions that can be added to the group
// =============================================

export async function getAvailableMissionsForGroup(): Promise<{
    success: boolean
    missions?: { id: string; title: string; company_name: string | null; logo_url: string | null; reward: string | null }[]
    error?: string
}> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Must be creator of an ACTIVE group
        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: { Group: { include: { Missions: true } } }
        })

        if (!membership || membership.status !== 'ACTIVE' || membership.Group.status !== 'ACTIVE') {
            return { success: false, error: 'Not in an active group' }
        }
        if (membership.Group.creator_id !== seller.id) {
            return { success: false, error: 'Only the group creator can add missions' }
        }

        // Get mission IDs already in the group
        const groupMissionIds = membership.Group.Missions.map(gm => gm.mission_id)

        // Find solo enrollments (APPROVED, group_mission_id = null) for missions NOT already in the group
        const soloEnrollments = await prisma.missionEnrollment.findMany({
            where: {
                user_id: user.userId,
                status: 'APPROVED',
                group_mission_id: null,
                organization_mission_id: null,
                mission_id: groupMissionIds.length > 0 ? { notIn: groupMissionIds } : undefined,
                Mission: {
                    status: 'ACTIVE',
                }
            },
            include: {
                Mission: {
                    select: { id: true, title: true, company_name: true, logo_url: true, reward: true }
                }
            }
        })

        const missions = soloEnrollments.map(e => e.Mission)

        return { success: true, missions }
    } catch (error) {
        console.error('[Group] Failed to get available missions:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// GET GROUP MISSION DETAIL
// Returns detailed stats + timeseries for a specific group mission
// =============================================

export type GroupMissionDetail = {
    mission: {
        id: string
        title: string
        companyName: string | null
        logoUrl: string | null
        reward: string | null
        lead_enabled: boolean
        sale_enabled: boolean
        recurring_enabled: boolean
        lead_reward_amount: number | null
        sale_reward_amount: number | null
        sale_reward_structure: string | null
        recurring_reward_amount: number | null
        recurring_reward_structure: string | null
    }
    stats: { clicks: number; leads: number; sales: number; revenue: number }
    timeseries: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>
    memberBreakdown: MissionMemberBreakdown[]
}

export async function getGroupMissionDetail(missionId: string): Promise<{
    success: boolean
    detail?: GroupMissionDetail
    error?: string
}> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Check membership
        const membership = await prisma.sellerGroupMember.findUnique({
            where: { seller_id: seller.id },
            include: {
                Group: {
                    include: {
                        Members: {
                            where: { status: 'ACTIVE' },
                            include: {
                                Seller: {
                                    select: {
                                        id: true, user_id: true, name: true, email: true,
                                        Profile: { select: { avatar_url: true } }
                                    }
                                }
                            }
                        },
                        Missions: {
                            where: { mission_id: missionId },
                            include: {
                                Mission: {
                                    select: {
                                        id: true, title: true, company_name: true, logo_url: true, reward: true,
                                        lead_enabled: true, sale_enabled: true, recurring_enabled: true,
                                        lead_reward_amount: true, sale_reward_amount: true, sale_reward_structure: true,
                                        recurring_reward_amount: true, recurring_reward_structure: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!membership || membership.status === 'REMOVED') {
            return { success: false, error: 'Not in a group' }
        }

        const group = membership.Group
        const groupMission = group.Missions[0]
        if (!groupMission) {
            return { success: false, error: 'Mission not found in group' }
        }

        const mission = groupMission.Mission

        // Get all enrollments for this group mission
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                group_mission_id: groupMission.id,
                status: 'APPROVED',
            },
            select: { user_id: true, link_id: true }
        })

        const enrollmentLinkIds = enrollments
            .map(e => e.link_id)
            .filter((id): id is string => !!id)

        // Fetch Tinybird stats per link
        const { getAffiliateStatsFromTinybird } = await import('@/app/actions/marketplace')
        const tinybirdStats = await getAffiliateStatsFromTinybird(enrollmentLinkIds)

        // Aggregate stats + per-member breakdown
        const membersByUserId = new Map(
            group.Members.map(m => [m.Seller.user_id, {
                sellerId: m.Seller.id,
                name: m.Seller.name || m.Seller.email || '',
                avatarUrl: m.Seller.Profile?.avatar_url || null,
            }])
        )

        let totalClicks = 0, totalLeads = 0, totalSales = 0, totalRevenue = 0
        const memberStatsMap = new Map<string, { clicks: number; leads: number; sales: number; revenue: number }>()

        for (const enrollment of enrollments) {
            if (!enrollment.link_id) continue
            const stats = tinybirdStats.get(enrollment.link_id)
            if (!stats) continue

            totalClicks += stats.clicks
            totalLeads += stats.leads
            totalSales += stats.sales
            totalRevenue += stats.revenue

            const existing = memberStatsMap.get(enrollment.user_id) || { clicks: 0, leads: 0, sales: 0, revenue: 0 }
            existing.clicks += stats.clicks
            existing.leads += stats.leads
            existing.sales += stats.sales
            existing.revenue += stats.revenue
            memberStatsMap.set(enrollment.user_id, existing)
        }

        // Build member breakdown
        const memberBreakdown: MissionMemberBreakdown[] = []
        for (const [userId, mStats] of memberStatsMap) {
            const info = membersByUserId.get(userId)
            memberBreakdown.push({
                sellerId: info?.sellerId || userId,
                name: info?.name || userId,
                avatarUrl: info?.avatarUrl || null,
                revenue: mStats.revenue,
                salesCount: mStats.sales,
                leadsCount: mStats.leads,
                clicks: mStats.clicks,
            })
        }
        memberBreakdown.sort((a, b) => b.clicks - a.clicks)

        // Fetch timeseries (aggregate all links)
        const { getLinkTimeseries } = await import('@/app/actions/marketplace-actions')
        const days = 30

        // Initialize date map
        const dateMap = new Map<string, { clicks: number; leads: number; sales: number; revenue: number }>()
        for (let i = 0; i <= days; i++) {
            const d = new Date()
            d.setDate(d.getDate() - (days - i))
            const dateStr = d.toISOString().split('T')[0]
            dateMap.set(dateStr, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
        }

        // Fetch timeseries for each link and aggregate
        for (const linkId of enrollmentLinkIds) {
            const ts = await getLinkTimeseries(linkId, days)
            for (const point of ts) {
                const existing = dateMap.get(point.date)
                if (existing) {
                    existing.clicks += point.clicks
                    existing.leads += point.leads
                    existing.sales += point.sales
                    existing.revenue += point.revenue
                }
            }
        }

        const timeseries = Array.from(dateMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => ({ date, ...data }))

        return {
            success: true,
            detail: {
                mission: {
                    id: mission.id,
                    title: mission.title,
                    companyName: mission.company_name,
                    logoUrl: mission.logo_url,
                    reward: mission.reward,
                    lead_enabled: mission.lead_enabled,
                    sale_enabled: mission.sale_enabled,
                    recurring_enabled: mission.recurring_enabled,
                    lead_reward_amount: mission.lead_reward_amount,
                    sale_reward_amount: mission.sale_reward_amount,
                    sale_reward_structure: mission.sale_reward_structure,
                    recurring_reward_amount: mission.recurring_reward_amount,
                    recurring_reward_structure: mission.recurring_reward_structure,
                },
                stats: { clicks: totalClicks, leads: totalLeads, sales: totalSales, revenue: totalRevenue },
                timeseries,
                memberBreakdown,
            }
        }
    } catch (error) {
        console.error('[Group] Failed to get group mission detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
