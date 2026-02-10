'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Check, X, Briefcase } from 'lucide-react'
import { useOrg } from '../layout'
import { getOrgMissionProposalsForLeader, acceptOrgMission, rejectOrgMission } from '@/app/actions/organization-actions'

function MissionStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-green-50 text-green-700',
        REJECTED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default function ManageOrgMissions() {
    const { org, isLeader, reload } = useOrg()
    const [proposals, setProposals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            // Only leaders can see proposals
            if (isLeader) {
                const result = await getOrgMissionProposalsForLeader()
                if (result.success) setProposals(result.proposals || [])
            }
            setLoading(false)
        }
        load()
    }, [isLeader])

    if (!org) return null

    const pendingProposals = proposals.filter(p => p.status === 'PROPOSED' && p.Organization?.id === org.id)
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const rejectedMissions = org.Missions?.filter((m: any) => m.status === 'REJECTED') || []

    const handleAccept = async (id: string) => {
        setActionLoading(id)
        await acceptOrgMission(id)
        await reload()
        const result = await getOrgMissionProposalsForLeader()
        if (result.success) setProposals(result.proposals || [])
        setActionLoading(null)
    }

    const handleReject = async (id: string) => {
        setActionLoading(id)
        await rejectOrgMission(id)
        await reload()
        const result = await getOrgMissionProposalsForLeader()
        if (result.success) setProposals(result.proposals || [])
        setActionLoading(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
        )
    }

    // =============================================
    // MEMBER VIEW — read-only active missions
    // =============================================
    if (!isLeader) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Active Missions ({acceptedMissions.length})
                    </h2>
                    {acceptedMissions.length === 0 ? (
                        <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                            <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No active missions yet</p>
                            <p className="text-xs text-gray-300 mt-1">The leader will accept mission proposals from startups</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {acceptedMissions.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                            <Briefcase className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{m.Mission?.title}</p>
                                            {m.member_reward && (
                                                <p className="text-xs text-gray-400">Your reward: <span className="text-green-600 font-medium">{m.member_reward}</span></p>
                                            )}
                                        </div>
                                    </div>
                                    <MissionStatusBadge status="ACCEPTED" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // =============================================
    // LEADER VIEW — proposals + active + rejected
    // =============================================
    return (
        <div className="space-y-8">
            {/* Pending Proposals */}
            <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Pending Proposals ({pendingProposals.length})
                </h2>
                {pendingProposals.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                        <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No pending proposals</p>
                        <p className="text-xs text-gray-300 mt-1">Startups will propose missions for your organization</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingProposals.map(p => (
                            <div key={p.id} className="bg-white border border-blue-100 rounded-xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{p.Mission?.title}</p>
                                        {p.Mission?.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.Mission.description}</p>
                                        )}
                                    </div>
                                    <MissionStatusBadge status={p.status} />
                                </div>
                                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                                    <span>Total: <strong className="text-gray-700">{p.total_reward}</strong></span>
                                    <span>Leader: <strong className="text-amber-700">{p.leader_reward}</strong></span>
                                    <span>Member: <strong className="text-green-700">{p.member_reward}</strong></span>
                                </div>
                                <div className="flex gap-2">
                                    {actionLoading === p.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    ) : (
                                        <>
                                            <button onClick={() => handleAccept(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                                                <Check className="w-3.5 h-3.5" /> Accept
                                            </button>
                                            <button onClick={() => handleReject(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">
                                                <X className="w-3.5 h-3.5" /> Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Accepted Missions */}
            <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Active Missions ({acceptedMissions.length})
                </h2>
                {acceptedMissions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No active missions yet</p>
                ) : (
                    <div className="space-y-2">
                        {acceptedMissions.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{m.Mission?.title}</p>
                                    <p className="text-xs text-gray-400">
                                        Total: {m.total_reward} · Leader: {m.leader_reward} · Member: {m.member_reward}
                                    </p>
                                </div>
                                <MissionStatusBadge status="ACCEPTED" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
