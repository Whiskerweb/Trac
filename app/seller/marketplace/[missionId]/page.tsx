'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, ExternalLink, Globe, Users, Calendar,
    Building2, MapPin, Loader2, Check, Clock, Lock,
    FileText, Youtube, Link as LinkIcon, Copy, CheckCircle2,
    Send, Sparkles
} from 'lucide-react'
import { getMissionDetailForMarketplace } from '@/app/actions/marketplace-actions'
import { joinMission } from '@/app/actions/marketplace'

// =============================================
// TYPES
// =============================================

interface MissionDetail {
    mission: {
        id: string
        title: string
        description: string
        target_url: string
        reward: string
        reward_type: string | null
        reward_structure: string | null
        visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
        partners_count: number
        created_at: Date
        // Multi-commission fields
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
        twitter_url: string | null
        linkedin_url: string | null
        founded_year: string | null
        company_size: string | null
        headquarters: string | null
    }
    resources: Array<{
        id: string
        type: string
        url: string | null
        title: string | null
        description: string | null
    }>
    enrollment: {
        id: string
        status: string
        link_slug: string | null
        link_url: string | null
    } | null
    pendingRequest: {
        id: string
        status: string
        created_at: Date
    } | null
    canSeeResources: boolean
}

// Helper to format reward display
function formatRewardAmount(amount: number | null, structure: string | null): string {
    if (amount === null) return ''
    if (structure === 'PERCENTAGE') {
        return `${amount}%`
    }
    return `${amount}€`
}

// Helper to check if mission has multiple commission types
function hasMultipleCommissions(mission: MissionDetail['mission']): boolean {
    const enabledCount = [
        mission.lead_enabled,
        mission.sale_enabled,
        mission.recurring_enabled
    ].filter(Boolean).length
    return enabledCount > 1
}

// =============================================
// RESOURCE ICON
// =============================================

function ResourceIcon({ type }: { type: string }) {
    switch (type) {
        case 'YOUTUBE':
            return <Youtube className="w-4 h-4" />
        case 'PDF':
            return <FileText className="w-4 h-4" />
        case 'LINK':
            return <LinkIcon className="w-4 h-4" />
        default:
            return <FileText className="w-4 h-4" />
    }
}

// =============================================
// MAIN PAGE
// =============================================

export default function MissionDetailPage() {
    const params = useParams()
    const router = useRouter()
    const missionId = params.missionId as string

    const [data, setData] = useState<MissionDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)
    const [joinSuccess, setJoinSuccess] = useState<'enrolled' | 'requested' | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await getMissionDetailForMarketplace(missionId)

            if (result.success) {
                setData(result as MissionDetail)
            } else {
                setError(result.error || 'Mission introuvable')
            }
            setLoading(false)
        }
        load()
    }, [missionId])

    async function handleJoin() {
        setJoining(true)
        const result = await joinMission(missionId)

        if (result.success) {
            setJoinSuccess(result.type || 'enrolled')
            // Reload data to get updated enrollment status
            const updated = await getMissionDetailForMarketplace(missionId)
            if (updated.success) {
                setData(updated as MissionDetail)
            }
        } else {
            setError(result.error || 'Request failed')
        }
        setJoining(false)
    }

    function copyLink() {
        if (!data?.enrollment?.link_url) return
        navigator.clipboard.writeText(data.enrollment.link_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        )
    }

    // Error state
    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">{error || 'Mission introuvable'}</p>
                    <Link
                        href="/seller/marketplace"
                        className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                        Back to marketplace
                    </Link>
                </div>
            </div>
        )
    }

    const { mission, startup, resources, enrollment, pendingRequest, canSeeResources } = data
    const isEnrolled = enrollment?.status === 'APPROVED'
    const isPending = pendingRequest?.status === 'PENDING'
    const isPrivate = mission.visibility === 'PRIVATE'

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-4xl mx-auto px-6 py-12">

                {/* Back button */}
                <Link
                    href="/seller/marketplace"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-10 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Marketplace
                </Link>

                {/* Header section */}
                <header className="mb-12">
                    <div className="flex items-start gap-6">
                        {/* Startup Logo */}
                        {startup.logo_url ? (
                            <img
                                src={startup.logo_url}
                                alt={startup.name}
                                className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                                <span className="text-2xl font-semibold text-white">
                                    {startup.name.charAt(0)}
                                </span>
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            {/* Industry tag */}
                            {startup.industry && (
                                <span className="inline-block text-[11px] text-gray-500 uppercase tracking-wider mb-2">
                                    {startup.industry}
                                </span>
                            )}

                            {/* Startup name */}
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
                                {startup.name}
                            </h1>

                            {/* Mission title */}
                            <p className="text-gray-500 text-[15px]">
                                {mission.title}
                            </p>
                        </div>

                        {/* Visibility badge */}
                        {isPrivate && (
                            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                                <Lock className="w-3 h-3" />
                                Private
                            </span>
                        )}
                    </div>
                </header>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left column - Main content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Startup description */}
                        {startup.description && (
                            <section className="bg-white rounded-2xl p-6 border border-gray-100">
                                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                    À propos de {startup.name}
                                </h2>
                                <p className="text-gray-600 text-[15px] leading-relaxed">
                                    {startup.description}
                                </p>

                                {/* Startup meta */}
                                <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-gray-50">
                                    {startup.website_url && (
                                        <a
                                            href={startup.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            Site web
                                        </a>
                                    )}
                                    {startup.headquarters && (
                                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {startup.headquarters}
                                        </span>
                                    )}
                                    {startup.company_size && (
                                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {startup.company_size} employees
                                        </span>
                                    )}
                                    {startup.founded_year && (
                                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Founded in {startup.founded_year}
                                        </span>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Mission description */}
                        <section className="bg-white rounded-2xl p-6 border border-gray-100">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                La mission
                            </h2>
                            <p className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-line">
                                {mission.description || 'Aucune description disponible.'}
                            </p>

                            {/* Target URL */}
                            <div className="mt-6 pt-5 border-t border-gray-50">
                                <a
                                    href={mission.target_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Voir le produit
                                </a>
                            </div>
                        </section>

                        {/* Resources section */}
                        <section className="bg-white rounded-2xl p-6 border border-gray-100">
                            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                                Ressources
                            </h2>

                            {!canSeeResources ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <Lock className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-1">
                                        Resources reserved for members
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Join the program to access the documents
                                    </p>
                                </div>
                            ) : resources.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">
                                    Aucune ressource disponible
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {resources.map((resource) => (
                                        <a
                                            key={resource.id}
                                            href={resource.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                                                <ResourceIcon type={resource.type} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {resource.title || 'Document'}
                                                </p>
                                                {resource.description && (
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {resource.description}
                                                    </p>
                                                )}
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right column - Sticky CTA */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">

                            {/* Commission card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100">
                                <div className="mb-6">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 text-center">
                                        {hasMultipleCommissions(mission) ? 'Commissions' : 'Commission'}
                                    </p>

                                    {hasMultipleCommissions(mission) ? (
                                        <div className="space-y-3">
                                            {mission.lead_enabled && mission.lead_reward_amount && (
                                                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                                                    <span className="text-sm text-purple-700 font-medium">Lead</span>
                                                    <span className="text-lg font-semibold text-purple-900">
                                                        {mission.lead_reward_amount}€
                                                    </span>
                                                </div>
                                            )}
                                            {mission.sale_enabled && mission.sale_reward_amount && (
                                                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                                    <span className="text-sm text-emerald-700 font-medium">Vente</span>
                                                    <span className="text-lg font-semibold text-emerald-900">
                                                        {formatRewardAmount(mission.sale_reward_amount, mission.sale_reward_structure)}
                                                    </span>
                                                </div>
                                            )}
                                            {mission.recurring_enabled && mission.recurring_reward_amount && (
                                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                                                    <span className="text-sm text-blue-700 font-medium">Recurring</span>
                                                    <span className="text-lg font-semibold text-blue-900">
                                                        {formatRewardAmount(mission.recurring_reward_amount, mission.recurring_reward_structure)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                                                {mission.reward}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                par {mission.reward_type === 'LEAD' ? 'lead' : 'conversion'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-50">
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-gray-900">
                                            {mission.partners_count}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Partenaires
                                        </p>
                                    </div>
                                </div>

                                {/* CTA Button */}
                                <div className="pt-4 border-t border-gray-50">
                                    {isEnrolled ? (
                                        <>
                                            {/* Already enrolled - show link */}
                                            <div className="mb-4">
                                                <p className="flex items-center justify-center gap-2 text-sm text-emerald-600 mb-3">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Membre du programme
                                                </p>
                                            </div>

                                            {enrollment?.link_url && (
                                                <div className="space-y-3">
                                                    <div className="bg-gray-50 rounded-xl p-3">
                                                        <p className="text-xs text-gray-500 mb-1">Votre lien</p>
                                                        <p className="text-sm text-gray-900 font-mono truncate">
                                                            {enrollment.link_url}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={copyLink}
                                                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                                                            copied
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : 'bg-gray-900 text-white hover:bg-black'
                                                        }`}
                                                    >
                                                        {copied ? (
                                                            <>
                                                                <Check className="w-4 h-4" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-4 h-4" />
                                                                Copier le lien
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : isPending ? (
                                        <>
                                            {/* Request pending */}
                                            <div className="text-center py-2">
                                                <p className="flex items-center justify-center gap-2 text-sm text-amber-600 mb-2">
                                                    <Clock className="w-4 h-4" />
                                                    Demande en attente
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    La startup examinera votre demande
                                                </p>
                                            </div>
                                        </>
                                    ) : joinSuccess ? (
                                        <>
                                            {/* Just joined/requested */}
                                            <div className="text-center py-2">
                                                {joinSuccess === 'enrolled' ? (
                                                    <p className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                                                        <Sparkles className="w-4 h-4" />
                                                        Welcome to the program !
                                                    </p>
                                                ) : (
                                                    <p className="flex items-center justify-center gap-2 text-sm text-violet-600">
                                                        <Send className="w-4 h-4" />
                                                        Request sent!
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Not enrolled - show join button */}
                                            <button
                                                onClick={handleJoin}
                                                disabled={joining}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {joining ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : isPrivate ? (
                                                    <>
                                                        <Send className="w-4 h-4" />
                                                        Request to join
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        Rejoindre le programme
                                                    </>
                                                )}
                                            </button>

                                            {isPrivate && (
                                                <p className="text-xs text-gray-400 text-center mt-3">
                                                    Your request will be reviewed by the startup
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Quick links */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Liens rapides
                                </p>
                                <div className="space-y-2">
                                    {startup.website_url && (
                                        <a
                                            href={startup.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            <Globe className="w-4 h-4 text-gray-400" />
                                            Site web
                                        </a>
                                    )}
                                    {startup.twitter_url && (
                                        <a
                                            href={startup.twitter_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            <span className="w-4 h-4 text-gray-400 text-center">𝕏</span>
                                            Twitter
                                        </a>
                                    )}
                                    {startup.linkedin_url && (
                                        <a
                                            href={startup.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            <span className="w-4 h-4 text-gray-400 text-center font-bold text-xs">in</span>
                                            LinkedIn
                                        </a>
                                    )}
                                    <a
                                        href={mission.target_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                        Produit
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
