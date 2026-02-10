'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, Briefcase, AlertTriangle, Info, Ban, Clock } from 'lucide-react'
import { useOrg } from '../layout'
import { getOrgMissionProposalsForLeader, acceptOrgMission, rejectOrgMission } from '@/app/actions/organization-actions'

// ---- Status badge ----
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700 border-blue-100',
        ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        REJECTED: 'bg-red-50 text-red-600 border-red-100',
        CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
        </span>
    )
}

// ---- Deal breakdown component ----
function DealBreakdown({ totalReward, leaderReward, memberReward, variant = 'default' }: {
    totalReward: string
    leaderReward?: string | null
    memberReward?: string | null
    variant?: 'default' | 'compact' | 'proposal'
}) {
    const isPercentage = totalReward.includes('%')
    const dealValue = isPercentage
        ? parseFloat(totalReward.replace('%', ''))
        : parseFloat(totalReward.replace(/[€$]/g, ''))
    const platformFee = isPercentage ? 15 : dealValue * 0.15
    const orgShare = isPercentage ? dealValue - 15 : dealValue - platformFee

    if (variant === 'compact') {
        return (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>Deal: <strong className="text-gray-900">{totalReward}</strong></span>
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Platform: {isPercentage ? '15%' : `${platformFee.toFixed(2)}€`}
                </span>
                {leaderReward && (
                    <>
                        <span className="text-gray-200">|</span>
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            You: <strong className="text-amber-600">{leaderReward}</strong>
                        </span>
                    </>
                )}
                {memberReward && (
                    <>
                        <span className="text-gray-200">|</span>
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Members: <strong className="text-emerald-600">{memberReward}</strong>
                        </span>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
                <span className="text-gray-500">Total deal</span>
                <span className="font-semibold text-gray-900">{totalReward}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    Traaaction (15% included)
                </span>
                <span>{isPercentage ? '15%' : `${platformFee.toFixed(2)}€`}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-gray-500">Available for org</span>
                <span className="font-semibold text-gray-700">{isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}€`}</span>
            </div>
            {leaderReward && memberReward && (
                <>
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Your cut (leader)
                        </span>
                        <span className="text-amber-600 font-medium">{leaderReward}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Member reward
                        </span>
                        <span className="text-emerald-600 font-medium">{memberReward}</span>
                    </div>
                </>
            )}
        </div>
    )
}

// =============================================
// MEMBER VIEW
// =============================================
function MemberMissionsView({ org }: { org: any }) {
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const cancelledMissions = org.Missions?.filter((m: any) => m.status === 'CANCELLED') || []

    return (
        <div className="space-y-8">
            {/* Active Missions */}
            <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Active Missions ({acceptedMissions.length})
                </h2>
                {acceptedMissions.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                        <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No active missions yet</p>
                        <p className="text-xs text-gray-300 mt-1">The leader will accept mission proposals from startups</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {acceptedMissions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                            <Briefcase className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{m.Mission?.title}</p>
                                            <p className="text-xs text-gray-400">Active mission</p>
                                        </div>
                                    </div>
                                    <StatusBadge status="ACCEPTED" />
                                </div>
                                {/* Member sees their reward prominently */}
                                {m.member_reward && (
                                    <div className="mt-3 bg-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between">
                                        <span className="text-sm text-emerald-700">Your commission</span>
                                        <span className="text-lg font-bold text-emerald-700">{m.member_reward}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancelled missions */}
            {cancelledMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Cancelled ({cancelledMissions.length})
                    </h2>
                    <div className="space-y-2">
                        {cancelledMissions.map((m: any) => (
                            <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{m.Mission?.title}</p>
                                    <p className="text-xs text-gray-400">This mission was cancelled by the startup</p>
                                </div>
                                <StatusBadge status="CANCELLED" />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================
// LEADER VIEW
// =============================================
function LeaderMissionsView({ org, proposals, reload, setProposals }: {
    org: any
    proposals: any[]
    reload: () => Promise<void>
    setProposals: (p: any[]) => void
}) {
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [leaderCuts, setLeaderCuts] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)

    const pendingProposals = proposals.filter(p => p.status === 'PROPOSED' && p.Organization?.id === org.id)
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const cancelledMissions = org.Missions?.filter((m: any) => m.status === 'CANCELLED') || []
    const rejectedMissions = org.Missions?.filter((m: any) => m.status === 'REJECTED') || []

    const refreshAll = async () => {
        await reload()
        const result = await getOrgMissionProposalsForLeader()
        if (result.success) setProposals(result.proposals || [])
    }

    const handleAccept = async (id: string) => {
        const leaderCut = leaderCuts[id]
        if (!leaderCut) {
            setError('Set your leader cut before accepting')
            return
        }
        setError(null)
        setActionLoading(id)
        const result = await acceptOrgMission(id, leaderCut)
        if (!result.success) {
            setError(result.error || 'Failed to accept')
            setActionLoading(null)
            return
        }
        await refreshAll()
        setActionLoading(null)
    }

    const handleReject = async (id: string) => {
        setActionLoading(id)
        await rejectOrgMission(id)
        await refreshAll()
        setActionLoading(null)
    }

    return (
        <div className="space-y-8">
            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p className="text-xs">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ========== PENDING PROPOSALS ========== */}
            <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Pending Proposals ({pendingProposals.length})
                </h2>
                {pendingProposals.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No pending proposals</p>
                        <p className="text-xs text-gray-300 mt-1">Startups will propose missions for your organization</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingProposals.map(p => {
                            const isPercentage = p.total_reward?.includes('%')
                            const dealValue = isPercentage
                                ? parseFloat(p.total_reward.replace('%', ''))
                                : parseFloat(p.total_reward.replace(/[€$]/g, ''))
                            const platformFee = isPercentage ? 15 : dealValue * 0.15
                            const orgShare = isPercentage ? dealValue - 15 : dealValue - platformFee

                            const leaderCut = leaderCuts[p.id] || ''
                            const leaderValue = parseFloat(leaderCut.replace(/[%€$]/g, '')) || 0
                            const memberValue = orgShare - leaderValue
                            const isValidCut = leaderCut.length > 0 && leaderValue >= 0 && memberValue >= 0

                            return (
                                <div key={p.id} className="bg-white border border-blue-100 rounded-2xl overflow-hidden">
                                    {/* Header */}
                                    <div className="px-5 pt-5 pb-4">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <p className="text-base font-semibold text-gray-900">{p.Mission?.title}</p>
                                                {p.Mission?.description && (
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.Mission.description}</p>
                                                )}
                                            </div>
                                            <StatusBadge status={p.status} />
                                        </div>
                                    </div>

                                    {/* Deal breakdown */}
                                    <div className="px-5 pb-4">
                                        <DealBreakdown totalReward={p.total_reward} />
                                    </div>

                                    {/* Leader cut section */}
                                    <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                                                Set your cut (leader commission)
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="text"
                                                    placeholder={isPercentage ? 'e.g. 5%' : 'e.g. 1.50€'}
                                                    value={leaderCut}
                                                    onChange={e => setLeaderCuts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-time preview */}
                                        {leaderCut && (
                                            <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${memberValue >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${memberValue >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                                    <span className={`text-sm ${memberValue >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                        Members will earn
                                                    </span>
                                                </div>
                                                <span className={`text-lg font-bold ${memberValue >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {isPercentage ? `${memberValue}%` : `${memberValue.toFixed(2)}€`}
                                                </span>
                                            </div>
                                        )}

                                        {memberValue < 0 && leaderCut && (
                                            <p className="text-xs text-red-500 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Your cut exceeds the available org share ({isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}€`})
                                            </p>
                                        )}

                                        {/* Accept / Reject buttons */}
                                        <div className="flex gap-2 pt-1">
                                            {actionLoading === p.id ? (
                                                <div className="flex items-center gap-2 px-4 py-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                    <span className="text-xs text-gray-400">Processing...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleAccept(p.id)}
                                                        disabled={!isValidCut}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Check className="w-3.5 h-3.5" /> Accept & Lock Deal
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(p.id)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Decline
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <p className="text-[11px] text-gray-400 flex items-start gap-1.5">
                                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                            Once accepted, the deal is locked. Your cut and member rewards cannot be changed.
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ========== ACTIVE MISSIONS ========== */}
            {acceptedMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Active Missions ({acceptedMissions.length})
                    </h2>
                    <div className="space-y-3">
                        {acceptedMissions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{m.Mission?.title}</p>
                                            <p className="text-xs text-gray-400">
                                                Accepted{m.accepted_at ? ` · ${new Date(m.accepted_at).toLocaleDateString()}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status="ACCEPTED" />
                                </div>
                                <DealBreakdown
                                    totalReward={m.total_reward}
                                    leaderReward={m.leader_reward}
                                    memberReward={m.member_reward}
                                    variant="compact"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========== CANCELLED / REJECTED ========== */}
            {(cancelledMissions.length > 0 || rejectedMissions.length > 0) && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Past ({cancelledMissions.length + rejectedMissions.length})
                    </h2>
                    <div className="space-y-2">
                        {[...cancelledMissions, ...rejectedMissions].map((m: any) => (
                            <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{m.Mission?.title}</p>
                                    <p className="text-xs text-gray-400">
                                        {m.status === 'CANCELLED' ? 'Cancelled by startup' : 'Declined'}
                                         · Deal: {m.total_reward}
                                    </p>
                                </div>
                                <StatusBadge status={m.status} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN EXPORT
// =============================================
export default function ManageOrgMissions() {
    const { org, isLeader, reload } = useOrg()
    const [proposals, setProposals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            if (isLeader) {
                const result = await getOrgMissionProposalsForLeader()
                if (result.success) setProposals(result.proposals || [])
            }
            setLoading(false)
        }
        load()
    }, [isLeader])

    if (!org) return null

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
        )
    }

    if (!isLeader) {
        return <MemberMissionsView org={org} />
    }

    return (
        <LeaderMissionsView
            org={org}
            proposals={proposals}
            reload={reload}
            setProposals={setProposals}
        />
    )
}
