'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, ExternalLink, Copy, Check, ChevronRight, Link2, Users } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getSellerDashboard } from '@/app/actions/sellers'
import { getMyEnrollments, getMyGlobalStatsWithTimeseries } from '@/app/actions/marketplace'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { floatVariants } from '@/lib/animations'

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
        isPortalExclusive: boolean
    }
    startup: {
        name: string
        logo_url: string | null
        industry: string | null
    }
    link: {
        slug: string
        full_url: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    } | null
    organization?: {
        id: string
        name: string
        memberReward: string | null
        orgMissionId: string
    } | null
    group?: {
        id: string
        name: string
        creatorId: string
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

function MissionRow({ data, sellerId }: { data: Enrollment; sellerId: string | null }) {
    const [copied, setCopied] = useState(false)

    const isArchived = data.status === 'ARCHIVED'

    const copyLink = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!data.link || isArchived) return
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

    const href = data.organization
        ? `/seller/manage/${data.organization.id}/mission/${data.organization.orgMissionId}`
        : `/seller/programs/${data.mission.id}?eid=${data.id}`

    return (
        <Link href={href}>
            <div className="group px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer row-hover">
                <div className="flex items-center gap-6">
                    {/* Startup Logo */}
                    {data.startup.logo_url ? (
                        <img
                            src={data.startup.logo_url}
                            alt={data.startup.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                            {data.startup.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Title & Startup */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                                {data.mission.title}
                            </h3>
                            {data.mission.isPortalExclusive && (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium flex-shrink-0">
                                    Portal
                                </span>
                            )}
                            {data.organization && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium flex-shrink-0">
                                    <Users className="w-2.5 h-2.5" />
                                    {data.organization.name}
                                </span>
                            )}
                            {data.group && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-medium flex-shrink-0">
                                    <Users className="w-2.5 h-2.5" />
                                    {data.group.name}
                                </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            <span className="text-gray-500">{data.startup.name}</span>
                            <span className="mx-1.5">·</span>
                            {data.organization ? data.organization.memberReward : data.mission.reward} per conversion
                        </p>
                        {data.group && sellerId && data.group.creatorId !== sellerId && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                Revenue → {data.group.name} creator
                            </p>
                        )}
                        {data.group && sellerId && data.group.creatorId === sellerId && (
                            <p className="text-[10px] text-violet-500 mt-0.5">
                                All group revenue → you
                            </p>
                        )}
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
                                <p className="text-gray-400">Earnings</p>
                            </div>
                        </div>
                    )}

                    {/* Copy Link Button — hidden for archived enrollments */}
                    {data.link && !isArchived && (
                        <button
                            onClick={copyLink}
                            className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                                copied
                                    ? 'bg-green-50 text-green-600'
                                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                            title={copied ? 'Copied!' : 'Copy link'}
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
    const [sellerId, setSellerId] = useState<string | null>(null)
    const [globalStats, setGlobalStats] = useState({ clicks: 0, leads: 0, sales: 0, revenue: 0 })
    const [timeseries, setTimeseries] = useState<Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>>([])
    const [selectedDays, setSelectedDays] = useState(30)
    const [loadingTimeseries, setLoadingTimeseries] = useState(false)
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
                if ('sellerId' in enrollmentsRes && enrollmentsRes.sellerId) {
                    setSellerId(enrollmentsRes.sellerId as string)
                }
                if ('stats' in globalStatsRes && globalStatsRes.stats) {
                    setGlobalStats(globalStatsRes.stats)
                }
                if ('timeseries' in globalStatsRes && globalStatsRes.timeseries) {
                    setTimeseries(globalStatsRes.timeseries)
                }
                if ('error' in dashboardRes && 'error' in enrollmentsRes) {
                    setError(dashboardRes.error || enrollmentsRes.error || 'Error')
                }
            } catch (e) {
                setError('Unexpected error')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleRangeChange = useCallback(async (days: number) => {
        setSelectedDays(days)
        setLoadingTimeseries(true)
        try {
            const res = await getMyGlobalStatsWithTimeseries(days)
            if ('stats' in res && res.stats) {
                setGlobalStats(res.stats)
            }
            if ('timeseries' in res && res.timeseries) {
                setTimeseries(res.timeseries)
            }
        } catch (e) {
            console.error('Failed to fetch timeseries:', e)
        } finally {
            setLoadingTimeseries(false)
        }
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
            <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 tracking-tight">Analytics</h1>
                    <p className="text-gray-500 mt-1">Overview of your performance</p>
                </div>

                {/* Analytics Chart (same as startup dashboard) */}
                <div className="mb-8">
                    <AnalyticsChart
                        clicks={totalClicks}
                        leads={leads}
                        sales={sales}
                        revenue={revenue}
                        timeseries={timeseries}
                        selectedDays={selectedDays}
                        onRangeChange={handleRangeChange}
                        loadingTimeseries={loadingTimeseries}
                    />
                </div>

                {/* Missions Section - Minimalist Table Design */}
                {(() => {
                    const activeEnrollments = enrollments.filter(e => e.status !== 'ARCHIVED')
                    const archivedEnrollments = enrollments.filter(e => e.status === 'ARCHIVED')

                    return (
                        <>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                {/* Header */}
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-sm font-semibold text-gray-900">Programmes</h2>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {activeEnrollments.length}
                                        </span>
                                    </div>
                                    <Link
                                        href="/seller/marketplace"
                                        className="text-xs text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
                                    >
                                        Explore
                                        <ChevronRight className="w-3 h-3" />
                                    </Link>
                                </div>

                                {activeEnrollments.length > 0 ? (
                                    <div className="divide-y divide-gray-50">
                                        {activeEnrollments.map((enrollment) => (
                                            <MissionRow key={enrollment.id} data={enrollment} sellerId={sellerId} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-6 py-16 text-center">
                                        <motion.div
                                            variants={floatVariants}
                                            animate="float"
                                            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4"
                                        >
                                            <Link2 className="w-5 h-5 text-violet-500" />
                                        </motion.div>
                                        <p className="text-sm text-gray-500 mb-4">
                                            No programs joined yet
                                        </p>
                                        <Link
                                            href="/seller/marketplace"
                                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black transition-colors w-full sm:w-auto btn-press"
                                        >
                                            Discover programs
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Archived enrollments */}
                            {archivedEnrollments.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mt-6 opacity-60">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                        <h2 className="text-sm font-semibold text-gray-500">Archived</h2>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {archivedEnrollments.length}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {archivedEnrollments.map((enrollment) => (
                                            <MissionRow key={enrollment.id} data={enrollment} sellerId={sellerId} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )
                })()}
            </div>
        </div>
    )
}
