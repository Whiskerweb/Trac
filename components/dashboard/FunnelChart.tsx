'use client'

import { useState } from 'react'
import NumberFlow from '@number-flow/react'

/**
 * Funnel Chart - Flowing SVG Visualization
 * Features:
 * - Heights proportional to percentage relative to clicks
 * - Minimum 4px height for 0% values (thin line)
 * - Bezier S-curve transitions between sections
 * - Triple-layer glow effect (core + inner + outer)
 * - Symmetric pinch points
 * - €/123 toggle for sales display
 */

interface FunnelChartProps {
    clicks: number
    leads: number
    sales: number
    revenue: number
}

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
}

function formatCurrency(cents: number): string {
    const amount = cents / 100
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K €`
    return `${amount.toFixed(0)} €`
}

export function FunnelChart({ clicks, leads, sales, revenue }: FunnelChartProps) {
    // Toggle state for €/123 button
    const [saleUnit, setSaleUnit] = useState<'currency' | 'count'>('currency')
    // Calculate percentages relative to clicks
    const leadsPercent = clicks > 0 ? (leads / clicks) * 100 : 0
    const salesPercent = clicks > 0 ? (sales / clicks) * 100 : 0

    // SVG dimensions
    const width = 900
    const height = 280
    const sectionWidth = width / 3

    // Height calculations - proportional with minimum for visibility
    const maxHeight = 180
    const minHeight = 4 // Thin line for 0% values

    const clicksHeight = maxHeight // 100%
    const leadsHeight = Math.max((leadsPercent / 100) * maxHeight, minHeight)
    const salesHeight = Math.max((salesPercent / 100) * maxHeight, minHeight)

    const centerY = height / 2

    // Generate S-curve bezier path between two sections
    const createFlowPath = (
        x1: number, h1: number,
        x2: number, h2: number,
        cy: number
    ) => {
        const y1Top = cy - h1 / 2
        const y1Bottom = cy + h1 / 2
        const y2Top = cy - h2 / 2
        const y2Bottom = cy + h2 / 2

        // Control points for smooth S-curve
        const cp1x = x1 + (x2 - x1) * 0.5
        const cp2x = x1 + (x2 - x1) * 0.5

        return `
            M ${x1},${y1Top}
            C ${cp1x},${y1Top} ${cp2x},${y2Top} ${x2},${y2Top}
            L ${x2},${y2Bottom}
            C ${cp2x},${y2Bottom} ${cp1x},${y1Bottom} ${x1},${y1Bottom}
            Z
        `
    }

    // Create rectangle path for sales section
    const createRectPath = (
        x: number, h: number, w: number, cy: number
    ) => {
        const yTop = cy - h / 2
        const yBottom = cy + h / 2
        return `M ${x},${yTop} L ${x + w},${yTop} L ${x + w},${yBottom} L ${x},${yBottom} Z`
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header Stats - 3 columns */}
            <div className="grid grid-cols-3 divide-x divide-gray-200">
                {/* Clicks */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span className="text-sm text-gray-500 font-medium">Clicks</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow value={clicks} />
                    </p>
                </div>

                {/* Leads - with chevron */}
                <div className="p-6 relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-purple-500" />
                        <span className="text-sm text-gray-500 font-medium">Leads</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow value={leads} />
                    </p>
                </div>

                {/* Sales - with toggle and underline */}
                <div className="p-6 relative border-b-2 border-gray-900">
                    <div className="absolute right-4 top-4 flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setSaleUnit('currency')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${saleUnit === 'currency'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            €
                        </button>
                        <button
                            onClick={() => setSaleUnit('count')}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${saleUnit === 'count'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            123
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded bg-teal-500" />
                        <span className="text-sm text-gray-500 font-medium">Sales</span>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 tracking-tight">
                        <NumberFlow
                            value={saleUnit === 'currency' ? revenue / 100 : sales}
                            format={saleUnit === 'currency' ? {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0
                            } : undefined}
                        />
                    </p>
                </div>
            </div>

            {/* Funnel SVG Visualization */}
            <div className="bg-gradient-to-b from-slate-50 to-white relative">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full"
                    style={{ minHeight: '220px' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {/* Gradients */}
                        <linearGradient id="funnelClicksGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#60a5fa" />
                        </linearGradient>
                        <linearGradient id="funnelLeadsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                        <linearGradient id="funnelSalesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#2dd4bf" />
                        </linearGradient>
                    </defs>

                    {/* Section divider lines */}
                    <line x1={sectionWidth} y1="0" x2={sectionWidth} y2={height} stroke="#e5e7eb" strokeWidth="1" />
                    <line x1={sectionWidth * 2} y1="0" x2={sectionWidth * 2} y2={height} stroke="#e5e7eb" strokeWidth="1" />

                    {/* === CLICKS → LEADS FLOW === */}
                    {/* Outer glow */}
                    <path
                        d={createFlowPath(0, clicksHeight + 30, sectionWidth, leadsHeight + 15, centerY)}
                        fill="url(#funnelClicksGrad)"
                        opacity="0.1"
                    />
                    {/* Inner glow */}
                    <path
                        d={createFlowPath(0, clicksHeight + 15, sectionWidth, leadsHeight + 8, centerY)}
                        fill="url(#funnelClicksGrad)"
                        opacity="0.2"
                    />
                    {/* Core */}
                    <path
                        d={createFlowPath(0, clicksHeight, sectionWidth, leadsHeight, centerY)}
                        fill="url(#funnelClicksGrad)"
                        opacity="0.95"
                    />

                    {/* === LEADS → SALES FLOW === */}
                    {/* Outer glow */}
                    <path
                        d={createFlowPath(sectionWidth, leadsHeight + 15, sectionWidth * 2, salesHeight + 12, centerY)}
                        fill="url(#funnelLeadsGrad)"
                        opacity="0.1"
                    />
                    {/* Inner glow */}
                    <path
                        d={createFlowPath(sectionWidth, leadsHeight + 8, sectionWidth * 2, salesHeight + 6, centerY)}
                        fill="url(#funnelLeadsGrad)"
                        opacity="0.2"
                    />
                    {/* Core */}
                    <path
                        d={createFlowPath(sectionWidth, leadsHeight, sectionWidth * 2, salesHeight, centerY)}
                        fill="url(#funnelLeadsGrad)"
                        opacity="0.95"
                    />

                    {/* === SALES RECTANGLE === */}
                    {/* Outer glow */}
                    <path
                        d={createRectPath(sectionWidth * 2, salesHeight + 12, sectionWidth, centerY)}
                        fill="url(#funnelSalesGrad)"
                        opacity="0.1"
                    />
                    {/* Inner glow */}
                    <path
                        d={createRectPath(sectionWidth * 2, salesHeight + 6, sectionWidth, centerY)}
                        fill="url(#funnelSalesGrad)"
                        opacity="0.2"
                    />
                    {/* Core */}
                    <path
                        d={createRectPath(sectionWidth * 2, salesHeight, sectionWidth, centerY)}
                        fill="url(#funnelSalesGrad)"
                        opacity="0.95"
                    />

                    {/* === PERCENTAGE BADGES === */}
                    <g>
                        {/* 100% - Clicks */}
                        <rect
                            x={sectionWidth / 2 - 32}
                            y={centerY - 13}
                            width="64"
                            height="26"
                            rx="13"
                            fill="white"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                        />
                        <text
                            x={sectionWidth / 2}
                            y={centerY + 5}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="600"
                            fill="#374151"
                        >
                            100%
                        </text>

                        {/* Leads % */}
                        <rect
                            x={sectionWidth * 1.5 - 32}
                            y={centerY - 13}
                            width="64"
                            height="26"
                            rx="13"
                            fill="white"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                        />
                        <text
                            x={sectionWidth * 1.5}
                            y={centerY + 5}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="600"
                            fill="#374151"
                        >
                            {leadsPercent === 0 ? '0%' : leadsPercent < 1 ? `${leadsPercent.toFixed(2)}%` : `${leadsPercent.toFixed(1)}%`}
                        </text>

                        {/* Sales % */}
                        <rect
                            x={sectionWidth * 2.5 - 36}
                            y={centerY - 13}
                            width="72"
                            height="26"
                            rx="13"
                            fill="white"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}
                        />
                        <text
                            x={sectionWidth * 2.5}
                            y={centerY + 5}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="600"
                            fill="#374151"
                        >
                            {salesPercent === 0 ? '0%' : salesPercent < 1 ? `${salesPercent.toFixed(2)}%` : `${salesPercent.toFixed(2)}%`}
                        </text>
                    </g>
                </svg>
            </div>
        </div>
    )
}
