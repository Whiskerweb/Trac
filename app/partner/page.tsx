'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ExternalLink, Copy, Check, MousePointer, Users, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { getPartnerDashboard } from '@/app/actions/partners'
import { getMyEnrollments, getMyGlobalStats } from '@/app/actions/marketplace'

interface Stats {
    totalEarned: number
    pendingAmount: number
    dueAmount: number
    paidAmount: number
    conversionCount: number
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

// =============================================
// FUNNEL CHART COMPONENT (Dub.co style)
// =============================================
function FunnelChart({ clicks, leads, sales, revenue }: {
    clicks: number; leads: number; sales: number; revenue: number
}) {
    // Calculate percentages (relative to clicks)
    const leadsPercent = clicks > 0 ? Math.round((leads / clicks) * 100) : 0
    const salesPercent = clicks > 0 ? Math.round((sales / clicks) * 100) : 0

    // Heights for funnel visualization (relative, max = 100)
    const clicksHeight = 100
    const leadsHeight = Math.max(leadsPercent, 5) // minimum 5% for visibility
    const salesHeight = Math.max(salesPercent, 3) // minimum 3% for visibility

    // SVG dimensions
    const width = 900
    const height = 200
    const sectionWidth = width / 3

    // Generate flowing path between two sections
    const generateFlowPath = (
        startX: number, startHeight: number,
        endX: number, endHeight: number,
        maxHeight: number
    ) => {
        const startY = (maxHeight - startHeight) / 2
        const endY = (maxHeight - endHeight) / 2
        const cpOffset = (endX - startX) / 2

        // Top curve
        const topStart = `M ${startX} ${startY}`
        const topCurve = `C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`

        // Bottom curve
        const bottomEnd = `L ${endX} ${endY + endHeight}`
        const bottomCurve = `C ${endX - cpOffset} ${endY + endHeight}, ${startX + cpOffset} ${startY + startHeight}, ${startX} ${startY + startHeight}`

        return `${topStart} ${topCurve} ${bottomEnd} ${bottomCurve} Z`
    }

    // Calculate normalized heights for SVG
    const svgMaxHeight = height - 40 // padding
    const clicksSvgHeight = (clicksHeight / 100) * svgMaxHeight
    const leadsSvgHeight = (leadsHeight / 100) * svgMaxHeight
    const salesSvgHeight = (salesHeight / 100) * svgMaxHeight

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            {/* Header Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-sm text-gray-500">Clicks</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(clicks)}</p>
                </div>
                <div className="text-left border-l border-gray-100 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-sm text-gray-500">Leads</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(leads)}</p>
                </div>
                <div className="text-left border-l border-gray-100 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        <span className="text-sm text-gray-500">Sales</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(revenue)}</p>
                </div>
            </div>

            {/* Funnel Visualization - SVG */}
            <div className="relative overflow-hidden rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto"
                    style={{ minHeight: '160px' }}
                >
                    <defs>
                        {/* Gradients */}
                        <linearGradient id="clicksGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                        <linearGradient id="leadsGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                        <linearGradient id="salesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#5eead4" />
                        </linearGradient>
                    </defs>

                    {/* Flow from Clicks to Leads */}
                    <path
                        d={generateFlowPath(0, clicksSvgHeight, sectionWidth, leadsSvgHeight, height)}
                        fill="url(#clicksGradient)"
                        opacity="0.9"
                    />

                    {/* Flow from Leads to Sales */}
                    <path
                        d={generateFlowPath(sectionWidth, leadsSvgHeight, sectionWidth * 2, salesSvgHeight, height)}
                        fill="url(#leadsGradient)"
                        opacity="0.9"
                    />

                    {/* Sales section (extends to end) */}
                    <path
                        d={generateFlowPath(sectionWidth * 2, salesSvgHeight, width, salesSvgHeight, height)}
                        fill="url(#salesGradient)"
                        opacity="0.9"
                    />

                    {/* Percentage labels */}
                    <g className="text-xs font-semibold" fill="#374151">
                        {/* 100% label */}
                        <rect x={sectionWidth / 2 - 30} y={height / 2 - 12} width="60" height="24" rx="12" fill="white" opacity="0.95" />
                        <text x={sectionWidth / 2} y={height / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="600">100%</text>

                        {/* Leads % label */}
                        <rect x={sectionWidth * 1.5 - 30} y={height / 2 - 12} width="60" height="24" rx="12" fill="white" opacity="0.95" />
                        <text x={sectionWidth * 1.5} y={height / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="600">{leadsPercent}%</text>

                        {/* Sales % label */}
                        <rect x={sectionWidth * 2.5 - 30} y={height / 2 - 12} width="60" height="24" rx="12" fill="white" opacity="0.95" />
                        <text x={sectionWidth * 2.5} y={height / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="600">{salesPercent}%</text>
                    </g>
                </svg>
            </div>
        </div>
    )
}

function MissionCard({ data }: { data: Enrollment }) {
    const [copied, setCopied] = useState(false)

    const copyLink = () => {
        if (!data.link) return
        navigator.clipboard.writeText(data.link.full_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-lg">
                        {data.mission.title.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{data.mission.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{data.mission.reward}</span>
                            {data.link && (
                                <span className="flex items-center gap-1">
                                    <MousePointer className="w-3 h-3" />
                                    {data.link.clicks} clics
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {data.link && (
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-green-600">Copié!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 text-gray-600" />
                                <span className="text-gray-600">Copier lien</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default function PartnerDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats | null>(null)
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [globalStats, setGlobalStats] = useState({ clicks: 0, sales: 0, revenue: 0 })
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const [dashboardRes, enrollmentsRes, globalStatsRes] = await Promise.all([
                    getPartnerDashboard(),
                    getMyEnrollments(),
                    getMyGlobalStats()
                ])

                if (dashboardRes.success && dashboardRes.stats) {
                    setStats(dashboardRes.stats)
                }
                if (enrollmentsRes.success && enrollmentsRes.enrollments) {
                    setEnrollments(enrollmentsRes.enrollments)
                }
                if (globalStatsRes.success && globalStatsRes.stats) {
                    setGlobalStats(globalStatsRes.stats)
                }
                if (!dashboardRes.success && !enrollmentsRes.success) {
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

    // Use globalStats from Tinybird (real clicks/sales by affiliate_id)
    const leads = 0 // TODO: Get from Tinybird leads table
    const { clicks: totalClicks, sales, revenue } = globalStats

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Analytics</h1>
                    <p className="text-gray-500 mt-1">Vue d'ensemble de vos performances</p>
                </div>

                {/* Funnel Chart */}
                <FunnelChart
                    clicks={totalClicks}
                    leads={leads}
                    sales={sales}
                    revenue={revenue}
                />

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
