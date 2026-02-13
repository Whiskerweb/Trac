'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft, Target, Users, MousePointer2, DollarSign,
    Copy, Check, Loader2, ExternalLink, Calendar, TrendingUp, Info,
    MoreHorizontal, Edit, Archive, Trash2, Globe, Lock, Sparkles, Link as LinkIcon,
    Clock, CheckCircle, XCircle, MessageSquare, User, BarChart3,
    ChevronRight, ChevronDown, Search, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import Link from 'next/link'
import { getMissionDetails } from '@/app/actions/missions'
import {
    getMissionPendingRequests,
    approveProgramRequest,
    rejectProgramRequest,
    type EnrichedProgramRequest
} from '@/app/actions/marketplace-actions'
import { useTranslations } from 'next-intl'

// =============================================
// PAGINATION CONFIG
// =============================================
const REQUESTS_PER_PAGE = 10

interface MissionDetails {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    status: string
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    invite_code: string | null
    invite_url: string | null
    created_at: Date
    enrollments: {
        id: string
        user_id: string
        status: string
        created_at: Date
        enrollmentType: 'SOLO' | 'GROUP' | 'ORG'
        groupName?: string | null
        orgName?: string | null
        seller: {
            name: string | null
            email: string
            avatar: string | null
        } | null
        link: {
            id: string
            slug: string
            clicks: number
            full_url: string
        } | null
        stats: {
            revenue: number
            sales: number
            clicks: number
        }
    }[]
}

type SortField = 'revenue' | 'sales' | 'clicks' | 'date'
type SortOrder = 'asc' | 'desc'

// =============================================
// STATUS BADGE
// =============================================

function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('dashboard.missions.detail.statusLabels')
    const styles: Record<string, string> = {
        ACTIVE: 'bg-green-50 text-green-700',
        DRAFT: 'bg-gray-100 text-gray-600',
        ARCHIVED: 'bg-orange-50 text-orange-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {t(status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED')}
        </span>
    )
}

function ParticipantStatusBadge({ status }: { status: string }) {
    const t = useTranslations('dashboard.missions.detail.statusLabels')
    const styles: Record<string, string> = {
        APPROVED: 'bg-green-50 text-green-700',
        PENDING: 'bg-orange-50 text-orange-700',
        REJECTED: 'bg-red-50 text-red-700',
        ARCHIVED: 'bg-gray-100 text-gray-500',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {t(status as 'APPROVED' | 'PENDING' | 'REJECTED' | 'ARCHIVED')}
        </span>
    )
}

function EnrollmentTypeBadge({ type, name }: { type: 'SOLO' | 'GROUP' | 'ORG'; name?: string | null }) {
    const t = useTranslations('dashboard.missions.detail')
    if (type === 'SOLO') return null
    if (type === 'GROUP') {
        return (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                {t('groupTag')}{name ? `: ${name}` : ''}
            </span>
        )
    }
    return (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            {t('orgTag')}{name ? `: ${name}` : ''}
        </span>
    )
}

function VisibilityBadge({ visibility }: { visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' }) {
    const t = useTranslations('dashboard.missions.detail.visibilityLabels')
    const config = {
        PUBLIC: {
            icon: Globe,
            styles: 'bg-emerald-50 text-emerald-700',
        },
        PRIVATE: {
            icon: Lock,
            styles: 'bg-amber-50 text-amber-700',
        },
        INVITE_ONLY: {
            icon: Sparkles,
            styles: 'bg-violet-50 text-violet-700',
        },
    }

    const { icon: Icon, styles } = config[visibility]
    const label = visibility === 'PUBLIC' ? 'public' : visibility === 'PRIVATE' ? 'private' : 'inviteOnly'

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            <Icon className="w-3 h-3" />
            {t(label)}
        </span>
    )
}

// =============================================
// FORMAT HELPERS
// =============================================

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function MissionDetailPage({
    params
}: {
    params: Promise<{ missionId: string }>
}) {
    const { missionId } = use(params)
    const t = useTranslations('dashboard.missions.detail')
    const router = useRouter()
    const [mission, setMission] = useState<MissionDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [pendingRequests, setPendingRequests] = useState<EnrichedProgramRequest[]>([])
    const [processingRequest, setProcessingRequest] = useState<string | null>(null)
    const [requestsPage, setRequestsPage] = useState(1)
    const [requestsSearch, setRequestsSearch] = useState('')
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null)
    const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
    const [sortField, setSortField] = useState<SortField>('revenue')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    useEffect(() => {
        async function loadMission() {
            const result = await getMissionDetails(missionId)
            if (result.success && result.mission) {
                setMission(result.mission)
                // Load pending requests for PRIVATE missions
                if (result.mission.visibility === 'PRIVATE') {
                    const requestsResult = await getMissionPendingRequests(missionId)
                    if (requestsResult.success && requestsResult.requests) {
                        setPendingRequests(requestsResult.requests)
                    }
                }
            } else {
                setError(result.error || 'Failed to load')
            }
            setLoading(false)
        }
        loadMission()
    }, [missionId])

    const handleApprove = async (requestId: string) => {
        setProcessingRequest(requestId)
        const result = await approveProgramRequest(requestId)
        if (result.success) {
            setPendingRequests(prev => prev.filter(r => r.id !== requestId))
            // Refresh mission to update enrollments
            const missionResult = await getMissionDetails(missionId)
            if (missionResult.success && missionResult.mission) {
                setMission(missionResult.mission)
            }
        }
        setProcessingRequest(null)
    }

    const handleReject = async (requestId: string) => {
        setProcessingRequest(requestId)
        const result = await rejectProgramRequest(requestId)
        if (result.success) {
            setPendingRequests(prev => prev.filter(r => r.id !== requestId))
            setSelectedRequests(prev => {
                const next = new Set(prev)
                next.delete(requestId)
                return next
            })
        }
        setProcessingRequest(null)
    }

    // Bulk approve
    const handleBulkApprove = async () => {
        for (const requestId of selectedRequests) {
            await handleApprove(requestId)
        }
        setSelectedRequests(new Set())
    }

    // Bulk reject
    const handleBulkReject = async () => {
        for (const requestId of selectedRequests) {
            await handleReject(requestId)
        }
        setSelectedRequests(new Set())
    }

    // Toggle selection
    const toggleSelection = (requestId: string) => {
        setSelectedRequests(prev => {
            const next = new Set(prev)
            if (next.has(requestId)) {
                next.delete(requestId)
            } else {
                next.add(requestId)
            }
            return next
        })
    }

    // Select all on current page
    const selectAllOnPage = () => {
        const pageRequests = paginatedRequests.map(r => r.id)
        setSelectedRequests(prev => {
            const allSelected = pageRequests.every(id => prev.has(id))
            if (allSelected) {
                const next = new Set(prev)
                pageRequests.forEach(id => next.delete(id))
                return next
            } else {
                return new Set([...prev, ...pageRequests])
            }
        })
    }

    // Filtered and paginated requests
    const filteredRequests = useMemo(() => {
        if (!requestsSearch.trim()) return pendingRequests
        const search = requestsSearch.toLowerCase()
        return pendingRequests.filter(r =>
            r.seller_name?.toLowerCase().includes(search) ||
            r.seller_email.toLowerCase().includes(search)
        )
    }, [pendingRequests, requestsSearch])

    const totalPages = Math.ceil(filteredRequests.length / REQUESTS_PER_PAGE)
    const paginatedRequests = useMemo(() => {
        const start = (requestsPage - 1) * REQUESTS_PER_PAGE
        return filteredRequests.slice(start, start + REQUESTS_PER_PAGE)
    }, [filteredRequests, requestsPage])

    // Sorted enrollments for participants list
    const sortedEnrollments = useMemo(() => {
        if (!mission) return []
        // Only show non-ARCHIVED enrollments in the main list
        const enrollments = mission.enrollments.filter(e => e.status !== 'ARCHIVED')

        enrollments.sort((a, b) => {
            let aVal: number, bVal: number
            switch (sortField) {
                case 'revenue':
                    aVal = a.stats.revenue
                    bVal = b.stats.revenue
                    break
                case 'sales':
                    aVal = a.stats.sales
                    bVal = b.stats.sales
                    break
                case 'clicks':
                    aVal = a.stats.clicks
                    bVal = b.stats.clicks
                    break
                case 'date':
                    aVal = new Date(a.created_at).getTime()
                    bVal = new Date(b.created_at).getTime()
                    break
                default:
                    aVal = 0
                    bVal = 0
            }
            return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        })

        return enrollments
    }, [mission, sortField, sortOrder])

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
        } else {
            setSortField(field)
            setSortOrder('desc')
        }
    }

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !mission) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => router.push('/dashboard/missions')}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t('backToMissions')}
                </button>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">{error || t('notFound')}</p>
                </div>
            </div>
        )
    }

    // Separate active vs archived enrollments
    const activeEnrollments = mission.enrollments.filter(e => e.status !== 'ARCHIVED')
    const archivedEnrollments = mission.enrollments.filter(e => e.status === 'ARCHIVED')

    // Calculate totals from ACTIVE enrollment stats only
    const totalClicks = activeEnrollments.reduce((sum, e) => sum + (e.stats?.clicks || e.link?.clicks || 0), 0)
    const totalParticipants = activeEnrollments.length
    const activeParticipants = activeEnrollments.filter(e => e.status === 'APPROVED').length
    const totalSales = activeEnrollments.reduce((sum, e) => sum + (e.stats?.sales || 0), 0)
    const totalRevenue = activeEnrollments.reduce((sum, e) => sum + (e.stats?.revenue || 0), 0)

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/missions')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                {t('backToMissions')}
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{mission.title}</h1>
                            <StatusBadge status={mission.status} />
                            <VisibilityBadge visibility={mission.visibility} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            {mission.description || t('noDescription')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 font-semibold rounded-lg text-sm flex-1 sm:flex-initial text-center">
                        {mission.reward}
                    </span>
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Invite Link Card - Only for INVITE_ONLY missions */}
            {mission.visibility === 'INVITE_ONLY' && mission.invite_url && (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                <LinkIcon className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{t('inviteLink')}</h3>
                                <p className="text-sm text-gray-500">
                                    {t('inviteLinkDescription')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                            <code className="px-3 py-2 bg-white border border-violet-200 rounded-lg text-xs sm:text-sm text-gray-700 font-mono truncate max-w-full sm:max-w-xs">
                                {mission.invite_url}
                            </code>
                            <button
                                onClick={() => handleCopyLink(mission.invite_url!)}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium w-full sm:w-auto"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {t('copied')}
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        {t('copy')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4 sm:p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex flex-col">
                    <p className="text-xs sm:text-sm text-gray-500">{t('participants')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{totalParticipants}</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-xs sm:text-sm text-gray-500">{t('active')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-green-600 mt-1">{activeParticipants}</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-xs sm:text-sm text-gray-500">{t('clicks')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{formatNumber(totalClicks)}</p>
                </div>
                <div className="flex flex-col">
                    <p className="text-xs sm:text-sm text-gray-500">{t('sales')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{totalSales}</p>
                </div>
                <div className="flex flex-col col-span-2 lg:col-span-1">
                    <p className="text-xs sm:text-sm text-gray-500">{t('revenue')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-green-600 mt-1">€{(totalRevenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            {/* Pending Requests Section - Compact Table Design */}
            {mission.visibility === 'PRIVATE' && pendingRequests.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Header with search and bulk actions */}
                    <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-medium text-gray-900">
                                    {pendingRequests.length} {pendingRequests.length > 1 ? t('pendingRequestsPlural') : t('pendingRequests')}
                                </span>
                            </div>
                            {/* Search */}
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('searchPlaceholder')}
                                    value={requestsSearch}
                                    onChange={(e) => {
                                        setRequestsSearch(e.target.value)
                                        setRequestsPage(1)
                                    }}
                                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-full sm:w-48 focus:outline-none focus:border-gray-300"
                                />
                            </div>
                        </div>
                        {/* Bulk actions */}
                        {selectedRequests.size > 0 && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs text-gray-500">{selectedRequests.size} {t('selected')}</span>
                                <button
                                    onClick={handleBulkApprove}
                                    disabled={processingRequest !== null}
                                    className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
                                >
                                    {t('approveAll')}
                                </button>
                                <button
                                    onClick={handleBulkReject}
                                    disabled={processingRequest !== null}
                                    className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
                                >
                                    {t('rejectAll')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table Header - Hidden on mobile */}
                    <div className="hidden lg:grid grid-cols-[32px_1fr_100px_80px_80px_140px] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                        <div className="flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={paginatedRequests.length > 0 && paginatedRequests.every(r => selectedRequests.has(r.id))}
                                onChange={selectAllOnPage}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                            />
                        </div>
                        <div>{t('seller')}</div>
                        <div className="text-right">{t('revenueGenerated')}</div>
                        <div className="text-right">{t('sales')}</div>
                        <div className="text-right">{t('clicks')}</div>
                        <div className="text-center">{t('actions')}</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {paginatedRequests.map((request) => (
                            <div key={request.id}>
                                {/* Desktop Row */}
                                <div className="hidden lg:grid grid-cols-[32px_1fr_100px_80px_80px_140px] gap-2 px-4 py-2.5 items-center hover:bg-gray-50 transition-colors">
                                    {/* Checkbox */}
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedRequests.has(request.id)}
                                            onChange={() => toggleSelection(request.id)}
                                            className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                        />
                                    </div>

                                    {/* Seller Info */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {request.seller_avatar ? (
                                            <img
                                                src={request.seller_avatar}
                                                alt=""
                                                className="w-7 h-7 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                                {(request.seller_name || request.seller_email).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <button
                                                onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                                                className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700 truncate"
                                            >
                                                {request.seller_name || request.seller_email.split('@')[0]}
                                                {(request.message || request.seller_bio) && (
                                                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${expandedRequest === request.id ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>
                                            <p className="text-[11px] text-gray-400 truncate">{request.seller_email}</p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-gray-900">
                                            €{(request.stats.total_revenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-600">{request.stats.total_sales}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-gray-600">{formatNumber(request.stats.total_clicks)}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => handleApprove(request.id)}
                                            disabled={processingRequest === request.id}
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                            title="Accepter"
                                        >
                                            {processingRequest === request.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={processingRequest === request.id}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                            title="Refuser"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        <Link
                                            href={`/dashboard/sellers/${request.seller_id}`}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                            title="Voir profil"
                                        >
                                            <User className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            href={`/dashboard/messages?seller=${request.seller_id}`}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                            title="Contacter"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Mobile Card */}
                                <div className="lg:hidden p-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedRequests.has(request.id)}
                                            onChange={() => toggleSelection(request.id)}
                                            className="w-4 h-4 mt-1 rounded border-gray-300 text-gray-900 focus:ring-gray-500 shrink-0"
                                        />
                                        {request.seller_avatar ? (
                                            <img
                                                src={request.seller_avatar}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                                                {(request.seller_name || request.seller_email).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 text-sm truncate">
                                                {request.seller_name || request.seller_email.split('@')[0]}
                                            </div>
                                            <div className="text-xs text-gray-400 truncate">{request.seller_email}</div>
                                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                                                <div>
                                                    <div className="text-gray-500">Revenue</div>
                                                    <div className="font-medium text-gray-900">€{(request.stats.total_revenue / 100).toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Sales</div>
                                                    <div className="font-medium text-gray-900">{request.stats.total_sales}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-500">Clicks</div>
                                                    <div className="font-medium text-gray-900">{formatNumber(request.stats.total_clicks)}</div>
                                                </div>
                                            </div>
                                            {(request.message || request.seller_bio) && (
                                                <button
                                                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                                                    className="flex items-center gap-1 text-xs text-gray-500 mt-2"
                                                >
                                                    {expandedRequest === request.id ? 'Hide details' : 'Show details'}
                                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedRequest === request.id ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                            <div className="flex items-center gap-1.5 mt-3">
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    disabled={processingRequest === request.id}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                                                >
                                                    {processingRequest === request.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Approve
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request.id)}
                                                    disabled={processingRequest === request.id}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Reject
                                                </button>
                                                <Link
                                                    href={`/dashboard/sellers/${request.seller_id}`}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/dashboard/messages?seller=${request.seller_id}`}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedRequest === request.id && (request.message || request.seller_bio) && (
                                    <div className="px-3 lg:px-4 pb-3 lg:pl-14 space-y-2 bg-gray-50/50">
                                        {request.message && (
                                            <div className="text-xs">
                                                <span className="text-gray-400">Message : </span>
                                                <span className="text-gray-600 italic">&ldquo;{request.message}&rdquo;</span>
                                            </div>
                                        )}
                                        {request.seller_bio && (
                                            <div className="text-xs">
                                                <span className="text-gray-400">Bio : </span>
                                                <span className="text-gray-600">{request.seller_bio}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                {((requestsPage - 1) * REQUESTS_PER_PAGE) + 1}-{Math.min(requestsPage * REQUESTS_PER_PAGE, filteredRequests.length)} sur {filteredRequests.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setRequestsPage(p => Math.max(1, p - 1))}
                                    disabled={requestsPage === 1}
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number
                                    if (totalPages <= 5) {
                                        pageNum = i + 1
                                    } else if (requestsPage <= 3) {
                                        pageNum = i + 1
                                    } else if (requestsPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i
                                    } else {
                                        pageNum = requestsPage - 2 + i
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setRequestsPage(pageNum)}
                                            className={`w-7 h-7 text-xs rounded ${
                                                requestsPage === pageNum
                                                    ? 'bg-gray-900 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                })}
                                <button
                                    onClick={() => setRequestsPage(p => Math.min(totalPages, p + 1))}
                                    disabled={requestsPage === totalPages}
                                    className="p-1 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Left - Participants Table */}
                <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Participants ({totalParticipants})
                            </h2>
                        </div>

                        {activeEnrollments.length === 0 ? (
                            <div className="px-4 sm:px-6 py-12 text-center">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-900 font-medium">{t('noParticipants')}</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    {t('shareToAttract')}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Table Header - Desktop Only */}
                                <div className="hidden lg:flex items-center px-5 py-2.5 bg-gray-50/80 border-b border-gray-100 text-xs font-medium text-gray-500">
                                    <div className="flex-1 min-w-0">{t('seller')}</div>
                                    <button onClick={() => toggleSort('revenue')} className="w-20 flex items-center justify-end gap-1 hover:text-gray-900">
                                        {t('sortRevenue')}
                                        {sortField === 'revenue' ? (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                    </button>
                                    <button onClick={() => toggleSort('sales')} className="w-16 flex items-center justify-end gap-1 hover:text-gray-900">
                                        {t('sortSales')}
                                        {sortField === 'sales' ? (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                    </button>
                                    <button onClick={() => toggleSort('clicks')} className="w-16 flex items-center justify-end gap-1 hover:text-gray-900">
                                        {t('sortClicks')}
                                        {sortField === 'clicks' ? (sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                                    </button>
                                    <div className="w-40 text-right">{t('status')}</div>
                                </div>

                                {/* Table Rows - Desktop */}
                                <div className="hidden lg:block divide-y divide-gray-50">
                                    {sortedEnrollments.map((enrollment, index) => (
                                        <div key={enrollment.id} className="flex items-center px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
                                            {/* Seller */}
                                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                                                <div className="relative shrink-0">
                                                    {enrollment.seller?.avatar ? (
                                                        <img src={enrollment.seller.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium">
                                                            {(enrollment.seller?.name || enrollment.seller?.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center text-[9px] font-semibold text-gray-500 border border-gray-200">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <span className="text-sm truncate">
                                                    <span className="font-medium text-gray-900">{enrollment.seller?.name || enrollment.seller?.email?.split('@')[0] || 'Unknown'}</span>
                                                    <span className="text-gray-400 ml-1.5 text-xs">{enrollment.seller?.email}</span>
                                                </span>
                                            </div>
                                            {/* Revenue */}
                                            <div className="w-20 text-right">
                                                <span className={`text-sm font-medium ${enrollment.stats.revenue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    €{(enrollment.stats.revenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            {/* Sales */}
                                            <div className="w-16 text-right">
                                                <span className={`text-sm ${enrollment.stats.sales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>{enrollment.stats.sales}</span>
                                            </div>
                                            {/* Clicks */}
                                            <div className="w-16 text-right">
                                                <span className={`text-sm ${enrollment.stats.clicks > 0 ? 'text-gray-600' : 'text-gray-400'}`}>{formatNumber(enrollment.stats.clicks)}</span>
                                            </div>
                                            {/* Status + Type */}
                                            <div className="w-40 flex items-center justify-end gap-1.5 flex-wrap">
                                                <EnrollmentTypeBadge type={enrollment.enrollmentType} name={enrollment.enrollmentType === 'GROUP' ? enrollment.groupName : enrollment.orgName} />
                                                <ParticipantStatusBadge status={enrollment.status} />
                                                {enrollment.link && (
                                                    <button onClick={() => handleCopyLink(enrollment.link!.full_url)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Copier le lien">
                                                        {copied ? (
                                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Mobile Cards */}
                                <div className="lg:hidden divide-y divide-gray-50">
                                    {sortedEnrollments.map((enrollment, index) => (
                                        <div key={enrollment.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="relative shrink-0">
                                                    {enrollment.seller?.avatar ? (
                                                        <img src={enrollment.seller.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-medium">
                                                            {(enrollment.seller?.name || enrollment.seller?.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] font-semibold text-gray-500 border border-gray-200">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 text-sm truncate">
                                                        {enrollment.seller?.name || enrollment.seller?.email?.split('@')[0] || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">{enrollment.seller?.email}</div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <EnrollmentTypeBadge type={enrollment.enrollmentType} name={enrollment.enrollmentType === 'GROUP' ? enrollment.groupName : enrollment.orgName} />
                                                        <ParticipantStatusBadge status={enrollment.status} />
                                                        {enrollment.link && (
                                                            <button onClick={() => handleCopyLink(enrollment.link!.full_url)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs">
                                                                {copied ? (
                                                                    <Check className="w-3 h-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                                                        <div>
                                                            <div className="text-gray-500">Revenue</div>
                                                            <div className={`font-medium ${enrollment.stats.revenue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                                €{(enrollment.stats.revenue / 100).toFixed(0)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">Sales</div>
                                                            <div className={`font-medium ${enrollment.stats.sales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                {enrollment.stats.sales}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="text-gray-500">Clicks</div>
                                                            <div className={`font-medium ${enrollment.stats.clicks > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                {formatNumber(enrollment.stats.clicks)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right - Details */}
                <div className="lg:w-72 w-full shrink-0 space-y-4">
                    {/* Mission Details */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('details')}</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">{t('targetUrl')}</p>
                                <a
                                    href={mission.target_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 truncate"
                                >
                                    {mission.target_url.slice(0, 30)}...
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">{t('reward')}</p>
                                <p className="text-sm font-medium text-green-600">{mission.reward}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">{t('visibility')}</p>
                                <p className="text-sm text-gray-900">{mission.visibility || 'PUBLIC'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">{t('createdOn')}</p>
                                <p className="text-sm text-gray-900">{formatDate(mission.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('actionsSection')}</h3>
                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                <Archive className="w-4 h-4" />
                                Archiver
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
