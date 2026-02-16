'use client'

import { useState } from 'react'
import { UserPlus, Check, X, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { respondToEnrollmentRequest } from '@/app/actions/messaging'

interface EnrollmentRequestMetadata {
    programRequestId: string
    missionId: string
    missionTitle: string
    sellerName: string
    sellerEmail: string
    sellerAvatar?: string
}

interface EnrollmentRequestCardProps {
    messageId: string
    metadata: EnrollmentRequestMetadata
    actionStatus: string | null
    isOwnMessage: boolean
    onAction?: () => void
}

export default function EnrollmentRequestCard({ messageId, metadata, actionStatus, isOwnMessage, onAction }: EnrollmentRequestCardProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const status = actionStatus || 'PENDING'
    const statusColor = status === 'ACCEPTED' ? 'bg-emerald-500' : status === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500'

    async function handleAction(action: 'ACCEPTED' | 'REJECTED') {
        setLoading(true)
        setError('')
        const result = await respondToEnrollmentRequest(messageId, action)
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
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Enrollment Request</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{metadata.missionTitle}</p>
                    </div>
                </div>

                <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        {metadata.sellerAvatar ? (
                            <img src={metadata.sellerAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-medium">
                                {(metadata.sellerName || metadata.sellerEmail)[0].toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{metadata.sellerName || metadata.sellerEmail.split('@')[0]}</p>
                            <p className="text-xs text-gray-500 truncate">{metadata.sellerEmail}</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100">
                    {status === 'PENDING' && !isOwnMessage ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAction('ACCEPTED')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Approve
                            </button>
                            <button
                                onClick={() => handleAction('REJECTED')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" />
                                Reject
                            </button>
                        </div>
                    ) : status === 'PENDING' && isOwnMessage ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Waiting for review...
                        </div>
                    ) : status === 'ACCEPTED' ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                            <Check className="w-4 h-4" />
                            Approved
                        </div>
                    ) : status === 'REJECTED' ? (
                        <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
                            <X className="w-4 h-4" />
                            Rejected
                        </div>
                    ) : null}
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            </div>
        </motion.div>
    )
}
