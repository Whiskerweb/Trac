'use client'

import { useState } from 'react'
import { Handshake, Check, X, Loader2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { respondToOrgDeal } from '@/app/actions/messaging'

interface OrgDealMetadata {
    orgMissionId: string
    orgId: string
    orgName: string
    missionId: string
    missionTitle: string
    totalReward: string
    companyName: string
    logoUrl?: string
    leaderReward?: string
    memberReward?: string
}

interface OrgDealCardProps {
    messageId: string
    metadata: OrgDealMetadata
    actionStatus: string | null
    isOwnMessage: boolean // true if current user sent this card
    onAction?: () => void
}

export default function OrgDealCard({ messageId, metadata, actionStatus, isOwnMessage, onAction }: OrgDealCardProps) {
    const [leaderCut, setLeaderCut] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const status = actionStatus || 'PENDING'
    const isPercentage = metadata.totalReward.includes('%')

    // Compute org share and preview
    let orgShare = ''
    let memberPreview = ''
    if (isPercentage) {
        const total = parseFloat(metadata.totalReward.replace('%', ''))
        const platformFee = 15
        const share = total - platformFee
        orgShare = `${share}%`
        if (leaderCut) {
            const lc = parseFloat(leaderCut)
            if (!isNaN(lc) && lc >= 0 && lc <= share) {
                memberPreview = `${(share - lc).toFixed(1).replace(/\.0$/, '')}%`
            }
        }
    } else {
        const match = metadata.totalReward.match(/(\d+(?:\.\d+)?)/)
        if (match) {
            const total = parseFloat(match[1])
            const platformFee = total * 0.15
            const share = total - platformFee
            orgShare = `${share % 1 === 0 ? share : share.toFixed(2)}€`
            if (leaderCut) {
                const lcMatch = leaderCut.match(/(\d+(?:\.\d+)?)/)
                if (lcMatch) {
                    const lc = parseFloat(lcMatch[1])
                    if (!isNaN(lc) && lc >= 0 && lc <= share) {
                        const mp = share - lc
                        memberPreview = `${mp % 1 === 0 ? mp : mp.toFixed(2)}€`
                    }
                }
            }
        }
    }

    const statusColor = status === 'ACCEPTED' ? 'bg-emerald-500' : status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'

    async function handleAccept() {
        if (!leaderCut.trim()) {
            setError('Enter your leader cut')
            return
        }
        setLoading(true)
        setError('')
        const formatted = isPercentage ? `${leaderCut}%` : `${leaderCut}€`
        const result = await respondToOrgDeal(messageId, 'ACCEPTED', formatted)
        if (!result.success) {
            setError(result.error || 'Failed')
        }
        setLoading(false)
        onAction?.()
    }

    async function handleReject() {
        setLoading(true)
        setError('')
        const result = await respondToOrgDeal(messageId, 'REJECTED')
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
                {/* Color bar */}
                <div className={`h-1 ${statusColor}`} />

                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-2.5 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Handshake className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Org Deal</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{metadata.missionTitle}</p>
                    </div>
                    {metadata.logoUrl && (
                        <img src={metadata.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    )}
                </div>

                {/* Deal breakdown */}
                <div className="px-4 py-3 space-y-2">
                    {metadata.companyName && (
                        <p className="text-xs text-gray-500">{metadata.companyName}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total reward</span>
                        <span className="font-semibold text-gray-900">{metadata.totalReward}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Platform fee (15%)</span>
                        <span className="text-gray-500">included</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Org share</span>
                        <span className="font-semibold text-emerald-600">{orgShare}</span>
                    </div>

                    {/* Show split if accepted */}
                    {status === 'ACCEPTED' && metadata.leaderReward && metadata.memberReward && (
                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Leader</span>
                                <span className="font-medium text-gray-900">{metadata.leaderReward}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Members</span>
                                <span className="font-medium text-gray-900">{metadata.memberReward}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100">
                    {status === 'PENDING' && !isOwnMessage ? (
                        <>
                            {!showForm ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowForm(true)}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Accept
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                        Decline
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-600">
                                        Your leader cut ({isPercentage ? '%' : '€'})
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={leaderCut}
                                            onChange={e => { setLeaderCut(e.target.value); setError('') }}
                                            placeholder="0"
                                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handleAccept}
                                            disabled={loading}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                        </button>
                                    </div>
                                    {memberPreview && (
                                        <p className="text-xs text-gray-500">
                                            Members get: <span className="font-medium text-emerald-600">{memberPreview}</span>
                                        </p>
                                    )}
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                    <button
                                        onClick={() => { setShowForm(false); setLeaderCut(''); setError('') }}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </>
                    ) : status === 'PENDING' && isOwnMessage ? (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Waiting for response...
                        </div>
                    ) : status === 'ACCEPTED' ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                                <Check className="w-4 h-4" />
                                Deal accepted
                            </div>
                            {!isOwnMessage && (
                                <a
                                    href={`/seller/organizations/${metadata.orgId}`}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                >
                                    View <ArrowRight className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    ) : status === 'REJECTED' ? (
                        <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
                            <X className="w-4 h-4" />
                            Deal declined
                        </div>
                    ) : null}
                </div>
            </div>
        </motion.div>
    )
}
