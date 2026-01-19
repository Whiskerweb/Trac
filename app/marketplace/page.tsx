'use client'

import { useState, useEffect } from 'react'
import {
    Rocket, CheckCircle2, Copy, Check, Loader2,
    ExternalLink, Target, Gift, TrendingUp, Eye,
    MousePointer2, ArrowLeft, DollarSign, Coins
} from 'lucide-react'
import Link from 'next/link'
import { getAllMissions, joinMission } from '@/app/actions/marketplace'
import { ActivityLog } from '@/components/ActivityLog'

interface AffiliateStats {
    clicks: number
    leads: number
    sales: number
    revenue: number
}

interface Mission {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    workspace_id: string
    created_at: Date
    custom_domain: string | null  // CNAME domain for preview URLs
    enrollment: {
        id: string
        status: string
        link: {
            id: string
            slug: string
            full_url: string
        } | null
        stats: AffiliateStats
    } | null
}

// =============================================
// STATS MINI DASHBOARD
// =============================================

function StatsBadge({
    icon: Icon,
    label,
    value,
    color
}: {
    icon: React.ElementType
    label: string
    value: string | number
    color: 'gray' | 'green' | 'gold'
}) {
    const colorClasses = {
        gray: 'bg-slate-100 text-slate-700 border-slate-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        gold: 'bg-amber-50 text-amber-700 border-amber-200',
    }

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
            <div>
                <p className="text-xs opacity-70">{label}</p>
                <p className="font-bold text-sm">{value}</p>
            </div>
        </div>
    )
}

// =============================================
// MISSION CARD COMPONENT
// =============================================

function MissionCard({
    mission,
    onJoin
}: {
    mission: Mission
    onJoin: () => void
}) {
    const [joining, setJoining] = useState(false)
    const [copied, setCopied] = useState(false)
    const [linkUrl, setLinkUrl] = useState(mission.enrollment?.link?.full_url || '')

    const isEnrolled = !!mission.enrollment
    const stats = mission.enrollment?.stats

    async function handleJoin() {
        setJoining(true)
        const result = await joinMission(mission.id)

        if (result.success && result.enrollment) {
            setLinkUrl(result.enrollment.link_url)
            onJoin()
        }

        setJoining(false)
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(linkUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
            {/* Header with Reward Badge */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-white/80" />
                        <span className="text-white/80 text-sm">Mission</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur rounded-full">
                        <Gift className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">{mission.reward}</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white mt-3">{mission.title}</h3>
            </div>

            {/* Body */}
            <div className="p-5">
                <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {mission.description || 'Rejoignez cette mission et gagnez des commissions sur chaque vente.'}
                </p>

                {/* Target URL */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                    <ExternalLink className="w-4 h-4" />
                    <a
                        href={mission.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-purple-600 truncate"
                    >
                        {mission.target_url}
                    </a>
                </div>

                {/* Action Area */}
                {isEnrolled ? (
                    <div className="space-y-4">
                        {/* Enrolled Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 font-medium">Vous participez</span>
                        </div>

                        {/* 📊 Stats Mini Dashboard */}
                        {stats && (
                            <div className="grid grid-cols-3 gap-2">
                                <StatsBadge
                                    icon={Eye}
                                    label="Clics"
                                    value={stats.clicks}
                                    color="gray"
                                />
                                <StatsBadge
                                    icon={TrendingUp}
                                    label="Ventes"
                                    value={stats.sales}
                                    color="green"
                                />
                                <StatsBadge
                                    icon={Coins}
                                    label="Gains"
                                    value={`€${stats.revenue.toFixed(0)}`}
                                    color="gold"
                                />
                            </div>
                        )}

                        {/* Generated Link */}
                        {linkUrl && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Votre lien d&apos;affiliation
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={linkUrl}
                                        readOnly
                                        className="w-full px-3 py-2.5 pr-20 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-purple-600"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm font-medium flex items-center gap-1"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3 h-3" />
                                                Copié
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Copier
                                            </>
                                        )}
                                    </button>
                                </div>
                                {/* Domain Status Badge */}
                                {!mission.custom_domain && (
                                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>Lien non-sécurisé (domaine par défaut)</span>
                                    </div>
                                )}
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <MousePointer2 className="w-3 h-3" />
                                    Partagez ce lien pour gagner des commissions
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                    >
                        {joining ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Inscription...
                            </>
                        ) : (
                            <>
                                <Rocket className="w-5 h-5" />
                                Rejoindre le programme
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function MarketplacePage() {
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(true)

    async function loadMissions() {
        const result = await getAllMissions()
        if (result.success && result.missions) {
            setMissions(result.missions)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMissions()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Back Link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </Link>

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                        <Gift className="w-4 h-4" />
                        Programmes d'affiliation
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-3">
                        Marketplace
                    </h1>
                    <p className="text-lg text-slate-600 max-w-xl mx-auto">
                        Rejoignez des programmes et gagnez des commissions en partageant vos liens.
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Target className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            Aucune mission disponible
                        </h3>
                        <p className="text-slate-500">
                            De nouvelles opportunités seront bientôt disponibles.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                onJoin={loadMissions}
                            />
                        ))}
                    </div>
                )}

                {/* Stats Banner */}
                {missions.length > 0 && (
                    <div className="mt-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">
                                    Prêt à gagner ?
                                </h3>
                                <p className="text-purple-200">
                                    Rejoignez une mission et commencez à partager.
                                </p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{missions.length}</div>
                                    <div className="text-purple-200 text-sm">Missions actives</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">
                                        {missions.filter(m => m.enrollment).length}
                                    </div>
                                    <div className="text-purple-200 text-sm">Vos participations</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Log for debugging affiliate events */}
                <div className="mt-8">
                    <ActivityLog mode="affiliate" />
                </div>
            </div>
        </div>
    )
}
