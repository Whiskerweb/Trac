'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Users,
    Wallet,
    CreditCard,
    Search,
    ChevronRight,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Zap
} from 'lucide-react'

interface Seller {
    id: string
    email: string
    name: string | null
    status: string
    payoutMethod: string
    hasStripeConnect: boolean
    payoutsEnabled: boolean
    createdAt: string
    balance: number
    pending: number
    due: number
    paidTotal: number
    totalEarned: number
    totalCommissions: number
    giftCardCount: number
    profileScore: number
}

interface Summary {
    totalSellers: number
    platformSellers: number
    stripeConnectSellers: number
    totalBalance: number
    totalPending: number
    totalPaid: number
}

export default function AdminSellersPage() {
    const [sellers, setSellers] = useState<Seller[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'PLATFORM' | 'STRIPE_CONNECT'>('all')

    useEffect(() => {
        loadSellers()
    }, [])

    async function loadSellers() {
        try {
            const res = await fetch('/api/admin/sellers')
            const data = await res.json()
            if (data.success) {
                setSellers(data.sellers)
                setSummary(data.summary)
            }
        } catch (error) {
            console.error('Failed to load sellers:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredSellers = sellers.filter(s => {
        const matchesSearch = search === '' ||
            s.email.toLowerCase().includes(search.toLowerCase()) ||
            s.name?.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || s.payoutMethod === filter
        return matchesSearch && matchesFilter
    })

    const formatCurrency = (cents: number) => {
        return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€'
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-light text-white mb-2">Sellers</h1>
                <p className="text-sm text-neutral-500">
                    Vue d'ensemble de tous les sellers de la plateforme
                </p>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Total Sellers"
                        value={summary.totalSellers}
                        icon={Users}
                    />
                    <StatCard
                        label="Platform Wallet"
                        value={summary.platformSellers}
                        subValue={`${formatCurrency(summary.totalBalance)} en solde`}
                        icon={Wallet}
                        color="violet"
                    />
                    <StatCard
                        label="Stripe Connect"
                        value={summary.stripeConnectSellers}
                        icon={Zap}
                        color="emerald"
                    />
                    <StatCard
                        label="Total Paid"
                        value={formatCurrency(summary.totalPaid)}
                        icon={CreditCard}
                        color="blue"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Rechercher par email ou nom..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'PLATFORM', 'STRIPE_CONNECT'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2.5 text-sm rounded-lg transition-colors ${
                                filter === f
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                            }`}
                        >
                            {f === 'all' ? 'Tous' : f === 'PLATFORM' ? 'Wallet' : 'Stripe'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sellers List */}
            <div className="space-y-2">
                {filteredSellers.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                        <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p>No seller found</p>
                    </div>
                ) : (
                    filteredSellers.map((seller, index) => (
                        <motion.div
                            key={seller.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                        >
                            <Link
                                href={`/admin/sellers/${seller.id}`}
                                className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-neutral-400">
                                            {(seller.name || seller.email).charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-white">
                                                {seller.name || seller.email}
                                            </span>
                                            {seller.payoutMethod === 'STRIPE_CONNECT' ? (
                                                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    Stripe
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full">
                                                    Wallet
                                                </span>
                                            )}
                                            {seller.status === 'PENDING' && (
                                                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-500">{seller.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Stats */}
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm text-white">
                                            {seller.totalCommissions} commissions
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            {formatCurrency(seller.totalEarned)} earned
                                        </p>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-right">
                                        <p className="text-lg font-medium text-white">
                                            {formatCurrency(seller.balance)}
                                        </p>
                                        <p className="text-xs text-neutral-500">solde</p>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                                </div>
                            </Link>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}

function StatCard({
    label,
    value,
    subValue,
    icon: Icon,
    color = 'neutral'
}: {
    label: string
    value: string | number
    subValue?: string
    icon: React.ComponentType<{ className?: string }>
    color?: 'neutral' | 'violet' | 'emerald' | 'blue'
}) {
    const colors = {
        neutral: 'bg-neutral-800 text-neutral-400',
        violet: 'bg-violet-500/20 text-violet-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-neutral-500">{label}</span>
            </div>
            <p className="text-2xl font-light text-white">{value}</p>
            {subValue && <p className="text-xs text-neutral-500 mt-1">{subValue}</p>}
        </div>
    )
}
