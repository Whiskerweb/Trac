'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ExternalLink, Copy, Check, ChevronRight, Link2 } from 'lucide-react'
import Link from 'next/link'
import { getSellerDashboard } from '@/app/actions/sellers'
import { getMyEnrollments, getMyGlobalStatsWithTimeseries } from '@/app/actions/marketplace'
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

// =============================================
// MISSION ROW - Minimalist table row design
// =============================================

function MissionRow({ data }: { data: Enrollment }) {
    const [copied, setCopied] = useState(false)

    const copyLink = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!data.link) return
        navigator.clipboard.writeText(data.link.full_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const stats = data.link ? [
        { label: 'Clicks', value: data.link.clicks },
        { label: 'Leads', value: data.link.leads },
        { label: 'Sales', value: data.link.sales },
    ] : []

    const revenue = data.link?.revenue || 0

    return (
        <Link href={`/seller/marketplace/${data.mission.id}`}>
            <div className="group px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-6">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {data.mission.title.charAt(0).toUpperCase()}
                    </div>

                    {/* Title & Reward */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                                {data.mission.title}
                            </h3>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {data.mission.reward} par conversion
                        </p>
                    </div>

                    {/* Stats - Compact inline */}
                    {data.link && (
                        <div className="hidden md:flex items-center gap-6 text-xs text-gray-500">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <p className="font-semibold text-gray-900 text-sm tabular-nums">
                                        {stat.value}
                                    </p>
                                    <p className="text-gray-400">{stat.label}</p>
                                </div>
                            ))}
                            <div className="text-center pl-4 border-l border-gray-100">
                                <p className="font-semibold text-violet-600 text-sm tabular-nums">
                                    {formatCurrency(revenue)}
                                </p>
                                <p className="text-gray-400">Gains</p>
                            </div>
                        </div>
                    )}

                    {/* Copy Link Button */}
                    {data.link && (
                        <button
                            onClick={copyLink}
                            className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                                copied
                                    ? 'bg-green-50 text-green-600'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                            title={copied ? 'Copié!' : 'Copier le lien'}
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </button>
                    )}
                </div>

                {/* Mobile Stats - Show below on small screens */}
                {data.link && (
                    <div className="md:hidden flex items-center gap-4 mt-3 pl-16 text-xs">
                        {stats.map((stat) => (
                            <span key={stat.label} className="text-gray-500">
                                <span className="font-medium text-gray-700">{stat.value}</span> {stat.label.toLowerCase()}
                            </span>
                        ))}
                        <span className="text-violet-600 font-medium">
                            {formatCurrency(revenue)}
                        </span>
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
    const [timeseries, setTimeseries] = useState<Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const [dashboardRes, enrollmentsRes, globalStatsRes] = await Promise.all([
                    getSellerDashboard(),
                    getMyEnrollments(),
                    getMyGlobalStatsWithTimeseries(30)  // Get last 30 days with timeseries
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
                if ('timeseries' in globalStatsRes && globalStatsRes.timeseries) {
                    setTimeseries(globalStatsRes.timeseries)
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
                        timeseries={timeseries}
                    />
                </div>

                {/* Missions Section - Minimalist Table Design */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-gray-900">Programmes</h2>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {enrollments.length}
                            </span>
                        </div>
                        <Link
                            href="/seller/marketplace"
                            className="text-xs text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
                        >
                            Explorer
                            <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {enrollments.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {enrollments.map((enrollment) => (
                                <MissionRow key={enrollment.id} data={enrollment} />
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Link2 className="w-5 h-5 text-violet-500" />
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Aucun programme rejoint
                            </p>
                            <Link
                                href="/seller/marketplace"
                                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors"
                            >
                                Découvrir les programmes
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
