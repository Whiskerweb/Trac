'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, DollarSign, Users, TrendingUp, Target,
    Loader2, Trophy, Medal
} from 'lucide-react'
import { getMissionStatsForStartup, MissionStatsForStartup, PartnerStats } from '@/app/actions/mission-stats'

// =============================================
// STAT CARD COMPONENT
// =============================================

function StatCard({
    icon: Icon,
    label,
    value,
    color = 'gray'
}: {
    icon: React.ElementType
    label: string
    value: string
    color?: 'gray' | 'green' | 'blue' | 'purple'
}) {
    const colors = {
        gray: 'bg-gray-50 text-gray-600',
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600'
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-xl font-semibold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    )
}

// =============================================
// RANK BADGE COMPONENT
// =============================================

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Trophy className="w-3 h-3" /> #1
        </span>
    }
    if (rank === 2) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
            <Medal className="w-3 h-3" /> #2
        </span>
    }
    if (rank === 3) {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            <Medal className="w-3 h-3" /> #3
        </span>
    }
    return <span className="text-sm text-gray-500">#{rank}</span>
}

// =============================================
// PARTNER LEADERBOARD ROW
// =============================================

function LeaderboardRow({ partner }: { partner: PartnerStats }) {
    const formatAmount = (cents: number) => `${(cents / 100).toFixed(2)}€`

    return (
        <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
            {/* Left: Avatar + Name */}
            <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-medium text-sm">
                    {partner.partner_name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{partner.partner_name}</p>
                    <p className="text-xs text-gray-500">{partner.leads} leads • {partner.clicks} clicks</p>
                </div>
            </div>

            {/* Right: Revenue + Rank */}
            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatAmount(partner.total_revenue)}</p>
                    <p className="text-xs text-gray-400">CA généré</p>
                </div>
                <RankBadge rank={partner.rank} />
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function MissionDetailPage() {
    const params = useParams()
    const router = useRouter()
    const missionId = params.id as string

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<MissionStatsForStartup | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadStats()
    }, [missionId])

    async function loadStats() {
        setLoading(true)
        const result = await getMissionStatsForStartup(missionId)
        if (result.success && result.stats) {
            setStats(result.stats)
        } else {
            setError(result.error || 'Failed to load')
        }
        setLoading(false)
    }

    const formatAmount = (cents: number) => `${(cents / 100).toFixed(2)}€`

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="p-6">
                <p className="text-red-600">{error || 'Mission not found'}</p>
                <Link href="/dashboard/missions" className="text-blue-600 hover:underline mt-2 inline-block">
                    ← Retour aux missions
                </Link>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{stats.mission_title}</h1>
                    <p className="text-sm text-gray-500">Statistiques détaillées de la mission</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={DollarSign}
                    label="CA Total"
                    value={formatAmount(stats.total_revenue)}
                    color="green"
                />
                <StatCard
                    icon={Target}
                    label="À reverser"
                    value={formatAmount(stats.total_to_pay)}
                    color="purple"
                />
                <StatCard
                    icon={Users}
                    label="Partners actifs"
                    value={stats.total_partners.toString()}
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Taux conversion"
                    value={`${stats.conversion_rate}%`}
                    color="gray"
                />
            </div>

            {/* Partner Leaderboard */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Classement des Partners</h2>
                    <p className="text-sm text-gray-500">Performance sur cette mission</p>
                </div>

                {stats.partner_leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Aucune vente enregistrée sur cette mission
                    </div>
                ) : (
                    <div>
                        {stats.partner_leaderboard.map((partner) => (
                            <LeaderboardRow key={partner.partner_id} partner={partner} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
