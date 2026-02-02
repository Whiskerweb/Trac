'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { revalidatePath } from 'next/cache'

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
        partner_name: string | null
        partner_email: string
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
                        select: { name: true, email: true }
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
                    partner_name: c.Seller.name,
                    partner_email: c.Seller.email,
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
                read_at: m.read_at
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

        // TODO: Send email notification (implement later)
        // await sendMessageNotificationEmail(conversation, message)

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
