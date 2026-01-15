'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
    MousePointer2,
    CreditCard,
    DollarSign,
    BarChart3,
    Loader2,
    RefreshCw,
    AlertCircle,
    Rocket,
    UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { LastEventsSection } from '@/components/dashboard/LastEventsSection'
import { subDays, format } from 'date-fns'

interface KPIData {
    clicks: number
    leads: number
    sales: number
    revenue: number
    conversion_rate: number
    click_to_lead_rate?: number
    lead_to_sale_rate?: number
    timeseries?: Array<{
        date: string
        clicks: number
        sales: number
        revenue: number
    }>
}

interface KPIResponse {
    data: KPIData[]
    meta?: { user_id?: string }
}

const kpiFetcher = async (url: string): Promise<KPIResponse> => {
    const cacheBuster = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    const res = await fetch(cacheBuster, {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        }
    })
    if (!res.ok) {
        throw new Error('Failed to fetch KPIs')
    }
    return res.json()
}

// Dub.co Style Minimalist KPI Card
function KPICard({
    title,
    value,
    icon: Icon,
}: {
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between h-full hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <Icon className="w-4 h-4 text-gray-400" strokeWidth={2} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-black tracking-tight">{value}</span>
            </div>
        </div>
    )
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(cents / 100)
}



export default function DashboardPage() {
    // Date range state (default: last 30 days)
    const [selectedRange, setSelectedRange] = useState('30d')
    const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

    // Fetch KPIs with date range parameters
    const kpiUrl = `/api/stats/kpi?date_from=${dateFrom}&date_to=${dateTo}`
    const { data: kpiData, error: kpiError, isLoading: kpiLoading, mutate: mutateKpi } = useSWR<KPIResponse>(kpiUrl, kpiFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    })

    // Handle date range change
    const handleRangeChange = (range: string, from: string, to: string) => {
        setSelectedRange(range)
        setDateFrom(from)
        setDateTo(to)
    }

    const kpi = kpiData?.data?.[0] || { clicks: 0, leads: 0, sales: 0, revenue: 0, conversion_rate: 0 }

    if (kpiError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-semibold text-red-800">Error loading data</h3>
                    <p className="text-xs text-red-600 mt-1">Please try refreshing the page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black tracking-tight">Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your performance and manage links.</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker
                        selectedRange={selectedRange}
                        onRangeChange={handleRangeChange}
                    />
                    <button
                        onClick={() => mutateKpi()}
                        className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 rounded-lg transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <Link
                        href="/dashboard/missions"
                        className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>Lancer une Mission</span>
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard
                    title="Total Clicks"
                    value={kpi.clicks.toLocaleString('en-US')}
                    icon={MousePointer2}
                />
                <KPICard
                    title="Total Leads"
                    value={kpi.leads.toLocaleString('en-US')}
                    icon={UserPlus}
                />
                <KPICard
                    title="Total Sales"
                    value={kpi.sales.toLocaleString('en-US')}
                    icon={CreditCard}
                />
                <KPICard
                    title="Revenue"
                    value={formatCurrency(kpi.revenue)}
                    icon={DollarSign}
                />
                <KPICard
                    title="Conversion"
                    value={`${kpi.conversion_rate.toFixed(1)}%`}
                    icon={BarChart3}
                />
            </div>

            {/* Chart + Last Events Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-base font-semibold text-gray-900">Performance Trend</h2>
                    </div>
                    <AnalyticsChart
                        data={kpiData?.data?.[0]?.timeseries || []}
                        isLoading={kpiLoading}
                    />
                </div>

                {/* Last Events */}
                <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Derniers Événements</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <LastEventsSection />
                    </div>
                </div>
            </div>
        </div>
    )
}
