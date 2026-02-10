'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Briefcase, DollarSign, TrendingUp, UserPlus, ClipboardList, Crown, Globe, Lock, KeyRound } from 'lucide-react'
import { getOrganizationStats } from '@/app/actions/organization-actions'
import { useOrg } from './layout'

// =============================================
// LEADER OVERVIEW (full management dashboard)
// =============================================

function LeaderOverview({ orgId, stats }: { orgId: string; stats: any }) {
    const statCards = [
        { label: 'Active Members', value: stats?.memberCount || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
        { label: 'Active Missions', value: stats?.missionCount || 0, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
        { label: 'Total Commissions', value: stats?.totalCommissions || 0, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
        { label: 'Total Revenue', value: `${((stats?.totalRevenue || 0) / 100).toFixed(2)}€`, icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
    ]

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(card => {
                    const Icon = card.icon
                    return (
                        <div key={card.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Pending Revenue */}
            {(stats?.pendingRevenue || 0) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-amber-800">Pending Revenue</p>
                        <p className="text-xs text-amber-600 mt-0.5">Commissions still in hold period</p>
                    </div>
                    <p className="text-lg font-bold text-amber-800">{((stats?.pendingRevenue || 0) / 100).toFixed(2)}€</p>
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link
                        href={`/seller/manage/${orgId}/members`}
                        className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Manage Members</p>
                            <p className="text-xs text-gray-400">Invite, approve, or remove</p>
                        </div>
                    </Link>
                    <Link
                        href={`/seller/manage/${orgId}/missions`}
                        className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Mission Proposals</p>
                            <p className="text-xs text-gray-400">Review and accept missions</p>
                        </div>
                    </Link>
                    <Link
                        href={`/seller/manage/${orgId}/settings`}
                        className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Settings</p>
                            <p className="text-xs text-gray-400">Visibility, invite code, share</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// =============================================
// MEMBER DASHBOARD (read-only, simple view)
// =============================================

function MemberDashboard({ org, stats }: { org: any; stats: any }) {
    const activeMembers = (org?.Members || []).filter((m: any) => m.status === 'ACTIVE')
    const acceptedMissions = (org?.Missions || []).filter((m: any) => m.status === 'ACCEPTED')

    return (
        <div className="space-y-8">
            {/* Org description */}
            {org.description && (
                <p className="text-gray-600 text-[15px] leading-relaxed">{org.description}</p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-blue-600 bg-blue-50">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.memberCount || activeMembers.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Active Members</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-purple-600 bg-purple-50">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.missionCount || acceptedMissions.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Active Missions</p>
                </div>
            </div>

            {/* Active Missions */}
            {acceptedMissions.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Missions</h2>
                    <div className="space-y-2">
                        {acceptedMissions.map((om: any) => (
                            <div key={om.id} className="flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <Briefcase className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{om.Mission?.title || 'Mission'}</p>
                                        {om.member_reward && (
                                            <p className="text-xs text-gray-400">Your reward: {om.member_reward}</p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {acceptedMissions.length === 0 && (
                <div className="text-center py-8 bg-white border border-gray-100 rounded-2xl">
                    <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No active missions yet</p>
                    <p className="text-xs text-gray-400 mt-1">The leader will accept mission proposals from startups</p>
                </div>
            )}

            {/* Members */}
            {activeMembers.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Members ({activeMembers.length})</h2>
                    <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
                        {activeMembers.slice(0, 20).map((m: any) => (
                            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold text-gray-600">
                                        {(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{m.Seller?.name || 'Seller'}</p>
                                    <p className="text-xs text-gray-400">{m.Seller?.email}</p>
                                </div>
                            </div>
                        ))}
                        {activeMembers.length > 20 && (
                            <div className="px-4 py-3 text-center">
                                <p className="text-xs text-gray-400">+{activeMembers.length - 20} more members</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Leader info */}
            {org.Leader && (
                <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Led by</p>
                        <p className="text-sm font-medium text-gray-900">{org.Leader.name || org.Leader.email}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function ManageOrgOverview() {
    const { org, isLeader } = useOrg()
    const params = useParams()
    const orgId = params.orgId as string
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const result = await getOrganizationStats(orgId)
            if (result.success) setStats(result.stats)
            setLoading(false)
        }
        load()
    }, [orgId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
        )
    }

    if (isLeader) {
        return <LeaderOverview orgId={orgId} stats={stats} />
    }

    return <MemberDashboard org={org} stats={stats} />
}
