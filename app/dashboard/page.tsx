'use client'

import useSWR from 'swr'
import { MousePointer2, CreditCard, DollarSign, BarChart3, AlertCircle, Loader2 } from 'lucide-react'

interface KPIData {
    clicks: number
    sales: number
    revenue: number
    conversion_rate: number
}

interface KPIResponse {
    data: KPIData[]
}

const fetcher = async (url: string): Promise<KPIResponse> => {
    const res = await fetch(url)
    if (!res.ok) {
        throw new Error('Failed to fetch KPIs')
    }
    return res.json()
}

function KPICard({
    title,
    value,
    icon: Icon,
    color
}: {
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    color: string
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    )
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100)
}

export default function DashboardPage() {
    // Simple SWR call to our proxy endpoint - no token management needed
    const { data, error, isLoading } = useSWR<KPIResponse>('/api/stats/kpi', fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
    })

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement des statistiques...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800">Erreur de chargement</h3>
                            <p className="text-red-700 mt-1">
                                Impossible de charger les statistiques.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const kpi = data?.data?.[0] || { clicks: 0, sales: 0, revenue: 0, conversion_rate: 0 }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Vue d&apos;ensemble de vos performances</p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard
                        title="Clics"
                        value={kpi.clicks.toLocaleString('fr-FR')}
                        icon={MousePointer2}
                        color="bg-blue-500"
                    />
                    <KPICard
                        title="Ventes"
                        value={kpi.sales.toLocaleString('fr-FR')}
                        icon={CreditCard}
                        color="bg-green-500"
                    />
                    <KPICard
                        title="Revenus"
                        value={formatCurrency(kpi.revenue)}
                        icon={DollarSign}
                        color="bg-purple-500"
                    />
                    <KPICard
                        title="Taux de conversion"
                        value={`${kpi.conversion_rate.toFixed(2)}%`}
                        icon={BarChart3}
                        color="bg-orange-500"
                    />
                </div>

                {/* Last updated info */}
                <p className="text-sm text-gray-400 mt-6 text-center">
                    Données actualisées automatiquement toutes les 30 secondes
                </p>
            </div>
        </div>
    )
}
