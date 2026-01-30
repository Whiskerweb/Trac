'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    ChevronLeft, Target, Users, MousePointer2, DollarSign,
    Copy, Check, Loader2, ExternalLink, Calendar, TrendingUp, Info,
    MoreHorizontal, Edit, Archive, Trash2, Globe, Lock, Sparkles, Link as LinkIcon,
    Clock, CheckCircle, XCircle, MessageSquare, User, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { getMissionDetails } from '@/app/actions/missions'
import {
    getMissionPendingRequests,
    approveProgramRequest,
    rejectProgramRequest,
    type EnrichedProgramRequest
} from '@/app/actions/marketplace-actions'

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
        link: {
            id: string
            slug: string
            clicks: number
            full_url: string
        } | null
    }[]
}

// =============================================
// STATUS BADGE
// =============================================

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        ACTIVE: 'bg-green-50 text-green-700',
        DRAFT: 'bg-gray-100 text-gray-600',
        ARCHIVED: 'bg-orange-50 text-orange-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    )
}

function ParticipantStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        APPROVED: 'bg-green-50 text-green-700',
        PENDING: 'bg-orange-50 text-orange-700',
        REJECTED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    )
}

function VisibilityBadge({ visibility }: { visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' }) {
    const config = {
        PUBLIC: {
            icon: Globe,
            label: 'Public',
            styles: 'bg-emerald-50 text-emerald-700',
        },
        PRIVATE: {
            icon: Lock,
            label: 'Private',
            styles: 'bg-amber-50 text-amber-700',
        },
        INVITE_ONLY: {
            icon: Sparkles,
            label: 'Invite Only',
            styles: 'bg-violet-50 text-violet-700',
        },
    }

    const { icon: Icon, label, styles } = config[visibility]

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            <Icon className="w-3 h-3" />
            {label}
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
    const router = useRouter()
    const [mission, setMission] = useState<MissionDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [pendingRequests, setPendingRequests] = useState<EnrichedProgramRequest[]>([])
    const [processingRequest, setProcessingRequest] = useState<string | null>(null)

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
                setError(result.error || 'Erreur de chargement')
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
        }
        setProcessingRequest(null)
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
                    Missions
                </button>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700">{error || 'Mission introuvable'}</p>
                </div>
            </div>
        )
    }

    // Calculate totals
    const totalClicks = mission.enrollments.reduce((sum, e) => sum + (e.link?.clicks || 0), 0)
    const totalParticipants = mission.enrollments.length
    const activeParticipants = mission.enrollments.filter(e => e.status === 'APPROVED').length
    // Mock data for now
    const totalSales = 0
    const totalRevenue = 0

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/missions')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Missions
            </button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Target className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">{mission.title}</h1>
                            <StatusBadge status={mission.status} />
                            <VisibilityBadge visibility={mission.visibility} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            {mission.description || 'Aucune description'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 font-semibold rounded-lg text-sm">
                        {mission.reward}
                    </span>
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Invite Link Card - Only for INVITE_ONLY missions */}
            {mission.visibility === 'INVITE_ONLY' && mission.invite_url && (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <LinkIcon className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Invite Link</h3>
                                <p className="text-sm text-gray-500">
                                    Share this link to invite sellers to your mission
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <code className="px-3 py-2 bg-white border border-violet-200 rounded-lg text-sm text-gray-700 font-mono">
                                {mission.invite_url}
                            </code>
                            <button
                                onClick={() => handleCopyLink(mission.invite_url!)}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Bar */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Participants</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalParticipants}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Actifs</p>
                    <p className="text-2xl font-semibold text-green-600">{activeParticipants}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Clicks</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatNumber(totalClicks)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Ventes</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalSales}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Revenu</p>
                    <p className="text-2xl font-semibold text-green-600">€{totalRevenue}</p>
                </div>
            </div>

            {/* Pending Requests Section - Only for PRIVATE missions */}
            {mission.visibility === 'PRIVATE' && pendingRequests.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Demandes en attente ({pendingRequests.length})
                            </h2>
                            <p className="text-xs text-gray-500">
                                Des sellers souhaitent rejoindre votre mission
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {pendingRequests.map((request) => (
                            <div key={request.id} className="p-5 hover:bg-amber-50/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="shrink-0">
                                        {request.seller_avatar ? (
                                            <img
                                                src={request.seller_avatar}
                                                alt={request.seller_name || 'Seller'}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                                                {(request.seller_name || request.seller_email).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {request.seller_name || request.seller_email}
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {formatDate(request.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-3">
                                            {request.seller_email}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-100">
                                                <DollarSign className="w-3.5 h-3.5 text-green-500" />
                                                <span className="text-xs font-medium text-gray-700">
                                                    €{(request.stats.total_revenue / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-gray-400">CA</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-100">
                                                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-medium text-gray-700">
                                                    {request.stats.total_sales}
                                                </span>
                                                <span className="text-xs text-gray-400">ventes</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-100">
                                                <MousePointer2 className="w-3.5 h-3.5 text-purple-500" />
                                                <span className="text-xs font-medium text-gray-700">
                                                    {formatNumber(request.stats.total_clicks)}
                                                </span>
                                                <span className="text-xs text-gray-400">clicks</span>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        {request.message && (
                                            <div className="bg-white border border-gray-100 rounded-lg p-3 mb-3">
                                                <p className="text-xs text-gray-400 mb-1">Message :</p>
                                                <p className="text-sm text-gray-700 italic">
                                                    &ldquo;{request.message}&rdquo;
                                                </p>
                                            </div>
                                        )}

                                        {/* Bio */}
                                        {request.seller_bio && (
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                                                {request.seller_bio}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="shrink-0 flex flex-col gap-2">
                                        <button
                                            onClick={() => handleApprove(request.id)}
                                            disabled={processingRequest === request.id}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingRequest === request.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                            Accepter
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={processingRequest === request.id}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Refuser
                                        </button>
                                        <div className="flex gap-2 mt-1">
                                            <Link
                                                href={`/dashboard/sellers/${request.seller_id}`}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <User className="w-3 h-3" />
                                                Profil
                                            </Link>
                                            <Link
                                                href={`/dashboard/messages?seller=${request.seller_id}`}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <MessageSquare className="w-3 h-3" />
                                                Contact
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Left - Participants Table */}
                <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Participants ({totalParticipants})
                            </h2>
                        </div>

                        {mission.enrollments.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-900 font-medium">Aucun participant</p>
                                <p className="text-gray-500 text-sm mt-1">
                                    Partagez votre mission pour attirer des partners
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {mission.enrollments.map((enrollment, index) => (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Partner {enrollment.user_id.slice(0, 8)}...
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Inscrit le {formatDate(enrollment.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {enrollment.link && (
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs text-gray-500 font-mono">
                                                        /s/{enrollment.link.slug}
                                                    </code>
                                                    <button
                                                        onClick={() => handleCopyLink(enrollment.link!.full_url)}
                                                        className="p-1 hover:bg-gray-100 rounded"
                                                    >
                                                        {copied ? (
                                                            <Check className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-gray-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                <MousePointer2 className="w-4 h-4 text-gray-400" />
                                                {enrollment.link?.clicks || 0}
                                            </div>
                                            <ParticipantStatusBadge status={enrollment.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right - Details */}
                <div className="w-72 shrink-0 space-y-4">
                    {/* Mission Details */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Détails</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">URL cible</p>
                                <a
                                    href={mission.target_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 truncate"
                                >
                                    {mission.target_url.slice(0, 30)}...
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Récompense</p>
                                <p className="text-sm font-medium text-green-600">{mission.reward}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Visibilité</p>
                                <p className="text-sm text-gray-900">{mission.visibility || 'PUBLIC'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Créée le</p>
                                <p className="text-sm text-gray-900">{formatDate(mission.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Actions</h3>
                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                                Modifier
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                <Archive className="w-4 h-4" />
                                Archiver
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
