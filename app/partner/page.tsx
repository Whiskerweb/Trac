'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, ShoppingCart, DollarSign, ExternalLink, Copy, Check, MousePointer } from 'lucide-react'
import Link from 'next/link'
import { getPartnerDashboard } from '@/app/actions/partners'
import { getMyEnrollments } from '@/app/actions/marketplace'

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

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: string | number; color: string
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
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
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const [dashboardRes, enrollmentsRes] = await Promise.all([
                    getPartnerDashboard(),
                    getMyEnrollments()
                ])

                if (dashboardRes.success && dashboardRes.stats) {
                    setStats(dashboardRes.stats)
                }
                if (enrollmentsRes.success && enrollmentsRes.enrollments) {
                    setEnrollments(enrollmentsRes.enrollments)
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

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Vue d'ensemble de vos performances</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        icon={ShoppingCart}
                        label="Conversions"
                        value={stats?.conversionCount || 0}
                        color="bg-blue-50 text-blue-600"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Total Gagné"
                        value={formatCurrency(stats?.totalEarned || 0)}
                        color="bg-green-50 text-green-600"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="En Attente"
                        value={formatCurrency(stats?.pendingAmount || 0)}
                        color="bg-orange-50 text-orange-600"
                    />
                    <StatCard
                        icon={DollarSign}
                        label="Disponible"
                        value={formatCurrency(stats?.dueAmount || 0)}
                        color="bg-purple-50 text-purple-600"
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
