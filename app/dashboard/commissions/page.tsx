'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Search, Info, Download, Filter, ChevronRight, ArrowRight, CreditCard } from 'lucide-react'
import {
    getWorkspaceCommissionStats,
    type CommissionStats
} from '@/app/actions/commissions'

// =============================================
// TYPES
// =============================================

interface Commission {
    id: string
    partnerName: string
    partnerEmail: string
    missionName: string
    grossAmount: number
    netAmount: number
    commissionAmount: number
    platformFee: number
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    createdAt: Date
    maturedAt?: Date
    paidAt?: Date
}

// =============================================
// FORMAT HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return `€${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
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

function StatusBadge({ status }: { status: Commission['status'] }) {
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

// =============================================
// MOCK DATA
// =============================================

const MOCK_COMMISSIONS: Commission[] = [
    {
        id: 'c1',
        partnerName: 'Sophie Anderson',
        partnerEmail: 'sophie@creator.io',
        missionName: 'Summer Campaign',
        grossAmount: 9900,
        netAmount: 8910,
        commissionAmount: 2000,
        platformFee: 300,
        status: 'COMPLETE',
        createdAt: new Date('2025-01-18'),
        maturedAt: new Date('2025-01-25'),
        paidAt: new Date('2025-01-26')
    },
    {
        id: 'c2',
        partnerName: 'Luca Romano',
        partnerEmail: 'luca@influencer.com',
        missionName: 'Black Friday',
        grossAmount: 19900,
        netAmount: 17910,
        commissionAmount: 3980,
        platformFee: 597,
        status: 'PROCEED',
        createdAt: new Date('2025-01-15'),
        maturedAt: new Date('2025-01-22'),
    },
    {
        id: 'c3',
        partnerName: 'Emma Stevenson',
        partnerEmail: 'emma@content.co',
        missionName: 'New Year Promo',
        grossAmount: 4900,
        netAmount: 4410,
        commissionAmount: 980,
        platformFee: 147,
        status: 'PENDING',
        createdAt: new Date('2025-01-19'),
    },
    {
        id: 'c4',
        partnerName: 'Sophie Anderson',
        partnerEmail: 'sophie@creator.io',
        missionName: 'Summer Campaign',
        grossAmount: 14900,
        netAmount: 13410,
        commissionAmount: 2980,
        platformFee: 447,
        status: 'COMPLETE',
        createdAt: new Date('2025-01-10'),
        maturedAt: new Date('2025-01-17'),
        paidAt: new Date('2025-01-18')
    },
    {
        id: 'c5',
        partnerName: 'Mia Thompson',
        partnerEmail: 'mia@social.media',
        missionName: 'Referral Program',
        grossAmount: 2900,
        netAmount: 2610,
        commissionAmount: 580,
        platformFee: 87,
        status: 'PENDING',
        createdAt: new Date('2025-01-20'),
    },
]

// =============================================
// MAIN PAGE
// =============================================

export default function CommissionsPage() {
    const [stats, setStats] = useState<CommissionStats | null>(null)
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'PROCEED' | 'COMPLETE'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [statsResult] = await Promise.all([
            getWorkspaceCommissionStats(),
        ])

        if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats)
        }

        // Use mock data for now - replace with real data fetch
        setCommissions(MOCK_COMMISSIONS)
        setLoading(false)
    }

    const filteredCommissions = useMemo(() => {
        return commissions.filter(c => {
            const matchesSearch = searchQuery === '' ||
                c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.partnerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.missionName.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [commissions, searchQuery, statusFilter])

    const computedStats = useMemo(() => ({
        total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        pending: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.commissionAmount, 0),
        proceed: commissions.filter(c => c.status === 'PROCEED').reduce((sum, c) => sum + c.commissionAmount, 0),
        complete: commissions.filter(c => c.status === 'COMPLETE').reduce((sum, c) => sum + c.commissionAmount, 0),
        platformFees: commissions.reduce((sum, c) => sum + c.platformFee, 0),
    }), [commissions])

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
                    {commissions.filter(c => c.status === 'PROCEED').length > 0 && (
                        <Link
                            href="/dashboard/payouts"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                        >
                            <CreditCard className="w-4 h-4" />
                            Payer ({commissions.filter(c => c.status === 'PROCEED').length})
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total commissions</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(computedStats.total)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">En attente</p>
                    <p className="text-2xl font-semibold text-orange-600">{formatCurrency(computedStats.pending)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <Link
                    href="/dashboard/payouts"
                    className="flex-1 group cursor-pointer hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors"
                >
                    <p className="text-sm text-gray-500">À payer</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-semibold text-blue-600">{formatCurrency(computedStats.proceed)}</p>
                        <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </Link>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Payés</p>
                    <p className="text-2xl font-semibold text-green-600">{formatCurrency(computedStats.complete)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Frais plateforme</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(computedStats.platformFees)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par partner ou mission..."
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
                    <div className="col-span-2">Partner</div>
                    <div>Mission</div>
                    <div>Vente</div>
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
                                        {commission.partnerName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{commission.partnerName}</p>
                                        <p className="text-xs text-gray-500">{commission.partnerEmail}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                    {commission.missionName}
                                </div>
                                <div className="text-sm text-gray-900">
                                    {formatCurrency(commission.grossAmount)}
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                    {formatCurrency(commission.commissionAmount)}
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
            </div>
        </div>
    )
}
