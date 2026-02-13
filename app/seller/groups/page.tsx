'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Plus, Copy, Check, ArrowRight, Loader2, LogOut, X } from 'lucide-react'
import { getMyGroup, leaveGroup, removeGroupMember, getAvailableMissionsForGroup, enrollGroupInMission, getGroupStats } from '@/app/actions/group-actions'
import type { GroupStats } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

// =============================================
// HELPERS
// =============================================

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(cents / 100) + ' \u20AC'

// =============================================
// EMPTY STATE — No group
// =============================================

function EmptyState({ t }: { t: any }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">{t('title')}</p>
                <h1 className="text-3xl md:text-4xl font-extralight tracking-tight text-neutral-900 mb-3">
                    {t('noGroup')}
                </h1>
                <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                    {t('noGroupDesc')}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 mb-16"
            >
                <Link
                    href="/seller/groups/create"
                    className="group flex items-center justify-between py-5 px-5 -mx-1 rounded-2xl hover:bg-neutral-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-neutral-900">{t('create')}</p>
                            <p className="text-xs text-neutral-400 mt-0.5">{t('createDesc')}</p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <div className="flex items-center gap-4 py-5 px-5 -mx-1">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-900">{t('join')}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{t('joinDesc')}</p>
                    </div>
                </div>
            </motion.div>

            <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="group"
            >
                <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform" />
                    {t('howItWorks')}
                </summary>
                <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                    <p><span className="text-neutral-400">1.</span> {t('howItWorksPoints.links')}</p>
                    <p><span className="text-neutral-400">2.</span> {t('howItWorksPoints.revenue')}</p>
                    <p><span className="text-neutral-400">3.</span> {t('howItWorksPoints.separate')}</p>
                    <p><span className="text-neutral-400">4.</span> {t('howItWorksPoints.limit')}</p>
                </div>
            </motion.details>
        </motion.div>
    )
}

// =============================================
// UNIFIED GROUP DASHBOARD
// =============================================

function GroupDashboard({ group: initialGroup, sellerId, isCreator, t }: {
    group: any
    sellerId: string
    isCreator: boolean
    t: any
}) {
    const router = useRouter()
    const [copied, setCopied] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [origin, setOrigin] = useState('')
    const [currentGroup, setCurrentGroup] = useState(initialGroup)
    const [stats, setStats] = useState<GroupStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [showAddMission, setShowAddMission] = useState(false)
    const [availableMissions, setAvailableMissions] = useState<any[]>([])
    const [loadingMissions, setLoadingMissions] = useState(false)
    const [addingMissionId, setAddingMissionId] = useState<string | null>(null)

    useEffect(() => { setOrigin(window.location.origin) }, [])

    // Load stats
    useEffect(() => {
        async function loadStats() {
            setStatsLoading(true)
            const result = await getGroupStats()
            if (result.success && result.stats) {
                setStats(result.stats)
            }
            setStatsLoading(false)
        }
        loadStats()
    }, [])

    const copyInviteLink = () => {
        if (!currentGroup?.invite_code || !origin) return
        navigator.clipboard.writeText(`${origin}/seller/groups/join/${currentGroup.invite_code}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleLeave = async () => {
        const confirmMsg = isCreator ? t('leaveCreatorConfirm') : t('leaveConfirm')
        if (!confirm(confirmMsg)) return
        setActionLoading('leave')
        const result = await leaveGroup()
        if (result.success) {
            router.refresh()
            window.location.reload()
        } else {
            alert(result.error || 'Failed to leave group')
        }
        setActionLoading(null)
    }

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(t('removeConfirm', { name: memberName }))) return
        setActionLoading(memberId)
        const result = await removeGroupMember(memberId)
        if (result.success) {
            const refreshed = await getMyGroup()
            if (refreshed.success && refreshed.group) {
                setCurrentGroup(refreshed.group)
            }
            // Refresh stats too
            const statsResult = await getGroupStats()
            if (statsResult.success && statsResult.stats) setStats(statsResult.stats)
        } else {
            alert(result.error || 'Failed to remove member')
        }
        setActionLoading(null)
    }

    const openAddMissionModal = async () => {
        setShowAddMission(true)
        setLoadingMissions(true)
        const result = await getAvailableMissionsForGroup()
        if (result.success && result.missions) {
            setAvailableMissions(result.missions)
        }
        setLoadingMissions(false)
    }

    const handleAddMission = async (missionId: string) => {
        setAddingMissionId(missionId)
        const result = await enrollGroupInMission(missionId)
        if (result.success) {
            setShowAddMission(false)
            setAvailableMissions([])
            const refreshed = await getMyGroup()
            if (refreshed.success && refreshed.group) {
                setCurrentGroup(refreshed.group)
            }
            const statsResult = await getGroupStats()
            if (statsResult.success && statsResult.stats) setStats(statsResult.stats)
        } else {
            alert(result.error || 'Failed to add mission')
        }
        setAddingMissionId(null)
    }

    const memberCount = currentGroup._count?.Members || currentGroup.Members?.length || 0
    const maxRevenue = stats?.members?.[0]?.totalRevenue || 0

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-10"
            >
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-extralight tracking-tight text-neutral-900">{currentGroup.name}</h1>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${currentGroup.status === 'ACTIVE' ? 'bg-green-500' : 'bg-neutral-300'}`} />
                        <span className="text-xs text-neutral-400">
                            {currentGroup.status === 'ACTIVE' ? t('active') : t('archived')}
                        </span>
                    </div>
                </div>
                {currentGroup.description && (
                    <p className="text-sm text-neutral-400 mt-2">{currentGroup.description}</p>
                )}
            </motion.div>

            {/* Invite link (creator only) */}
            {isCreator && currentGroup.invite_code && currentGroup.status === 'ACTIVE' && origin && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-10"
                >
                    <div className="flex items-center justify-between py-3.5 px-4 -mx-4 rounded-xl bg-neutral-50">
                        <p className="text-sm text-neutral-500 font-mono truncate mr-4">
                            {origin}/seller/groups/join/{currentGroup.invite_code}
                        </p>
                        <button
                            onClick={copyInviteLink}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-black transition-colors flex-shrink-0"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? t('copied') : t('copyLink')}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Overview Stats — 3 cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-10"
            >
                <div className="bg-white p-5 text-center">
                    {statsLoading ? (
                        <div className="h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-300" /></div>
                    ) : (
                        <p className="text-2xl font-light text-neutral-900 tabular-nums">{formatCurrency(stats?.totalRevenue || 0)}</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">{t('stats.totalRevenue')}</p>
                </div>
                <div className="bg-white p-5 text-center">
                    {statsLoading ? (
                        <div className="h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-300" /></div>
                    ) : (
                        <p className="text-2xl font-light text-neutral-900 tabular-nums">{stats?.totalSales || 0}</p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">{t('stats.totalSales')}</p>
                </div>
                <div className="bg-white p-5 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">{memberCount}<span className="text-neutral-300">/{currentGroup.max_members}</span></p>
                    <p className="text-xs text-neutral-400 mt-1">{t('members')}</p>
                </div>
            </motion.div>

            {/* Members Performance */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="mb-10"
            >
                <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-5">{t('stats.performance')}</h2>

                {statsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                    </div>
                ) : stats && stats.totalRevenue === 0 && stats.totalLeads === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-neutral-400">{t('stats.noStats')}</p>
                        <p className="text-xs text-neutral-300 mt-1">{t('stats.noStatsDesc')}</p>
                    </div>
                ) : stats ? (
                    <div className="space-y-1">
                        {stats.members.map((member, index) => (
                            <motion.div
                                key={member.sellerId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.04 * index }}
                                className="group py-3.5 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {member.avatarUrl ? (
                                            <img src={member.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] font-medium text-neutral-500">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm text-neutral-700 truncate">{member.name}</span>
                                            {member.isCreator && (
                                                <span className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 flex-shrink-0">{t('creator')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-neutral-900 tabular-nums flex-shrink-0">
                                            {formatCurrency(member.totalRevenue)}
                                        </span>
                                        {isCreator && member.sellerId !== sellerId && (
                                            <button
                                                onClick={() => handleRemoveMember(member.sellerId, member.name)}
                                                disabled={actionLoading === member.sellerId}
                                                className="p-1 text-neutral-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title={t('removeMember')}
                                            >
                                                {actionLoading === member.sellerId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mb-2 pl-10">
                                    <span className="text-xs text-neutral-400">
                                        {member.salesCount} {t('stats.sales')} · {member.leadsCount} {t('stats.leads')}
                                    </span>
                                </div>
                                {maxRevenue > 0 && (
                                    <div className="pl-10">
                                        <div className="h-1 rounded-full bg-neutral-100 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-neutral-900"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(member.totalRevenue / maxRevenue) * 100}%` }}
                                                transition={{ delay: 0.3 + 0.04 * index, duration: 0.6, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : null}
            </motion.div>

            {/* Mission Breakdown */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-10"
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('stats.byMission')}</h2>
                    {isCreator && currentGroup.status === 'ACTIVE' && (
                        <button
                            onClick={openAddMissionModal}
                            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {t('addMission')}
                        </button>
                    )}
                </div>

                {statsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                    </div>
                ) : stats && stats.missions.length > 0 ? (
                    <div className="space-y-3">
                        {stats.missions.map((mission, index) => (
                            <motion.div
                                key={mission.missionId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.04 * index }}
                                className="rounded-xl border border-neutral-100 overflow-hidden"
                            >
                                {/* Mission header */}
                                <div className="flex items-center justify-between p-4 bg-neutral-50/50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {mission.logoUrl ? (
                                            <img src={mission.logoUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] font-bold text-neutral-400">
                                                    {mission.companyName?.charAt(0) || 'M'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm text-neutral-700 truncate">{mission.missionTitle}</p>
                                            <p className="text-[11px] text-neutral-400">{mission.companyName} · {mission.reward}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <p className="text-sm font-medium text-neutral-900 tabular-nums">{formatCurrency(mission.totalRevenue)}</p>
                                        <p className="text-[11px] text-neutral-400">
                                            {mission.totalSales} {t('stats.sales')} · {mission.totalLeads} {t('stats.leads')}
                                        </p>
                                    </div>
                                </div>

                                {/* Member breakdown */}
                                {mission.memberBreakdown.length > 0 && (
                                    <div className="divide-y divide-neutral-50">
                                        {mission.memberBreakdown.map(mb => (
                                            <div key={mb.sellerId} className="flex items-center justify-between py-2.5 px-4">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {mb.avatarUrl ? (
                                                        <img src={mb.avatarUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[8px] font-medium text-neutral-500">
                                                                {mb.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-neutral-600 truncate">{mb.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                    <span className="text-xs text-neutral-400">
                                                        {mb.salesCount} {t('stats.sales')} · {mb.leadsCount} {t('stats.leads')}
                                                    </span>
                                                    <span className="text-xs font-medium text-neutral-700 tabular-nums">
                                                        {formatCurrency(mb.revenue)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                ) : currentGroup.Missions?.length > 0 ? (
                    /* Has missions but 0 commissions */
                    <div className="space-y-3">
                        {currentGroup.Missions.map((gm: any) => (
                            <div key={gm.id} className="flex items-center justify-between py-3 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    {gm.Mission?.logo_url ? (
                                        <img src={gm.Mission.logo_url} className="w-7 h-7 rounded-lg object-cover" alt="" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-neutral-400">
                                                {gm.Mission?.company_name?.charAt(0) || 'M'}
                                            </span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-neutral-600">{gm.Mission?.title}</p>
                                        <p className="text-[11px] text-neutral-400">{gm.Mission?.company_name}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-neutral-400 tabular-nums">{gm.Mission?.reward}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-neutral-400 text-sm">{t('noMissions')}</p>
                        <p className="text-xs text-neutral-300 mt-1 mb-3">{isCreator ? t('noMissionsDesc') : t('enrollMissionsCreatorOnly')}</p>
                        {isCreator && (
                            <button
                                onClick={openAddMissionModal}
                                className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                            >
                                {t('addMission')} →
                            </button>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Add Mission Modal */}
            {showAddMission && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAddMission(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
                    >
                        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                            <div>
                                <h3 className="text-sm font-medium text-neutral-900">{t('selectMission')}</h3>
                                <p className="text-xs text-neutral-400 mt-0.5">{t('addMissionDesc')}</p>
                            </div>
                            <button onClick={() => setShowAddMission(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-3 flex-1">
                            {loadingMissions ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                                </div>
                            ) : availableMissions.length > 0 ? (
                                <div className="space-y-1">
                                    {availableMissions.map((mission: any) => (
                                        <div
                                            key={mission.id}
                                            className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-neutral-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {mission.logo_url ? (
                                                    <img src={mission.logo_url} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-neutral-400">
                                                            {mission.company_name?.charAt(0) || 'M'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm text-neutral-700 truncate">{mission.title}</p>
                                                    <p className="text-[11px] text-neutral-400">{mission.company_name} · {mission.reward}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddMission(mission.id)}
                                                disabled={addingMissionId === mission.id}
                                                className="flex-shrink-0 ml-3 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
                                            >
                                                {addingMissionId === mission.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    t('addToGroup')
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm text-neutral-500">{t('noAvailableMissions')}</p>
                                    <p className="text-xs text-neutral-400 mt-1 mb-3">{t('noAvailableMissionsDesc')}</p>
                                    <Link
                                        href="/seller/marketplace"
                                        onClick={() => setShowAddMission(false)}
                                        className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                                    >
                                        {t('browseMarketplace')} →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Leave */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="pt-8 border-t border-neutral-100"
            >
                <button
                    onClick={handleLeave}
                    disabled={actionLoading === 'leave'}
                    className="flex items-center gap-2 text-xs text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    {actionLoading === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    {isCreator ? t('leaveAndArchive') : t('leaveGroup')}
                </button>
            </motion.div>
        </motion.div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function GroupsPage() {
    const t = useTranslations('seller.groups')
    const [loading, setLoading] = useState(true)
    const [group, setGroup] = useState<any>(null)
    const [isCreator, setIsCreator] = useState(false)
    const [sellerId, setSellerId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getMyGroup()
        if (result.success) {
            setGroup(result.group)
            setIsCreator(result.isCreator || false)
            setSellerId(result.sellerId || null)
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    if (!group) {
        return <EmptyState t={t} />
    }

    return <GroupDashboard group={group} sellerId={sellerId!} isCreator={isCreator} t={t} />
}
