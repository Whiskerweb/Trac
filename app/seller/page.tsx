'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ExternalLink, Copy, Check, MousePointer, Users, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { getSellerDashboard } from '@/app/actions/sellers'
import { getMyEnrollments, getMyGlobalStats } from '@/app/actions/marketplace'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'

interface Stats {
    totalClicks: number
    totalEarnings: number
    totalSales: number
    conversionRate: number
    activeMissions: number
}

interface Enrollment {
    id: string
    mission: {
        id: string
        title: string
        reward: string
    }
    link: {
        slug: string
        full_url: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    } | null
    status: string
    created_at: Date
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
}


function MissionCard({ data }: { data: Enrollment }) {
    const [copied, setCopied] = useState(false)

    const copyLink = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!data.link) return
        navigator.clipboard.writeText(data.link.full_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Link href={`/seller/marketplace/${data.mission.id}`}>
            <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                            {data.mission.title.charAt(0).toUpperCase()}
                        </div>

                        {/* Title & Meta */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                    {data.mission.title}
                                </h3>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Reward badge */}
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                                    💰 {data.mission.reward}
                                </span>
                                <span className="text-xs text-gray-400">par conversion</span>
                            </div>

                            {/* Stats row */}
                            {data.link && (
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5">
                                        <MousePointer className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="font-medium text-gray-700">{data.link.clicks}</span> clicks
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-purple-500" />
                                        <span className="font-medium text-gray-700">{data.link.leads}</span> leads
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <ShoppingCart className="w-3.5 h-3.5 text-teal-500" />
                                        <span className="font-medium text-gray-700">{data.link.sales}</span> ventes
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Copy button */}
                    {data.link && (
                        <button
                            onClick={copyLink}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex-shrink-0"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600 font-medium">Copié!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">Copier lien</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Tracking link preview */}
                {data.link && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>🔗</span>
                            <code className="bg-gray-50 px-2 py-0.5 rounded font-mono truncate">
                                {data.link.full_url}
                            </code>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    )
}

export default function PartnerDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats | null>(null)
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [globalStats, setGlobalStats] = useState({ clicks: 0, leads: 0, sales: 0, revenue: 0 })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const [dashboardRes, enrollmentsRes, globalStatsRes] = await Promise.all([
                    getSellerDashboard(),
                    getMyEnrollments(),
                    getMyGlobalStats()
                ])

                if ('stats' in dashboardRes && dashboardRes.stats) {
                    setStats(dashboardRes.stats as Stats)
                }
                if ('enrollments' in enrollmentsRes && enrollmentsRes.enrollments) {
                    setEnrollments(enrollmentsRes.enrollments as Enrollment[])
                }
                if ('stats' in globalStatsRes && globalStatsRes.stats) {
                    setGlobalStats(globalStatsRes.stats)
                }
                if ('error' in dashboardRes && 'error' in enrollmentsRes) {
                    setError(dashboardRes.error || enrollmentsRes.error || 'Erreur')
                }
            } catch (e) {
                setError('Erreur inattendue')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FAFAFB] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        )
    }

    // Use globalStats from Tinybird (real clicks/leads/sales by affiliate_id)
    const { clicks: totalClicks, leads, sales, revenue } = globalStats

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Analytics</h1>
                    <p className="text-gray-500 mt-1">Vue d'ensemble de vos performances</p>
                </div>

                {/* Analytics Chart (same as startup dashboard) */}
                <div className="mb-8">
                    <AnalyticsChart
                        clicks={totalClicks}
                        leads={leads}
                        sales={sales}
                        revenue={revenue}
                    />
                </div>

                {/* Missions Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Mes Missions ({enrollments.length})</h2>
                        <Link
                            href="/marketplace"
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Explorer le Marketplace
                        </Link>
                    </div>

                    {enrollments.length > 0 ? (
                        <div className="space-y-3">
                            {enrollments.map((enrollment) => (
                                <MissionCard key={enrollment.id} data={enrollment} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ExternalLink className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune mission rejointe</h3>
                            <p className="text-gray-500 mb-6">
                                Rejoignez des missions pour commencer à gagner des commissions.
                            </p>
                            <Link
                                href="/marketplace"
                                className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                            >
                                Explorer le Marketplace
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
