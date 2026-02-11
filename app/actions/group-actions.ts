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

        await prisma.$transaction(async (tx) => {
            // Mark member as REMOVED
            await tx.sellerGroupMember.update({
                where: { id: membership.id },
                data: { status: 'REMOVED' }
            })

            // If creator leaves → archive the group
            if (membership.Group.creator_id === seller.id) {
                await tx.sellerGroup.update({
                    where: { id: membership.Group.id },
                    data: { status: 'ARCHIVED' }
                })
                console.log(`[Group] Creator ${seller.id} left → group ${membership.Group.id} archived`)
            }
        })

        revalidatePath('/seller/groups')
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

        revalidatePath('/seller/groups')
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

        // Verify mission exists and is active
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
        // Check if already enrolled in this mission
        const existing = await prisma.missionEnrollment.findFirst({
            where: { mission_id: groupMission.mission_id, user_id: userId }
        })
        if (existing) {
            console.log(`[Group] Seller ${seller.id} already enrolled in mission ${groupMission.mission_id}, skipping`)
            return
        }

        // Generate slug
        const missionSlug = groupMission.Mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = userId.slice(0, 8)
        const fullSlug = `${missionSlug}/${affiliateCode}`

        // Check for custom domain
        const verifiedDomain = await prisma.domain.findFirst({
            where: { workspace_id: groupMission.Mission.workspace_id, verified: true }
        })
        const customDomain = verifiedDomain?.name || null

        // Create ShortLink
        const shortLink = await prisma.shortLink.create({
            data: {
                slug: fullSlug,
                original_url: groupMission.Mission.target_url,
                workspace_id: groupMission.Mission.workspace_id,
                affiliate_id: userId,
                clicks: 0,
            }
        })

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
