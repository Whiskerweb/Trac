'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { nanoid } from 'nanoid'
import { getAdminEmails } from '@/lib/admin'
import {
    notifyMembersOfMissionAccepted,
    notifyOfMissionCancelled,
    notifyLeaderOfNewMember,
    notifyLeaderOfMemberLeft,
    notifyMemberRemoved,
} from '@/lib/org-notifications'

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
 * Generate a URL-safe slug from a name, ensuring uniqueness
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug
    let attempt = 0
    while (true) {
        const existing = await prisma.organization.findUnique({ where: { slug } })
        if (!existing) return slug
        attempt++
        slug = `${baseSlug}-${attempt}`
    }
}

/**
 * A seller applies to create an organization (pending admin approval)
 */
export async function applyToCreateOrg({ name, description, motivation, estimated_audience }: {
    name: string
    description?: string
    motivation?: string
    estimated_audience?: string
}) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated or not an approved seller' }

        // Stripe Connect required to receive org commissions as leader
        if (!seller.stripe_connect_id || !seller.payouts_enabled_at) {
            return { success: false, error: 'stripe_required' }
        }

        const slug = await ensureUniqueSlug(generateSlug(name))
        const invite_code = nanoid(12)

        const org = await prisma.organization.create({
            data: {
                name,
                description: description || null,
                logo_url: null,
                leader_id: seller.id,
                status: 'PENDING',
                visibility: 'PUBLIC',
                slug,
                invite_code,
                motivation: motivation || null,
                estimated_audience: estimated_audience || null,
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

        // Orgs where user is leader (exclude REJECTED — they get deleted, but filter just in case)
        const ledOrgs = await prisma.organization.findMany({
            where: { leader_id: seller.id, status: { not: 'REJECTED' } },
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
                        Mission: {
                            select: {
                                id: true, title: true, status: true, target_url: true,
                                industry: true, gain_type: true, reward: true,
                                workspace_id: true,
                                Workspace: {
                                    select: {
                                        id: true, name: true,
                                        Profile: { select: { logo_url: true, industry: true, website_url: true } }
                                    }
                                }
                            }
                        }
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
 * A seller applies to join an organization.
 * PUBLIC → auto-approve + auto-enroll in missions.
 * PRIVATE → PENDING (needs leader approval).
 * INVITE_ONLY → rejected (must use invite code).
 */
export async function applyToJoinOrg(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                Members: { where: { status: 'ACTIVE' }, include: { Seller: true } },
                Missions: { where: { status: 'ACCEPTED' }, include: { Mission: true } },
            }
        })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Organization not found or not active' }
        }
        if (org.leader_id === seller.id) {
            return { success: false, error: 'You are already the leader of this organization' }
        }
        if (org.visibility === 'INVITE_ONLY') {
            return { success: false, error: 'This organization is invite-only. Use an invite link.' }
        }

        // PUBLIC = auto-approve, PRIVATE = pending
        const autoApprove = org.visibility === 'PUBLIC'
        const status = autoApprove ? 'ACTIVE' : 'PENDING'

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
                status,
                invited_by: null,
            },
            update: {} // No-op if already exists
        })

        // If auto-approved, enroll in all accepted missions
        if (autoApprove && membership.status === 'ACTIVE' && seller.user_id) {
            for (const orgMission of org.Missions) {
                await enrollSingleMemberInMission(
                    seller as { id: string; user_id: string },
                    orgMission.Mission,
                    orgMission.id
                )
            }

            // Notify leader of new member (non-blocking)
            notifyLeaderOfNewMember(
                org.leader_id,
                org.name,
                seller.name || seller.email || 'A seller'
            ).catch(() => {})
        }

        return { success: true, membership, autoApproved: autoApprove }
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

        // Notify removed member (non-blocking)
        notifyMemberRemoved(
            membership.seller_id,
            membership.Organization.name
        ).catch(() => {})

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

        // Fetch org to check leader + system-managed status
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { leader_id: true, slug: true, name: true }
        })
        if (!org) return { success: false, error: 'Organization not found' }

        // Leaders cannot leave their own org
        if (org.leader_id === seller.id) {
            return { success: false, error: 'Leaders cannot leave their own organization' }
        }

        // Traaaction Top Tierce is mandatory — no one can leave
        if (org.slug === TRAAACTION_ORG_SLUG) {
            return { success: false, error: 'You cannot leave this organization' }
        }

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

        // Notify leader (non-blocking)
        notifyLeaderOfMemberLeft(
            org.leader_id,
            org.name,
            seller.name || seller.email || 'A seller'
        ).catch(() => {})

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
export async function proposeOrgMission({ orgId, missionId, totalReward }: {
    orgId: string
    missionId: string
    totalReward: string
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

        // Validate: for percentage deals, must be > 15% (otherwise nothing for the org)
        const trimmed = totalReward.trim()
        if (trimmed.endsWith('%')) {
            const pct = parseFloat(trimmed.replace('%', ''))
            if (pct <= 15) {
                return { success: false, error: 'Deal must be greater than 15% (platform fee is 15% included)' }
            }
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
                leader_reward: null,
                member_reward: null,
                status: 'PROPOSED',
                proposed_by: workspace.workspaceId,
            },
            update: {
                total_reward: totalReward,
                leader_reward: null,
                member_reward: null,
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
 * Leader accepts a proposed mission → sets their cut, auto-calculates member reward, auto-enrolls members.
 *
 * For PERCENTAGE deals: memberPct = dealPct - 15 (platform) - leaderPct
 * For FLAT deals: memberFlat = dealFlat - 15% of dealFlat (platform) - leaderFlat
 *
 * Once accepted, the deal is IMMUTABLE (leader_reward and member_reward are locked).
 */
export async function acceptOrgMission(orgMissionId: string, leaderCut: string) {
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
        if (orgMission.status === 'ACCEPTED') {
            return { success: true, memberReward: orgMission.member_reward || '' }
        }
        if (orgMission.status !== 'PROPOSED') {
            return { success: false, error: 'Mission is not in proposed state' }
        }

        // Parse total reward and leader cut to compute member reward
        const totalTrimmed = orgMission.total_reward.trim()
        const leaderTrimmed = leaderCut.trim()

        let memberReward: string

        if (totalTrimmed.endsWith('%')) {
            // PERCENTAGE DEAL
            const dealPct = parseFloat(totalTrimmed.replace('%', ''))
            const leaderPct = parseFloat(leaderTrimmed.replace('%', ''))

            if (isNaN(dealPct) || isNaN(leaderPct)) {
                return { success: false, error: 'Invalid reward format' }
            }
            if (leaderPct < 0) {
                return { success: false, error: 'Leader cut cannot be negative' }
            }

            const orgShare = dealPct - 15 // 15% platform fee
            if (leaderPct > orgShare) {
                return { success: false, error: `Leader cut (${leaderPct}%) exceeds org share (${orgShare}%)` }
            }

            const memberPct = orgShare - leaderPct
            memberReward = `${memberPct}%`
        } else {
            // FLAT DEAL
            const dealMatch = totalTrimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)
            const leaderMatch = leaderTrimmed.match(/^(\d+(?:\.\d+)?)\s*[€$]?$|^[€$]?\s*(\d+(?:\.\d+)?)$/)

            if (!dealMatch || !leaderMatch) {
                return { success: false, error: 'Invalid reward format' }
            }

            const dealFlat = parseFloat(dealMatch[1] || dealMatch[2])
            const leaderFlat = parseFloat(leaderMatch[1] || leaderMatch[2])

            if (isNaN(dealFlat) || isNaN(leaderFlat)) {
                return { success: false, error: 'Invalid reward values' }
            }
            if (leaderFlat < 0) {
                return { success: false, error: 'Leader cut cannot be negative' }
            }

            const platformFee = dealFlat * 0.15
            const orgShare = dealFlat - platformFee

            if (leaderFlat > orgShare) {
                return { success: false, error: `Leader cut (${leaderFlat}€) exceeds org share (${orgShare.toFixed(2)}€)` }
            }

            const memberFlat = orgShare - leaderFlat
            // Format nicely: avoid trailing zeros for whole numbers
            memberReward = memberFlat % 1 === 0 ? `${memberFlat}€` : `${memberFlat.toFixed(2)}€`
        }

        // Mark as ACCEPTED with leader_reward and member_reward locked
        await prisma.organizationMission.update({
            where: { id: orgMissionId },
            data: {
                status: 'ACCEPTED',
                accepted_at: new Date(),
                leader_reward: leaderCut,
                member_reward: memberReward,
            }
        })

        // Auto-enroll all active members
        await enrollMembersInOrgMission(orgMission)

        // Notify all active members (non-blocking)
        notifyMembersOfMissionAccepted(
            orgMission.organization_id,
            orgMission.Organization.name,
            orgMission.Mission.title,
            memberReward
        ).catch(() => {})

        return { success: true, memberReward }
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
 * Startup cancels an accepted org mission arrangement.
 *
 * Guards:
 * - Must have PROCEED + UNPAID commissions settled first
 * - PENDING commissions are deleted + seller balances recalculated
 * - COMPLETE commissions are preserved
 *
 * Actions:
 * 1. OrganizationMission status → CANCELLED
 * 2. Delete all PENDING commissions tied to this org mission
 * 3. Recalculate seller balances
 * 4. Notify leader + all members
 */
export async function cancelOrgMission(orgMissionId: string) {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        const orgMission = await prisma.organizationMission.findUnique({
            where: { id: orgMissionId },
            include: {
                Organization: {
                    include: {
                        Members: { where: { status: 'ACTIVE' }, include: { Seller: true } }
                    }
                },
                Mission: { select: { id: true, title: true } }
            }
        })

        if (!orgMission) return { success: false, error: 'Mission arrangement not found' }
        if (orgMission.proposed_by !== workspace.workspaceId) {
            return { success: false, error: 'Only the proposing startup can cancel' }
        }
        if (orgMission.status !== 'ACCEPTED') {
            return { success: false, error: 'Only accepted missions can be cancelled' }
        }

        // Guard: check for PROCEED + UNPAID commissions (must be settled first)
        const unpaidProceed = await prisma.commission.count({
            where: {
                organization_mission_id: orgMissionId,
                status: 'PROCEED',
                startup_payment_status: 'UNPAID',
            }
        })

        if (unpaidProceed > 0) {
            // Calculate the total amount owed
            const unpaidTotal = await prisma.commission.aggregate({
                where: {
                    organization_mission_id: orgMissionId,
                    status: 'PROCEED',
                    startup_payment_status: 'UNPAID',
                },
                _sum: { commission_amount: true, platform_fee: true }
            })
            const totalOwed = ((unpaidTotal._sum.commission_amount || 0) + (unpaidTotal._sum.platform_fee || 0)) / 100
            return {
                success: false,
                error: `Cannot cancel: ${unpaidProceed} unpaid commission(s) totaling ${totalOwed.toFixed(2)}€ must be settled first.`
            }
        }

        // 1. Mark as CANCELLED
        await prisma.organizationMission.update({
            where: { id: orgMissionId },
            data: { status: 'CANCELLED' }
        })

        // 2. Delete all PENDING commissions tied to this org mission
        const pendingCommissions = await prisma.commission.findMany({
            where: {
                organization_mission_id: orgMissionId,
                status: 'PENDING',
            },
            select: { id: true, seller_id: true }
        })

        if (pendingCommissions.length > 0) {
            // Collect unique seller IDs for balance recalculation
            const affectedSellerIds = [...new Set(pendingCommissions.map(c => c.seller_id))]

            await prisma.commission.deleteMany({
                where: {
                    organization_mission_id: orgMissionId,
                    status: 'PENDING',
                }
            })

            // 3. Recalculate balances for affected sellers
            const { updateSellerBalance } = await import('@/lib/commission/engine')
            for (const sellerId of affectedSellerIds) {
                await updateSellerBalance(sellerId)
            }

            console.log(`[Org] Deleted ${pendingCommissions.length} PENDING commissions for cancelled mission ${orgMissionId}`)
        }

        console.log(`[Org] Mission ${orgMission.Mission.title} cancelled for org ${orgMission.Organization.id}`)

        // Notify leader + all active members (non-blocking)
        notifyOfMissionCancelled(
            orgMission.organization_id,
            orgMission.Organization.leader_id,
            orgMission.Organization.name,
            orgMission.Mission.title
        ).catch(() => {})

        return { success: true }
    } catch (error) {
        console.error('[Org] Failed to cancel mission:', error)
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
                        workspace_id: true,
                        Workspace: {
                            select: {
                                id: true, name: true,
                                Profile: { select: { logo_url: true, industry: true, website_url: true } }
                            }
                        }
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

/**
 * Get org performance stats for the startup dashboard.
 * Aggregates commissions by seller and by mission.
 */
export async function getOrgStatsForStartup(orgId: string) {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        // Get org with active members
        const org = await prisma.organization.findUnique({
            where: { id: orgId, status: 'ACTIVE' },
            include: {
                Members: {
                    where: { status: 'ACTIVE' },
                    include: { Seller: { select: { id: true, name: true, email: true } } },
                },
            },
        })
        if (!org) return { success: false, error: 'Organization not found' }

        // Get org missions that are ACCEPTED or proposed by this workspace
        const orgMissions = await prisma.organizationMission.findMany({
            where: {
                organization_id: orgId,
                OR: [
                    { status: 'ACCEPTED' },
                    { proposed_by: workspace.workspaceId },
                ],
            },
            include: { Mission: { select: { id: true, title: true, status: true, reward: true, gain_type: true } } },
        })

        const acceptedMissionIds = orgMissions
            .filter(m => m.status === 'ACCEPTED')
            .map(m => m.id)

        // Get all member commissions for these org missions (exclude leader cuts and referral)
        const commissions = acceptedMissionIds.length > 0
            ? await prisma.commission.findMany({
                where: {
                    organization_mission_id: { in: acceptedMissionIds },
                    org_parent_commission_id: null,
                    referral_generation: null,
                },
                select: {
                    id: true,
                    seller_id: true,
                    organization_mission_id: true,
                    commission_source: true,
                    gross_amount: true,
                    commission_amount: true,
                    status: true,
                },
            })
            : []

        // Aggregate totals
        const totalRevenue = commissions.reduce((s, c) => s + c.gross_amount, 0)
        const totalSales = commissions.filter(c => c.commission_source === 'SALE' || c.commission_source === 'RECURRING').length
        const totalLeads = commissions.filter(c => c.commission_source === 'LEAD').length

        // Aggregate by seller → top sellers
        const sellerMap = new Map<string, { sales: number; leads: number; revenue: number }>()
        for (const c of commissions) {
            const existing = sellerMap.get(c.seller_id) || { sales: 0, leads: 0, revenue: 0 }
            existing.revenue += c.gross_amount
            if (c.commission_source === 'LEAD') existing.leads++
            else existing.sales++
            sellerMap.set(c.seller_id, existing)
        }

        // Build top sellers list with seller info
        const sellerInfoMap = new Map(
            org.Members.map(m => [m.Seller.id, m.Seller])
        )
        // Also add leader info if they have commissions
        const topSellers = Array.from(sellerMap.entries())
            .map(([sellerId, stats]) => ({
                sellerId,
                name: sellerInfoMap.get(sellerId)?.name || null,
                email: sellerInfoMap.get(sellerId)?.email || null,
                avatarUrl: null,
                ...stats,
            }))
            .sort((a, b) => b.revenue - a.revenue)

        // Aggregate by mission
        const missionMap = new Map<string, { sales: number; leads: number; revenue: number }>()
        for (const c of commissions) {
            if (!c.organization_mission_id) continue
            const existing = missionMap.get(c.organization_mission_id) || { sales: 0, leads: 0, revenue: 0 }
            existing.revenue += c.gross_amount
            if (c.commission_source === 'LEAD') existing.leads++
            else existing.sales++
            missionMap.set(c.organization_mission_id, existing)
        }

        const missionStats = orgMissions
            .filter(m => m.status === 'ACCEPTED')
            .map(m => ({
                orgMissionId: m.id,
                missionTitle: m.Mission.title,
                totalReward: m.total_reward,
                leaderReward: m.leader_reward,
                memberReward: m.member_reward,
                ...(missionMap.get(m.id) || { sales: 0, leads: 0, revenue: 0 }),
            }))

        return {
            success: true,
            stats: {
                totalRevenue,
                totalSales,
                totalLeads,
                activeMembers: org.Members.length,
                activeMissions: acceptedMissionIds.length,
                topSellers,
                missionStats,
            },
        }
    } catch (error) {
        console.error('[Org] Failed to get org stats for startup:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// SELLER: Browse Organizations
// =============================================

/**
 * Get all active organizations (for sellers to browse/apply).
 * Excludes INVITE_ONLY orgs. Supports search.
 */
export async function getActiveOrganizations(params?: { search?: string }) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const where: any = {
            status: 'ACTIVE',
            visibility: { not: 'INVITE_ONLY' },
        }
        if (params?.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { description: { contains: params.search, mode: 'insensitive' } },
            ]
        }

        const organizations = await prisma.organization.findMany({
            where,
            include: {
                Leader: { select: { id: true, name: true, email: true } },
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
                    select: {
                        id: true,
                        mission_id: true,
                        status: true,
                        total_reward: true,
                        leader_reward: true,
                        member_reward: true,
                        accepted_at: true,
                        Mission: { select: { id: true, title: true, reward: true, gain_type: true, status: true } }
                    }
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
// SELLER: Organization Detail (by slug)
// =============================================

/**
 * Get organization detail page data by slug (public-facing)
 */
export async function getOrganizationBySlug(slug: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({
            where: { slug },
            include: {
                Leader: { select: { id: true, name: true, email: true } },
                Members: {
                    where: { status: 'ACTIVE' },
                    include: { Seller: { select: { id: true, name: true, email: true } } },
                },
                Missions: {
                    where: { status: 'ACCEPTED' },
                    include: { Mission: { select: { id: true, title: true, status: true, target_url: true, reward: true } } },
                },
                _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: { where: { status: 'ACCEPTED' } } } },
            }
        })
        if (!org || (org.status !== 'ACTIVE' && org.leader_id !== seller.id)) {
            return { success: false, error: 'Organization not found' }
        }

        // Determine user's relationship to this org
        const isLeader = org.leader_id === seller.id
        const membership = await prisma.organizationMember.findUnique({
            where: {
                organization_id_seller_id: {
                    organization_id: org.id,
                    seller_id: seller.id,
                }
            }
        })

        return {
            success: true,
            organization: org,
            isLeader,
            membershipStatus: isLeader ? 'LEADER' as const : (membership?.status || null),
        }
    } catch (error) {
        console.error('[Org] Failed to get org by slug:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Join an organization by invite code (works for any visibility including INVITE_ONLY)
 */
export async function joinOrgByInviteCode(code: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({
            where: { invite_code: code },
            include: {
                Missions: { where: { status: 'ACCEPTED' }, include: { Mission: true } },
            }
        })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Invalid or expired invite code' }
        }
        if (org.leader_id === seller.id) {
            return { success: false, error: 'You are already the leader' }
        }

        // Auto-approve via invite code
        const membership = await prisma.organizationMember.upsert({
            where: {
                organization_id_seller_id: {
                    organization_id: org.id,
                    seller_id: seller.id,
                }
            },
            create: {
                organization_id: org.id,
                seller_id: seller.id,
                status: 'ACTIVE',
                invited_by: org.leader_id,
            },
            update: {
                status: 'ACTIVE',
                invited_by: org.leader_id,
            }
        })

        // Enroll in all accepted missions
        if (seller.user_id) {
            for (const orgMission of org.Missions) {
                await enrollSingleMemberInMission(
                    seller as { id: string; user_id: string },
                    orgMission.Mission,
                    orgMission.id
                )
            }
        }

        // Notify leader of new member (non-blocking)
        notifyLeaderOfNewMember(
            org.leader_id,
            org.name,
            seller.name || seller.email || 'A seller'
        ).catch(() => {})

        return { success: true, membership, organization: { id: org.id, name: org.name, slug: org.slug } }
    } catch (error) {
        console.error('[Org] Failed to join by invite code:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Leader updates organization settings (name, description, visibility)
 */
export async function updateOrganizationSettings(orgId: string, data: {
    name?: string
    description?: string
    visibility?: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
}) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can update settings' }
        }

        const updateData: any = {}
        if (data.name && data.name !== org.name) {
            updateData.name = data.name
            updateData.slug = await ensureUniqueSlug(generateSlug(data.name))
        }
        if (data.description !== undefined) updateData.description = data.description || null
        if (data.visibility) updateData.visibility = data.visibility

        const updated = await prisma.organization.update({
            where: { id: orgId },
            data: updateData,
        })

        return { success: true, organization: updated }
    } catch (error) {
        console.error('[Org] Failed to update settings:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get organization stats for organizer dashboard
 */
export async function getOrganizationStats(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org) return { success: false, error: 'Organization not found' }

        // Allow leader OR active member to view stats
        const isLeader = org.leader_id === seller.id
        if (!isLeader) {
            const membership = await prisma.organizationMember.findUnique({
                where: { organization_id_seller_id: { organization_id: orgId, seller_id: seller.id } }
            })
            if (!membership || membership.status !== 'ACTIVE') {
                return { success: false, error: 'Access denied' }
            }
        }

        const [memberCount, missionCount, commissions] = await Promise.all([
            prisma.organizationMember.count({
                where: { organization_id: orgId, status: 'ACTIVE' }
            }),
            prisma.organizationMission.count({
                where: { organization_id: orgId, status: 'ACCEPTED' }
            }),
            prisma.commission.findMany({
                where: { organization_mission_id: { not: null }, org_parent_commission_id: null },
                select: { commission_amount: true, status: true, organization_mission_id: true },
            }),
        ])

        // Filter commissions to only those belonging to this org's missions
        const orgMissions = await prisma.organizationMission.findMany({
            where: { organization_id: orgId },
            select: { id: true }
        })
        const orgMissionIds = new Set(orgMissions.map(m => m.id))
        const orgCommissions = commissions.filter(c => c.organization_mission_id && orgMissionIds.has(c.organization_mission_id))

        const totalRevenue = orgCommissions.reduce((sum, c) => sum + c.commission_amount, 0)
        const pendingRevenue = orgCommissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commission_amount, 0)

        return {
            success: true,
            stats: {
                memberCount,
                missionCount,
                totalCommissions: orgCommissions.length,
                totalRevenue,
                pendingRevenue,
            }
        }
    } catch (error) {
        console.error('[Org] Failed to get org stats:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get org commissions for the organizer dashboard
 */
export async function getOrganizationCommissions(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can view commissions' }
        }

        const orgMissions = await prisma.organizationMission.findMany({
            where: { organization_id: orgId },
            select: { id: true }
        })
        const orgMissionIds = orgMissions.map(m => m.id)

        const commissions = await prisma.commission.findMany({
            where: {
                organization_mission_id: { in: orgMissionIds },
                org_parent_commission_id: null, // exclude leader cuts from list
            },
            include: {
                Seller: { select: { name: true, email: true } },
            },
            orderBy: { created_at: 'desc' },
            take: 100,
        })

        // Fetch mission titles for display
        const missionIds = [...new Set(commissions.map(c => c.program_id))]
        const missions = await prisma.mission.findMany({
            where: { id: { in: missionIds } },
            select: { id: true, title: true }
        })
        const missionMap = new Map(missions.map(m => [m.id, m.title]))

        const commissionsWithMission = commissions.map(c => ({
            ...c,
            missionTitle: missionMap.get(c.program_id) || '-',
        }))

        return { success: true, commissions: commissionsWithMission }
    } catch (error) {
        console.error('[Org] Failed to get org commissions:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get per-mission commission stats for an org (leader only).
 * Returns a map: { [orgMissionId]: { count, revenue, pending } }
 */
export async function getOrgMissionStats(orgId: string) {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        const org = await prisma.organization.findUnique({ where: { id: orgId } })
        if (!org || org.leader_id !== seller.id) {
            return { success: false, error: 'Only the leader can view mission stats' }
        }

        const orgMissions = await prisma.organizationMission.findMany({
            where: { organization_id: orgId },
            select: { id: true }
        })

        const stats: Record<string, { count: number; revenue: number; pending: number }> = {}

        for (const om of orgMissions) {
            const commissions = await prisma.commission.findMany({
                where: {
                    organization_mission_id: om.id,
                    org_parent_commission_id: null, // member commissions only
                },
                select: { commission_amount: true, status: true }
            })

            stats[om.id] = {
                count: commissions.length,
                revenue: commissions.reduce((s, c) => s + c.commission_amount, 0),
                pending: commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commission_amount, 0),
            }
        }

        return { success: true, stats }
    } catch (error) {
        console.error('[Org] Failed to get mission stats:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get public org data by slug (no auth required — for public share page)
 */
export async function getPublicOrganization(slug: string) {
    try {
        const org = await prisma.organization.findUnique({
            where: { slug },
            include: {
                Leader: { select: { name: true } },
                _count: { select: { Members: { where: { status: 'ACTIVE' } }, Missions: { where: { status: 'ACCEPTED' } } } },
            }
        })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Organization not found' }
        }
        return {
            success: true,
            organization: {
                id: org.id,
                name: org.name,
                description: org.description,
                visibility: org.visibility,
                slug: org.slug,
                leaderName: org.Leader?.name,
                memberCount: org._count.Members,
                missionCount: org._count.Missions,
            }
        }
    } catch (error) {
        return { success: false, error: 'Unknown error' }
    }
}

// =============================================
// ORG MISSION DETAIL (for seller dashboard)
// =============================================

export type OrgMissionDetail = {
    mission: {
        id: string
        title: string
        companyName: string | null
        logoUrl: string | null
        lead_enabled: boolean
        sale_enabled: boolean
        recurring_enabled: boolean
        lead_reward_amount: number | null
        sale_reward_amount: number | null
        sale_reward_structure: string | null
        recurring_reward_amount: number | null
        recurring_reward_structure: string | null
    }
    orgDeal: {
        totalReward: string
        leaderReward: string | null
        memberReward: string | null
    }
    stats: { clicks: number; leads: number; sales: number; revenue: number }
    timeseries: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>
    memberBreakdown: Array<{
        sellerId: string
        name: string
        avatarUrl: string | null
        revenue: number
        salesCount: number
        leadsCount: number
        clicks: number
    }>
    isLeader: boolean
}

/**
 * Get detailed analytics for an org mission (for seller mission detail page).
 * Fetches Tinybird stats, timeseries, and per-member breakdown.
 */
export async function getOrgMissionDetail(orgMissionId: string): Promise<{
    success: boolean
    detail?: OrgMissionDetail
    error?: string
}> {
    try {
        const seller = await getSellerForCurrentUser()
        if (!seller) return { success: false, error: 'Not authenticated' }

        // Fetch org mission with related data
        const orgMission = await prisma.organizationMission.findUnique({
            where: { id: orgMissionId },
            include: {
                Organization: {
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
                        }
                    }
                },
                Mission: {
                    select: {
                        id: true, title: true, company_name: true, logo_url: true,
                        lead_enabled: true, sale_enabled: true, recurring_enabled: true,
                        lead_reward_amount: true, sale_reward_amount: true, sale_reward_structure: true,
                        recurring_reward_amount: true, recurring_reward_structure: true,
                        Workspace: {
                            select: {
                                name: true,
                                Profile: { select: { logo_url: true } }
                            }
                        }
                    }
                }
            }
        })

        if (!orgMission) return { success: false, error: 'Mission not found' }

        const org = orgMission.Organization
        const mission = orgMission.Mission

        // Verify user is leader or active member
        const isLeader = org.leader_id === seller.id
        const isMember = org.Members.some(m => m.seller_id === seller.id)
        if (!isLeader && !isMember) {
            return { success: false, error: 'Access denied' }
        }

        // Get all enrollments for this org mission
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                organization_mission_id: orgMissionId,
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

        // Map members by user_id
        const membersByUserId = new Map(
            org.Members.map(m => [m.Seller.user_id, {
                sellerId: m.Seller.id,
                name: m.Seller.name || m.Seller.email || '',
                avatarUrl: m.Seller.Profile?.avatar_url || null,
            }])
        )

        // Aggregate stats + per-member breakdown
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
        const memberBreakdown: OrgMissionDetail['memberBreakdown'] = []
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

        const dateMap = new Map<string, { clicks: number; leads: number; sales: number; revenue: number }>()
        for (let i = 0; i <= days; i++) {
            const d = new Date()
            d.setDate(d.getDate() - (days - i))
            const dateStr = d.toISOString().split('T')[0]
            dateMap.set(dateStr, { clicks: 0, leads: 0, sales: 0, revenue: 0 })
        }

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
                    companyName: mission.company_name || mission.Workspace?.name || null,
                    logoUrl: mission.logo_url || mission.Workspace?.Profile?.logo_url || null,
                    lead_enabled: mission.lead_enabled,
                    sale_enabled: mission.sale_enabled,
                    recurring_enabled: mission.recurring_enabled,
                    lead_reward_amount: mission.lead_reward_amount,
                    sale_reward_amount: mission.sale_reward_amount,
                    sale_reward_structure: mission.sale_reward_structure,
                    recurring_reward_amount: mission.recurring_reward_amount,
                    recurring_reward_structure: mission.recurring_reward_structure,
                },
                orgDeal: {
                    totalReward: orgMission.total_reward,
                    leaderReward: orgMission.leader_reward,
                    memberReward: orgMission.member_reward,
                },
                stats: { clicks: totalClicks, leads: totalLeads, sales: totalSales, revenue: totalRevenue },
                timeseries,
                memberBreakdown,
                isLeader,
            }
        }
    } catch (error) {
        console.error('[Org] Failed to get org mission detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get org info by invite code (for invite landing page, no auth required)
 */
export async function getOrgByInviteCode(code: string) {
    try {
        const org = await prisma.organization.findUnique({
            where: { invite_code: code },
            include: {
                Leader: { select: { name: true } },
                _count: { select: { Members: { where: { status: 'ACTIVE' } } } },
            }
        })
        if (!org || org.status !== 'ACTIVE') {
            return { success: false, error: 'Invalid or expired invite code' }
        }
        return {
            success: true,
            organization: {
                id: org.id,
                name: org.name,
                description: org.description,
                slug: org.slug,
                leaderName: org.Leader?.name,
                memberCount: org._count.Members,
            }
        }
    } catch (error) {
        return { success: false, error: 'Unknown error' }
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
 * Aligned with enrollSellerInGroupMission() pattern:
 *   - `-o` suffix on slugs (groups use `-g`)
 *   - P2002 collision handler with nanoid fallback
 *   - Custom domain passed to Redis
 *   - try-catch so one member failing doesn't block others
 *   - ARCHIVED enrollment reactivation
 */
async function enrollSingleMemberInMission(
    seller: { id: string; user_id: string | null },
    mission: { id: string; title: string; target_url: string; workspace_id: string },
    organizationMissionId: string
) {
    if (!seller.user_id) return

    try {
        // Check if already enrolled via this org mission
        const existing = await prisma.missionEnrollment.findFirst({
            where: {
                mission_id: mission.id,
                user_id: seller.user_id,
                organization_mission_id: organizationMissionId,
            }
        })

        // Handle ARCHIVED enrollment — reactivate
        if (existing && existing.status === 'ARCHIVED') {
            if (existing.link_id) {
                const oldLink = await prisma.shortLink.findUnique({
                    where: { id: existing.link_id }
                })
                if (oldLink) {
                    const verifiedDomain = await prisma.domain.findFirst({
                        where: { workspace_id: mission.workspace_id, verified: true }
                    })
                    const { setLinkInRedis } = await import('@/lib/redis')
                    await setLinkInRedis(oldLink.slug, {
                        url: oldLink.original_url,
                        linkId: oldLink.id,
                        workspaceId: oldLink.workspace_id,
                        sellerId: oldLink.affiliate_id,
                    }, verifiedDomain?.name || undefined)

                    await prisma.missionEnrollment.update({
                        where: { id: existing.id },
                        data: { status: 'APPROVED' }
                    })
                    console.log(`[Org] Reactivated ARCHIVED enrollment for seller ${seller.id}`)
                    return
                }
            }
            // Old ShortLink deleted — fall through to create new one below
        }

        if (existing && existing.status !== 'ARCHIVED') return // Already active — skip

        // Generate slug with -o suffix (like groups use -g)
        const missionSlug = mission.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 20)
        const affiliateCode = seller.user_id.slice(0, 8)
        let fullSlug = `${missionSlug}/${affiliateCode}-o`

        // Fetch custom domain
        const verifiedDomain = await prisma.domain.findFirst({
            where: { workspace_id: mission.workspace_id, verified: true }
        })
        const customDomain = verifiedDomain?.name || null

        // Create ShortLink (P2002 handler with nanoid fallback)
        let shortLink
        try {
            shortLink = await prisma.shortLink.create({
                data: {
                    slug: fullSlug,
                    original_url: mission.target_url,
                    workspace_id: mission.workspace_id,
                    affiliate_id: seller.user_id,
                    clicks: 0,
                }
            })
        } catch (slugError: any) {
            if (slugError?.code === 'P2002') {
                fullSlug = `${missionSlug}/${affiliateCode}-o-${nanoid(4)}`
                shortLink = await prisma.shortLink.create({
                    data: {
                        slug: fullSlug,
                        original_url: mission.target_url,
                        workspace_id: mission.workspace_id,
                        affiliate_id: seller.user_id,
                        clicks: 0,
                    }
                })
            } else {
                throw slugError
            }
        }

        // Set in Redis WITH custom domain
        const { setLinkInRedis } = await import('@/lib/redis')
        await setLinkInRedis(shortLink.slug, {
            url: shortLink.original_url,
            linkId: shortLink.id,
            workspaceId: shortLink.workspace_id,
            sellerId: shortLink.affiliate_id,
        }, customDomain || undefined)

        // Create or update MissionEnrollment
        if (existing && existing.status === 'ARCHIVED') {
            await prisma.missionEnrollment.update({
                where: { id: existing.id },
                data: { status: 'APPROVED', link_id: shortLink.id }
            })
        } else {
            await prisma.missionEnrollment.create({
                data: {
                    mission_id: mission.id,
                    user_id: seller.user_id,
                    status: 'APPROVED',
                    link_id: shortLink.id,
                    organization_mission_id: organizationMissionId,
                }
            })
        }

        console.log(`[Org] Enrolled seller ${seller.id} in mission ${mission.id} via org`)
    } catch (error) {
        console.error(`[Org] Failed to enroll seller ${seller.id}:`, error)
    }
}

// =============================================
// TRAAACTION TOP TIERCE — Default Organization
// =============================================

const TRAAACTION_ORG_SLUG = 'traaaction-top-tierce'

/**
 * Get or create the "Traaaction Top Tierce" default organization.
 * This org is system-managed: every seller joins it automatically on onboarding completion.
 */
async function getOrCreateTraaactionOrg(): Promise<string> {
    const existing = await prisma.organization.findUnique({
        where: { slug: TRAAACTION_ORG_SLUG }
    })
    if (existing) return existing.id

    // Find an admin seller to serve as leader
    const adminEmails = getAdminEmails()
    const adminSeller = await prisma.seller.findFirst({
        where: { email: { in: adminEmails } },
        select: { id: true }
    })
    if (!adminSeller) {
        throw new Error('No admin seller found — cannot create Traaaction org')
    }

    const org = await prisma.organization.create({
        data: {
            name: 'Traaaction Top Tierce',
            description: 'Le classement general Traaaction. Accedez a des contrats de commission superieurs negocies directement par Traaaction aupres des meilleures startups. Tous les sellers ayant complete leur profil rejoignent automatiquement cette organisation.',
            slug: TRAAACTION_ORG_SLUG,
            invite_code: nanoid(12),
            leader_id: adminSeller.id,
            status: 'ACTIVE',
            visibility: 'INVITE_ONLY',
        }
    })

    console.log(`[Org] Created Traaaction Top Tierce org: ${org.id}`)
    return org.id
}

/**
 * Auto-join a seller into the Traaaction Top Tierce org.
 * Called on onboarding completion (step 4). Idempotent.
 */
export async function autoJoinTraaactionOrg(sellerId: string) {
    try {
        // Verify the seller belongs to the current authenticated user
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            select: { id: true, user_id: true }
        })
        if (!seller?.user_id) return

        if (seller.user_id !== currentUser.userId) {
            console.error(`[Org] autoJoinTraaactionOrg: seller ${sellerId} does not belong to user ${currentUser.userId}`)
            return
        }

        const orgId = await getOrCreateTraaactionOrg()

        // Upsert membership (idempotent)
        await prisma.organizationMember.upsert({
            where: {
                organization_id_seller_id: {
                    organization_id: orgId,
                    seller_id: sellerId,
                }
            },
            create: {
                organization_id: orgId,
                seller_id: sellerId,
                status: 'ACTIVE',
            },
            update: {} // No-op if already member
        })

        // Enroll in all accepted missions of this org
        const orgMissions = await prisma.organizationMission.findMany({
            where: { organization_id: orgId, status: 'ACCEPTED' },
            include: { Mission: { select: { id: true, title: true, target_url: true, workspace_id: true } } }
        })

        for (const orgMission of orgMissions) {
            await enrollSingleMemberInMission(
                seller as { id: string; user_id: string },
                orgMission.Mission,
                orgMission.id
            )
        }

        console.log(`[Org] Auto-joined seller ${sellerId} into Traaaction Top Tierce`)
    } catch (error) {
        // Non-blocking — don't fail onboarding if this errors
        console.error('[Org] Failed to auto-join Traaaction org:', error)
    }
}

/**
 * Get the Traaaction Top Tierce card data for the browse page.
 * Returns org info, member count, mission count, and user status.
 */
export async function getTraaactionOrgCard() {
    try {
        const user = await getCurrentUser()

        // Ensure the org exists (creates it on first visit if needed)
        await getOrCreateTraaactionOrg()

        const org = await prisma.organization.findUnique({
            where: { slug: TRAAACTION_ORG_SLUG },
            include: {
                _count: {
                    select: {
                        Members: { where: { status: 'ACTIVE' } },
                        Missions: { where: { status: 'ACCEPTED' } },
                    }
                }
            }
        })

        if (!org) return { success: true, org: null }

        let isMember = false
        let profileComplete = false

        if (user) {
            // Find any seller for this user (regardless of status)
            const seller = await prisma.seller.findFirst({
                where: { user_id: user.userId },
                select: { id: true, onboarding_step: true }
            })

            if (seller) {
                profileComplete = seller.onboarding_step >= 4

                const membership = await prisma.organizationMember.findUnique({
                    where: {
                        organization_id_seller_id: {
                            organization_id: org.id,
                            seller_id: seller.id,
                        }
                    }
                })
                isMember = membership?.status === 'ACTIVE'
            }
        }

        return {
            success: true,
            org: {
                id: org.id,
                name: org.name,
                description: org.description,
                slug: org.slug,
                memberCount: org._count.Members,
                missionCount: org._count.Missions,
                isMember,
                profileComplete,
            }
        }
    } catch (error) {
        console.error('[Org] Failed to get Traaaction org card:', error)
        return { success: true, org: null }
    }
}
