'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Send, User, Building2, CheckCheck, Gift, ExternalLink, Loader2, ArrowLeft } from 'lucide-react'
import { getConversations, getMessages, sendMessage, markAsRead } from '@/app/actions/messaging'
import Link from 'next/link'

interface Conversation {
    id: string
    partner_name: string | null
    partner_email: string
    workspace_name: string
    workspace_id?: string
    workspace_logo?: string | null
    last_message: string | null
    last_at: Date
    unread_count: number
}

interface Message {
    id: string
    sender_type: 'STARTUP' | 'SELLER'
    content: string
    is_invitation: boolean
    created_at: Date
    read_at: Date | null
}

// Loading fallback for Suspense
function MessagesLoading() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    )
}

// Main page wrapper with Suspense
export default function PartnerMessagesPage() {
    return (
        <Suspense fallback={<MessagesLoading />}>
            <MessagesContent />
        </Suspense>
    )
}

function MessagesContent() {
    const searchParams = useSearchParams()
    const conversationParam = searchParams.get('conversation')

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationParam)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Load conversations
    useEffect(() => {
        loadConversations()
    }, [])

    // Handle conversation param from URL
    useEffect(() => {
        if (conversationParam && conversationParam !== selectedConversation) {
            setSelectedConversation(conversationParam)
        }
    }, [conversationParam])

    // Load messages when conversation changes
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation)
            // Mark as read
            markAsRead(selectedConversation, 'partner')
        }
    }, [selectedConversation])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function loadConversations() {
        const result = await getConversations('partner')
        if (result.success && result.conversations) {
            setConversations(result.conversations)
            // Auto-select first conversation only if no conversation is already selected (from URL or previous selection)
            if (result.conversations.length > 0 && !selectedConversation && !conversationParam) {
                setSelectedConversation(result.conversations[0].id)
            }
        }
        setLoading(false)
    }

    async function loadMessages(conversationId: string) {
        const result = await getMessages(conversationId)
        if (result.success && result.messages) {
            setMessages(result.messages)
        }
    }

    async function handleSendMessage() {
        if (!newMessage.trim() || !selectedConversation) return

        setSending(true)
        const result = await sendMessage(selectedConversation, newMessage.trim(), 'SELLER')

        if (result.success) {
            setNewMessage('')
            await loadMessages(selectedConversation)
            await loadConversations() // Refresh to update last_message
        }
        setSending(false)
    }

    const selectedConvo = conversations.find(c => c.id === selectedConversation)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex">
            {/* Conversations List (Left) - Full width on mobile, fixed on desktop */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
                <div className="p-4 sm:p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
                </div>

                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                            No messages yet
                        </h3>
                        <p className="text-sm text-gray-600">
                            Startups can send you messages and invitations here.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map((convo) => (
                            <button
                                key={convo.id}
                                onClick={() => setSelectedConversation(convo.id)}
                                className={`w-full p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedConversation === convo.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {convo.workspace_logo ? (
                                        <img
                                            src={convo.workspace_logo}
                                            alt={convo.workspace_name}
                                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-5 h-5 text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-gray-900 truncate">{convo.workspace_name}</p>
                                            {convo.unread_count > 0 && (
                                                <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                                    {convo.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mt-0.5">
                                            {convo.last_message || 'New conversation'}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(convo.last_at).toLocaleDateString('en-US')}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Messages View (Right) - Hidden on mobile when no conversation selected */}
            <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
                {selectedConvo ? (
                    <>
                        {/* Header */}
                        <div className="p-4 sm:p-6 bg-white border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                {/* Back button for mobile */}
                                <button
                                    onClick={() => setSelectedConversation(null)}
                                    className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                {selectedConvo.workspace_logo ? (
                                    <img
                                        src={selectedConvo.workspace_logo}
                                        alt={selectedConvo.workspace_name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{selectedConvo.workspace_name}</h3>
                                    <p className="text-sm text-gray-500">Startup</p>
                                </div>
                                {selectedConvo.workspace_id && (
                                    <Link
                                        href={`/seller/startup/${selectedConvo.workspace_id}`}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        View Profile
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender_type === 'SELLER' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.is_invitation
                                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                                : msg.sender_type === 'SELLER'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-900'
                                            }`}
                                    >
                                        {msg.is_invitation && (
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/30">
                                                <Gift className="w-4 h-4" />
                                                <span className="text-sm font-medium">Mission Invitation</span>
                                            </div>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`flex items-center gap-1 mt-1 ${msg.sender_type === 'SELLER' || msg.is_invitation ? 'text-white/70' : 'text-gray-400'
                                            }`}>
                                            <span className="text-xs">
                                                {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.sender_type === 'SELLER' && msg.read_at && (
                                                <CheckCheck className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Write a message..."
                                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-2">
                                Select a conversation
                            </h3>
                            <p className="text-sm text-gray-600">
                                Choose a conversation on the left to view messages.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
