'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Briefcase, DollarSign, TrendingUp, UserPlus, ClipboardList, Crown, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { getOrganizationStats } from '@/app/actions/organization-actions'
import { useOrg } from './layout'

function OrgCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm ${className}`}
        >
            {children}
        </motion.div>
    )
}

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
            <OrgCard className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {statCards.map(card => {
                        const Icon = card.icon
                        return (
                            <div key={card.label}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-semibold text-neutral-900">{card.value}</p>
                                <p className="text-[12px] text-neutral-400 mt-0.5">{card.label}</p>
                            </div>
                        )
                    })}
                </div>
            </OrgCard>

            {/* Pending Revenue */}
            {(stats?.pendingRevenue || 0) > 0 && (
                <OrgCard className="bg-amber-50/50 border-amber-200/60 px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[14px] font-medium text-amber-800">Pending Revenue</p>
                        <p className="text-[12px] text-amber-600 mt-0.5">Commissions still in hold period</p>
                    </div>
                    <p className="text-lg font-semibold text-amber-800">{((stats?.pendingRevenue || 0) / 100).toFixed(2)}€</p>
                </OrgCard>
            )}

            {/* Quick Actions */}
            <OrgCard className="p-6">
                <h2 className="text-[15px] font-semibold text-neutral-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link
                        href={`/seller/manage/${orgId}/members`}
                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-neutral-50/80 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[14px] font-medium text-neutral-900">Manage Members</p>
                            <p className="text-[12px] text-neutral-400">Invite, approve, or remove</p>
                        </div>
                    </Link>
                    <Link
                        href={`/seller/manage/${orgId}/missions`}
                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-neutral-50/80 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[14px] font-medium text-neutral-900">Mission Proposals</p>
                            <p className="text-[12px] text-neutral-400">Review and accept missions</p>
                        </div>
                    </Link>
                    <Link
                        href={`/seller/manage/${orgId}/settings`}
                        className="flex items-center gap-3 p-4 rounded-xl hover:bg-neutral-50/80 transition-colors"
                    >
                        <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-neutral-600" />
                        </div>
                        <div>
                            <p className="text-[14px] font-medium text-neutral-900">Settings</p>
                            <p className="text-[12px] text-neutral-400">Visibility, invite code, share</p>
                        </div>
                    </Link>
                </div>
            </OrgCard>
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
                <p className="text-[14px] text-neutral-600 leading-relaxed">{org.description}</p>
            )}

            {/* Stats */}
            <OrgCard className="p-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-blue-600 bg-blue-50">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-semibold text-neutral-900">{stats?.memberCount || activeMembers.length}</p>
                        <p className="text-[12px] text-neutral-400 mt-0.5">Active Members</p>
                    </div>
                    <div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-purple-600 bg-purple-50">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-semibold text-neutral-900">{stats?.missionCount || acceptedMissions.length}</p>
                        <p className="text-[12px] text-neutral-400 mt-0.5">Active Missions</p>
                    </div>
                </div>
            </OrgCard>

            {/* Active Missions */}
            {acceptedMissions.length > 0 && (
                <OrgCard className="p-6">
                    <h2 className="text-[15px] font-semibold text-neutral-900 mb-4">Active Missions</h2>
                    <div className="space-y-3">
                        {acceptedMissions.map((om: any) => (
                            <Link
                                key={om.id}
                                href={`/seller/marketplace/${om.Mission?.id}`}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <Briefcase className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-neutral-900 group-hover:text-neutral-700">{om.Mission?.title || 'Mission'}</p>
                                        {om.member_reward && (
                                            <span className="text-[12px] text-emerald-600 font-medium">{om.member_reward}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full font-medium">Active</span>
                                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </OrgCard>
            )}

            {acceptedMissions.length === 0 && (
                <OrgCard className="py-8 text-center">
                    <Briefcase className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                    <p className="text-[14px] text-neutral-400">No active missions yet</p>
                    <p className="text-[12px] text-neutral-300 mt-1">The leader will accept mission proposals from startups</p>
                </OrgCard>
            )}

            {/* Members */}
            {activeMembers.length > 0 && (
                <OrgCard className="p-6">
                    <h2 className="text-[15px] font-semibold text-neutral-900 mb-4">Members ({activeMembers.length})</h2>
                    <div className="divide-y divide-neutral-100">
                        {activeMembers.slice(0, 20).map((m: any) => (
                            <div key={m.id} className="flex items-center gap-3 py-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-semibold text-neutral-600">
                                        {(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-neutral-900">{m.Seller?.name || 'Seller'}</p>
                                    <p className="text-[12px] text-neutral-400">{m.Seller?.email}</p>
                                </div>
                            </div>
                        ))}
                        {activeMembers.length > 20 && (
                            <div className="py-3 text-center">
                                <p className="text-[12px] text-neutral-400">+{activeMembers.length - 20} more members</p>
                            </div>
                        )}
                    </div>
                </OrgCard>
            )}

            {/* Leader info */}
            {org.Leader && (
                <OrgCard className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-[12px] text-neutral-400">Led by</p>
                        <p className="text-[14px] font-medium text-neutral-900">{org.Leader.name || org.Leader.email}</p>
                    </div>
                </OrgCard>
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
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    if (isLeader) {
        return <LeaderOverview orgId={orgId} stats={stats} />
    }

    return <MemberDashboard org={org} stats={stats} />
}
