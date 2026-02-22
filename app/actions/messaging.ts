'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { MessageType, MessageActionStatus, Prisma } from '@/lib/generated/prisma/client'
import { notifyAsync } from '@/lib/notifications'

// =============================================
// MESSAGING SYSTEM - SERVER ACTIONS
// =============================================

/**
 * Get conversations for the current user (startup or partner)
 */
export async function getConversations(role: 'startup' | 'partner'): Promise<{
    success: boolean
    conversations?: Array<{
        id: string
        seller_id?: string
        partner_name: string | null
        partner_email: string
        partner_avatar?: string | null
        workspace_name: string
        workspace_id?: string
        workspace_logo?: string | null
        last_message: string | null
        last_at: Date
        unread_count: number
    }>
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        if (role === 'startup') {
            const workspace = await getActiveWorkspaceForUser()
            if (!workspace) {
                return { success: false, error: 'No active workspace' }
            }

            const conversations = await prisma.conversation.findMany({
                where: { workspace_id: workspace.workspaceId },
                include: {
                    Seller: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            Profile: {
                                select: { avatar_url: true }
                            }
                        }
                    },
                    Workspace: {
                        select: { name: true }
                    }
                },
                orderBy: { last_at: 'desc' }
            })

            return {
                success: true,
                conversations: conversations.map(c => ({
                    id: c.id,
                    seller_id: c.Seller.id,
                    partner_name: c.Seller.name,
                    partner_email: c.Seller.email,
                    partner_avatar: c.Seller.Profile?.avatar_url || null,
                    workspace_name: c.Workspace.name,
                    last_message: c.last_message,
                    last_at: c.last_at,
                    unread_count: c.unread_startup
                }))
            }
        } else {
            // Partner role - find ALL seller records for this user
            const sellers = await prisma.seller.findMany({
                where: { user_id: user.id },
                select: { id: true }
            })

            if (sellers.length === 0) {
                return { success: false, error: 'Partner not found' }
            }

            const sellerIds = sellers.map(s => s.id)

            const conversations = await prisma.conversation.findMany({
                where: { seller_id: { in: sellerIds } },
                include: {
                    Seller: {
                        select: { name: true, email: true }
                    },
                    Workspace: {
                        select: { id: true, name: true, Profile: { select: { logo_url: true } } }
                    }
                },
                orderBy: { last_at: 'desc' }
            })

            return {
                success: true,
                conversations: conversations.map(c => ({
                    id: c.id,
                    partner_name: c.Seller.name,
                    partner_email: c.Seller.email,
                    workspace_name: c.Workspace.name,
                    workspace_id: c.Workspace.id,
                    workspace_logo: c.Workspace.Profile?.logo_url || null,
                    last_message: c.last_message,
                    last_at: c.last_at,
                    unread_count: c.unread_partner
                }))
            }
        }
    } catch (error) {
        console.error('[Messaging] ❌ getConversations error:', error)
        return { success: false, error: 'Failed to fetch conversations' }
    }
}

/**
 * Get total unread message count for sidebar badge
 */
export async function getUnreadCount(role: 'startup' | 'partner'): Promise<number> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return 0

        if (role === 'startup') {
            const workspace = await getActiveWorkspaceForUser()
            if (!workspace) return 0
            const result = await prisma.conversation.aggregate({
                where: { workspace_id: workspace.workspaceId },
                _sum: { unread_startup: true }
            })
            return result._sum.unread_startup || 0
        } else {
            const sellers = await prisma.seller.findMany({
                where: { user_id: user.id },
                select: { id: true }
            })
            if (sellers.length === 0) return 0
            const result = await prisma.conversation.aggregate({
                where: { seller_id: { in: sellers.map(s => s.id) } },
                _sum: { unread_partner: true }
            })
            return result._sum.unread_partner || 0
        }
    } catch {
        return 0
    }
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(conversationId: string): Promise<{
    success: boolean
    messages?: Array<{
        id: string
        sender_type: 'STARTUP' | 'SELLER'
        content: string
        is_invitation: boolean
        created_at: Date
        read_at: Date | null
        message_type: string
        metadata: Record<string, unknown> | null
        action_status: string | null
    }>
    error?: string
}> {
    try {
        const messages = await prisma.message.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: 'asc' }
        })

        return {
            success: true,
            messages: messages.map(m => ({
                id: m.id,
                sender_type: m.sender_type as 'STARTUP' | 'SELLER',
                content: m.content,
                is_invitation: m.is_invitation,
                created_at: m.created_at,
                read_at: m.read_at,
                message_type: m.message_type,
                metadata: m.metadata as Record<string, unknown> | null,
                action_status: m.action_status,
            }))
        }
    } catch (error) {
        console.error('[Messaging] ❌ getMessages error:', error)
        return { success: false, error: 'Failed to fetch messages' }
    }
}

/**
 * Send a message in a conversation
 * Startup can always send, Partner can only reply in existing conversations
 */
export async function sendMessage(
    conversationId: string,
    content: string,
    senderType: 'STARTUP' | 'SELLER'
): Promise<{
    success: boolean
    message?: { id: string }
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    if (!content.trim()) {
        return { success: false, error: 'Message cannot be empty' }
    }

    try {
        // Verify conversation exists and user has access
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                Seller: true,
                Workspace: true
            }
        })

        if (!conversation) {
            return { success: false, error: 'Conversation not found' }
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                conversation_id: conversationId,
                sender_type: senderType,
                content: content.trim()
            }
        })

        // Update conversation metadata
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                last_message: content.trim().slice(0, 100),
                last_at: new Date(),
                // Increment unread count for the other side
                ...(senderType === 'STARTUP'
                    ? { unread_partner: { increment: 1 } }
                    : { unread_startup: { increment: 1 } }
                )
            }
        })

        // Email notification for new message
        if (senderType === 'STARTUP' && conversation.Seller?.user_id) {
            // Startup sent → notify seller
            notifyAsync({
                category: 'new_message',
                userId: conversation.Seller.user_id,
                email: conversation.Seller.email,
                sellerId: conversation.Seller.id,
                data: {
                    senderName: conversation.Workspace?.name || 'A startup',
                    messagePreview: content.trim(),
                    recipientType: 'seller',
                },
            })
        } else if (senderType === 'SELLER' && conversation.Workspace?.owner_id) {
            // Seller sent → notify startup owner
            const ownerSeller = await prisma.seller.findFirst({
                where: { user_id: conversation.Workspace.owner_id },
                select: { email: true },
            })
            if (ownerSeller?.email) {
                notifyAsync({
                    category: 'new_message',
                    userId: conversation.Workspace.owner_id,
                    email: ownerSeller.email,
                    data: {
                        senderName: conversation.Seller?.name || conversation.Seller?.email || 'A seller',
                        messagePreview: content.trim(),
                        recipientType: 'startup',
                    },
                })
            }
        }

        revalidatePath('/dashboard/messages')
        revalidatePath('/seller/messages')

        return { success: true, message: { id: message.id } }

    } catch (error) {
        console.error('[Messaging] ❌ sendMessage error:', error)
        return { success: false, error: 'Failed to send message' }
    }
}

/**
 * Initialize a conversation (Startup-only action)
 */
export async function initializeConversation(partnerId: string): Promise<{
    success: boolean
    conversationId?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Check if conversation already exists
        const existing = await prisma.conversation.findUnique({
            where: {
                workspace_id_seller_id: {
                    workspace_id: workspace.workspaceId,
                    seller_id: partnerId
                }
            }
        })

        if (existing) {
            return { success: true, conversationId: existing.id }
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                workspace_id: workspace.workspaceId,
                seller_id: partnerId
            }
        })

        return { success: true, conversationId: conversation.id }

    } catch (error) {
        console.error('[Messaging] ❌ initializeConversation error:', error)
        return { success: false, error: 'Failed to start conversation' }
    }
}

/**
 * Mark conversation as read
 */
export async function markAsRead(
    conversationId: string,
    role: 'startup' | 'partner'
): Promise<{ success: boolean; error?: string }> {
    try {
        // Mark all messages as read
        await prisma.message.updateMany({
            where: {
                conversation_id: conversationId,
                sender_type: role === 'startup' ? 'SELLER' : 'STARTUP',
                read_at: null
            },
            data: { read_at: new Date() }
        })

        // Reset unread counter
        await prisma.conversation.update({
            where: { id: conversationId },
            data: role === 'startup'
                ? { unread_startup: 0 }
                : { unread_partner: 0 }
        })

        return { success: true }

    } catch (error) {
        console.error('[Messaging] ❌ markAsRead error:', error)
        return { success: false, error: 'Failed to mark as read' }
    }
}

/**
 * Get or create a conversation for a seller with a specific workspace
 * This allows sellers to initiate conversations with startups
 */
export async function getOrCreateConversationForSeller(workspaceId: string): Promise<{
    success: boolean
    conversationId?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    try {
        // Find seller record for this user (global seller with program_id = null)
        const seller = await prisma.seller.findFirst({
            where: {
                user_id: user.id,
                program_id: null
            }
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        // Check if conversation already exists
        const existing = await prisma.conversation.findUnique({
            where: {
                workspace_id_seller_id: {
                    workspace_id: workspaceId,
                    seller_id: seller.id
                }
            }
        })

        if (existing) {
            return { success: true, conversationId: existing.id }
        }

        // Create new conversation
        const conversation = await prisma.conversation.create({
            data: {
                workspace_id: workspaceId,
                seller_id: seller.id
            }
        })

        revalidatePath('/seller/messages')

        return { success: true, conversationId: conversation.id }

    } catch (error) {
        console.error('[Messaging] ❌ getOrCreateConversationForSeller error:', error)
        return { success: false, error: 'Failed to start conversation' }
    }
}

/**
 * Create an invitation message (when startup invites partner to a mission)
 */
export async function createInvitationMessage(
    partnerId: string,
    missionTitle: string,
    requestId?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' }
    }

    const workspace = await getActiveWorkspaceForUser()
    if (!workspace) {
        return { success: false, error: 'No active workspace' }
    }

    try {
        // Get or create conversation
        let conversation = await prisma.conversation.findUnique({
            where: {
                workspace_id_seller_id: {
                    workspace_id: workspace.workspaceId,
                    seller_id: partnerId
                }
            }
        })

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    workspace_id: workspace.workspaceId,
                    seller_id: partnerId
                }
            })
        }

        // Create invitation message
        const invitationContent = `🎯 You are invited to join the mission "${missionTitle}". Click to see details and accept the invitation.`

        await prisma.message.create({
            data: {
                conversation_id: conversation.id,
                sender_type: 'STARTUP',
                content: invitationContent,
                is_invitation: true,
                invitation_id: requestId
            }
        })

        // Update conversation
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                last_message: invitationContent.slice(0, 100),
                last_at: new Date(),
                unread_partner: { increment: 1 }
            }
        })

        return { success: true }

    } catch (error) {
        console.error('[Messaging] ❌ createInvitationMessage error:', error)
        return { success: false, error: 'Failed to create invitation message' }
    }
}

/**
 * Mark all conversations as read for the current startup workspace
 */
export async function markAllMessagesAsRead(): Promise<{ success: boolean; error?: string }> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        await prisma.conversation.updateMany({
            where: {
                workspace_id: workspace.workspaceId,
                unread_startup: { gt: 0 },
            },
            data: { unread_startup: 0 },
        })

        revalidatePath('/dashboard/messages')
        return { success: true }
    } catch (error) {
        console.error('[Messaging] markAllMessagesAsRead error:', error)
        return { success: false, error: 'Failed to mark all as read' }
    }
}

// =============================================
// RICH MESSAGES — Helpers & Actions
// =============================================

/**
 * Internal helper: send a rich message (card) in a conversation.
 * Creates the Message with message_type, metadata, action_status
 * and updates the conversation's last_message / unread counters.
 */
export async function sendRichMessage({
    workspaceId,
    sellerId,
    senderType,
    messageType,
    content,
    metadata,
    actionStatus = 'PENDING',
}: {
    workspaceId: string
    sellerId: string
    senderType: 'STARTUP' | 'SELLER'
    messageType: MessageType
    content: string
    metadata: Record<string, unknown>
    actionStatus?: MessageActionStatus
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        // Upsert conversation
        let conversation = await prisma.conversation.findUnique({
            where: { workspace_id_seller_id: { workspace_id: workspaceId, seller_id: sellerId } }
        })
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: { workspace_id: workspaceId, seller_id: sellerId }
            })
        }

        const message = await prisma.message.create({
            data: {
                conversation_id: conversation.id,
                sender_type: senderType,
                content,
                message_type: messageType,
                metadata: metadata as Prisma.InputJsonValue,
                action_status: actionStatus,
            }
        })

        const preview = content.slice(0, 100)
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                last_message: preview,
                last_at: new Date(),
                ...(senderType === 'STARTUP'
                    ? { unread_partner: { increment: 1 } }
                    : { unread_startup: { increment: 1 } }
                )
            }
        })

        return { success: true, messageId: message.id }
    } catch (error) {
        console.error('[Messaging] sendRichMessage error:', error)
        return { success: false, error: 'Failed to send rich message' }
    }
}

/**
 * Internal helper: sync the action_status of a card message.
 * Finds the message by message_type + a metadata field match within a conversation,
 * then updates its action_status (and optionally merges extra metadata).
 */
export async function syncMessageCardStatus({
    workspaceId,
    sellerId,
    messageType,
    metadataKey,
    metadataValue,
    newStatus,
    extraMetadata,
}: {
    workspaceId: string
    sellerId: string
    messageType: MessageType
    metadataKey: string
    metadataValue: string
    newStatus: MessageActionStatus
    extraMetadata?: Record<string, unknown>
}): Promise<void> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { workspace_id_seller_id: { workspace_id: workspaceId, seller_id: sellerId } }
        })
        if (!conversation) return

        // Find the most recent matching card message
        const messages = await prisma.message.findMany({
            where: {
                conversation_id: conversation.id,
                message_type: messageType,
            },
            orderBy: { created_at: 'desc' },
        })

        const target = messages.find(m => {
            const meta = m.metadata as Record<string, unknown> | null
            return meta && meta[metadataKey] === metadataValue
        })

        if (!target) return

        const updateData: Prisma.MessageUpdateInput = { action_status: newStatus }
        if (extraMetadata) {
            const existingMeta = (target.metadata as Record<string, unknown>) || {}
            updateData.metadata = { ...existingMeta, ...extraMetadata } as Prisma.InputJsonValue
        }

        await prisma.message.update({
            where: { id: target.id },
            data: updateData,
        })
    } catch (error) {
        console.error('[Messaging] syncMessageCardStatus error:', error)
    }
}

// =============================================
// ORG DEAL PROPOSAL — respond from chat
// =============================================

/**
 * Leader responds to an org deal proposal card in the chat.
 * Calls acceptOrgMission or rejectOrgMission under the hood,
 * then updates the card status.
 */
export async function respondToOrgDeal(
    messageId: string,
    action: 'ACCEPTED' | 'REJECTED',
    leaderCut?: string
): Promise<{ success: boolean; error?: string; memberReward?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const message = await prisma.message.findUnique({ where: { id: messageId } })
        if (!message || message.message_type !== 'ORG_DEAL_PROPOSAL') {
            return { success: false, error: 'Message not found or wrong type' }
        }
        if (message.action_status !== 'PENDING') {
            return { success: false, error: 'Already responded' }
        }

        const meta = message.metadata as Record<string, unknown>
        const orgMissionId = meta.orgMissionId as string

        if (action === 'ACCEPTED') {
            if (!leaderCut) return { success: false, error: 'Leader cut is required' }
            // Dynamically import to avoid circular deps
            const { acceptOrgMission } = await import('./organization-actions')
            const result = await acceptOrgMission(orgMissionId, leaderCut)
            if (!result.success) return { success: false, error: result.error }

            // Update card
            await prisma.message.update({
                where: { id: messageId },
                data: {
                    action_status: 'ACCEPTED',
                    metadata: {
                        ...meta,
                        leaderReward: leaderCut,
                        memberReward: result.memberReward,
                    } as Prisma.InputJsonValue,
                }
            })

            revalidatePath('/seller/messages')
            revalidatePath('/dashboard/messages')
            return { success: true, memberReward: result.memberReward }
        } else {
            const { rejectOrgMission } = await import('./organization-actions')
            const result = await rejectOrgMission(orgMissionId)
            if (!result.success) return { success: false, error: result.error }

            await prisma.message.update({
                where: { id: messageId },
                data: { action_status: 'REJECTED' }
            })

            revalidatePath('/seller/messages')
            revalidatePath('/dashboard/messages')
            return { success: true }
        }
    } catch (error) {
        console.error('[Messaging] respondToOrgDeal error:', error)
        return { success: false, error: 'Failed to respond to deal' }
    }
}

// =============================================
// MISSION INVITE — send & respond from chat
// =============================================

/**
 * Startup sends a mission invite card to a seller via chat.
 */
export async function sendMissionInviteCard(
    sellerId: string,
    missionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: false, error: 'Not authenticated' }

        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: workspace.workspaceId }
        })
        if (!mission) return { success: false, error: 'Mission not found' }

        // Build reward display string
        let rewardDisplay = mission.reward || ''
        if (mission.sale_enabled && mission.sale_reward_amount) {
            const struct = mission.sale_reward_structure === 'PERCENTAGE' ? '%' : '€'
            rewardDisplay = `${mission.sale_reward_amount}${struct}/sale`
        }

        const content = `You're invited to join "${mission.title}". Reward: ${rewardDisplay}`

        await sendRichMessage({
            workspaceId: workspace.workspaceId,
            sellerId,
            senderType: 'STARTUP',
            messageType: 'MISSION_INVITE',
            content,
            metadata: {
                missionId: mission.id,
                missionTitle: mission.title,
                reward: rewardDisplay,
                companyName: mission.company_name || '',
                logoUrl: mission.logo_url || '',
            },
        })

        revalidatePath('/dashboard/messages')
        revalidatePath('/seller/messages')
        return { success: true }
    } catch (error) {
        console.error('[Messaging] sendMissionInviteCard error:', error)
        return { success: false, error: 'Failed to send invite' }
    }
}

/**
 * Seller responds to a mission invite card in the chat.
 */
export async function respondToMissionInvite(
    messageId: string,
    action: 'ACCEPTED' | 'REJECTED'
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const message = await prisma.message.findUnique({ where: { id: messageId } })
        if (!message || message.message_type !== 'MISSION_INVITE') {
            return { success: false, error: 'Message not found or wrong type' }
        }
        if (message.action_status !== 'PENDING') {
            return { success: false, error: 'Already responded' }
        }

        const meta = message.metadata as Record<string, unknown>
        const missionId = meta.missionId as string

        if (action === 'ACCEPTED') {
            const { joinMission } = await import('./marketplace')
            const result = await joinMission(missionId)
            if (!result.success) return { success: false, error: result.error }

            await prisma.message.update({
                where: { id: messageId },
                data: {
                    action_status: 'ACCEPTED',
                    metadata: { ...meta, enrollmentId: result.enrollment?.id || null } as Prisma.InputJsonValue,
                }
            })
        } else {
            await prisma.message.update({
                where: { id: messageId },
                data: { action_status: 'REJECTED' }
            })
        }

        revalidatePath('/seller/messages')
        revalidatePath('/dashboard/messages')
        return { success: true }
    } catch (error) {
        console.error('[Messaging] respondToMissionInvite error:', error)
        return { success: false, error: 'Failed to respond to invite' }
    }
}

// =============================================
// ENROLLMENT REQUEST — respond from chat
// =============================================

/**
 * Startup responds to an enrollment request card in the chat.
 */
export async function respondToEnrollmentRequest(
    messageId: string,
    action: 'ACCEPTED' | 'REJECTED'
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getCurrentUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const message = await prisma.message.findUnique({ where: { id: messageId } })
        if (!message || message.message_type !== 'ENROLLMENT_REQUEST') {
            return { success: false, error: 'Message not found or wrong type' }
        }
        if (message.action_status !== 'PENDING') {
            return { success: false, error: 'Already responded' }
        }

        const meta = message.metadata as Record<string, unknown>
        const programRequestId = meta.programRequestId as string

        if (action === 'ACCEPTED') {
            const { approveProgramRequest } = await import('./marketplace-actions')
            const result = await approveProgramRequest(programRequestId)
            if (!result.success) return { success: false, error: result.error }
        } else {
            const { rejectProgramRequest } = await import('./marketplace-actions')
            const result = await rejectProgramRequest(programRequestId)
            if (!result.success) return { success: false, error: result.error }
        }

        await prisma.message.update({
            where: { id: messageId },
            data: { action_status: action }
        })

        revalidatePath('/dashboard/messages')
        revalidatePath('/seller/messages')
        return { success: true }
    } catch (error) {
        console.error('[Messaging] respondToEnrollmentRequest error:', error)
        return { success: false, error: 'Failed to respond to request' }
    }
}
