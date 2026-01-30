'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Loader2, Target, Users, MousePointer2, TrendingUp,
    MoreHorizontal, Archive, Trash2, ExternalLink, Globe, Lock,
    Sparkles, ChevronRight, Clock, Check, X, AlertCircle,
    Copy, Activity, Eye, Zap, ArrowUpRight, Circle
} from 'lucide-react'
import Link from 'next/link'
import { DNSGatekeeper } from '@/components/dashboard/DNSGatekeeper'
import {
    getMissionsWithFullStats,
    getRecentMissionActivity,
    updateMissionStatus,
    deleteMission,
    type MissionWithStats,
    type ActivityItem
} from '@/app/actions/missions'
import {
    getMyProgramRequests,
    approveProgramRequest,
    rejectProgramRequest
} from '@/app/actions/marketplace-actions'

// =============================================
// CONSTANTS
// =============================================

const MAX_MISSIONS = 4

// =============================================
// TYPES
// =============================================

interface ProgramRequest {
    id: string
    seller_email: string
    seller_name: string | null
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

    if (minutes < 1) return 'à l\'instant'
    if (minutes < 60) return `il y a ${minutes}m`
    if (hours < 24) return `il y a ${hours}h`
    if (days < 7) return `il y a ${days}j`
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// =============================================
// VISIBILITY INDICATOR
// =============================================

function VisibilityDot({ visibility }: { visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' }) {
    const config = {
        PUBLIC: { color: 'bg-emerald-500', label: 'Public' },
        PRIVATE: { color: 'bg-amber-500', label: 'Privé' },
        INVITE_ONLY: { color: 'bg-violet-500', label: 'Sur invitation' },
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
    label,
    trend
}: {
    value: string | number
    label: string
    trend?: 'up' | 'down' | 'neutral'
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
    onRefresh
}: {
    mission: MissionWithStats
    onRefresh: () => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    async function handleArchive() {
        setLoading(true)
        await updateMissionStatus(mission.id, 'ARCHIVED')
        setMenuOpen(false)
        onRefresh()
        setLoading(false)
    }

    async function handleDelete() {
        if (!confirm('Supprimer cette mission définitivement ?')) return
        setLoading(true)
        await deleteMission(mission.id)
        onRefresh()
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
    const hasStats = mission.stats.clicks > 0 || mission.stats.sales > 0

    return (
        <div className={`
            group relative bg-white border transition-all duration-200
            ${isActive
                ? 'border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                : 'border-neutral-100 opacity-60 hover:opacity-80'
            }
            rounded-xl overflow-hidden
        `}>
            {/* Main Content */}
            <div className="p-5">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                            <Link
                                href={`/dashboard/missions/${mission.id}`}
                                className="text-lg font-medium text-neutral-900 hover:text-neutral-600 transition-colors truncate"
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {mission.visibility === 'INVITE_ONLY' && mission.invite_code && (
                            <button
                                onClick={handleCopyInviteLink}
                                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                                title="Copier le lien d'invitation"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        )}
                        <Link
                            href={`/dashboard/missions/${mission.id}`}
                            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Voir les détails"
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
                                            Archiver
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            disabled={loading}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Supprimer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6">
                    <StatBlock
                        value={mission.stats.activeSellers}
                        label="Sellers"
                    />
                    <StatBlock
                        value={formatNumber(mission.stats.clicks)}
                        label="Clicks"
                    />
                    <StatBlock
                        value={mission.stats.sales}
                        label="Ventes"
                    />
                    <StatBlock
                        value={formatCurrency(mission.stats.revenue)}
                        label="CA"
                    />
                </div>

                {/* Commission Badge */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900">
                            {mission.reward}
                        </span>
                        <span className="text-xs text-neutral-400">par conversion</span>
                    </div>
                    <Link
                        href={`/dashboard/missions/${mission.id}`}
                        className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                    >
                        Gérer
                        <ArrowUpRight className="w-3 h-3" />
                    </Link>
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
// PENDING REQUEST CARD
// =============================================

function PendingRequestCard({
    request,
    onApprove,
    onReject,
    loading
}: {
    request: ProgramRequest
    onApprove: () => void
    onReject: () => void
    loading: boolean
}) {
    return (
        <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                    {request.seller_name || request.seller_email}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">
                    souhaite rejoindre {request.mission_title}
                </p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={onReject}
                    disabled={loading}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                </button>
                <button
                    onClick={onApprove}
                    disabled={loading}
                    className="p-1.5 hover:bg-emerald-50 rounded-lg text-neutral-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

// =============================================
// ACTIVITY SIDEBAR
// =============================================

function ActivitySidebar({
    activities,
    requests,
    onApproveRequest,
    onRejectRequest,
    loadingRequest
}: {
    activities: ActivityItem[]
    requests: ProgramRequest[]
    onApproveRequest: (id: string) => void
    onRejectRequest: (id: string) => void
    loadingRequest: string | null
}) {
    const hasRequests = requests.length > 0
    const hasActivity = activities.length > 0

    return (
        <div className="space-y-6">
            {/* Pending Requests */}
            {hasRequests && (
                <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <h3 className="text-sm font-semibold text-neutral-900">
                                En attente
                            </h3>
                        </div>
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {requests.length}
                        </span>
                    </div>
                    <div className="px-4 max-h-[200px] overflow-y-auto">
                        {requests.map((request) => (
                            <PendingRequestCard
                                key={request.id}
                                request={request}
                                onApprove={() => onApproveRequest(request.id)}
                                onReject={() => onRejectRequest(request.id)}
                                loading={loadingRequest === request.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Feed */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-sm font-semibold text-neutral-900">
                        Activité récente
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
                            Aucune activité récente
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
    return (
        <div className="bg-white border border-neutral-200 border-dashed rounded-xl p-16 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-xl font-medium text-neutral-900 mb-2">
                Créez votre première mission
            </h3>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto leading-relaxed">
                Une mission est un programme d'affiliation. Définissez les commissions
                et recrutez des sellers pour promouvoir votre produit.
            </p>
            <Link
                href="/dashboard/missions/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Nouvelle mission
            </Link>
        </div>
    )
}

// =============================================
// MISSION SLOTS INDICATOR
// =============================================

function MissionSlots({ used, total }: { used: number; total: number }) {
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
                {remaining > 0 ? `${remaining} disponible${remaining > 1 ? 's' : ''}` : 'Limite atteinte'}
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
    return (
        <div className="grid grid-cols-4 gap-6 p-6 bg-white border border-neutral-200 rounded-xl">
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {stats.activeMissions}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Missions actives
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {stats.totalSellers}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Sellers totaux
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-neutral-900 tracking-tight tabular-nums">
                    {formatNumber(stats.totalClicks)}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Clicks totaux
                </p>
            </div>
            <div>
                <p className="text-3xl font-light text-emerald-600 tracking-tight tabular-nums">
                    {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">
                    Chiffre d'affaires
                </p>
            </div>
        </div>
    )
}

// =============================================
// MAIN CONTENT
// =============================================

function MissionsContent() {
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
    const [loadingRequest, setLoadingRequest] = useState<string | null>(null)

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

    async function handleApproveRequest(requestId: string) {
        setLoadingRequest(requestId)
        await approveProgramRequest(requestId)
        loadData()
        setLoadingRequest(null)
    }

    async function handleRejectRequest(requestId: string) {
        setLoadingRequest(requestId)
        await rejectProgramRequest(requestId)
        loadData()
        setLoadingRequest(null)
    }

    // Filter active/non-archived missions for slot count
    const activeMissions = missions.filter(m => m.status !== 'ARCHIVED')
    const canCreateMore = activeMissions.length < MAX_MISSIONS

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
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-light text-neutral-900 tracking-tight">
                        Missions
                    </h1>
                    <p className="text-neutral-500 mt-2">
                        Gérez vos programmes d'affiliation
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <MissionSlots used={activeMissions.length} total={MAX_MISSIONS} />
                    {canCreateMore ? (
                        <Link
                            href="/dashboard/missions/create"
                            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nouvelle mission
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-100 text-neutral-400 rounded-xl font-medium text-sm cursor-not-allowed">
                            <AlertCircle className="w-4 h-4" />
                            Limite atteinte
                        </div>
                    )}
                </div>
            </div>

            {/* Global Stats */}
            {missions.length > 0 && (
                <GlobalStatsBar stats={globalStats} />
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Missions List (2/3) */}
                <div className="lg:col-span-2 space-y-4">
                    {missions.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <>
                            {missions.map((mission) => (
                                <MissionRow
                                    key={mission.id}
                                    mission={mission}
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
                                    <span className="font-medium">Ajouter une mission</span>
                                </Link>
                            )}
                        </>
                    )}
                </div>

                {/* Activity Sidebar (1/3) */}
                <div className="lg:col-span-1">
                    <ActivitySidebar
                        activities={activities}
                        requests={requests}
                        onApproveRequest={handleApproveRequest}
                        onRejectRequest={handleRejectRequest}
                        loadingRequest={loadingRequest}
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
