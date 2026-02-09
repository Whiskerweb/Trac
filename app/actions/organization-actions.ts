'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// ORGANIZATION SERVER ACTIONS
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
// SELLER: Organization Lifecycle
// =============================================

/**
 * A seller applies to create an organization (pending admin approval)
 */
export async function applyToCreateOrg({ name, description, logo_url }: {
    name: string
    description?: string
    logo_url?: string
}) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated or not an approved seller' }

        const org = await prisma.organization.create({
            data: {
                name,
                description: description || null,
                logo_url: logo_url || null,
                leader_id: seller.id,
                status: 'PENDING',
            }
        })

        return { success: true, organization: org }
    } catch (error) {
        console.error('[Org] Failed to apply for org creation:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get organizations where the current user is leader or member
 */
export async function getMyOrganizations() {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Orgs where user is leader
        const ledOrgs = await prisma.organization.findMany({
            where: { leader_id: seller.id },
            include: {
                _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: true } },
            },
            orderBy: { created_at: 'desc' }
        })

        // Orgs where user is member (not leader)
        const memberships = await prisma.organizationMember.findMany({
            where: { seller_id: seller.id, status: 'ACTIVE' },
            include: {
                Organization: {
                    include: {
                        _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: true } },
                        Leader: { select: { name: true, email: true } }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        const memberOrgs = memberships
            .map(m => m.Organization)
            .filter(org => org.leader_id !== seller.id)

        return {
            success: true,
            led: ledOrgs,
            memberOf: memberOrgs,
            sellerId: seller.id,
        }
    } catch (error) {
        console.error('[Org] Failed to get organizations:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get full detail of an organization (for leader or member)
 */
export async function getOrganizationDetail(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                Leader: { select: { id: true, name: true, email: true } },
                Members: {
                    include: {
                        Seller: { select: { id: true, name: true, email: true, status: true } }
                    },
                    orderBy: { created_at: 'desc' }
                },
                Missions: {
                    include: {
                        Mission: { select: { id: true, title: true, status: true, target_url: true } }
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!org) return { success: false, error: 'Organization not found' }

        // Check user is leader or active member
        const isLeader = org.leader_id === seller.id
        const isMember = org.Members.some(m => m.seller_id === seller.id && m.status === 'ACTIVE')
        if (!isLeader && !isMember) {
            return { success: false, error: 'Access denied' }
        }

        return { success: true, organization: org, isLeader }
    } catch (error) {
        console.error('[Org] Failed to get org detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// LEADER: Member Management
// =============================================

/**
 * Leader invites a seller to the org by email
 */
export async function inviteMemberToOrg(orgId: string, sellerEmail: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Verify user is leader of this org
        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can invite members' }
        }
        if (org.status !== 'ACTIVE') {
            return { success: false, error: 'Organization must be active to invite members' }
        }

        // Find seller by email
        const targetSeller = await prisma.seller.findFirst({
            where: { email: sellerEmail.toLowerCase(), status: 'APPROVED' }
        })
        if (!targetSeller) {
            return { success: false, error: 'No approved seller found with this email' }
        }
        if (targetSeller.id === seller.id) {
            return { success: false, error: 'You cannot invite yourself' }
        }

        // Create membership (upsert to handle re-invites)
        const membership = await prisma.organizationMember.upsert({
            where: {
                organization_id_seller_id: {
                    organization_id: orgId,
                    seller_id: targetSeller.id,
                }
            },
            create: {
                organization_id: orgId,
                seller_id: targetSeller.id,
                status: 'PENDING',
                invited_by: seller.id,
            },
            update: {
                status: 'PENDING',
                invited_by: seller.id,
            }
        })

        return { success: true, membership }
    } catch (error) {
        console.error('[Org] Failed to invite member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * A seller applies to join an organization
 */
export async function applyToJoinOrg(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Organization not found or not active' }
        }
        if (org.leader_id === seller.id) {
            return { success: false, error: 'You are already the leader of this organization' }
        }

        const membership = await prisma.organizationMember.upsert({
            where: {
                organization_id_seller_id: {
                    organization_id: orgId,
                    seller_id: seller.id,
                }
            },
            create: {
                organization_id: orgId,
                seller_id: seller.id,
                status: 'PENDING',
                invited_by: null, // Self-application
            },
            update: {} // No-op if already exists
        })

        return { success: true, membership }
    } catch (error) {
        console.error('[Org] Failed to apply to org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Leader approves a pending member → ACTIVE + auto-enroll in all accepted missions
 */
export async function approveOrgMember(membershipId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const membership = await prisma.organizationMember.findUnique({
            where: { id: membershipId },
            include: { Organization: true }
        })
        if (!membership) return { success: false, error: 'Membership not found' }
        if (membership.Organization.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can approve members' }
        }
        if (membership.status !== 'PENDING') {
            return { success: false, error: 'Member is not pending' }
        }

        // Activate membership
        await prisma.organizationMember.update({
            where: { id: membershipId },
            data: { status: 'ACTIVE' }
        })

        // Auto-enroll in all ACCEPTED org missions
        const acceptedMissions = await prisma.organizationMission.findMany({
            where: { organization_id: membership.organization_id, status: 'ACCEPTED' },
            include: { Mission: true }
        })

        const memberSeller = await prisma.seller.findUnique({
            where: { id: membership.seller_id }
        })

        if (memberSeller?.user_id) {
            for (const orgMission of acceptedMissions) {
                await enrollSingleMemberInMission(
                    memberSeller,
                    orgMission.Mission,
                    orgMission.id
                )
            }
        }

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to approve member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Leader removes a member from the org
 */
export async function removeOrgMember(membershipId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const membership = await prisma.organizationMember.findUnique({
            where: { id: membershipId },
            include: { Organization: true }
        })
        if (!membership) return { success: false, error: 'Membership not found' }
        if (membership.Organization.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can remove members' }
        }

        await prisma.organizationMember.update({
            where: { id: membershipId },
            data: { status: 'REMOVED' }
        })

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to remove member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * A member leaves an organization voluntarily
 */
export async function leaveOrganization(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const membership = await prisma.organizationMember.findUnique({
            where: {
                organization_id_seller_id: {
                    organization_id: orgId,
                    seller_id: seller.id,
                }
            }
        })
        if (!membership) return { success: false, error: 'Not a member of this organization' }

        await prisma.organizationMember.update({
            where: { id: membership.id },
            data: { status: 'REMOVED' }
        })

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to leave org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// STARTUP: Org Mission Proposals
// =============================================

/**
 * Startup proposes a mission to an organization
 */
export async function proposeOrgMission({ orgId, missionId, totalReward, leaderReward, memberReward }: {
    orgId: string
    missionId: string
    totalReward: string
    leaderReward: string
    memberReward: string
}) {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        // Verify mission belongs to this workspace
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: workspace.workspaceId }
        })
        if (!mission) return { success: false, error: 'Mission not found' }

        // Verify org is active
        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Organization not found or not active' }
        }

        const orgMission = await prisma.organizationMission.upsert({
            where: {
                organization_id_mission_id: {
                    organization_id: orgId,
                    mission_id: missionId,
                }
            },
            create: {
                organization_id: orgId,
                mission_id: missionId,
                total_reward: totalReward,
                leader_reward: leaderReward,
                member_reward: memberReward,
                status: 'PROPOSED',
                proposed_by: workspace.workspaceId,
            },
            update: {
                total_reward: totalReward,
                leader_reward: leaderReward,
                member_reward: memberReward,
                status: 'PROPOSED',
            }
        })

        return { success: true, orgMission }
    } catch (error) {
        console.error('[Org] Failed to propose mission:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Startup gets its org mission proposals
 */
export async function getOrgMissionProposals() {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        const proposals = await prisma.organizationMission.findMany({
            where: { proposed_by: workspace.workspaceId },
            include: {
                Organization: { select: { id: true, name: true, status: true, Leader: { select: { name: true, email: true } } } },
                Mission: { select: { id: true, title: true, status: true } }
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, proposals }
    } catch (error) {
        console.error('[Org] Failed to get proposals:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// LEADER: Mission Accept/Reject
// =============================================

/**
 * Leader accepts a proposed mission → auto-enroll all active members
 */
export async function acceptOrgMission(orgMissionId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const orgMission = await prisma.organizationMission.findUnique({
            where: { id: orgMissionId },
            include: {
                Organization: { include: { Members: { where: { status: 'ACTIVE' }, include: { Seller: true } } } },
                Mission: true,
            }
        })
        if (!orgMission) return { success: false, error: 'Mission proposal not found' }
        if (orgMission.Organization.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can accept missions' }
        }
        if (orgMission.status !== 'PROPOSED') {
            return { success: false, error: 'Mission is not in proposed state' }
        }

        // Mark as ACCEPTED
        await prisma.organizationMission.update({
            where: { id: orgMissionId },
            data: { status: 'ACCEPTED', accepted_at: new Date() }
        })

        // Auto-enroll all active members
        await enrollMembersInOrgMission(orgMission)

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to accept mission:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Leader rejects a proposed mission
 */
export async function rejectOrgMission(orgMissionId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const orgMission = await prisma.organizationMission.findUnique({
            where: { id: orgMissionId },
            include: { Organization: true }
        })
        if (!orgMission) return { success: false, error: 'Mission proposal not found' }
        if (orgMission.Organization.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can reject missions' }
        }

        await prisma.organizationMission.update({
            where: { id: orgMissionId },
            data: { status: 'REJECTED' }
        })

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to reject mission:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get pending mission proposals for leader review
 */
export async function getOrgMissionProposalsForLeader() {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const proposals = await prisma.organizationMission.findMany({
            where: {
                Organization: { leader_id: seller.id },
                status: 'PROPOSED',
            },
            include: {
                Organization: { select: { id: true, name: true } },
                Mission: {
                    select: {
                        id: true, title: true, description: true, target_url: true,
                        status: true, industry: true, gain_type: true,
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, proposals }
    } catch (error) {
        console.error('[Org] Failed to get leader proposals:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// SELLER: Browse Organizations
// =============================================

/**
 * Get all active organizations (for sellers to browse/apply)
 */
export async function getActiveOrganizations() {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const organizations = await prisma.organization.findMany({
            where: { status: 'ACTIVE' },
            include: {
                Leader: { select: { name: true, email: true } },
                _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: { where: { status: 'ACCEPTED' } } } },
            },
            orderBy: { created_at: 'desc' }
        })

        // Check current user's membership status in each org
        const memberships = await prisma.organizationMember.findMany({
            where: { seller_id: seller.id },
            select: { organization_id: true, status: true }
        })
        const membershipMap = new Map(memberships.map(m => [m.organization_id, m.status]))

        const orgsWithStatus = organizations.map(org => ({
            ...org,
            userMembershipStatus: org.leader_id === seller.id ? 'LEADER' as const : (membershipMap.get(org.id) || null),
        }))

        return { success: true, organizations: orgsWithStatus }
    } catch (error) {
        console.error('[Org] Failed to get active organizations:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// STARTUP: Browse Organizations (for proposing missions)
// =============================================

/**
 * Get all active organizations for a startup to browse
 */
export async function getActiveOrganizationsForStartup() {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        const organizations = await prisma.organization.findMany({
            where: { status: 'ACTIVE' },
            include: {
                Leader: { select: { name: true, email: true } },
                _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: { where: { status: 'ACCEPTED' } } } },
                Missions: {
                    where: { proposed_by: workspace.workspaceId },
                    select: { id: true, mission_id: true, status: true }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, organizations }
    } catch (error) {
        console.error('[Org] Failed to get organizations for startup:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// INTERNAL: Auto-enrollment Helper
// =============================================

/**
 * Enroll all active members of an org into a mission.
 * Called when leader accepts a mission or when a new member is approved.
 */
async function enrollMembersInOrgMission(orgMission: {
    id: string
    mission_id: string
    Organization: {
        Members: Array<{
            seller_id: string
            Seller: { id: string; user_id: string | null }
        }>
    }
    Mission: { id: string; title: string; target_url: string; workspace_id: string }
}) {
    const { setLinkInRedis } = await import('@/lib/redis')

    for (const member of orgMission.Organization.Members) {
        if (!member.Seller.user_id) continue

        await enrollSingleMemberInMission(
            member.Seller as { id: string; user_id: string },
            orgMission.Mission,
            orgMission.id
        )
    }
}

/**
 * Enroll a single seller into a mission via an org.
 * Creates ShortLink + Redis + MissionEnrollment.
 * Skips if already enrolled.
 */
async function enrollSingleMemberInMission(
    seller: { id: string; user_id: string | null },
    mission: { id: string; title: string; target_url: string; workspace_id: string },
    organizationMissionId: string
) {
    if (!seller.user_id) return

    // Check if already enrolled (individual or another org)
    const existing = await prisma.missionEnrollment.findUnique({
        where: {
            mission_id_user_id: {
                mission_id: mission.id,
                user_id: seller.user_id,
            }
        }
    })
    if (existing) return // Already enrolled — skip

    // Generate slug: mission-slug/affiliate-code
    const missionSlug = mission.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20)
    const affiliateCode = seller.user_id.slice(0, 8)
    const fullSlug = `${missionSlug}/${affiliateCode}`

    // Create ShortLink
    const shortLink = await prisma.shortLink.create({
        data: {
            slug: fullSlug,
            original_url: mission.target_url,
            workspace_id: mission.workspace_id,
            affiliate_id: seller.user_id,
            clicks: 0,
        }
    })

    // Add to Redis
    const { setLinkInRedis } = await import('@/lib/redis')
    await setLinkInRedis(shortLink.slug, {
        url: shortLink.original_url,
        linkId: shortLink.id,
        workspaceId: shortLink.workspace_id,
        sellerId: shortLink.affiliate_id,
    })

    // Create MissionEnrollment
    await prisma.missionEnrollment.create({
        data: {
            mission_id: mission.id,
            user_id: seller.user_id,
            status: 'APPROVED',
            link_id: shortLink.id,
            organization_mission_id: organizationMissionId,
        }
    })

    console.log(`[Org] ✅ Enrolled seller ${seller.id} in mission ${mission.id} via org`)
}
