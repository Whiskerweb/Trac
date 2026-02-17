'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalCommissions } from '@/app/actions/portal'
import PortalCommissionTable from '@/components/portal/PortalCommissionTable'

interface Commission {
    id: string
    amount: number
    status: string
    source: string
    createdAt: string
    maturedAt: string | null
    holdDays: number
    recurringMonth: number | null
    rate: string | null
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'PROCEED', 'COMPLETE'] as const

export default function PortalCommissionsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.commissions')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [commissions, setCommissions] = useState<Commission[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [statusTotals, setStatusTotals] = useState({ PENDING: 0, PROCEED: 0, COMPLETE: 0 })
    const [loading, setLoading] = useState(true)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const loadCommissions = useCallback(async (p: number, filter: string) => {
        setLoading(true)
        const result = await getPortalCommissions(workspaceSlug, p, filter === 'ALL' ? undefined : filter)
        if (result.success && result.data) {
            setCommissions(result.data.commissions as Commission[])
            setPage(result.data.page)
            setTotalPages(result.data.totalPages)
            setStatusTotals(result.data.statusTotals)
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadCommissions(1, statusFilter) }, [loadCommissions, statusFilter])

    const handleFilterChange = (filter: string) => {
        setStatusFilter(filter)
        setPage(1)
    }

    const filterLabels: Record<string, string> = {
        ALL: t('all'),
        PENDING: t('maturing'),
        PROCEED: t('available'),
        COMPLETE: t('paid'),
    }

    const totalAll = statusTotals.PENDING + statusTotals.PROCEED + statusTotals.COMPLETE

    return (
        <div className="space-y-5">
            {/* Status totals */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
            >
                {[
                    { label: t('maturing'), amount: statusTotals.PENDING, color: '#f59e0b' },
                    { label: t('available'), amount: statusTotals.PROCEED, color: primaryColor },
                    { label: t('paid'), amount: statusTotals.COMPLETE, color: '#10b981' },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ backgroundColor: s.color }} />
                        <p className="text-xl font-bold text-gray-900">{(s.amount / 100).toFixed(0)}&euro;</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Filter chips */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex gap-2"
            >
                {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f
                    return (
                        <button
                            key={f}
                            onClick={() => handleFilterChange(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                                active
                                    ? 'text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                            style={active ? { backgroundColor: primaryColor } : undefined}
                        >
                            {filterLabels[f]}
                        </button>
                    )
                })}
            </motion.div>

            {/* Commission table */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    </div>
                ) : commissions.length === 0 ? (
                    <div className="text-center py-12">
                        <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">{t('empty')}</p>
                    </div>
                ) : (
                    <PortalCommissionTable commissions={commissions} primaryColor={primaryColor} />
                )}

                {/* Pagination */}
                {totalPages > 1 && !loading && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        <button
                            onClick={() => loadCommissions(page - 1, statusFilter)}
                            disabled={page <= 1}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                        <button
                            onClick={() => loadCommissions(page + 1, statusFilter)}
                            disabled={page >= totalPages}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
