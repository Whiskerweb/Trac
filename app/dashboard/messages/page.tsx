'use client'

import { useState, useEffect, useRef } from 'react'
import {
    MessageSquare,
    Send,
    Loader2,
    User,
    ArrowLeft,
    Gift
} from 'lucide-react'
import {
    getConversations,
    getMessages,
    sendMessage as sendMsgAction,
    markAsRead
} from '@/app/actions/messaging'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Conversation {
    id: string
    partner_name: string | null
    partner_email: string
    workspace_name: string
    last_message: string | null
    last_at: Date
    unread_count: number
}

interface Message {
    id: string
    sender_type: 'STARTUP' | 'PARTNER'
    content: string
    is_invitation: boolean
    created_at: Date
    read_at: Date | null
}

function ConversationItem({
    conversation,
    isActive,
    onClick
}: {
    conversation: Conversation
    isActive: boolean
    onClick: () => void
}) {
    const displayName = conversation.partner_name || conversation.partner_email.split('@')[0]

    return (
        <button
            onClick={onClick}
            className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-gray-50' : ''
                }`}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 truncate">{displayName}</span>
                        {conversation.unread_count > 0 && (
                            <span className="bg-black text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                                {conversation.unread_count}
                            </span>
                        )}
                    </div>
                    {conversation.last_message && (
                        <p className="text-sm text-gray-500 truncate">{conversation.last_message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(conversation.last_at), { addSuffix: true, locale: fr })}
                    </p>
                </div>
            </div>
        </button>
    )
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.is_invitation
                    ? 'bg-amber-50 border border-amber-200'
                    : isOwn
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900'
                }`}>
                {message.is_invitation && (
                    <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium mb-2">
                        <Gift className="w-3.5 h-3.5" />
                        Invitation
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
                </p>
            </div>
        </div>
    )
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sendingMessage, setSendingMessage] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const loadConversations = async () => {
        const result = await getConversations('startup')
        if (result.success && result.conversations) {
            setConversations(result.conversations)
        }
        setLoading(false)
    }

    const loadMessages = async (conversationId: string) => {
        const result = await getMessages(conversationId)
        if (result.success && result.messages) {
            setMessages(result.messages)
        }
    }

    useEffect(() => {
        loadConversations()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSelectConversation = async (conversation: Conversation) => {
        setActiveConversation(conversation)
        await loadMessages(conversation.id)
        if (conversation.unread_count > 0) {
            await markAsRead(conversation.id, 'startup')
            setConversations(prev => prev.map(c =>
                c.id === conversation.id ? { ...c, unread_count: 0 } : c
            ))
        }
    }

    const handleSendMessage = async () => {
        if (!activeConversation || !newMessage.trim()) return

        setSendingMessage(true)
        const result = await sendMsgAction(activeConversation.id, newMessage, 'STARTUP')
        if (result.success) {
            setNewMessage('')
            await loadMessages(activeConversation.id)
            await loadConversations()
        }
        setSendingMessage(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-black tracking-tight">Messages</h1>
                <p className="text-gray-500 text-sm mt-1">Communiquez avec vos partenaires.</p>
            </div>

            {/* Chat Layout */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex">
                {/* Conversations Sidebar */}
                <div className={`w-80 border-r border-gray-200 flex-shrink-0 ${activeConversation ? 'hidden md:block' : ''}`}>
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Conversations</h2>
                    </div>
                    <div className="overflow-y-auto h-full">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Aucune conversation</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <ConversationItem
                                    key={conv.id}
                                    conversation={conv}
                                    isActive={activeConversation?.id === conv.id}
                                    onClick={() => handleSelectConversation(conv)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : ''}`}>
                    {activeConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                                <button
                                    onClick={() => setActiveConversation(null)}
                                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">
                                        {activeConversation.partner_name || activeConversation.partner_email}
                                    </h3>
                                    <p className="text-xs text-gray-500">{activeConversation.partner_email}</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map(msg => (
                                    <MessageBubble
                                        key={msg.id}
                                        message={msg}
                                        isOwn={msg.sender_type === 'STARTUP'}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        placeholder="Écrivez votre message..."
                                        className="flex-1 px-4 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={sendingMessage || !newMessage.trim()}
                                        className="p-2.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {sendingMessage ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="font-medium">Sélectionnez une conversation</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Choisissez un partenaire pour commencer à discuter
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
