'use client'

import { useState } from 'react'
import NumberFlow from '@number-flow/react'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Flag } from 'lucide-react'

/**
 * Analytics Chart with Funnel & Timeline Views
 * Toggle between flowing funnel visualization and classic line chart
 */

interface AnalyticsChartProps {
    clicks: number
    leads: number
    sales: number
    revenue: number
    timeseries?: Array<{
        date: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    }>
}

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
}

// =============================================
// CUSTOM TOOLTIP FOR LINE CHART
// =============================================

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null

    const isHourly = label && typeof label === 'string' && label.includes('T')
    const formatDate = (dateStr: string) => {
        // If it's already a formatted label (contains " - " or isn't ISO format), return as-is
        if (!dateStr || dateStr.includes(' - ') || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr
        }
        const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
        if (isNaN(date.getTime())) return dateStr
        if (isHourly) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) +
                ' - ' + date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        }
        return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    }

    return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-2">{formatDate(label)}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-500 capitalize">{entry.dataKey}</span>
                    <span className="font-semibold text-gray-900 ml-auto">
                        {entry.dataKey === 'revenue' ? `${(entry.value / 100).toFixed(2)} €` : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

// =============================================
// VIEW TOGGLE BUTTONS
// =============================================

function ViewToggle({ view, onChange }: { view: 'funnel' | 'timeline'; onChange: (v: 'funnel' | 'timeline') => void }) {
    return (
        <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button
                onClick={() => onChange('timeline')}
                className={`p-2 transition-colors ${view === 'timeline' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                title="Timeline view"
            >
                <TrendingUp className="w-4 h-4" />
            </button>
            <button
                onClick={() => onChange('funnel')}
                className={`p-2 transition-colors ${view === 'funnel' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                title="Funnel view"
            >
                <Flag className="w-4 h-4" />
            </button>
        </div>
    )
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AnalyticsChart({ clicks, leads, sales, revenue, timeseries = [] }: AnalyticsChartProps) {
    const [view, setView] = useState<'funnel' | 'timeline'>('funnel')
    const [saleUnit, setSaleUnit] = useState<'currency' | 'count'>('currency')

    // Calculate percentages relative to clicks
    const leadsPercent = clicks > 0 ? (leads / clicks) * 100 : 0
    const salesPercent = clicks > 0 ? (sales / clicks) * 100 : 0

    // SVG dimensions for funnel
    const width = 900
    const height = 280
    const sectionWidth = width / 3
    const maxHeight = 180
    const minHeight = 4

    const clicksHeight = maxHeight
    const leadsHeight = Math.max((leadsPercent / 100) * maxHeight, minHeight)
    const salesHeight = Math.max((salesPercent / 100) * maxHeight, minHeight)
    const centerY = height / 2

    const createFlowPath = (x1: number, h1: number, x2: number, h2: number, cy: number) => {
        const y1Top = cy - h1 / 2
        const y1Bottom = cy + h1 / 2
        const y2Top = cy - h2 / 2
        const y2Bottom = cy + h2 / 2
        const cpX = x1 + (x2 - x1) * 0.5

        return `M ${x1},${y1Top} C ${cpX},${y1Top} ${cpX},${y2Top} ${x2},${y2Top} L ${x2},${y2Bottom} C ${cpX},${y2Bottom} ${cpX},${y1Bottom} ${x1},${y1Bottom} Z`
    }

    const createRectPath = (x: number, h: number, w: number, cy: number) => {
        const yTop = cy - h / 2
        const yBottom = cy + h / 2
        return `M ${x},${yTop} L ${x + w},${yTop} L ${x + w},${yBottom} L ${x},${yBottom} Z`
    }

    // Detect if data is hourly (contains 'T' in date)
    const isHourlyData = timeseries.length > 0 && timeseries[0]?.date?.includes('T')

    const formatXAxis = (dateStr: string) => {
        // If it's already a formatted label (contains " - " or non-ASCII), return as-is
        if (!dateStr || dateStr.includes(' - ') || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr
        }
        const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
        if (isNaN(date.getTime())) return dateStr
        if (isHourlyData || dateStr.includes('T')) {
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header Stats - 3 columns */}
            <div className="grid grid-cols-3 divide-x divide-gray-200">
                {/* Clicks */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-violet-700" />
                        <span className="text-sm text-gray-500 font-medium">Clicks</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow value={clicks} />
                    </p>
                </div>

                {/* Leads */}
                <div className="p-6 relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-violet-500" />
                        <span className="text-sm text-gray-500 font-medium">Leads</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow value={leads} />
                    </p>
                </div>

                {/* Sales */}
                <div className={`p-6 relative ${view === 'funnel' ? 'border-b-2 border-gray-900' : ''}`}>
                    <div className="absolute right-4 top-4 flex items-center gap-2">
                        {/* Currency/Count Toggle */}
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setSaleUnit('currency')}
                                className={`px-2.5 py-1 text-sm font-medium transition-colors ${saleUnit === 'currency' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                €
                            </button>
                            <button
                                onClick={() => setSaleUnit('count')}
                                className={`px-2.5 py-1 text-sm font-medium transition-colors ${saleUnit === 'count' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                123
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-violet-300" />
                        <span className="text-sm text-gray-500 font-medium">Sales</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow
                            value={saleUnit === 'currency' ? revenue / 100 : sales}
                            format={saleUnit === 'currency' ? { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } : undefined}
                        />
                    </p>
                </div>
            </div>

            {/* Chart Area */}
            <div className="bg-gradient-to-b from-slate-50 to-white relative">
                {/* View Toggle - positioned in chart area */}
                <div className="absolute top-4 right-4 z-10">
                    <ViewToggle view={view} onChange={setView} />
                </div>

                {view === 'funnel' ? (
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full"
                        style={{ minHeight: '220px' }}
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            {/* Continuous gradient dark → light across all sections */}
                            {/* Clicks - Dark purple → medium purple */}
                            <linearGradient id="funnelClicksGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6d28d9" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                            {/* Leads - Medium purple → light purple (picks up where Clicks ends) */}
                            <linearGradient id="funnelLeadsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                            {/* Sales - Light purple → lightest (picks up where Leads ends) */}
                            <linearGradient id="funnelSalesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#a78bfa" />
                                <stop offset="100%" stopColor="#c4b5fd" />
                            </linearGradient>
                        </defs>

                        {/* Section divider lines */}
                        <line x1={sectionWidth} y1="0" x2={sectionWidth} y2={height} stroke="#e5e7eb" strokeWidth="1" />
                        <line x1={sectionWidth * 2} y1="0" x2={sectionWidth * 2} y2={height} stroke="#e5e7eb" strokeWidth="1" />

                        {/* Clicks glow layers with animation */}
                        <g key={`clicks-${clicks}-${leads}`} className="animate-funnel-clicks">
                            <path d={createFlowPath(0, clicksHeight + 30, sectionWidth, leadsHeight + 15, centerY)} fill="url(#funnelClicksGrad)" opacity="0.1" />
                            <path d={createFlowPath(0, clicksHeight + 15, sectionWidth, leadsHeight + 8, centerY)} fill="url(#funnelClicksGrad)" opacity="0.2" />
                            <path d={createFlowPath(0, clicksHeight, sectionWidth, leadsHeight, centerY)} fill="url(#funnelClicksGrad)" opacity="0.95" />
                        </g>

                        {/* Leads glow layers with animation */}
                        <g key={`leads-${leads}-${sales}`} className="animate-funnel-leads" style={{ animationDelay: '100ms' }}>
                            <path d={createFlowPath(sectionWidth, leadsHeight + 15, sectionWidth * 2, salesHeight + 12, centerY)} fill="url(#funnelLeadsGrad)" opacity="0.1" />
                            <path d={createFlowPath(sectionWidth, leadsHeight + 8, sectionWidth * 2, salesHeight + 6, centerY)} fill="url(#funnelLeadsGrad)" opacity="0.2" />
                            <path d={createFlowPath(sectionWidth, leadsHeight, sectionWidth * 2, salesHeight, centerY)} fill="url(#funnelLeadsGrad)" opacity="0.95" />
                        </g>

                        {/* Sales glow layers with animation */}
                        <g key={`sales-${sales}-${revenue}`} className="animate-funnel-sales" style={{ animationDelay: '200ms' }}>
                            <path d={createRectPath(sectionWidth * 2, salesHeight + 12, sectionWidth, centerY)} fill="url(#funnelSalesGrad)" opacity="0.1" />
                            <path d={createRectPath(sectionWidth * 2, salesHeight + 6, sectionWidth, centerY)} fill="url(#funnelSalesGrad)" opacity="0.2" />
                            <path d={createRectPath(sectionWidth * 2, salesHeight, sectionWidth, centerY)} fill="url(#funnelSalesGrad)" opacity="0.95" />
                        </g>

                        {/* Percentage badges with fade-in */}
                        <g className="animate-in fade-in duration-700" style={{ animationDelay: '400ms' }}>
                            <rect x={sectionWidth / 2 - 32} y={centerY - 13} width="64" height="26" rx="13" fill="white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }} />
                            <text x={sectionWidth / 2} y={centerY + 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">100%</text>

                            <rect x={sectionWidth * 1.5 - 32} y={centerY - 13} width="64" height="26" rx="13" fill="white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }} />
                            <text x={sectionWidth * 1.5} y={centerY + 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">
                                {leadsPercent === 0 ? '0%' : leadsPercent < 1 ? `${leadsPercent.toFixed(2)}%` : `${leadsPercent.toFixed(1)}%`}
                            </text>

                            <rect x={sectionWidth * 2.5 - 36} y={centerY - 13} width="72" height="26" rx="13" fill="white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }} />
                            <text x={sectionWidth * 2.5} y={centerY + 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">
                                {salesPercent === 0 ? '0%' : salesPercent < 1 ? `${salesPercent.toFixed(2)}%` : `${salesPercent.toFixed(2)}%`}
                            </text>
                        </g>
                    </svg>
                ) : (
                    /* Timeline Line Chart */
                    <div className="p-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatXAxis}
                                    stroke="#9ca3af"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={isHourlyData ? 3 : 'preserveStartEnd'}
                                />
                                <YAxis
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => saleUnit === 'currency' ? `${v / 100}€` : v}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey={saleUnit === 'currency' ? 'revenue' : 'sales'}
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fill="url(#colorSales)"
                                    dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: '#8b5cf6', strokeWidth: 0 }}
                                    isAnimationActive={true}
                                    animationDuration={1200}
                                    animationEasing="ease-out"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* CSS Animations for Funnel - Grow from thin line */}
            <style jsx>{`
                @keyframes funnelGrow {
                    from {
                        opacity: 0.3;
                        transform: scaleY(0.02);
                    }
                    to {
                        opacity: 1;
                        transform: scaleY(1);
                    }
                }
                .animate-funnel-clicks {
                    animation: funnelGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    transform-origin: center center;
                }
                .animate-funnel-leads {
                    animation: funnelGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    animation-delay: 100ms;
                    opacity: 0;
                    transform-origin: center center;
                }
                .animate-funnel-sales {
                    animation: funnelGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    animation-delay: 200ms;
                    opacity: 0;
                    transform-origin: center center;
                }
            `}</style>
        </div>
    )
}
