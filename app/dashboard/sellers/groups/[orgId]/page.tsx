'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Users, Target, Send, X, AlertTriangle, Ban, Check, Info } from 'lucide-react'
import { getActiveOrganizationsForStartup, proposeOrgMission, cancelOrgMission } from '@/app/actions/organization-actions'
import { getWorkspaceMissions } from '@/app/actions/missions'

// ---- Status badge ----
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700 border-blue-100',
        ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        REJECTED: 'bg-red-50 text-red-700 border-red-100',
        CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
        </span>
    )
}

// ---- Deal breakdown helper ----
function DealBreakdown({ totalReward, leaderReward, memberReward, compact }: {
    totalReward: string
    leaderReward?: string | null
    memberReward?: string | null
    compact?: boolean
}) {
    const isPercentage = totalReward.includes('%')
    const dealValue = isPercentage
        ? parseFloat(totalReward.replace('%', ''))
        : parseFloat(totalReward.replace(/[€$]/g, ''))
    const platformFee = isPercentage ? 15 : dealValue * 0.15
    const orgShare = isPercentage ? dealValue - 15 : dealValue - platformFee

    if (compact) {
        return (
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Deal: <strong className="text-gray-900">{totalReward}</strong></span>
                <span className="text-gray-300">|</span>
                <span>Platform: <strong className="text-gray-600">{isPercentage ? '15%' : `${platformFee.toFixed(2)}€`}</strong></span>
                {leaderReward && (
                    <>
                        <span className="text-gray-300">|</span>
                        <span>Leader: <strong className="text-amber-600">{leaderReward}</strong></span>
                    </>
                )}
                {memberReward && (
                    <>
                        <span className="text-gray-300">|</span>
                        <span>Member: <strong className="text-emerald-600">{memberReward}</strong></span>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
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
                <span className="text-gray-500">Organization receives</span>
                <span className="font-semibold text-gray-700">{isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}€`}</span>
            </div>
            {leaderReward && memberReward && (
                <>
                    <div className="flex items-center justify-between text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Leader cut
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

export default function OrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [missions, setMissions] = useState<any[]>([])
    const [showPropose, setShowPropose] = useState(false)
    const [proposing, setProposing] = useState(false)
    const [proposeError, setProposeError] = useState<string | null>(null)

    // Cancel state
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null)
    const [cancelError, setCancelError] = useState<string | null>(null)

    // Form state
    const [selectedMission, setSelectedMission] = useState('')
    const [totalReward, setTotalReward] = useState('')

    // Auto-fill totalReward when mission is selected
    const selectedMissionData = useMemo(
        () => missions.find(m => m.id === selectedMission),
        [missions, selectedMission]
    )

    const loadData = useCallback(async () => {
        setLoading(true)
        const [orgResult, missionsResult] = await Promise.all([
            getActiveOrganizationsForStartup(),
            getWorkspaceMissions(),
        ])

        if (orgResult.success && orgResult.organizations) {
            const found = orgResult.organizations.find((o: any) => o.id === orgId)
            setOrg(found || null)
        }
        if (missionsResult.success && missionsResult.missions) {
            // Only show ACTIVE missions
            setMissions(missionsResult.missions.filter((m: any) => m.status === 'ACTIVE'))
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    // Auto-fill reward when mission selected
    useEffect(() => {
        if (selectedMissionData?.reward) {
            setTotalReward(selectedMissionData.reward)
        }
    }, [selectedMissionData])

    const handlePropose = async () => {
        if (!selectedMission || !totalReward) return
        setProposeError(null)
        setProposing(true)
        const result = await proposeOrgMission({
            orgId,
            missionId: selectedMission,
            totalReward,
        })
        setProposing(false)
        if (result.success) {
            setShowPropose(false)
            setSelectedMission('')
            setTotalReward('')
            loadData()
        } else {
            setProposeError(result.error || 'Failed to propose mission')
        }
    }

    const handleCancel = async (orgMissionId: string) => {
        setCancelError(null)
        setCancellingId(orgMissionId)
        const result = await cancelOrgMission(orgMissionId)
        setCancellingId(null)
        setShowCancelConfirm(null)
        if (result.success) {
            loadData()
        } else {
            setCancelError(result.error || 'Failed to cancel')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Organization not found</p>
                <button onClick={() => router.back()} className="mt-4 text-sm text-violet-600 hover:underline">Go back</button>
            </div>
        )
    }

    // Separate missions by status
    const proposedMissions = org.Missions?.filter((m: any) => m.status === 'PROPOSED') || []
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const otherMissions = org.Missions?.filter((m: any) => m.status === 'REJECTED' || m.status === 'CANCELLED') || []

    // Deal breakdown preview for the propose form
    const isPercentageDeal = totalReward.includes('%')
    const dealValue = isPercentageDeal
        ? parseFloat(totalReward.replace('%', ''))
        : parseFloat(totalReward.replace(/[€$]/g, ''))
    const isValidDeal = !isNaN(dealValue) && dealValue > 0
    const platformPreview = isPercentageDeal ? 15 : dealValue * 0.15
    const orgSharePreview = isPercentageDeal ? dealValue - 15 : dealValue - platformPreview

    // Missions already proposed (to filter from selector)
    const alreadyProposedMissionIds = new Set(org.Missions?.map((m: any) => m.mission_id) || [])
    const availableMissions = missions.filter(m => !alreadyProposedMissionIds.has(m.id))

    return (
        <div className="space-y-8">
            {/* Back + Header */}
            <div>
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to organizations
                </button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                            {org.logo_url ? (
                                <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-2xl object-cover" />
                            ) : (
                                <Users className="w-7 h-7 text-gray-400" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                            <p className="text-sm text-gray-500">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} active members</p>
                        </div>
                    </div>
                    {availableMissions.length > 0 && (
                        <button
                            onClick={() => setShowPropose(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            <Send className="w-4 h-4" /> Propose Mission
                        </button>
                    )}
                </div>
                {org.description && (
                    <p className="text-gray-500 mt-3 text-sm">{org.description}</p>
                )}
            </div>

            {/* Cancel error banner */}
            {cancelError && (
                <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium">Cannot cancel</p>
                        <p className="text-xs mt-0.5 text-red-600">{cancelError}</p>
                    </div>
                    <button onClick={() => setCancelError(null)} className="ml-auto text-red-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Active missions (ACCEPTED) */}
            {acceptedMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Arrangements ({acceptedMissions.length})</h2>
                    <div className="space-y-3">
                        {acceptedMissions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{m.Mission?.title || m.mission_id}</p>
                                            <p className="text-xs text-gray-400">Accepted{m.accepted_at ? ` · ${new Date(m.accepted_at).toLocaleDateString()}` : ''}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status="ACCEPTED" />
                                </div>

                                <DealBreakdown
                                    totalReward={m.total_reward}
                                    leaderReward={m.leader_reward}
                                    memberReward={m.member_reward}
                                    compact
                                />

                                {/* Cancel button */}
                                {showCancelConfirm === m.id ? (
                                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                        <p className="text-xs text-gray-600 flex-1">Cancel this arrangement? Pending commissions will be deleted. Completed ones are preserved.</p>
                                        <button
                                            onClick={() => handleCancel(m.id)}
                                            disabled={cancellingId === m.id}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            {cancellingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setShowCancelConfirm(null)}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Keep
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-2 border-t border-gray-100">
                                        <button
                                            onClick={() => setShowCancelConfirm(m.id)}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            Cancel arrangement
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending proposals (PROPOSED) */}
            {proposedMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pending Proposals ({proposedMissions.length})</h2>
                    <div className="space-y-3">
                        {proposedMissions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-blue-100 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Send className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{m.Mission?.title || m.mission_id}</p>
                                            <p className="text-xs text-gray-400">Waiting for leader to accept</p>
                                        </div>
                                    </div>
                                    <StatusBadge status="PROPOSED" />
                                </div>
                                <DealBreakdown totalReward={m.total_reward} compact />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rejected / Cancelled */}
            {otherMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past ({otherMissions.length})</h2>
                    <div className="space-y-2">
                        {otherMissions.map((m: any) => (
                            <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between opacity-60">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{m.Mission?.title || m.mission_id}</p>
                                    <p className="text-xs text-gray-400">Deal: {m.total_reward}</p>
                                </div>
                                <StatusBadge status={m.status} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!org.Missions?.length && (
                <div className="bg-gray-50 rounded-2xl p-12 text-center">
                    <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-900 font-medium mb-1">No missions proposed yet</p>
                    <p className="text-gray-500 text-sm mb-4">Propose a mission to start working with this organization.</p>
                    {availableMissions.length > 0 && (
                        <button
                            onClick={() => setShowPropose(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            <Send className="w-4 h-4" /> Propose Mission
                        </button>
                    )}
                </div>
            )}

            {/* ================= PROPOSE MODAL ================= */}
            {showPropose && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 space-y-5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Propose Mission</h3>
                            <button onClick={() => { setShowPropose(false); setProposeError(null) }} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mission selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Select a mission</label>
                            <select
                                value={selectedMission}
                                onChange={e => setSelectedMission(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 bg-white"
                            >
                                <option value="">Choose a mission...</option>
                                {availableMissions.map((m: any) => (
                                    <option key={m.id} value={m.id}>
                                        {m.title} — {m.reward}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Total reward (auto-filled, editable) */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Total deal (commission for the org)</label>
                            <input
                                type="text"
                                placeholder='e.g. "40%" or "10€"'
                                value={totalReward}
                                onChange={e => setTotalReward(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                            />
                            {selectedMissionData?.reward && totalReward !== selectedMissionData.reward && (
                                <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Mission default is {selectedMissionData.reward}. You can customize the org deal.
                                </p>
                            )}
                        </div>

                        {/* Deal breakdown preview */}
                        {isValidDeal && (
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal breakdown</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Total deal</span>
                                    <span className="font-semibold text-gray-900">{totalReward}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                        Platform fee (15%)
                                    </span>
                                    <span>{isPercentageDeal ? '15%' : `${platformPreview.toFixed(2)}€`}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                                    <span className="text-gray-600">Organization receives</span>
                                    <span className="font-semibold text-emerald-600">
                                        {isPercentageDeal ? `${orgSharePreview}%` : `${orgSharePreview.toFixed(2)}€`}
                                    </span>
                                </div>
                                {isPercentageDeal && orgSharePreview <= 0 && (
                                    <p className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Deal must be greater than 15%
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Info box */}
                        <div className="flex items-start gap-2.5 p-3 bg-violet-50 rounded-xl text-xs text-violet-700">
                            <Info className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />
                            <p>The 15% platform fee is included in the deal — you pay exactly what you set. The leader will choose their cut when they accept, and the rest goes to members.</p>
                        </div>

                        {/* Error */}
                        {proposeError && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {proposeError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handlePropose}
                            disabled={proposing || !selectedMission || !totalReward || (isPercentageDeal && orgSharePreview <= 0)}
                            className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {proposing ? 'Sending proposal...' : 'Send Proposal'}
                        </button>
                    </div>
                </div>
            )}

            {/* ================= CANCEL CONFIRMATION MODAL ================= */}
        </div>
    )
}
