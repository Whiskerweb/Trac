'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Check, X, AlertTriangle, Info, ExternalLink, Globe, Building2, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { useOrg } from '../layout'
import { getOrgMissionProposalsForLeader, acceptOrgMission, rejectOrgMission, getOrgMissionStats } from '@/app/actions/organization-actions'

// =============================================
// MEMBER VIEW — simple list with commission
// =============================================
function MemberMissionsView({ org }: { org: any }) {
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const cancelledMissions = org.Missions?.filter((m: any) => m.status === 'CANCELLED') || []

    if (acceptedMissions.length === 0 && cancelledMissions.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-gray-400">No missions yet</p>
                <p className="text-xs text-gray-300 mt-1">The leader will accept mission proposals from startups</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {acceptedMissions.map((m: any) => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {m.Mission?.Workspace?.Profile?.logo_url ? (
                                <Image src={m.Mission.Workspace.Profile.logo_url} alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                                    {(m.Mission?.Workspace?.name || m.Mission?.title || '?').charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-900">{m.Mission?.title}</p>
                                <p className="text-xs text-gray-400">{m.Mission?.Workspace?.name}</p>
                            </div>
                        </div>
                        {m.member_reward && (
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                {m.member_reward}
                            </span>
                        )}
                    </div>
                </div>
            ))}

            {cancelledMissions.map((m: any) => (
                <div key={m.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 opacity-50">
                    <p className="text-sm text-gray-500">{m.Mission?.title} <span className="text-xs text-gray-400">— cancelled</span></p>
                </div>
            ))}
        </div>
    )
}

// =============================================
// STARTUP CARD — compact info about the proposing startup
// =============================================
function StartupCard({ mission }: { mission: any }) {
    const ws = mission?.Workspace
    const profile = ws?.Profile
    if (!ws) return null

    return (
        <Link
            href={`/seller/startup/${ws.id}`}
            className="flex items-center gap-3 group"
        >
            {profile?.logo_url ? (
                <Image src={profile.logo_url} alt="" width={36} height={36} className="w-9 h-9 rounded-lg object-cover" />
            ) : (
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">
                    {ws.name.charAt(0)}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors flex items-center gap-1">
                    {ws.name}
                    <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-violet-400" />
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {profile?.industry && <span>{profile.industry}</span>}
                    {profile?.website_url && (
                        <>
                            {profile.industry && <span>·</span>}
                            <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{new URL(profile.website_url).hostname}</span>
                        </>
                    )}
                </div>
            </div>
        </Link>
    )
}

// =============================================
// DEAL ROW — one-line deal summary
// =============================================
function DealRow({ totalReward, leaderReward, memberReward }: {
    totalReward: string; leaderReward?: string | null; memberReward?: string | null
}) {
    const isPercentage = totalReward.includes('%')
    const dealValue = isPercentage ? parseFloat(totalReward.replace('%', '')) : parseFloat(totalReward.replace(/[€$]/g, ''))
    const platformFee = isPercentage ? 15 : dealValue * 0.15
    const orgShare = isPercentage ? dealValue - 15 : dealValue - platformFee

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-gray-500">Deal <strong className="text-gray-800">{totalReward}</strong></span>
            <span className="text-gray-300">→</span>
            <span className="text-gray-400">Platform {isPercentage ? '15%' : `${platformFee.toFixed(2)}€`}</span>
            {leaderReward && (
                <>
                    <span className="text-gray-300">|</span>
                    <span className="text-amber-600 font-medium">You {leaderReward}</span>
                </>
            )}
            {memberReward && (
                <>
                    <span className="text-gray-300">|</span>
                    <span className="text-emerald-600 font-medium">Members {memberReward}</span>
                </>
            )}
        </div>
    )
}

// =============================================
// LEADER VIEW
// =============================================
function LeaderMissionsView({ org, proposals, reload, setProposals }: {
    org: any; proposals: any[]; reload: () => Promise<void>; setProposals: (p: any[]) => void
}) {
    const params = useParams()
    const orgId = params.orgId as string
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [leaderCuts, setLeaderCuts] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [missionStats, setMissionStats] = useState<Record<string, { count: number; revenue: number; pending: number }>>({})

    const pendingProposals = proposals.filter(p => p.status === 'PROPOSED' && p.Organization?.id === org.id)
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const pastMissions = org.Missions?.filter((m: any) => m.status === 'CANCELLED' || m.status === 'REJECTED') || []

    useEffect(() => {
        getOrgMissionStats(orgId).then(r => {
            if (r.success && r.stats) setMissionStats(r.stats)
        })
    }, [orgId])

    const refreshAll = async () => {
        await reload()
        const result = await getOrgMissionProposalsForLeader()
        if (result.success) setProposals(result.proposals || [])
        const statsResult = await getOrgMissionStats(orgId)
        if (statsResult.success && statsResult.stats) setMissionStats(statsResult.stats)
    }

    const handleAccept = async (id: string) => {
        const leaderCut = leaderCuts[id]
        if (!leaderCut) { setError('Set your leader cut first'); return }
        setError(null)
        setActionLoading(id)
        const result = await acceptOrgMission(id, leaderCut)
        if (!result.success) { setError(result.error || 'Failed'); setActionLoading(null); return }
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
            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
                </div>
            )}

            {/* ========== PENDING PROPOSALS ========== */}
            {pendingProposals.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        New Proposals ({pendingProposals.length})
                    </h2>
                    <div className="space-y-3">
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
                                <div key={p.id} className="bg-white border border-blue-100 rounded-xl p-4 space-y-3">
                                    {/* Startup + Mission */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <StartupCard mission={p.Mission} />
                                            <div className="pl-12">
                                                <p className="text-sm font-semibold text-gray-900">{p.Mission?.title}</p>
                                                {p.Mission?.description && (
                                                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{p.Mission.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">NEW</span>
                                    </div>

                                    {/* Deal summary */}
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Total deal</span>
                                            <span className="font-semibold text-gray-900">{p.total_reward}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="text-gray-400">Platform (15%)</span>
                                            <span className="text-gray-400">−{isPercentage ? '15%' : `${platformFee.toFixed(2)}€`}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-gray-200">
                                            <span className="text-gray-600 font-medium">Available for org</span>
                                            <span className="font-semibold text-gray-700">{isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}€`}</span>
                                        </div>
                                    </div>

                                    {/* Leader cut input + preview */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 mb-1 block">Your cut</label>
                                            <input
                                                type="text"
                                                placeholder={isPercentage ? 'e.g. 5%' : 'e.g. 2€'}
                                                value={leaderCut}
                                                onChange={e => setLeaderCuts(prev => ({ ...prev, [p.id]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                                            />
                                        </div>
                                        {leaderCut && (
                                            <div className="flex-1">
                                                <label className="text-xs text-gray-500 mb-1 block">Members get</label>
                                                <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${memberValue >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {isPercentage ? `${memberValue}%` : `${memberValue.toFixed(2)}€`}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {memberValue < 0 && leaderCut && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Cut exceeds org share ({isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}€`})
                                        </p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Info className="w-3 h-3" /> Deal is locked after acceptance
                                        </p>
                                        <div className="flex gap-2">
                                            {actionLoading === p.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            ) : (
                                                <>
                                                    <button onClick={() => handleReject(p.id)}
                                                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                                        Decline
                                                    </button>
                                                    <button onClick={() => handleAccept(p.id)} disabled={!isValidCut}
                                                        className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                        Accept
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ========== ACTIVE MISSIONS ========== */}
            {acceptedMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Active Missions ({acceptedMissions.length})
                    </h2>
                    <div className="space-y-2">
                        {acceptedMissions.map((m: any) => {
                            const stats = missionStats[m.id]
                            return (
                                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                    {/* Startup + Mission title */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1.5 min-w-0">
                                            <StartupCard mission={m.Mission} />
                                            <p className="text-sm font-medium text-gray-900 pl-12">{m.Mission?.title}</p>
                                        </div>
                                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">ACTIVE</span>
                                    </div>

                                    {/* Deal split */}
                                    <div className="pl-12">
                                        <DealRow totalReward={m.total_reward} leaderReward={m.leader_reward} memberReward={m.member_reward} />
                                    </div>

                                    {/* Stats row */}
                                    {stats && stats.count > 0 && (
                                        <div className="pl-12 flex items-center gap-4 text-xs">
                                            <span className="flex items-center gap-1 text-gray-500">
                                                <TrendingUp className="w-3 h-3" />
                                                {stats.count} sale{stats.count > 1 ? 's' : ''}
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                <DollarSign className="w-3 h-3" />
                                                {(stats.revenue / 100).toFixed(2)}€ earned
                                            </span>
                                            {stats.pending > 0 && (
                                                <span className="flex items-center gap-1 text-amber-500">
                                                    <Clock className="w-3 h-3" />
                                                    {(stats.pending / 100).toFixed(2)}€ pending
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Accepted date */}
                                    <p className="text-[11px] text-gray-300 pl-12">
                                        Accepted {m.accepted_at ? new Date(m.accepted_at).toLocaleDateString() : ''}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ========== EMPTY STATE ========== */}
            {pendingProposals.length === 0 && acceptedMissions.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-sm text-gray-400">No missions yet</p>
                    <p className="text-xs text-gray-300 mt-1">Startups will propose missions for your organization</p>
                </div>
            )}

            {/* ========== PAST ========== */}
            {pastMissions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Past ({pastMissions.length})
                    </h2>
                    {pastMissions.map((m: any) => (
                        <div key={m.id} className="py-2 flex items-center justify-between text-xs text-gray-400">
                            <span>{m.Mission?.title} — {m.status === 'CANCELLED' ? 'Cancelled' : 'Declined'}</span>
                            <span>{m.total_reward}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN
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

    if (!isLeader) return <MemberMissionsView org={org} />

    return <LeaderMissionsView org={org} proposals={proposals} reload={reload} setProposals={setProposals} />
}
