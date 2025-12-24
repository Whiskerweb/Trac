'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

interface TimeseriesData {
    date: string
    clicks: number
    sales: number
    revenue: number
}

interface AnalyticsChartProps {
    data: TimeseriesData[]
    isLoading?: boolean
}

// Loading Skeleton Component
function ChartSkeleton() {
    return (
        <div className="w-full h-[350px] flex items-end justify-between gap-2 px-8 pb-8 pt-4 animate-pulse">
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-gray-200 rounded-t-md flex-1"
                    style={{
                        height: `${Math.random() * 60 + 40}%`,
                    }}
                />
            ))}
        </div>
    )
}

// Empty State Component
function EmptyState() {
    return (
        <div className="w-full h-[350px] flex flex-col items-center justify-center text-gray-400">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No activity in this period</p>
            <p className="text-xs mt-1">Try selecting a different date range</p>
        </div>
    )
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) {
        return null
    }

    // Format date from "2024-12-23" to "23 Dec"
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }

    return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-2">
                {formatDate(label)}
            </p>
            <div className="space-y-1">
                {payload.map((entry: any) => (
                    <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
                        <span className="font-semibold text-gray-900">
                            {entry.value.toLocaleString('fr-FR')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function AnalyticsChart({ data, isLoading = false }: AnalyticsChartProps) {
    // Show loading skeleton
    if (isLoading) {
        return <ChartSkeleton />
    }

    // Show empty state when no data
    if (!data || data.length === 0) {
        return <EmptyState />
    }

    // Format date for X-axis from "2024-12-23" to "23 Dec"
    const formatXAxis = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }

    // Format data to ensure proper typing
    const chartData = data.map((item) => ({
        date: item.date,
        clicks: item.clicks,
        sales: item.sales,
    }))

    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <defs>
                    {/* Blue gradient for Clicks - Enhanced opacity */}
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    {/* Green gradient for Sales - Enhanced opacity */}
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />

                <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />

                <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Clicks Area - Blue */}
                <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorClicks)"
                    animationDuration={800}
                />

                {/* Sales Area - Green */}
                <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                    animationDuration={800}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
