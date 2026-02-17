'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
    Loader2, ChevronLeft, Users, Target, Send, X, AlertTriangle, Ban, Check,
    Info, DollarSign, ShoppingCart, Trophy, BarChart3, MessageSquare, Lightbulb
} from 'lucide-react'
import { getActiveOrganizationsForStartup, proposeOrgMission, cancelOrgMission, getOrgStatsForStartup } from '@/app/actions/organization-actions'
import { getWorkspaceMissions } from '@/app/actions/missions'
import { initializeConversation } from '@/app/actions/messaging'
import InfoTooltip from '@/components/ui/InfoTooltip'

// ---- Helpers ----

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function getTrophyColor(rank: number): string {
    switch (rank) {
        case 1: return 'text-yellow-500'
        case 2: return 'text-gray-400'
        case 3: return 'text-amber-600'
        default: return 'text-transparent'
    }
}

function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// ---- Org Status Badge ----
function OrgStatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; label: string }> = {
        ACTIVE: { bg: 'bg-slate-900', text: 'text-white', label: 'Active' },
        PENDING: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Pending' },
        SUSPENDED: { bg: 'bg-red-50', text: 'text-red-600', label: 'Suspended' },
    }
    const c = config[status] || config.PENDING
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    )
}

// ---- Deal Status Badge ----
function DealStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700 border-blue-100',
        ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        REJECTED: 'bg-red-50 text-red-700 border-red-100',
        CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
        </span>
    )
}

// ---- StatCard (editorial style from seller profile) ----
function StatCard({ label, value, highlight = false, tooltip, delay = '0ms' }: {
    label: string
    value: string | number
    highlight?: boolean
    tooltip?: string
    delay?: string
}) {
    return (
        <div className="group relative overflow-hidden" style={{ animationDelay: delay }}>
            <div className={`relative border ${highlight ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white'} rounded-2xl p-6 transition-all duration-500 hover:shadow-lg ${!highlight && 'hover:border-slate-900'}`}>
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${highlight ? 'bg-white/20' : 'bg-slate-900'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                <div className="relative z-10">
                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-3 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>
                        {label}
                        {tooltip && <InfoTooltip text={tooltip} position="top" />}
                    </div>
                    <div className={`text-3xl font-black tracking-tighter ${highlight ? 'text-white' : 'text-slate-900'}`}>
                        {value}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---- ContentCard (wrapper with icon + title) ----
function ContentCard({ title, icon, tooltip, children }: {
    title: string
    icon: React.ReactNode
    tooltip?: string
    children: React.ReactNode
}) {
    return (
        <div className="border border-slate-200 bg-white rounded-2xl p-6 hover:border-slate-300 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {title}
                </h3>
                {tooltip && <InfoTooltip text={tooltip} position="right" />}
            </div>
            {children}
        </div>
    )
}

// ---- DealBreakdownBar ----
function DealBreakdownBar({ totalReward, leaderReward, memberReward, tooltips }: {
    totalReward: string
    leaderReward?: string | null
    memberReward?: string | null
    tooltips: { platform: string; leader: string; member: string }
}) {
    const isPercentage = totalReward.includes('%')
    const dealValue = isPercentage
        ? parseFloat(totalReward.replace('%', ''))
        : parseFloat(totalReward.replace(/[€$]/g, ''))

    if (isNaN(dealValue) || dealValue <= 0) return null

    const platformFee = isPercentage ? 15 : dealValue * 0.15
    const leaderValue = leaderReward
        ? (isPercentage
            ? parseFloat(leaderReward.replace('%', ''))
            : parseFloat(leaderReward.replace(/[€$]/g, '')))
        : 0
    const memberValue = memberReward
        ? (isPercentage
            ? parseFloat(memberReward.replace('%', ''))
            : parseFloat(memberReward.replace(/[€$]/g, '')))
        : 0

    const suffix = isPercentage ? '%' : '€'

    // Calculate proportions for the bar
    const total = platformFee + leaderValue + memberValue
    const platformPct = total > 0 ? (platformFee / total) * 100 : 33
    const leaderPct = total > 0 ? (leaderValue / total) * 100 : 33
    const memberPct = total > 0 ? (memberValue / total) * 100 : 34

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Deal: <strong className="text-slate-900">{totalReward}</strong></span>
            </div>
            <div className="flex h-8 rounded-lg overflow-hidden border border-slate-200">
                {/* Platform */}
                <div
                    className="bg-violet-100 flex items-center justify-center gap-1 min-w-[60px] border-r border-white/50"
                    style={{ width: `${platformPct}%` }}
                >
                    <span className="text-[10px] font-semibold text-violet-700 truncate px-1">
                        {isPercentage ? '15%' : `${platformFee.toFixed(0)}${suffix}`}
                    </span>
                    <InfoTooltip text={tooltips.platform} position="bottom" width="w-56" />
                </div>
                {/* Leader */}
                {leaderValue > 0 && (
                    <div
                        className="bg-amber-100 flex items-center justify-center gap-1 min-w-[60px] border-r border-white/50"
                        style={{ width: `${leaderPct}%` }}
                    >
                        <span className="text-[10px] font-semibold text-amber-700 truncate px-1">
                            {leaderValue}{suffix}
                        </span>
                        <InfoTooltip text={tooltips.leader} position="bottom" width="w-56" />
                    </div>
                )}
                {/* Members */}
                {memberValue > 0 && (
                    <div
                        className="bg-emerald-100 flex items-center justify-center gap-1 min-w-[60px]"
                        style={{ width: `${memberPct}%` }}
                    >
                        <span className="text-[10px] font-semibold text-emerald-700 truncate px-1">
                            {memberValue}{suffix}
                        </span>
                        <InfoTooltip text={tooltips.member} position="bottom" width="w-56" />
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-200" /> Platform</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-200" /> Leader</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-200" /> Members</span>
            </div>
        </div>
    )
}

export default function OrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const t = useTranslations('dashboard.orgDetail')
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [missions, setMissions] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [showPropose, setShowPropose] = useState(false)
    const [proposing, setProposing] = useState(false)
    const [proposeError, setProposeError] = useState<string | null>(null)

    // Messaging state
    const [messagingLeader, setMessagingLeader] = useState(false)

    // Cancel state
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null)
    const [cancelError, setCancelError] = useState<string | null>(null)

    // Form state
    const [selectedMission, setSelectedMission] = useState('')
    const [totalReward, setTotalReward] = useState('')

    const selectedMissionData = useMemo(
        () => missions.find(m => m.id === selectedMission),
        [missions, selectedMission]
    )

    const loadData = useCallback(async () => {
        setLoading(true)
        const [orgResult, missionsResult, statsResult] = await Promise.all([
            getActiveOrganizationsForStartup(),
            getWorkspaceMissions(),
            getOrgStatsForStartup(orgId),
        ])

        if (orgResult.success && orgResult.organizations) {
            const found = orgResult.organizations.find((o: any) => o.id === orgId)
            setOrg(found || null)
        }
        if (missionsResult.success && missionsResult.missions) {
            setMissions(missionsResult.missions.filter((m: any) => m.status === 'ACTIVE'))
        }
        if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats)
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    // Auto-fill reward when mission selected
    useEffect(() => {
        if (selectedMissionData?.reward) {
            setTotalReward(selectedMissionData.reward)
        }
    }, [selectedMissionData])

    const handlePropose = async () => {
        if (!selectedMission || !totalReward) return
        setProposeError(null)
        setProposing(true)
        const result = await proposeOrgMission({
            orgId,
            missionId: selectedMission,
            totalReward,
        })
        setProposing(false)
        if (result.success) {
            setShowPropose(false)
            setSelectedMission('')
            setTotalReward('')
            loadData()
        } else {
            setProposeError(result.error || 'Failed to propose mission')
        }
    }

    const handleCancel = async (orgMissionId: string) => {
        setCancelError(null)
        setCancellingId(orgMissionId)
        const result = await cancelOrgMission(orgMissionId)
        setCancellingId(null)
        setShowCancelConfirm(null)
        if (result.success) {
            loadData()
        } else {
            setCancelError(result.error || 'Failed to cancel')
        }
    }

    // ---- Loading state ----
    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        )
    }

    // ---- Not found ----
    if (!org) {
        return (
            <div className="text-center py-32">
                <p className="text-slate-400 font-medium">{t('notFound')}</p>
                <button onClick={() => router.back()} className="mt-4 text-sm text-violet-600 hover:underline">{t('notFoundBack')}</button>
            </div>
        )
    }

    // Separate missions by status
    const proposedMissions = org.Missions?.filter((m: any) => m.status === 'PROPOSED') || []
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const otherMissions = org.Missions?.filter((m: any) => m.status === 'REJECTED' || m.status === 'CANCELLED') || []

    // Deal breakdown preview for propose form
    const isPercentageDeal = totalReward.includes('%')
    const dealValue = isPercentageDeal
        ? parseFloat(totalReward.replace('%', ''))
        : parseFloat(totalReward.replace(/[€$]/g, ''))
    const isValidDeal = !isNaN(dealValue) && dealValue > 0
    const platformPreview = isPercentageDeal ? 15 : dealValue * 0.15
    const orgSharePreview = isPercentageDeal ? dealValue - 15 : dealValue - platformPreview

    // Available missions (not yet proposed, invite-only)
    const alreadyProposedMissionIds = new Set(org.Missions?.map((m: any) => m.mission_id) || [])
    const availableMissions = missions.filter(m => !alreadyProposedMissionIds.has(m.id) && !m.organization_id && m.visibility === 'INVITE_ONLY')

    const leaderName = org.Leader?.name || org.Leader?.email || 'Unknown'

    return (
        <div className="relative min-h-screen">
            <div className="relative space-y-8 pb-20">
                {/* Back button — Editorial style */}
                <button
                    onClick={() => router.push('/dashboard/sellers?view=orgs')}
                    className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-all duration-300"
                >
                    <div className="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-900 transition-all duration-300">
                        <ChevronLeft className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                    </div>
                    <span className="tracking-tight">{t('back')}</span>
                </button>

                {/* ═══════════ HERO HEADER ═══════════ */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent rounded-3xl" />
                    <div className="relative border border-slate-200/60 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
                        {/* Accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-900 to-transparent" />

                        <div className="p-6 sm:p-10">
                            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
                                {/* Logo / Avatar */}
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-b from-slate-200 to-slate-300 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
                                    <div className="relative w-20 h-20 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                                        {org.logo_url ? (
                                            <img src={org.logo_url} alt={org.name} className="w-20 h-20 rounded-2xl object-cover" />
                                        ) : (
                                            <Users className="w-8 h-8 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900">
                                                {org.name}
                                            </h1>
                                            <OrgStatusBadge status={org.status || 'ACTIVE'} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {org.leader_id && (
                                                <button
                                                    onClick={async () => {
                                                        if (messagingLeader) return
                                                        setMessagingLeader(true)
                                                        const result = await initializeConversation(org.leader_id)
                                                        setMessagingLeader(false)
                                                        if (result.success && result.conversationId) {
                                                            router.push(`/dashboard/messages?conversation=${result.conversationId}`)
                                                        }
                                                    }}
                                                    disabled={messagingLeader}
                                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                                                >
                                                    {messagingLeader ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <MessageSquare className="w-4 h-4" />
                                                    )}
                                                    {t('messageLeader')}
                                                </button>
                                            )}
                                            {availableMissions.length > 0 && (
                                                <button
                                                    onClick={() => setShowPropose(true)}
                                                    className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                                >
                                                    <Send className="w-4 h-4" /> {t('proposeMission')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-slate-500 font-mono text-sm tracking-tight mb-6">
                                        {t('ledBy', { name: leaderName })} · {org.Leader?.email}
                                    </p>

                                    {org.description && (
                                        <p className="text-sm text-slate-600 leading-relaxed mb-6">{org.description}</p>
                                    )}

                                    {/* Meta pills */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                            <Users className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                {t('members', { count: org._count?.Members || 0 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                            <Target className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                {t('missions', { count: acceptedMissions.length })}
                                            </span>
                                        </div>
                                        {org.created_at && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                                <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                    {t('since', { date: formatDate(org.created_at) })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ KPI STATS GRID ═══════════ */}
                {stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label={t('revenue')}
                            value={formatCurrency(stats.totalRevenue)}
                            highlight
                            tooltip={t('tooltip.revenue')}
                            delay="0ms"
                        />
                        <StatCard
                            label={t('conversions')}
                            value={stats.totalSales + stats.totalLeads}
                            tooltip={t('tooltip.conversions')}
                            delay="50ms"
                        />
                        <StatCard
                            label={t('activeMembers')}
                            value={stats.activeMembers}
                            tooltip={t('tooltip.activeMembers')}
                            delay="100ms"
                        />
                        <StatCard
                            label={t('activeMissions')}
                            value={stats.activeMissions}
                            tooltip={t('tooltip.activeMissions')}
                            delay="150ms"
                        />
                    </div>
                )}

                {/* Cancel error banner */}
                {cancelError && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-medium">{t('cancelError')}</p>
                            <p className="text-xs mt-0.5 text-red-600">{cancelError}</p>
                        </div>
                        <button onClick={() => setCancelError(null)} className="ml-auto text-red-400 hover:text-red-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ═══════════ 2-COLUMN LAYOUT ═══════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ──── Main (col-span-2) ──── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Active Arrangements */}
                        {acceptedMissions.length > 0 && (
                            <ContentCard
                                title={`${t('activeArrangements')} (${acceptedMissions.length})`}
                                icon={<Check className="w-4 h-4" />}
                                tooltip={t('tooltip.activeArrangements')}
                            >
                                <div className="space-y-5">
                                    {acceptedMissions.map((m: any) => {
                                        const missionStat = stats?.missionStats?.find((ms: any) => ms.orgMissionId === m.id)
                                        return (
                                            <div key={m.id} className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                            <Check className="w-4 h-4 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{m.Mission?.title || m.mission_id}</p>
                                                            <p className="text-xs text-slate-400">
                                                                {t('accepted')}{m.accepted_at ? ` · ${formatDate(m.accepted_at)}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <DealStatusBadge status="ACCEPTED" />
                                                </div>

                                                {/* Stats row */}
                                                {missionStat && (missionStat.sales > 0 || missionStat.leads > 0) && (
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <span className="flex items-center gap-1.5 text-slate-500">
                                                            <BarChart3 className="w-3.5 h-3.5" />
                                                            <strong className="text-slate-900">{formatCurrency(missionStat.revenue)}</strong> {t('revenueLabel')}
                                                        </span>
                                                        {missionStat.sales > 0 && (
                                                            <span className="text-slate-500">
                                                                <strong className="text-slate-700">{missionStat.sales}</strong> {missionStat.sales === 1 ? 'sale' : 'sales'}
                                                            </span>
                                                        )}
                                                        {missionStat.leads > 0 && (
                                                            <span className="text-slate-500">
                                                                <strong className="text-slate-700">{missionStat.leads}</strong> {missionStat.leads === 1 ? 'lead' : 'leads'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* DealBreakdownBar */}
                                                <DealBreakdownBar
                                                    totalReward={m.total_reward}
                                                    leaderReward={m.leader_reward}
                                                    memberReward={m.member_reward}
                                                    tooltips={{
                                                        platform: t('tooltip.platformFee'),
                                                        leader: t('tooltip.leaderCut'),
                                                        member: t('tooltip.memberReward'),
                                                    }}
                                                />

                                                {/* Cancel */}
                                                {showCancelConfirm === m.id ? (
                                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                                        <p className="text-xs text-slate-600 flex-1">{t('cancelConfirmText')}</p>
                                                        <button
                                                            onClick={() => handleCancel(m.id)}
                                                            disabled={cancellingId === m.id}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {cancellingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                                            {t('cancelConfirmButton')}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowCancelConfirm(null)}
                                                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                                                        >
                                                            {t('cancelKeepButton')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                                        <button
                                                            onClick={() => setShowCancelConfirm(m.id)}
                                                            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            {t('cancelArrangement')}
                                                        </button>
                                                        <InfoTooltip text={t('tooltip.cancelArrangement')} position="right" width="w-56" />
                                                    </div>
                                                )}

                                                {/* Separator between missions */}
                                                {acceptedMissions.indexOf(m) < acceptedMissions.length - 1 && (
                                                    <div className="border-b border-slate-100" />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </ContentCard>
                        )}

                        {/* Pending Proposals */}
                        {proposedMissions.length > 0 && (
                            <ContentCard
                                title={`${t('pendingProposals')} (${proposedMissions.length})`}
                                icon={<Send className="w-4 h-4" />}
                                tooltip={t('tooltip.pendingProposals')}
                            >
                                <div className="space-y-4">
                                    {proposedMissions.map((m: any) => (
                                        <div key={m.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Send className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{m.Mission?.title || m.mission_id}</p>
                                                    <p className="text-xs text-slate-400">{t('waitingForLeader')} · {t('deal')}: {m.total_reward}</p>
                                                </div>
                                            </div>
                                            <DealStatusBadge status="PROPOSED" />
                                        </div>
                                    ))}
                                </div>
                            </ContentCard>
                        )}

                        {/* Past Arrangements */}
                        {otherMissions.length > 0 && (
                            <ContentCard
                                title={`${t('pastArrangements')} (${otherMissions.length})`}
                                icon={<BarChart3 className="w-4 h-4" />}
                            >
                                <div className="space-y-2">
                                    {otherMissions.map((m: any) => (
                                        <div key={m.id} className="flex items-center justify-between py-2 opacity-60">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">{m.Mission?.title || m.mission_id}</p>
                                                <p className="text-xs text-slate-400">{t('deal')}: {m.total_reward}</p>
                                            </div>
                                            <DealStatusBadge status={m.status} />
                                        </div>
                                    ))}
                                </div>
                            </ContentCard>
                        )}

                        {/* Empty state */}
                        {!org.Missions?.length && (
                            <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50">
                                <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-900 font-semibold mb-1">{t('noMissionsYet')}</p>
                                <p className="text-slate-500 text-sm mb-5">{t('noMissionsDesc')}</p>
                                {availableMissions.length === 0 && missions.length > 0 && (
                                    <p className="text-xs text-slate-400 mb-4">{t('noInviteOnly')}</p>
                                )}
                                {availableMissions.length > 0 && (
                                    <button
                                        onClick={() => setShowPropose(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
                                    >
                                        <Send className="w-4 h-4" /> {t('proposeMission')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ──── Sidebar (col-span-1) ──── */}
                    <div className="space-y-6">
                        {/* Top Sellers */}
                        {stats?.topSellers?.length > 0 && (
                            <ContentCard
                                title={t('topSellers')}
                                icon={<Trophy className="w-4 h-4" />}
                                tooltip={t('tooltip.topSellers')}
                            >
                                <div className="space-y-1">
                                    {stats.topSellers.map((seller: any, index: number) => {
                                        const rank = index + 1
                                        return (
                                            <div key={seller.sellerId} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                                <div className="w-6 flex items-center justify-center">
                                                    {rank <= 3 ? (
                                                        <Trophy className={`w-4 h-4 ${getTrophyColor(rank)}`} />
                                                    ) : (
                                                        <span className="text-sm font-medium text-slate-400">{rank}</span>
                                                    )}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
                                                    {seller.avatarUrl ? (
                                                        <img src={seller.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {(seller.name || seller.email || '?')[0].toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        {seller.name || seller.email || 'Unknown'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {seller.sales > 0 && `${seller.sales} sale${seller.sales > 1 ? 's' : ''}`}
                                                        {seller.sales > 0 && seller.leads > 0 && ' · '}
                                                        {seller.leads > 0 && `${seller.leads} lead${seller.leads > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900">{formatCurrency(seller.revenue)}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ContentCard>
                        )}

                        {/* How It Works Panel */}
                        <div className="border border-violet-100 bg-violet-50/50 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 border border-violet-200 rounded-lg flex items-center justify-center">
                                    <Lightbulb className="w-4 h-4 text-violet-600" />
                                </div>
                                <h3 className="text-sm font-bold text-violet-900 uppercase tracking-wider">
                                    {t('howItWorks')}
                                </h3>
                            </div>
                            <ol className="space-y-3">
                                {[1, 2, 3, 4, 5].map(step => (
                                    <li key={step} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-200/60 flex items-center justify-center text-[10px] font-bold text-violet-700 mt-0.5">
                                            {step}
                                        </span>
                                        <span className="text-xs text-violet-800 leading-relaxed">
                                            {t(`howItWorksSteps.step${step}`)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>

                {/* ═══════════ PROPOSE MODAL ═══════════ */}
                {showPropose && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 space-y-5 shadow-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">{t('proposeMission')}</h3>
                                <button onClick={() => { setShowPropose(false); setProposeError(null) }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mission selector */}
                            <div>
                                <label className="text-sm font-medium text-slate-700 block mb-1.5">{t('selectMission')}</label>
                                <select
                                    value={selectedMission}
                                    onChange={e => setSelectedMission(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 bg-white"
                                >
                                    <option value="">{t('chooseMission')}</option>
                                    {availableMissions.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                            {m.title} — {m.reward}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                                    <InfoTooltip text={t('tooltip.inviteOnly')} position="right" width="w-56" />
                                    {t('tooltip.inviteOnly').split('.')[0]}.
                                </p>
                            </div>

                            {/* Total reward */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <label className="text-sm font-medium text-slate-700">{t('totalDeal')}</label>
                                    <InfoTooltip text={t('tooltip.totalDeal')} position="right" width="w-56" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('totalDealPlaceholder')}
                                    value={totalReward}
                                    onChange={e => setTotalReward(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                                />
                                {selectedMissionData?.reward && totalReward !== selectedMissionData.reward && (
                                    <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        {t('customDealNote', { reward: selectedMissionData.reward })}
                                    </p>
                                )}
                            </div>

                            {/* Deal breakdown preview */}
                            {isValidDeal && (
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-sm">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dealBreakdown')}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">{t('totalDealLabel')}</span>
                                        <span className="font-semibold text-slate-900">{totalReward}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                            {t('platformFeeLabel')}
                                        </span>
                                        <span>{isPercentageDeal ? '15%' : `${platformPreview.toFixed(2)}€`}</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                                        <span className="text-slate-600">{t('orgReceives')}</span>
                                        <span className="font-semibold text-emerald-600">
                                            {isPercentageDeal ? `${orgSharePreview}%` : `${orgSharePreview.toFixed(2)}€`}
                                        </span>
                                    </div>
                                    {isPercentageDeal && orgSharePreview <= 0 && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t('dealTooLow')}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Info box */}
                            <div className="flex items-start gap-2.5 p-3 bg-violet-50 rounded-xl text-xs text-violet-700">
                                <Info className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />
                                <p>{t('infoBox')}</p>
                            </div>

                            {/* Error */}
                            {proposeError && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {proposeError}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handlePropose}
                                disabled={proposing || !selectedMission || !totalReward || (isPercentageDeal && orgSharePreview <= 0)}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {proposing ? t('sendingProposal') : t('sendProposal')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
