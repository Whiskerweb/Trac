'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Search, Info, Download, Filter, ChevronRight, ArrowRight, CreditCard } from 'lucide-react'
import {
    getWorkspaceCommissions,
    type CommissionItem
} from '@/app/actions/commissions'

// =============================================
// FORMAT HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return `€${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

// =============================================
// STATUS BADGE
// =============================================

function StatusBadge({ status }: { status: CommissionItem['status'] }) {
    const styles = {
        PENDING: 'bg-orange-50 text-orange-700',
        PROCEED: 'bg-blue-50 text-blue-700',
        COMPLETE: 'bg-green-50 text-green-700',
    }
    const labels = {
        PENDING: 'En attente',
        PROCEED: 'À payer',
        COMPLETE: 'Payé',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

function TypeBadge({ type }: { type: 'SALE' | 'LEAD' | 'RECURRING' | null }) {
    if (!type) return null
    const styles: Record<string, string> = {
        SALE: 'bg-emerald-50 text-emerald-700',
        LEAD: 'bg-purple-50 text-purple-700',
        RECURRING: 'bg-blue-50 text-blue-700',
    }
    const labels: Record<string, string> = {
        SALE: 'Vente',
        LEAD: 'Lead',
        RECURRING: 'Récurrent',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-50 text-gray-700'}`}>
            {labels[type] || type}
        </span>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<CommissionItem[]>([])
    const [stats, setStats] = useState({ total: 0, pending: 0, proceed: 0, complete: 0, platformFees: 0 })
    const [pagination, setPagination] = useState({ total: 0, page: 1, perPage: 50, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'PROCEED' | 'COMPLETE'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const loadData = useCallback(async (page: number, silent: boolean = false) => {
        if (!silent) {
            setLoading(true)
        }

        const result = await getWorkspaceCommissions(
            page,
            50,
            statusFilter === 'all' ? undefined : statusFilter
        )

        if (result.success) {
            setCommissions(result.commissions || [])
            setStats(result.stats || { total: 0, pending: 0, proceed: 0, complete: 0, platformFees: 0 })
            setPagination(result.pagination || { total: 0, page: 1, perPage: 50, totalPages: 1 })
        }

        if (!silent) {
            setLoading(false)
        }
    }, [statusFilter])

    // Initial load and when filter changes
    useEffect(() => {
        loadData(currentPage)
    }, [currentPage, loadData])

    // Auto-refresh every 30 seconds (silent)
    useEffect(() => {
        const interval = setInterval(() => {
            loadData(currentPage, true)
        }, 30000)

        return () => clearInterval(interval)
    }, [currentPage, loadData])

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter])

    // Client-side search filtering
    const filteredCommissions = useMemo(() => {
        if (searchQuery === '') return commissions
        return commissions.filter(c =>
            c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.partnerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.missionName.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [commissions, searchQuery])

    const proceedCount = commissions.filter(c => c.status === 'PROCEED').length

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">Commissions</h1>
                    <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    {proceedCount > 0 && (
                        <Link
                            href="/dashboard/payouts"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                        >
                            <CreditCard className="w-4 h-4" />
                            Payer ({proceedCount})
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total commissions</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">En attente</p>
                    <p className="text-2xl font-semibold text-orange-600">{formatCurrency(stats.pending)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <Link
                    href="/dashboard/payouts"
                    className="flex-1 group cursor-pointer hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors"
                >
                    <p className="text-sm text-gray-500">À payer</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-semibold text-blue-600">{formatCurrency(stats.proceed)}</p>
                        <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Link>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Payés</p>
                    <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.complete)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Frais plateforme</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.platformFees)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par seller ou mission..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {(['all', 'PENDING', 'PROCEED', 'COMPLETE'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'all' && 'Tous'}
                            {status === 'PENDING' && 'En attente'}
                            {status === 'PROCEED' && 'À payer'}
                            {status === 'COMPLETE' && 'Payés'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Seller</div>
                    <div>Mission</div>
                    <div>Montant HT</div>
                    <div>Commission</div>
                    <div>Status</div>
                    <div className="text-right">Date</div>
                </div>

                {filteredCommissions.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-900 font-medium">Aucune commission</p>
                        <p className="text-gray-500 text-sm mt-1">Les commissions apparaîtront ici quand vos partners génèrent des ventes</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredCommissions.map((commission) => (
                            <div
                                key={commission.id}
                                className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                        {commission.partnerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{commission.partnerName}</p>
                                        <p className="text-xs text-gray-500">{commission.partnerEmail}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate">{commission.missionName}</span>
                                        <TypeBadge type={commission.rewardType} />
                                    </div>
                                </div>
                                <div className="text-sm text-gray-900">
                                    {commission.rewardType === 'LEAD' ? (
                                        <span className="text-gray-400">—</span>
                                    ) : (
                                        <>
                                            {formatCurrency(commission.grossAmount - commission.taxAmount)}
                                            <span className="block text-xs text-gray-400">HT</span>
                                        </>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-green-600">
                                        {formatCurrency(commission.commissionAmount)}
                                    </span>
                                    <span className="block text-xs text-gray-400">
                                        {commission.commissionRate}
                                    </span>
                                </div>
                                <div>
                                    <StatusBadge status={commission.status} />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm text-gray-500">{formatDate(commission.createdAt)}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Page {pagination.page} sur {pagination.totalPages} ({pagination.total} commissions)
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Précédent
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={currentPage === pagination.totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
