'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Copy,
    Check,
    ExternalLink,
    FileText,
    Video,
    Link2,
    Loader2,
    AlertCircle,
    MessageSquare
} from 'lucide-react'
import { getEnrolledMissionDetail } from '@/app/actions/marketplace-actions'
import { getOrCreateConversationForSeller } from '@/app/actions/messaging'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'

// =============================================
// TYPES
// =============================================

interface MissionData {
    mission: {
        id: string
        title: string
        description: string
        target_url: string
        reward: string
        visibility: string
        lead_enabled: boolean
        lead_reward_amount: number | null
        sale_enabled: boolean
        sale_reward_amount: number | null
        sale_reward_structure: string | null
        recurring_enabled: boolean
        recurring_reward_amount: number | null
        recurring_reward_structure: string | null
    }
    startup: {
        id: string
        name: string
        slug: string
        logo_url: string | null
        description: string | null
        industry: string | null
        website_url: string | null
        pitch_deck_url: string | null
        doc_url: string | null
    }
    enrollment: {
        id: string
        status: string
        link_slug: string | null
        link_url: string | null
        created_at: string
    }
    stats: {
        clicks: number
        leads: number
        sales: number
        revenue: number
    }
    timeseries: Array<{
        date: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    }>
    resources: Array<{
        id: string
        type: string
        url: string | null
        title: string | null
        description: string | null
    }>
}

// =============================================
// HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0
    })
}

function formatRewardAmount(amount: number | null, structure: string | null): string {
    if (amount === null) return ''
    if (structure === 'PERCENTAGE') {
        return `${amount}%`
    }
    return `${amount}€`
}

function hasMultipleCommissions(mission: MissionData['mission']): boolean {
    const enabledCount = [
        mission.lead_enabled,
        mission.sale_enabled,
        mission.recurring_enabled
    ].filter(Boolean).length
    return enabledCount > 1
}

function getResourceIcon(type: string) {
    switch (type) {
        case 'YOUTUBE':
        case 'VIDEO':
            return Video
        case 'LINK':
            return Link2
        default:
            return FileText
    }
}

// =============================================
// MAIN PAGE
// =============================================

export default function SellerProgramDetailPage() {
    const params = useParams()
    const router = useRouter()
    const missionId = params.missionId as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<MissionData | null>(null)
    const [copied, setCopied] = useState(false)
    const [startingChat, setStartingChat] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await getEnrolledMissionDetail(missionId)

            if (!result.success) {
                if (result.error === 'NOT_ENROLLED') {
                    router.push('/seller/marketplace/' + missionId)
                    return
                }
                setError(result.error || 'Error')
            } else {
                setData(result as unknown as MissionData)
            }
            setLoading(false)
        }
        load()
    }, [missionId, router])

    const copyLink = () => {
        if (!data?.enrollment.link_url) return
        navigator.clipboard.writeText(data.enrollment.link_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const startConversation = async () => {
        if (!data?.startup.id) return
        setStartingChat(true)
        try {
            const result = await getOrCreateConversationForSeller(data.startup.id)
            if (result.success && result.conversationId) {
                router.push(`/seller/messages?conversation=${result.conversationId}`)
            }
        } catch (err) {
            console.error('Failed to start conversation:', err)
        } finally {
            setStartingChat(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    // Error state
    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="text-gray-600">{error || 'Failed to load'}</p>
                    <Link
                        href="/seller"
                        className="mt-4 inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                </div>
            </div>
        )
    }

    const { mission, startup, enrollment, stats, timeseries, resources } = data

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Back Link */}
                <Link
                    href="/seller"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    My programs
                </Link>

                {/* Header - Startup + Mission */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-10">
                    {/* Startup Logo */}
                    {startup.logo_url ? (
                        <img
                            src={startup.logo_url}
                            alt={startup.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-semibold text-white">
                                {startup.name.charAt(0)}
                            </span>
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">
                                {startup.name}
                            </h1>
                            {startup.industry && (
                                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                                    {startup.industry}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mb-3">
                            {mission.title}
                        </p>

                        {/* Commissions badges */}
                        <div className="flex flex-wrap gap-2">
                            {mission.lead_enabled && mission.lead_reward_amount && (
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                                    {mission.lead_reward_amount}€ / lead
                                </span>
                            )}
                            {mission.sale_enabled && mission.sale_reward_amount && (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                                    {formatRewardAmount(mission.sale_reward_amount, mission.sale_reward_structure)} / sale
                                </span>
                            )}
                            {mission.recurring_enabled && mission.recurring_reward_amount && (
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                    {formatRewardAmount(mission.recurring_reward_amount, mission.recurring_reward_structure)} / recurring
                                </span>
                            )}
                            {!hasMultipleCommissions(mission) && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                    {mission.reward}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
                        {/* Message button */}
                        <button
                            onClick={startConversation}
                            disabled={startingChat}
                            className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                        >
                            {startingChat ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <MessageSquare className="w-4 h-4" />
                            )}
                            Message
                        </button>

                        {/* External link to startup website */}
                        {startup.website_url && (
                            <a
                                href={startup.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Tracking Link Card */}
                {enrollment.link_url && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 mb-8">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">
                            Your affiliate link
                        </p>
                        <div className="flex items-center gap-3">
                            <code className="flex-1 text-xs sm:text-sm text-gray-700 bg-gray-50 px-4 py-2.5 rounded-xl font-mono truncate">
                                {enrollment.link_url}
                            </code>
                            <button
                                onClick={copyLink}
                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    copied
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-gray-900 text-white hover:bg-black'
                                }`}
                            >
                                {copied ? (
                                    <span className="flex items-center gap-1.5">
                                        <Check className="w-4 h-4" />
                                        Copied
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5">
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Analytics Chart */}
                <div className="mb-8">
                    <AnalyticsChart
                        clicks={stats.clicks}
                        leads={stats.leads}
                        sales={stats.sales}
                        revenue={stats.revenue}
                        timeseries={timeseries}
                    />
                </div>

                {/* Startup Public Resources */}
                {(startup.pitch_deck_url || startup.doc_url) && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
                        <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">
                                {startup.name} Resources
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Public documents from the startup
                            </p>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {startup.pitch_deck_url && (
                                <a
                                    href={startup.pitch_deck_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                                        <FileText className="w-5 h-5 text-violet-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors">
                                            Pitch Deck
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Presentation of {startup.name}
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                                </a>
                            )}
                            {startup.doc_url && (
                                <a
                                    href={startup.doc_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-50 transition-colors">
                                        <FileText className="w-5 h-5 text-gray-500 group-hover:text-violet-500 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors">
                                            Documentation
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Additional documentation
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Mission-Specific Resources */}
                {resources.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">
                                Program resources
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Tools specific to this mission
                            </p>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {resources.map((resource) => {
                                const Icon = getResourceIcon(resource.type)
                                return (
                                    <a
                                        key={resource.id}
                                        href={resource.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-50 transition-colors">
                                            <Icon className="w-5 h-5 text-gray-500 group-hover:text-violet-500 transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors">
                                                {resource.title || 'Document'}
                                            </p>
                                            {resource.description && (
                                                <p className="text-xs text-gray-400 truncate">
                                                    {resource.description}
                                                </p>
                                            )}
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                                    </a>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* No resources message */}
                {resources.length === 0 && !startup.pitch_deck_url && !startup.doc_url && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                            No resources available for this program
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
