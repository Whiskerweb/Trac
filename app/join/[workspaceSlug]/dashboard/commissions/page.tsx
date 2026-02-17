'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPortalCommissions } from '@/app/actions/portal'
import { usePortalData } from '../layout'
import PortalCommissionTable from '@/components/portal/PortalCommissionTable'

type StatusFilter = 'ALL' | 'PENDING' | 'PROCEED' | 'COMPLETE'

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

export default function PortalCommissionsPage() {
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string
    const portalData = usePortalData()
    const t = useTranslations('portal.commissions')

    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<StatusFilter>('ALL')
    const [page, setPage] = useState(1)
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [statusTotals, setStatusTotals] = useState({ PENDING: 0, PROCEED: 0, COMPLETE: 0 })

    const primaryColor = portalData?.workspace.portal_primary_color || '#7C3AED'

    const loadCommissions = useCallback(async () => {
        setLoading(true)
        const result = await getPortalCommissions(workspaceSlug, page, filter)
        if (result.success && result.data) {
            setCommissions(result.data.commissions)
            setTotalPages(result.data.totalPages)
            setStatusTotals(result.data.statusTotals)
        }
        setLoading(false)
    }, [workspaceSlug, page, filter])

    useEffect(() => { loadCommissions() }, [loadCommissions])

    const filters: { key: StatusFilter; label: string }[] = [
        { key: 'ALL', label: t('all') },
        { key: 'PENDING', label: t('maturing') },
        { key: 'PROCEED', label: t('available') },
        { key: 'COMPLETE', label: t('paid') },
    ]

    return (
        <div className="space-y-5">
            {/* Mini stats */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-3"
            >
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{(statusTotals.PENDING / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('maturing')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
                    <p className="text-lg font-bold" style={{ color: primaryColor }}>{(statusTotals.PROCEED / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('available')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{(statusTotals.COMPLETE / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('paid')}</p>
                </div>
            </motion.div>

            {/* Filter pills */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex items-center gap-2"
            >
                {filters.map(f => {
                    const active = filter === f.key
                    return (
                        <button
                            key={f.key}
                            onClick={() => { setFilter(f.key); setPage(1) }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                                backgroundColor: active ? `${primaryColor}10` : 'transparent',
                                color: active ? primaryColor : '#6b7280',
                                border: active ? `1px solid ${primaryColor}25` : '1px solid transparent',
                            }}
                        >
                            {f.label}
                        </button>
                    )
                })}
            </motion.div>

            {/* Commission table */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
            >
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <PortalCommissionTable commissions={commissions} primaryColor={primaryColor} />
                )}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
