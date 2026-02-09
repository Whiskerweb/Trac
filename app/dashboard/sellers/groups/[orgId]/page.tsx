'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Users, Target, Send, Check, X } from 'lucide-react'
import { getActiveOrganizationsForStartup, proposeOrgMission, getOrgMissionProposals } from '@/app/actions/organization-actions'

export default function OrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [missions, setMissions] = useState<any[]>([])
    const [showPropose, setShowPropose] = useState(false)
    const [proposing, setProposing] = useState(false)

    // Form state
    const [selectedMission, setSelectedMission] = useState('')
    const [totalReward, setTotalReward] = useState('')
    const [leaderReward, setLeaderReward] = useState('')
    const [memberReward, setMemberReward] = useState('')

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getActiveOrganizationsForStartup()
        if (result.success && result.organizations) {
            const found = result.organizations.find((o: any) => o.id === orgId)
            setOrg(found || null)
        }

        // Load workspace missions for the proposal form
        try {
            const res = await fetch('/api/auth/me')
            const data = await res.json()
            if (data.user?.workspaceId) {
                const mRes = await fetch(`/api/missions?workspaceId=${data.user.workspaceId}`)
                if (mRes.ok) {
                    const mData = await mRes.json()
                    setMissions(mData.missions || [])
                }
            }
        } catch (e) {
            // Fallback: missions list not critical
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    const handlePropose = async () => {
        if (!selectedMission || !totalReward || !leaderReward || !memberReward) return
        setProposing(true)
        const result = await proposeOrgMission({
            orgId,
            missionId: selectedMission,
            totalReward,
            leaderReward,
            memberReward,
        })
        setProposing(false)
        if (result.success) {
            setShowPropose(false)
            setSelectedMission('')
            setTotalReward('')
            setLeaderReward('')
            setMemberReward('')
            loadData()
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
                <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">Go back</button>
            </div>
        )
    }

    const statusStyles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-green-50 text-green-700',
        REJECTED: 'bg-red-50 text-red-700',
    }

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div>
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            {org.logo_url ? (
                                <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-cover" />
                            ) : (
                                <Users className="w-6 h-6 text-gray-500" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                            <p className="text-sm text-gray-500">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowPropose(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <Send className="w-4 h-4" /> Propose Mission
                    </button>
                </div>
                {org.description && (
                    <p className="text-gray-600 mt-3">{org.description}</p>
                )}
            </div>

            {/* Existing proposals */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Mission Proposals</h2>
                {org.Missions?.length > 0 ? (
                    <div className="space-y-2">
                        {org.Missions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">{m.mission_id}</p>
                                    <p className="text-xs text-gray-500">Proposed</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[m.status] || 'bg-gray-100 text-gray-500'}`}>
                                    {m.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center">
                        <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No missions proposed yet. Click "Propose Mission" to get started.</p>
                    </div>
                )}
            </div>

            {/* Propose modal */}
            {showPropose && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Propose Mission</h3>
                            <button onClick={() => setShowPropose(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Mission</label>
                            <select
                                value={selectedMission}
                                onChange={e => setSelectedMission(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            >
                                <option value="">Select a mission</option>
                                {missions.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Total Commission Rate</label>
                            <input
                                type="text"
                                placeholder='e.g. "30%"'
                                value={totalReward}
                                onChange={e => setTotalReward(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Leader Cut</label>
                                <input
                                    type="text"
                                    placeholder='e.g. "5%"'
                                    value={leaderReward}
                                    onChange={e => setLeaderReward(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">Member Cut</label>
                                <input
                                    type="text"
                                    placeholder='e.g. "25%"'
                                    value={memberReward}
                                    onChange={e => setMemberReward(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handlePropose}
                            disabled={proposing || !selectedMission || !totalReward || !leaderReward || !memberReward}
                            className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {proposing ? 'Proposing...' : 'Send Proposal'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
