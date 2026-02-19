'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageSquare, Send, User, CheckCheck, Gift, ExternalLink, Loader2, ArrowLeft, Plus, X, Handshake, Rocket } from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, springGentle } from '@/lib/animations'
import { getConversations, getMessages, sendMessage, markAsRead, sendMissionInviteCard } from '@/app/actions/messaging'
import { sendOrgDealProposalCard } from '@/app/actions/organization-actions'
import MessageCard from '@/components/messages/MessageCard'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

interface Conversation {
    id: string
    seller_id?: string
    partner_name: string | null
    partner_email: string
    partner_avatar?: string | null
    workspace_name: string
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
    message_type: string
    metadata: Record<string, unknown> | null
    action_status: string | null
}

// Loading fallback for Suspense
function MessagesLoading() {
    return (
        <div className="h-[calc(100vh-4rem)] bg-[#FAFAFA] flex items-center justify-center">
            <TraaactionLoader size={32} className="text-gray-400" />
        </div>
    )
}

// Main page wrapper with Suspense
export default function MessagesPage() {
    return (
        <Suspense fallback={<MessagesLoading />}>
            <MessagesContent />
        </Suspense>
    )
}

// ---- Quick Actions Popover (startup-side "+" button) ----

function QuickActionsPopover({
    sellerId,
    onClose,
    onDone,
}: {
    sellerId: string
    onClose: () => void
    onDone: () => void
}) {
    const [mode, setMode] = useState<null | 'deal' | 'invite'>(null)
    const [missions, setMissions] = useState<Array<{ id: string; title: string; reward: string }>>([])
    const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([])
    const [selectedMission, setSelectedMission] = useState('')
    const [selectedOrg, setSelectedOrg] = useState('')
    const [totalReward, setTotalReward] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [dataLoading, setDataLoading] = useState(false)

    // Load missions + orgs for this seller when opening a sub-mode
    useEffect(() => {
        if (mode) {
            setDataLoading(true)
            loadData()
        }
    }, [mode])

    async function loadData() {
        try {
            const { getWorkspaceMissions } = await import('@/app/actions/missions')
            const missionsResult = await getWorkspaceMissions()
            if (missionsResult.success && missionsResult.missions) {
                const filtered = missionsResult.missions.filter(m => m.status === 'ACTIVE' && !m.organization_id)
                setMissions(
                    (mode === 'deal' ? filtered.filter(m => m.visibility === 'INVITE_ONLY') : filtered)
                        .map(m => ({ id: m.id, title: m.title, reward: m.reward }))
                )
            }

            if (mode === 'deal') {
                const { getSellerOrganizations } = await import('@/app/actions/organization-actions')
                const orgsResult = await getSellerOrganizations(sellerId)
                if (orgsResult.success && orgsResult.organizations) {
                    setOrgs(orgsResult.organizations)
                }
            }
        } catch {
            // silent
        }
        setDataLoading(false)
    }

    async function handleSendDeal() {
        if (!selectedOrg || !selectedMission || !totalReward.trim()) {
            setError('All fields are required')
            return
        }
        setLoading(true)
        setError('')
        const result = await sendOrgDealProposalCard({ orgId: selectedOrg, missionId: selectedMission, totalReward, sellerId })
        if (!result.success) {
            setError(result.error || 'Failed')
            setLoading(false)
            return
        }
        setLoading(false)
        onDone()
    }

    async function handleSendInvite() {
        if (!selectedMission) {
            setError('Select a mission')
            return
        }
        setLoading(true)
        setError('')
        const result = await sendMissionInviteCard(sellerId, selectedMission)
        if (!result.success) {
            setError(result.error || 'Failed')
            setLoading(false)
            return
        }
        setLoading(false)
        onDone()
    }

    return (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            {!mode ? (
                <div className="p-2">
                    <button
                        onClick={() => setMode('deal')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Handshake className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Propose org deal</p>
                            <p className="text-xs text-gray-500">Send a deal to an org leader</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setMode('invite')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Rocket className="w-4 h-4 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Invite to mission</p>
                            <p className="text-xs text-gray-500">Invite this seller to a mission</p>
                        </div>
                    </button>
                </div>
            ) : dataLoading ? (
                <div className="p-6 flex items-center justify-center">
                    <TraaactionLoader size={20} className="text-gray-400" />
                </div>
            ) : mode === 'deal' ? (
                <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Propose Deal</p>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Organization</label>
                        <select
                            value={selectedOrg}
                            onChange={e => setSelectedOrg(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select org...</option>
                            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Mission</label>
                        <select
                            value={selectedMission}
                            onChange={e => setSelectedMission(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select mission...</option>
                            {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Total reward (e.g. 20% or 15€)</label>
                        <input
                            type="text"
                            value={totalReward}
                            onChange={e => setTotalReward(e.target.value)}
                            placeholder="20% or 15€"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                        onClick={handleSendDeal}
                        disabled={loading}
                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Deal'}
                    </button>
                </div>
            ) : (
                <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Invite to Mission</p>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Mission</label>
                        <select
                            value={selectedMission}
                            onChange={e => setSelectedMission(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Select mission...</option>
                            {missions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                        onClick={handleSendInvite}
                        disabled={loading}
                        className="w-full py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Invite'}
                    </button>
                </div>
            )}
        </div>
    )
}

function MessagesContent() {
    const t = useTranslations('messages')
    const searchParams = useSearchParams()
    const conversationParam = searchParams.get('conversation')

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedConversation, setSelectedConversation] = useState<string | null>(conversationParam)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showActions, setShowActions] = useState(false)
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
            markAsRead(selectedConversation, 'startup')
        }
    }, [selectedConversation])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function loadConversations() {
        const result = await getConversations('startup')
        if (result.success && result.conversations) {
            setConversations(result.conversations)
            // Auto-select first conversation only if no conversation is already selected
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
        const result = await sendMessage(selectedConversation, newMessage.trim(), 'STARTUP')

        if (result.success) {
            setNewMessage('')
            await loadMessages(selectedConversation)
            await loadConversations() // Refresh to update last_message
        }
        setSending(false)
    }

    async function handleCardAction() {
        if (selectedConversation) {
            await loadMessages(selectedConversation)
            await loadConversations()
        }
    }

    const selectedConvo = conversations.find(c => c.id === selectedConversation)

    if (loading) {
        return (
            <div className="h-[calc(100vh-4rem)] bg-[#FAFAFA] flex items-center justify-center">
                <TraaactionLoader size={28} className="text-gray-400" />
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-4rem)] bg-[#FAFAFA] flex rounded-xl overflow-hidden border border-gray-200">
            {/* Conversations List (Left) - Full width on mobile, fixed on desktop */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-gray-200 flex-col`}>
                <div className="p-4 sm:p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{conversations.length} {conversations.length !== 1 ? t('conversations') : t('conversation')}</p>
                </div>

                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                            {t('noMessages')}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {t('startConversation')}
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="flex-1 overflow-y-auto"
                    >
                        {conversations.map((convo) => {
                            const displayName = convo.partner_name || convo.partner_email.split('@')[0]
                            return (
                                <motion.button
                                    key={convo.id}
                                    variants={staggerItem}
                                    transition={springGentle}
                                    onClick={() => setSelectedConversation(convo.id)}
                                    className={`w-full p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                                        selectedConversation === convo.id ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {convo.partner_avatar ? (
                                            <img
                                                src={convo.partner_avatar}
                                                alt={displayName}
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-gray-900 truncate">{displayName}</p>
                                                {convo.unread_count > 0 && (
                                                    <span className="bg-violet-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                                                        {convo.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate mt-0.5">
                                                {convo.last_message || t('newConversation')}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(convo.last_at).toLocaleDateString('en-US')}
                                            </p>
                                        </div>
                                    </div>
                                </motion.button>
                            )
                        })}
                    </motion.div>
                )}
            </div>

            {/* Messages View (Right) - Hidden on mobile when no conversation selected */}
            <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#FAFAFA]`}>
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
                                {selectedConvo.seller_id ? (
                                    <Link
                                        href={`/dashboard/sellers/${selectedConvo.seller_id}/profile`}
                                        className="hover:ring-2 hover:ring-violet-300 transition-all rounded-full"
                                    >
                                        {selectedConvo.partner_avatar ? (
                                            <img
                                                src={selectedConvo.partner_avatar}
                                                alt={selectedConvo.partner_name || 'Seller'}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </Link>
                                ) : selectedConvo.partner_avatar ? (
                                    <img
                                        src={selectedConvo.partner_avatar}
                                        alt={selectedConvo.partner_name || 'Seller'}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">
                                        {selectedConvo.partner_name || selectedConvo.partner_email}
                                    </h3>
                                    <p className="text-sm text-gray-500">{selectedConvo.partner_email}</p>
                                </div>
                                {selectedConvo.seller_id && (
                                    <Link
                                        href={`/dashboard/sellers/${selectedConvo.seller_id}/profile`}
                                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        {t('viewProfile')}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => {
                                // Rich message card (not TEXT)
                                if (msg.message_type !== 'TEXT') {
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={springGentle}
                                            className="flex justify-center py-1"
                                        >
                                            <MessageCard
                                                messageId={msg.id}
                                                messageType={msg.message_type}
                                                metadata={msg.metadata}
                                                actionStatus={msg.action_status}
                                                isOwnMessage={msg.sender_type === 'STARTUP'}
                                                onAction={handleCardAction}
                                            />
                                        </motion.div>
                                    )
                                }

                                // Legacy invitation bubble (backward compat)
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={springGentle}
                                        className={`flex ${msg.sender_type === 'STARTUP' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                                                msg.is_invitation
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                                    : msg.sender_type === 'STARTUP'
                                                        ? 'bg-violet-500 text-white'
                                                        : 'bg-white border border-gray-200 text-gray-900'
                                            }`}
                                        >
                                            {msg.is_invitation && (
                                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/30">
                                                    <Gift className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{t('missionInvitation')}</span>
                                                </div>
                                            )}
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            <div className={`flex items-center gap-1 mt-1 ${
                                                msg.sender_type === 'STARTUP' || msg.is_invitation ? 'text-white/70' : 'text-gray-400'
                                            }`}>
                                                <span className="text-xs">
                                                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {msg.sender_type === 'STARTUP' && msg.read_at && (
                                                    <CheckCheck className="w-3 h-3" />
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Quick actions "+" button */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowActions(!showActions)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                            showActions
                                                ? 'bg-violet-500 text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {showActions ? <X className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                                    </button>
                                    {showActions && selectedConvo.seller_id && (
                                        <QuickActionsPopover
                                            sellerId={selectedConvo.seller_id}
                                            onClose={() => setShowActions(false)}
                                            onDone={() => {
                                                setShowActions(false)
                                                handleCardAction()
                                            }}
                                        />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder={t('writeMessage')}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || sending}
                                    className="w-10 h-10 bg-violet-500 hover:bg-violet-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors btn-press"
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
                                {t('selectConversation')}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {t('chooseConversation')}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
