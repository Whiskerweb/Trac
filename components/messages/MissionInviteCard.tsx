'use client'

import { useState } from 'react'
import { Rocket, Check, X, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { respondToMissionInvite } from '@/app/actions/messaging'

interface MissionInviteMetadata {
    missionId: string
    missionTitle: string
    reward: string
    companyName: string
    logoUrl?: string
    enrollmentId?: string
}

interface MissionInviteCardProps {
    messageId: string
    metadata: MissionInviteMetadata
    actionStatus: string | null
    isOwnMessage: boolean
    onAction?: () => void
}

export default function MissionInviteCard({ messageId, metadata, actionStatus, isOwnMessage, onAction }: MissionInviteCardProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const status = actionStatus || 'PENDING'
    const statusColor = status === 'ACCEPTED' ? 'bg-emerald-500' : status === 'REJECTED' ? 'bg-red-500' : 'bg-violet-500'

    async function handleAction(action: 'ACCEPTED' | 'REJECTED') {
        setLoading(true)
        setError('')
        const result = await respondToMissionInvite(messageId, action)
        if (!result.success) {
            setError(result.error || 'Failed')
        }
        setLoading(false)
        onAction?.()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm mx-auto"
        >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`h-1 ${statusColor}`} />

                <div className="px-4 py-3 flex items-center gap-2.5 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Rocket className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mission Invite</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{metadata.missionTitle}</p>
                    </div>
                    {metadata.logoUrl && (
                        <img src={metadata.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    )}
                </div>

                <div className="px-4 py-3 space-y-2">
                    {metadata.companyName && (
                        <p className="text-xs text-gray-500">{metadata.companyName}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Reward</span>
                        <span className="font-semibold text-violet-600">{metadata.reward}</span>
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100">
                    {status === 'PENDING' && !isOwnMessage ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAction('ACCEPTED')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Join
                            </button>
                            <button
                                onClick={() => handleAction('REJECTED')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" />
                                Decline
                            </button>
                        </div>
                    ) : status === 'PENDING' && isOwnMessage ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Waiting for response...
                        </div>
                    ) : status === 'ACCEPTED' ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                                <Check className="w-4 h-4" />
                                Joined
                            </div>
                            {!isOwnMessage && metadata.missionId && (
                                <a
                                    href={`/seller/marketplace/${metadata.missionId}`}
                                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                                >
                                    View <ArrowRight className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    ) : status === 'REJECTED' ? (
                        <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
                            <X className="w-4 h-4" />
                            Declined
                        </div>
                    ) : null}
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            </div>
        </motion.div>
    )
}
