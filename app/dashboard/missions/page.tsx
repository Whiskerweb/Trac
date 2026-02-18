'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Loader2, Target, Users, MousePointer2,
    MoreHorizontal, Archive, Globe, Lock,
    Sparkles, Clock, AlertCircle, Download,
    Copy, Activity, Eye, Zap, ArrowUpRight, Circle, Check, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { DNSGatekeeper } from '@/components/dashboard/DNSGatekeeper'
import {
    getMissionsWithFullStats,
    getRecentMissionActivity,
    deleteMission,
    exportMissionData,
    type MissionWithStats,
    type ActivityItem
} from '@/app/actions/missions'
import { getMyProgramRequests } from '@/app/actions/marketplace-actions'

// =============================================
// CONSTANTS
// =============================================

const MAX_MISSIONS = 4

// =============================================
// TYPES
// =============================================

interface ProgramRequest {
    id: string
    seller_id: string
    seller_email: string
    seller_name: string | null
    mission_id: string
    mission_title: string
    message: string | null
    created_at: Date
}

// =============================================
// FORMAT HELPERS
// =============================================

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toLocaleString('fr-FR')
}

function formatCurrency(cents: number): string {
    const euros = cents / 100
    if (euros >= 1000) return `${(euros / 1000).toFixed(1)}k€`
    return `${euros.toFixed(0)}€`
}

function formatTimeAgo(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

// =============================================
// VISIBILITY INDICATOR
// =============================================

function VisibilityDot({ visibility }: { visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' }) {
    const t = useTranslations('dashboard.missions.visibility')
    const config = {
        PUBLIC: { color: 'bg-emerald-500', label: t('public') },
        PRIVATE: { color: 'bg-amber-500', label: t('private') },
        INVITE_ONLY: { color: 'bg-violet-500', label: t('inviteOnly') },
    }
    const { color, label } = config[visibility] || config.PUBLIC

    return (
        <div className="flex items-center gap-1.5" title={label}>
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[11px] text-neutral-500 font-medium uppercase tracking-wide">
                {label}
            </span>
        </div>
    )
}

// =============================================
// STAT BLOCK (MINIMAL)
// =============================================

function StatBlock({
    value,
    label
}: {
    value: string | number
    label: string
}) {
    return (
        <div className="text-center">
            <p className="text-2xl font-light text-neutral-900 tracking-tight tabular-nums">
                {value}
            </p>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">
                {label}
            </p>
        </div>
    )
}

// =============================================
// MISSION ROW (LIST STYLE)
// =============================================

function MissionRow({
    mission,
    pendingRequests,
    onRefresh
}: {
    mission: MissionWithStats
    pendingRequests: number
    onRefresh: () => void
}) {
    const t = useTranslations('dashboard.missions')
    const [menuOpen, setMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    async function handleArchive() {
        if (!confirm(t('deleteConfirm'))) return
        setLoading(true)
        try {
            const result = await deleteMission(mission.id)
            if (result.success) {
                setMenuOpen(false)
                onRefresh()
            } else {
                alert(result.error || 'Failed to archive mission')
            }
        } catch {
            alert('Failed to archive mission')
        } finally {
            setLoading(false)
        }
    }

    function handleCopyInviteLink() {
        if (mission.invite_code) {
            const url = `${window.location.origin}/invite/${mission.invite_code}`
            navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const isActive = mission.status === 'ACTIVE'

    return (
        <div className={`
            group relative bg-white border transition-all duration-200
            ${isActive
                ? 'border-neutral-200 hover:border-neutral-300 card-hover'
                : 'border-neutral-100 opacity-60 hover:opacity-80'
            }
            rounded-xl overflow-hidden
        `}>
            {/* Pending Requests Badge */}
            {pendingRequests > 0 && (
                <div className="absolute -top-2 -right-2 z-10">
                    <Link
                        href={`/dashboard/missions/${mission.id}`}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-amber-600 transition-colors"
                    >
                        <Clock className="w-3 h-3" />
                        {pendingRequests}
                    </Link>
                </div>
            )}

            {/* Main Content */}
            <div className="p-4 sm:p-5">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                            <Link
                                href={`/dashboard/missions/${mission.id}`}
                                className="text-base sm:text-lg font-medium text-neutral-900 hover:text-neutral-600 transition-colors truncate"
                            >
                                {mission.title}
                            </Link>
                            {isActive && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                                    <Circle className="w-1.5 h-1.5 fill-current" />
                                    Live
                                </span>
                            )}
                        </div>
                        <VisibilityDot visibility={mission.visibility} />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {mission.visibility === 'INVITE_ONLY' && mission.invite_code && (
                            <button
                                onClick={handleCopyInviteLink}
                                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                                title={t('copyInviteLink')}
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        )}
                        <Link
                            href={`/dashboard/missions/${mission.id}`}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                            title={t('viewDetails')}
                        >
                            <Eye className="w-4 h-4" />
                        </Link>
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-20">
                                        <button
                                            onClick={handleArchive}
                                            disabled={loading}
                                            className="w-full px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50 flex items-center gap-2"
                                        >
                                            <Archive className="w-4 h-4" />
                                            {t('archive')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                    <StatBlock
                        value={mission.stats.activeSellers}
                        label={t('stats.sellers')}
                    />
                    <StatBlock
                        value={formatNumber(mission.stats.clicks)}
                        label={t('stats.clicks')}
                    />
                    <StatBlock
                        value={mission.stats.sales}
                        label={t('stats.sales')}
                    />
                    <StatBlock
                        value={formatCurrency(mission.stats.revenue)}
                        label={t('stats.revenue')}
                    />
                </div>

                {/* Commission Badge */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900">
                            {mission.reward}
                        </span>
                        <span className="text-xs text-neutral-400">{t('perConversion')}</span>
                    </div>
                    <Link
                        href={`/dashboard/missions/${mission.id}`}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                    >
                        {t('manage')}
                        <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

// =============================================
// ARCHIVED MISSION ROW
// =============================================

function ArchivedMissionRow({
    mission,
    onExport
}: {
    mission: MissionWithStats
    onExport: (missionId: string) => void
}) {
    const t = useTranslations('dashboard.missions')
    const [exporting, setExporting] = useState(false)

    const daysRemaining = mission.archived_at
        ? Math.max(0, 30 - Math.floor((Date.now() - new Date(mission.archived_at).getTime()) / 86400000))
        : 30

    async function handleExport() {
        setExporting(true)
        try {
            onExport(mission.id)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="group relative bg-white border border-neutral-100 rounded-xl overflow-hidden opacity-60 hover:opacity-80 transition-all duration-200">
            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <Link
                            href={`/dashboard/missions/${mission.id}`}
                            className="text-base font-medium text-neutral-900 hover:text-neutral-600 transition-colors truncate block"
                        >
                            {mission.title}
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Deletion countdown badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-full ${
                            daysRemaining <= 7
                                ? 'bg-red-50 text-red-600'
                                : 'bg-neutral-100 text-neutral-500'
                        }`}>
                            <Clock className="w-3 h-3" />
                            {t('archives.daysRemaining', { count: daysRemaining })}
                        </span>
                        {/* Export button */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                            {exporting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Download className="w-3 h-3" />
                            )}
                            {t('archives.exportData')}
                        </button>
                    </div>
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <StatBlock value={mission.stats.activeSellers} label={t('stats.sellers')} />
                    <StatBlock value={formatNumber(mission.stats.clicks)} label={t('stats.clicks')} />
                    <StatBlock value={mission.stats.sales} label={t('stats.sales')} />
                    <StatBlock value={formatCurrency(mission.stats.revenue)} label={t('stats.revenue')} />
                </div>
            </div>
        </div>
    )
}

// =============================================
// ACTIVITY FEED ITEM
// =============================================

function ActivityFeedItem({ activity }: { activity: ActivityItem }) {
    const typeConfig = {
        enrollment: {
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        request: {
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
        sale: {
            icon: Zap,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50'
        },
        click: {
            icon: MousePointer2,
            color: 'text-violet-500',
            bg: 'bg-violet-50'
        }
    }

    const config = typeConfig[activity.type] || typeConfig.enrollment
    const Icon = config.icon

    return (
        <div className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
            <div className={`w-7 h-7 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 leading-snug">
                    {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-neutral-400">
                        {activity.missionTitle}
                    </span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-[11px] text-neutral-400">
                        {formatTimeAgo(activity.timestamp)}
                    </span>
                </div>
            </div>
            {activity.metadata?.amount && (
                <span className="text-sm font-medium text-emerald-600 tabular-nums">
                    +{formatCurrency(activity.metadata.amount)}
                </span>
            )}
        </div>
    )
}

// =============================================
// PENDING REQUEST NOTIFICATION (links to mission)
// =============================================

function PendingRequestNotification({ request }: { request: ProgramRequest }) {
    return (
        <Link
            href={`/dashboard/missions/${request.mission_id}`}
            className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 -mx-4 px-4 transition-colors"
        >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                    {request.seller_name || request.seller_email}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                    veut rejoindre {request.mission_title}
                </p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
        </Link>
    )
}

// =============================================
// ACTIVITY SIDEBAR
// =============================================

function ActivitySidebar({
    activities,
    requests
}: {
    activities: ActivityItem[]
    requests: ProgramRequest[]
}) {
    const t = useTranslations('dashboard.missions')
    const hasRequests = requests.length > 0
    const hasActivity = activities.length > 0

    return (
        <div className="space-y-6">
            {/* Pending Requests - Notifications that link to mission */}
            {hasRequests && (
                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <h3 className="text-sm font-semibold text-neutral-900">
                                {t('pendingRequests')}
                            </h3>
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {requests.length}
                        </span>
                    </div>
                    <div className="px-4 max-h-[200px] overflow-y-auto">
                        {requests.map((request) => (
                            <PendingRequestNotification key={request.id} request={request} />
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Feed */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-sm font-semibold text-neutral-900">
                        {t('recentActivity')}
                    </h3>
                </div>
                {hasActivity ? (
                    <div className="px-4 max-h-[400px] overflow-y-auto">
                        {activities.map((activity) => (
                            <ActivityFeedItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    <div className="px-4 py-8 text-center">
                        <Activity className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
                        <p className="text-sm text-neutral-400">
                            {t('noActivity')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// =============================================
// EMPTY STATE
// =============================================

function EmptyState() {
    const t = useTranslations('dashboard.missions')
    return (
        <div className="bg-white border border-neutral-200 border-dashed rounded-xl p-16 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-xl font-medium text-neutral-900 mb-2">
                {t('createFirst')}
            </h3>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto leading-relaxed">
                {t('missionDescription')}
            </p>
            <Link
                href="/dashboard/missions/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
            >
                <Plus className="w-4 h-4" />
                {t('newMission')}
            </Link>
        </div>
    )
}

// =============================================
// MISSION SLOTS INDICATOR
// =============================================

function MissionSlots({ used, total }: { used: number; total: number }) {
    const t = useTranslations('dashboard.missions')
    const remaining = total - used

    return (
        <div className="flex items-center gap-3">
            <div className="flex gap-1">
                {[...Array(total)].map((_, i) => (
                    <div
                        key={i}
                        className={`
                            w-8 h-1.5 rounded-full transition-colors
                            ${i < used ? 'bg-neutral-900' : 'bg-neutral-200'}
                        `}
                    />
                ))}
            </div>
            <span className="text-sm text-neutral-500">
                {remaining > 0 ? t('slotsAvailable', { count: remaining }) : t('limitReached')}
            </span>
        </div>
    )
}

// =============================================
// GLOBAL STATS BAR
// =============================================

function GlobalStatsBar({ stats }: {
    stats: {
        totalMissions: number
        activeMissions: number
        totalSellers: number
        totalClicks: number
        totalRevenue: number
    }
}) {
    const t = useTranslations('dashboard.missions')
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-4 sm:p-6 bg-white border border-neutral-200 rounded-xl">
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {stats.activeMissions}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    {t('activeMissions')}
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {stats.totalSellers}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    {t('totalSellers')}
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {formatNumber(stats.totalClicks)}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    {t('totalClicks')}
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-emerald-600 tracking-tight tabular-nums">
                    {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    {t('totalRevenue')}
                </p>
            </div>
        </div>
    )
}

// =============================================
// MAIN CONTENT
// =============================================

function MissionsContent() {
    const t = useTranslations('dashboard.missions')
    const [missions, setMissions] = useState<MissionWithStats[]>([])
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [requests, setRequests] = useState<ProgramRequest[]>([])
    const [globalStats, setGlobalStats] = useState({
        totalMissions: 0,
        activeMissions: 0,
        totalSellers: 0,
        totalClicks: 0,
        totalRevenue: 0,
        totalCommissions: 0
    })
    const [loading, setLoading] = useState(true)
    const [showArchives, setShowArchives] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const [missionsResult, activityResult, requestsResult] = await Promise.all([
            getMissionsWithFullStats(),
            getRecentMissionActivity(15),
            getMyProgramRequests()
        ])

        if (missionsResult.success && missionsResult.missions) {
            setMissions(missionsResult.missions)
        }
        if (missionsResult.globalStats) {
            setGlobalStats(missionsResult.globalStats)
        }
        if (activityResult.success && activityResult.activities) {
            setActivities(activityResult.activities)
        }
        if (requestsResult.success && 'requests' in requestsResult && requestsResult.requests) {
            setRequests(requestsResult.requests as ProgramRequest[])
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Filter active/non-archived missions for slot count
    const nonArchivedMissions = missions.filter(m => m.status !== 'ARCHIVED')
    const archivedMissions = missions.filter(m => m.status === 'ARCHIVED')
    const activeMissions = nonArchivedMissions
    const canCreateMore = activeMissions.length < MAX_MISSIONS

    async function handleExport(missionId: string) {
        const result = await exportMissionData(missionId)
        if (result.success && result.csv) {
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = result.filename || 'mission-export.csv'
            a.click()
            URL.revokeObjectURL(a.href)
        }
    }

    // Group requests by mission for badge count
    const requestsByMission = requests.reduce((acc, req) => {
        acc[req.mission_id] = (acc[req.mission_id] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-light text-neutral-900 tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-neutral-500 mt-2">
                        {t('managePrograms')}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <MissionSlots used={activeMissions.length} total={MAX_MISSIONS} />
                    {archivedMissions.length > 0 && (
                        <button
                            onClick={() => setShowArchives(!showArchives)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                                showArchives
                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:text-neutral-700'
                            }`}
                        >
                            <Archive className="w-3.5 h-3.5" />
                            {t('archives.title')}
                            <span className={`ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                                showArchives ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                                {archivedMissions.length}
                            </span>
                        </button>
                    )}
                    {canCreateMore ? (
                        <Link
                            href="/dashboard/missions/create"
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('newMission')}
                        </Link>
                    ) : (
                        <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-400 rounded-xl font-medium text-sm cursor-not-allowed">
                            <AlertCircle className="w-4 h-4" />
                            {t('limitReached')}
                        </div>
                    )}
                </div>
            </div>

            {/* Global Stats */}
            {missions.length > 0 && (
                <GlobalStatsBar stats={globalStats} />
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Missions List (2/3) */}
                <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                    {nonArchivedMissions.length === 0 && archivedMissions.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <>
                            {nonArchivedMissions.map((mission) => (
                                <MissionRow
                                    key={mission.id}
                                    mission={mission}
                                    pendingRequests={requestsByMission[mission.id] || 0}
                                    onRefresh={loadData}
                                />
                            ))}

                            {/* Add Mission Placeholder */}
                            {canCreateMore && (
                                <Link
                                    href="/dashboard/missions/create"
                                    className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50/50 transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">{t('addMission')}</span>
                                </Link>
                            )}

                            {/* Archives Section */}
                            {showArchives && archivedMissions.length > 0 && (
                                <div className="mt-6 space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Archive className="w-4 h-4 text-neutral-400" />
                                        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
                                            {t('archives.section')}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-neutral-400 -mt-1 mb-3">
                                        {t('archives.deletionSoon')}
                                    </p>
                                    {archivedMissions.map((mission) => (
                                        <ArchivedMissionRow
                                            key={mission.id}
                                            mission={mission}
                                            onExport={handleExport}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Activity Sidebar (1/3) */}
                <div className="lg:col-span-1">
                    <ActivitySidebar
                        activities={activities}
                        requests={requests}
                    />
                </div>
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function MissionsPage() {
    return (
        <DNSGatekeeper>
            <MissionsContent />
        </DNSGatekeeper>
    )
}
