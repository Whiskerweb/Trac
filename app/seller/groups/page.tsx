'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Copy, Check, ArrowRight, Loader2, LogOut, X, AlertTriangle, ChevronRight, AlertCircle } from 'lucide-react'
import { getMyGroup, joinGroup, leaveGroup, removeGroupMember, getAvailableMissionsForGroup, enrollGroupInMission, getGroupStats } from '@/app/actions/group-actions'
import type { GroupStats } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

// =============================================
// HELPERS
// =============================================

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(cents / 100) + ' \u20AC'

// =============================================
// REUSABLE COMPONENTS
// =============================================

function GroupCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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

function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    loading,
    variant = 'danger'
}: {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel: string
    loading?: boolean
    variant?: 'danger' | 'default'
}) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => !loading && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                    >
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-neutral-100'}`}>
                                    <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-neutral-600'}`} />
                                </div>
                                <h2 className="text-[17px] font-semibold text-neutral-900">{title}</h2>
                            </div>
                            <p className="text-[14px] text-neutral-600 mb-6">{description}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[14px] font-medium text-neutral-700 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className={`flex-1 h-11 rounded-xl text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                                        variant === 'danger'
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                                    }`}
                                >
                                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// =============================================
// EMPTY STATE — No group
// =============================================

function EmptyState({ t }: { t: any }) {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)

    const handleJoinWithCode = async () => {
        const trimmed = code.trim()
        if (!trimmed) return
        setJoining(true)
        setJoinError(null)
        const result = await joinGroup(trimmed)
        if (result.success) {
            router.refresh()
            window.location.reload()
        } else {
            setJoinError(result.error || 'Failed to join group')
        }
        setJoining(false)
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-neutral-600" />
                        </div>
                        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                            {t('title')}
                        </h1>
                    </div>
                    <p className="text-[15px] text-neutral-500">
                        {t('noGroupDesc')}
                    </p>
                </motion.div>

                <div className="space-y-6">
                    {/* Create Group */}
                    <GroupCard>
                        <Link
                            href="/seller/groups/create"
                            className="group flex items-center justify-between p-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-neutral-900">{t('create')}</p>
                                    <p className="text-[13px] text-neutral-500 mt-0.5">{t('createDesc')}</p>
                                </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                    </GroupCard>

                    {/* Join Group */}
                    <GroupCard>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-neutral-400" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-neutral-900">{t('join')}</p>
                                    <p className="text-[13px] text-neutral-500 mt-0.5">{t('joinDesc')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value); setJoinError(null) }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                                    placeholder={t('enterCode')}
                                    className="flex-1 h-11 px-4 text-[14px] font-mono bg-neutral-50/50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 placeholder:text-neutral-400 transition-colors"
                                />
                                <button
                                    onClick={handleJoinWithCode}
                                    disabled={joining || !code.trim()}
                                    className="h-11 px-5 text-[14px] font-medium bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 flex-shrink-0 flex items-center gap-2"
                                >
                                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : t('join')}
                                </button>
                            </div>
                            <AnimatePresence>
                                {joinError && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600 flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {joinError}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </GroupCard>

                    {/* How It Works */}
                    <GroupCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-5">{t('howItWorks')}</h2>
                            <div className="space-y-4">
                                {[
                                    t('howItWorksPoints.links'),
                                    t('howItWorksPoints.revenue'),
                                    t('howItWorksPoints.separate'),
                                    t('howItWorksPoints.limit'),
                                ].map((point, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-[12px] font-medium text-neutral-500">{i + 1}</span>
                                        </div>
                                        <p className="text-[14px] text-neutral-600 leading-relaxed">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GroupCard>
                </div>
            </div>
        </div>
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
    const [confirmLeave, setConfirmLeave] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null)

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
        setActionLoading('leave')
        const result = await leaveGroup()
        if (result.success) {
            router.refresh()
            window.location.reload()
        } else {
            alert(result.error || 'Failed to leave group')
        }
        setActionLoading(null)
        setConfirmLeave(false)
    }

    const handleRemoveMember = async (memberId: string) => {
        setActionLoading(memberId)
        const result = await removeGroupMember(memberId)
        if (result.success) {
            const refreshed = await getMyGroup()
            if (refreshed.success && refreshed.group) {
                setCurrentGroup(refreshed.group)
            }
            const statsResult = await getGroupStats()
            if (statsResult.success && statsResult.stats) setStats(statsResult.stats)
        } else {
            alert(result.error || 'Failed to remove member')
        }
        setActionLoading(null)
        setConfirmRemove(null)
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
            setAvailableMissions(prev => {
                const updated = prev.filter(m => m.id !== missionId)
                if (updated.length === 0) setShowAddMission(false)
                return updated
            })
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
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-neutral-600" />
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                                {currentGroup.name}
                            </h1>
                            <span className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${
                                currentGroup.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-neutral-100 text-neutral-500'
                            }`}>
                                {currentGroup.status === 'ACTIVE' ? t('active') : t('archived')}
                            </span>
                        </div>
                    </div>
                    {currentGroup.description && (
                        <p className="text-[15px] text-neutral-500">{currentGroup.description}</p>
                    )}
                </motion.div>

                <div className="space-y-6">
                    {/* Invite Link */}
                    {isCreator && currentGroup.invite_code && currentGroup.status === 'ACTIVE' && origin && (
                        <GroupCard>
                            <div className="p-6">
                                <h2 className="text-[15px] font-semibold text-neutral-900 mb-4">{t('inviteLink')}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-11 px-4 bg-neutral-50 rounded-xl flex items-center overflow-hidden">
                                        <p className="text-[13px] text-neutral-500 font-mono truncate">
                                            {origin}/seller/groups/join/{currentGroup.invite_code}
                                        </p>
                                    </div>
                                    <button
                                        onClick={copyInviteLink}
                                        className="h-10 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[13px] font-medium text-neutral-700 transition-colors flex items-center gap-2 flex-shrink-0"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? t('copied') : t('copyLink')}
                                    </button>
                                </div>
                            </div>
                        </GroupCard>
                    )}

                    {/* Stats Grid */}
                    <GroupCard>
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-200/60">
                            <div className="p-5 text-center">
                                {statsLoading ? (
                                    <div className="h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-300" /></div>
                                ) : (
                                    <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{formatCurrency(stats?.totalRevenue || 0)}</p>
                                )}
                                <p className="text-[13px] text-neutral-500 mt-1">{t('stats.totalRevenue')}</p>
                            </div>
                            <div className="p-5 text-center">
                                {statsLoading ? (
                                    <div className="h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-300" /></div>
                                ) : (
                                    <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{stats?.totalSales || 0}</p>
                                )}
                                <p className="text-[13px] text-neutral-500 mt-1">{t('stats.totalSales')}</p>
                            </div>
                            <div className="p-5 text-center">
                                {statsLoading ? (
                                    <div className="h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-300" /></div>
                                ) : (
                                    <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{stats?.totalLeads || 0}</p>
                                )}
                                <p className="text-[13px] text-neutral-500 mt-1">{t('stats.leads')}</p>
                            </div>
                            <div className="p-5 text-center">
                                <p className="text-2xl font-semibold text-neutral-900 tabular-nums">{memberCount}<span className="text-neutral-300 font-normal">/{currentGroup.max_members}</span></p>
                                <p className="text-[13px] text-neutral-500 mt-1">{t('members')}</p>
                            </div>
                        </div>
                    </GroupCard>

                    {/* Members Performance */}
                    <GroupCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-5">{t('stats.performance')}</h2>

                            {statsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <TraaactionLoader size={20} className="text-gray-400" />
                                </div>
                            ) : stats && stats.totalRevenue === 0 && stats.totalLeads === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-[14px] text-neutral-400">{t('stats.noStats')}</p>
                                    <p className="text-[13px] text-neutral-300 mt-1">{t('stats.noStatsDesc')}</p>
                                </div>
                            ) : stats ? (
                                <div className="space-y-1">
                                    {stats.members.map((member, index) => (
                                        <motion.div
                                            key={member.sellerId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.04 * index }}
                                            className="group py-3.5 px-3 -mx-3 rounded-xl hover:bg-neutral-50/80 transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {member.avatarUrl ? (
                                                        <img src={member.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[11px] font-medium text-neutral-500">
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[14px] text-neutral-700 truncate">{member.name}</span>
                                                        {member.isCreator && (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-500">{t('creator')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[14px] font-medium text-neutral-900 tabular-nums flex-shrink-0">
                                                        {formatCurrency(member.totalRevenue)}
                                                    </span>
                                                    {isCreator && member.sellerId !== sellerId && (
                                                        <button
                                                            onClick={() => setConfirmRemove({ id: member.sellerId, name: member.name })}
                                                            disabled={actionLoading === member.sellerId}
                                                            className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title={t('removeMember')}
                                                        >
                                                            {actionLoading === member.sellerId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mb-2 pl-11">
                                                <span className="text-[13px] text-neutral-400">
                                                    {member.salesCount} {t('stats.sales')} · {member.leadsCount} {t('stats.leads')}
                                                </span>
                                            </div>
                                            {maxRevenue > 0 && (
                                                <div className="pl-11">
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
                        </div>
                    </GroupCard>

                    {/* Missions */}
                    <GroupCard>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-[15px] font-semibold text-neutral-900">{t('stats.byMission')}</h2>
                                {isCreator && currentGroup.status === 'ACTIVE' && (
                                    <button
                                        onClick={openAddMissionModal}
                                        className="h-9 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-[13px] font-medium text-neutral-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t('addMission')}
                                    </button>
                                )}
                            </div>

                            {statsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <TraaactionLoader size={20} className="text-gray-400" />
                                </div>
                            ) : stats && stats.missions.length > 0 ? (
                                <div className="space-y-3">
                                    {stats.missions.map((mission, index) => (
                                        <motion.div
                                            key={mission.missionId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.04 * index }}
                                            className="bg-neutral-50 rounded-xl overflow-hidden cursor-pointer hover:bg-neutral-100/80 transition-colors"
                                            onClick={() => router.push(`/seller/groups/mission/${mission.missionId}`)}
                                        >
                                            <div className="flex items-center justify-between p-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {mission.logoUrl ? (
                                                        <img src={mission.logoUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-neutral-200/60 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-neutral-400">
                                                                {mission.companyName?.charAt(0) || 'M'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-[14px] text-neutral-700 truncate">{mission.missionTitle}</p>
                                                        <p className="text-[12px] text-neutral-400">{mission.companyName} · {mission.reward}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-3 text-[13px] text-neutral-500 tabular-nums">
                                                            <span>{mission.clicks} {t('stats.clicks')}</span>
                                                            <span>{mission.tinybirdSales} {t('stats.sales')}</span>
                                                            <span className="text-[14px] font-medium text-neutral-900">{formatCurrency(mission.tinybirdRevenue)}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                                                </div>
                                            </div>

                                            {mission.memberBreakdown.length > 0 && (
                                                <div className="border-t border-neutral-200/40" onClick={(e) => e.stopPropagation()}>
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
                                                                <span className="text-[13px] text-neutral-600 truncate">{mb.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                                <span className="text-[12px] text-neutral-400 tabular-nums">
                                                                    {mb.clicks} {t('stats.clicks')} · {mb.salesCount} {t('stats.sales')} · {mb.leadsCount} {t('stats.leads')}
                                                                </span>
                                                                <span className="text-[13px] font-medium text-neutral-700 tabular-nums">
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
                                <div className="space-y-2">
                                    {currentGroup.Missions.map((gm: any) => (
                                        <div
                                            key={gm.id}
                                            onClick={() => router.push(`/seller/groups/mission/${gm.Mission?.id}`)}
                                            className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-neutral-50/80 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                {gm.Mission?.logo_url ? (
                                                    <img src={gm.Mission.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-neutral-400">
                                                            {gm.Mission?.company_name?.charAt(0) || 'M'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[14px] text-neutral-600">{gm.Mission?.title}</p>
                                                    <p className="text-[12px] text-neutral-400">{gm.Mission?.company_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] text-neutral-400 tabular-nums">{gm.Mission?.reward}</span>
                                                <ChevronRight className="w-4 h-4 text-neutral-300" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-neutral-400 text-[14px]">{t('noMissions')}</p>
                                    <p className="text-[13px] text-neutral-300 mt-1 mb-3">{isCreator ? t('noMissionsDesc') : t('enrollMissionsCreatorOnly')}</p>
                                    {isCreator && (
                                        <button
                                            onClick={openAddMissionModal}
                                            className="text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors"
                                        >
                                            {t('addMission')} →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </GroupCard>

                    {/* Danger Zone */}
                    <GroupCard className="border-red-200/60">
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-red-600 mb-1">{t('dangerZone')}</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">
                                {isCreator ? t('dangerZoneDesc') : t('leaveConfirm')}
                            </p>
                            <button
                                onClick={() => setConfirmLeave(true)}
                                disabled={actionLoading === 'leave'}
                                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2"
                            >
                                {actionLoading === 'leave' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                {isCreator ? t('leaveAndArchive') : t('leaveGroup')}
                            </button>
                        </div>
                    </GroupCard>
                </div>

                {/* Add Mission Modal */}
                <AnimatePresence>
                    {showAddMission && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowAddMission(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                            >
                                <div className="flex items-center justify-between p-6 border-b border-neutral-100">
                                    <div>
                                        <h3 className="text-[15px] font-semibold text-neutral-900">{t('selectMission')}</h3>
                                        <p className="text-[13px] text-neutral-500 mt-0.5">{t('addMissionDesc')}</p>
                                    </div>
                                    <button onClick={() => setShowAddMission(false)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-3 flex-1">
                                    {loadingMissions ? (
                                        <div className="flex items-center justify-center py-12">
                                            <TraaactionLoader size={20} className="text-gray-400" />
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
                                                            <p className="text-[14px] text-neutral-700 truncate">{mission.title}</p>
                                                            <p className="text-[12px] text-neutral-400">{mission.company_name} · {mission.reward}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddMission(mission.id)}
                                                        disabled={addingMissionId === mission.id}
                                                        className="flex-shrink-0 ml-3 h-9 px-4 rounded-xl bg-neutral-900 text-white text-[13px] font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                                            <p className="text-[14px] text-neutral-500">{t('noAvailableMissions')}</p>
                                            <p className="text-[13px] text-neutral-400 mt-1 mb-3">{t('noAvailableMissionsDesc')}</p>
                                            <Link
                                                href="/seller/marketplace"
                                                onClick={() => setShowAddMission(false)}
                                                className="text-[13px] text-neutral-500 hover:text-neutral-700 transition-colors"
                                            >
                                                {t('browseMarketplace')} →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Leave Confirm Modal */}
                <ConfirmModal
                    open={confirmLeave}
                    onClose={() => setConfirmLeave(false)}
                    onConfirm={handleLeave}
                    title={t('confirmLeaveTitle')}
                    description={isCreator ? t('confirmLeaveCreatorDesc') : t('confirmLeaveDesc')}
                    confirmLabel={isCreator ? t('leaveAndArchive') : t('leaveGroup')}
                    loading={actionLoading === 'leave'}
                    variant="danger"
                />

                {/* Remove Member Confirm Modal */}
                <ConfirmModal
                    open={!!confirmRemove}
                    onClose={() => setConfirmRemove(null)}
                    onConfirm={() => confirmRemove && handleRemoveMember(confirmRemove.id)}
                    title={t('confirmRemoveTitle')}
                    description={t('confirmRemoveDesc', { name: confirmRemove?.name || '' })}
                    confirmLabel={t('removeMember')}
                    loading={!!confirmRemove && actionLoading === confirmRemove.id}
                    variant="danger"
                />
            </div>
        </div>
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
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <TraaactionLoader size={32} className="text-gray-400" />
                    <span className="text-sm text-neutral-500">Loading...</span>
                </motion.div>
            </div>
        )
    }

    if (!group) {
        return <EmptyState t={t} />
    }

    return <GroupDashboard group={group} sellerId={sellerId!} isCreator={isCreator} t={t} />
}
