'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Users, Crown, Target, UserPlus, UserMinus, Check, X, Mail, LogOut } from 'lucide-react'
import {
    getOrganizationDetail,
    inviteMemberToOrg,
    approveOrgMember,
    removeOrgMember,
    leaveOrganization,
    acceptOrgMission,
    rejectOrgMission,
    getOrgMissionProposalsForLeader,
} from '@/app/actions/organization-actions'

function StatusBadge({ status, type }: { status: string; type: 'member' | 'mission' }) {
    const memberStyles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        ACTIVE: 'bg-green-50 text-green-700',
        REMOVED: 'bg-gray-100 text-gray-500',
    }
    const missionStyles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-green-50 text-green-700',
        REJECTED: 'bg-red-50 text-red-700',
    }
    const styles = type === 'member' ? memberStyles : missionStyles
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default function OrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [isLeader, setIsLeader] = useState(false)
    const [proposals, setProposals] = useState<any[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)
    const [inviteError, setInviteError] = useState('')

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getOrganizationDetail(orgId)
        if (result.success) {
            setOrg(result.organization)
            setIsLeader(result.isLeader || false)

            // Load pending proposals if leader
            if (result.isLeader) {
                const pResult = await getOrgMissionProposalsForLeader()
                if (pResult.success) {
                    setProposals(pResult.proposals?.filter((p: any) => p.Organization.id === orgId) || [])
                }
            }
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return
        setInviting(true)
        setInviteError('')
        const result = await inviteMemberToOrg(orgId, inviteEmail.trim())
        if (result.success) {
            setInviteEmail('')
            loadData()
        } else {
            setInviteError(result.error || 'Failed to invite')
        }
        setInviting(false)
    }

    const handleApproveMember = async (membershipId: string) => {
        await approveOrgMember(membershipId)
        loadData()
    }

    const handleRemoveMember = async (membershipId: string) => {
        await removeOrgMember(membershipId)
        loadData()
    }

    const handleAcceptMission = async (orgMissionId: string) => {
        await acceptOrgMission(orgMissionId)
        loadData()
    }

    const handleRejectMission = async (orgMissionId: string) => {
        await rejectOrgMission(orgMissionId)
        loadData()
    }

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this organization?')) return
        await leaveOrganization(orgId)
        router.push('/seller/organizations')
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
                <p className="text-gray-500">Organization not found or access denied</p>
                <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">Go back</button>
            </div>
        )
    }

    const activeMembers = org.Members?.filter((m: any) => m.status === 'ACTIVE') || []
    const pendingMembers = org.Members?.filter((m: any) => m.status === 'PENDING') || []

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div>
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                            {isLeader && <Crown className="w-5 h-5 text-amber-500" />}
                        </div>
                        <p className="text-sm text-gray-500">
                            {isLeader ? 'You are the leader' : `Led by ${org.Leader?.name || org.Leader?.email}`}
                            {' · '}{activeMembers.length} active members
                        </p>
                    </div>
                </div>
                {org.description && <p className="text-gray-600 mt-3">{org.description}</p>}
            </div>

            {/* LEADER: Pending Mission Proposals */}
            {isLeader && proposals.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" /> Pending Proposals
                    </h2>
                    <div className="space-y-2">
                        {proposals.map(p => (
                            <div key={p.id} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{p.Mission?.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            Total: {p.total_reward} · Leader: {p.leader_reward} · Members: {p.member_reward}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAcceptMission(p.id)}
                                            className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRejectMission(p.id)}
                                            className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Missions */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Missions</h2>
                {org.Missions?.length > 0 ? (
                    <div className="space-y-2">
                        {org.Missions.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">{m.Mission?.title || m.mission_id}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Total: {m.total_reward} · Leader: {m.leader_reward} · Members: {m.member_reward}
                                    </p>
                                </div>
                                <StatusBadge status={m.status} type="mission" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No missions yet.</p>
                )}
            </div>

            {/* LEADER: Invite Members */}
            {isLeader && org.status === 'ACTIVE' && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <UserPlus className="w-5 h-5" /> Invite Member
                    </h2>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                placeholder="seller@example.com"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            />
                        </div>
                        <button
                            onClick={handleInvite}
                            disabled={inviting || !inviteEmail.trim()}
                            className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                        >
                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                        </button>
                    </div>
                    {inviteError && <p className="text-sm text-red-600 mt-1">{inviteError}</p>}
                </div>
            )}

            {/* LEADER: Pending Members */}
            {isLeader && pendingMembers.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Members</h2>
                    <div className="space-y-2">
                        {pendingMembers.map((m: any) => (
                            <div key={m.id} className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{m.Seller?.name || m.Seller?.email}</p>
                                    <p className="text-xs text-gray-500">{m.invited_by ? 'Invited' : 'Applied'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleApproveMember(m.id)} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Members */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Members ({activeMembers.length})</h2>
                {activeMembers.length > 0 ? (
                    <div className="space-y-2">
                        {activeMembers.map((m: any) => (
                            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                        {(m.Seller?.name || m.Seller?.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{m.Seller?.name || m.Seller?.email}</p>
                                        {m.Seller?.name && <p className="text-xs text-gray-500">{m.Seller?.email}</p>}
                                    </div>
                                </div>
                                {isLeader && (
                                    <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                                        <UserMinus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No active members yet.</p>
                )}
            </div>

            {/* Member: Leave */}
            {!isLeader && (
                <button
                    onClick={handleLeave}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                >
                    <LogOut className="w-4 h-4" /> Leave Organization
                </button>
            )}
        </div>
    )
}
