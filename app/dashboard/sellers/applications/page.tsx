'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, ChevronRight, Users, Info } from 'lucide-react'
import { getMySellers, type MySeller } from '@/app/actions/sellers'

function Avatar({ initials, imageUrl }: { initials: string; imageUrl?: string }) {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={initials}
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
            />
        )
    }
    return (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {initials}
        </div>
    )
}

function StatusBadge({ status }: { status: MySeller['status'] }) {
    const styles = {
        active: 'bg-green-50 text-green-700',
        pending: 'bg-orange-50 text-orange-700',
        inactive: 'bg-gray-100 text-gray-500'
    }
    const labels = {
        active: 'Actif',
        pending: 'En attente',
        inactive: 'Inactif'
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

function formatCurrency(cents: number): string {
    return `€${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

export default function ApplicationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sellers, setSellers] = useState<MySeller[]>([])
    const [stats, setStats] = useState({ total: 0, active: 0, totalClicks: 0, totalCommissions: 0 })
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

    const loadData = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true)
        }

        try {
            const result = await getMySellers()
            if (result.success) {
                setSellers(result.sellers || [])
                setStats(result.stats || { total: 0, active: 0, totalClicks: 0, totalCommissions: 0 })
            }
        } catch (error) {
            console.error('Error loading sellers:', error)
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }, [])

    // Initial load
    useEffect(() => {
        loadData()
    }, [loadData])

    // Auto-refresh every 30 seconds (silent)
    useEffect(() => {
        const interval = setInterval(() => {
            loadData(true)
        }, 30000)

        return () => clearInterval(interval)
    }, [loadData])

    const filteredSellers = useMemo(() => {
        return sellers.filter(s => {
            const matchesSearch = searchQuery === '' ||
                s.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || s.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [sellers, searchQuery, statusFilter])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">Sellers</h1>
                    <Info className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total sellers</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Actifs</p>
                    <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total clics</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalClicks)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Commissions paid</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalCommissions)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un seller..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {(['all', 'active', 'pending', 'inactive'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'all' && 'Tous'}
                            {status === 'active' && 'Actifs'}
                            {status === 'pending' && 'En attente'}
                            {status === 'inactive' && 'Inactifs'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Seller</div>
                    <div>Status</div>
                    <div>Missions</div>
                    <div>Clics</div>
                    <div className="text-right">Commissions</div>
                    <div></div>
                </div>

                {filteredSellers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-900 font-medium">No seller found</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Sellers will appear here when they join your missions
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredSellers.map((seller) => (
                            <div
                                key={seller.id}
                                onClick={() => router.push(`/dashboard/sellers/applications/${seller.id}`)}
                                className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="col-span-2 flex items-center gap-3">
                                    <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{seller.name}</p>
                                        <p className="text-xs text-gray-500">{seller.activityType}</p>
                                    </div>
                                </div>
                                <div>
                                    <StatusBadge status={seller.status} />
                                </div>
                                <div className="text-sm text-gray-600">
                                    {seller.missionsCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {formatNumber(seller.totalClicks)}
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium text-green-600">
                                        {formatCurrency(seller.commissionEarned)}
                                    </span>
                                    {seller.totalSales > 0 && (
                                        <span className="block text-xs text-gray-400">
                                            {seller.totalSales} vente{seller.totalSales > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
