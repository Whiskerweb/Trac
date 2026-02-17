'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { MousePointerClick, ShoppingCart, UserPlus, TrendingUp, DollarSign } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalReports } from '@/app/actions/portal'

type Period = '7d' | '30d' | '90d' | 'all'

interface ReportData {
    totalClicks: number
    totalSales: number
    totalLeads: number
    totalRevenue: number
    totalCommission: number
    timeseries: { date: string; sales: number; commission: number }[]
}

export default function PortalReportsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.reports')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [period, setPeriod] = useState<Period>('30d')
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const loadReports = useCallback(async (p: Period) => {
        setLoading(true)
        const result = await getPortalReports(workspaceSlug, p)
        if (result.success && result.data) {
            setReportData(result.data)
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadReports(period) }, [loadReports, period])

    const periods: { key: Period; label: string }[] = [
        { key: '7d', label: t('period7d') },
        { key: '30d', label: t('period30d') },
        { key: '90d', label: t('period90d') },
        { key: 'all', label: t('periodAll') },
    ]

    return (
        <div className="space-y-5">
            {/* Period selector */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <h1 className="text-lg font-semibold text-gray-900">{t('title')}</h1>
                <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
                    {periods.map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setPeriod(p.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                period === p.key
                                    ? 'text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            style={period === p.key ? { backgroundColor: primaryColor } : undefined}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                </div>
            ) : reportData ? (
                <>
                    {/* KPI cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-3"
                    >
                        {[
                            { label: t('clicks'), value: reportData.totalClicks.toLocaleString(), icon: MousePointerClick, color: '#6366f1' },
                            { label: t('sales'), value: reportData.totalSales.toLocaleString(), icon: ShoppingCart, color: '#10b981' },
                            { label: t('leads'), value: reportData.totalLeads.toLocaleString(), icon: UserPlus, color: '#f59e0b' },
                            { label: t('revenue'), value: `${(reportData.totalRevenue / 100).toFixed(0)}€`, icon: TrendingUp, color: '#3b82f6' },
                            { label: t('commission'), value: `${(reportData.totalCommission / 100).toFixed(0)}€`, icon: DollarSign, color: primaryColor },
                        ].map((kpi) => (
                            <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                                    <span className="text-[11px] text-gray-500">{kpi.label}</span>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Simple bar chart */}
                    {reportData.timeseries.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="bg-white rounded-2xl border border-gray-100 p-5"
                        >
                            <p className="text-sm font-semibold text-gray-900 mb-4">{t('commission')}</p>
                            <div className="flex items-end gap-[2px] h-32">
                                {(() => {
                                    const maxVal = Math.max(...reportData.timeseries.map(d => d.commission), 1)
                                    return reportData.timeseries.map((d, i) => {
                                        const height = Math.max((d.commission / maxVal) * 100, d.commission > 0 ? 4 : 0)
                                        return (
                                            <div
                                                key={d.date}
                                                className="flex-1 rounded-t-sm transition-all hover:opacity-80 group relative"
                                                style={{
                                                    height: `${height}%`,
                                                    backgroundColor: d.commission > 0 ? primaryColor : '#f3f4f6',
                                                    minHeight: '2px',
                                                }}
                                                title={`${d.date}: ${(d.commission / 100).toFixed(2)}€ (${d.sales} sales)`}
                                            />
                                        )
                                    })
                                })()}
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-[10px] text-gray-400">{reportData.timeseries[0]?.date}</span>
                                <span className="text-[10px] text-gray-400">{reportData.timeseries[reportData.timeseries.length - 1]?.date}</span>
                            </div>
                        </motion.div>
                    )}
                </>
            ) : null}
        </div>
    )
}
