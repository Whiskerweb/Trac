'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    CreditCard,
    Clock,
    CheckCircle2,
    TrendingUp,
    Building2,
    Loader2,
    Zap,
    Wallet,
    ArrowRight
} from 'lucide-react'

interface Summary {
    totalCommissions: number
    totalPlatformFees: number
    pending: { count: number; amount: number }
    proceed: { count: number; amount: number }
    complete: { count: number; amount: number }
}

interface Commission {
    id: string
    sellerId: string
    sellerEmail: string
    sellerName: string | null
    payoutMethod: string
    startupName: string | null
    grossAmount: number
    netAmount: number
    commissionAmount: number
    platformFee: number
    status: string
    startupPaymentStatus: string
    createdAt: string
    maturedAt: string | null
    paidAt: string | null
}

interface StartupPayment {
    id: string
    workspaceName: string
    totalAmount: number
    sellerTotal: number
    platformTotal: number
    commissionCount: number
    status: string
    stripePaymentId: string | null
    createdAt: string
}

export default function AdminPayoutsPage() {
    const [summary, setSummary] = useState<Summary | null>(null)
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [startupPayments, setStartupPayments] = useState<StartupPayment[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'commissions' | 'startup-payments'>('commissions')
    const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'PROCEED' | 'COMPLETE'>('all')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const res = await fetch('/api/admin/payouts')
            const data = await res.json()
            if (data.success) {
                setSummary(data.summary)
                setCommissions(data.commissions)
                setStartupPayments(data.startupPayments)
            }
        } catch (error) {
            console.error('Failed to load payouts:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-500/20 text-amber-400'
            case 'PROCEED': return 'bg-blue-500/20 text-blue-400'
            case 'COMPLETE': return 'bg-emerald-500/20 text-emerald-400'
            case 'PAID': return 'bg-emerald-500/20 text-emerald-400'
            default: return 'bg-neutral-500/20 text-neutral-400'
        }
    }

    const filteredCommissions = commissions.filter(c =>
        statusFilter === 'all' || c.status === statusFilter
    )

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
                <h1 className="text-2xl font-light text-white mb-2">Payouts</h1>
                <p className="text-sm text-neutral-500">
                    Vue d'ensemble des commissions et paiements
                </p>
            </div>

            {/* Summary Stats */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-neutral-500">En attente</span>
                        </div>
                        <p className="text-2xl font-light text-white">{formatCurrency(summary.pending.amount)}</p>
                        <p className="text-xs text-neutral-500">{summary.pending.count} commissions</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-neutral-500">Disponible</span>
                        </div>
                        <p className="text-2xl font-light text-white">{formatCurrency(summary.proceed.amount)}</p>
                        <p className="text-xs text-neutral-500">{summary.proceed.count} commissions</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-neutral-500">Versé</span>
                        </div>
                        <p className="text-2xl font-light text-white">{formatCurrency(summary.complete.amount)}</p>
                        <p className="text-xs text-neutral-500">{summary.complete.count} commissions</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-4 h-4 text-violet-400" />
                            <span className="text-xs text-neutral-500">Fees plateforme</span>
                        </div>
                        <p className="text-2xl font-light text-violet-400">{formatCurrency(summary.totalPlatformFees)}</p>
                        <p className="text-xs text-neutral-500">15% des ventes</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-neutral-400" />
                            <span className="text-xs text-neutral-500">Total commissions</span>
                        </div>
                        <p className="text-2xl font-light text-white">{summary.totalCommissions}</p>
                        <p className="text-xs text-neutral-500">toutes confondues</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setTab('commissions')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        tab === 'commissions'
                            ? 'bg-violet-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                >
                    Commissions
                </button>
                <button
                    onClick={() => setTab('startup-payments')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        tab === 'startup-payments'
                            ? 'bg-violet-500 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                >
                    Paiements Startup
                </button>
            </div>

            {/* Commissions Tab */}
            {tab === 'commissions' && (
                <>
                    {/* Status Filter */}
                    <div className="flex gap-2 mb-4">
                        {(['all', 'PENDING', 'PROCEED', 'COMPLETE'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    statusFilter === s
                                        ? 'bg-neutral-700 text-white'
                                        : 'bg-neutral-800 text-neutral-500 hover:text-neutral-400'
                                }`}
                            >
                                {s === 'all' ? 'Tous' : s}
                            </button>
                        ))}
                    </div>

                    {/* Commissions List */}
                    <div className="space-y-2">
                        {filteredCommissions.length === 0 ? (
                            <p className="text-neutral-500 text-center py-8">Aucune commission</p>
                        ) : (
                            filteredCommissions.map((commission, index) => (
                                <motion.div
                                    key={commission.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Payout method indicator */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                commission.payoutMethod === 'STRIPE_CONNECT'
                                                    ? 'bg-emerald-500/20'
                                                    : 'bg-violet-500/20'
                                            }`}>
                                                {commission.payoutMethod === 'STRIPE_CONNECT' ? (
                                                    <Zap className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <Wallet className="w-4 h-4 text-violet-400" />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/sellers/${commission.sellerId}`}
                                                        className="text-white hover:text-violet-400 transition-colors"
                                                    >
                                                        {commission.sellerName || commission.sellerEmail}
                                                    </Link>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(commission.status)}`}>
                                                        {commission.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                    {commission.startupName && (
                                                        <>
                                                            <span>via {commission.startupName}</span>
                                                            <span>•</span>
                                                        </>
                                                    )}
                                                    <span>{formatDate(commission.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-medium text-emerald-400">
                                                +{formatCurrency(commission.commissionAmount)}
                                            </p>
                                            <p className="text-xs text-neutral-500">
                                                Fee: {formatCurrency(commission.platformFee)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Startup Payments Tab */}
            {tab === 'startup-payments' && (
                <div className="space-y-2">
                    {startupPayments.length === 0 ? (
                        <p className="text-neutral-500 text-center py-8">Aucun paiement startup</p>
                    ) : (
                        startupPayments.map((payment, index) => (
                            <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-neutral-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white">{payment.workspaceName}</span>
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500">
                                                {payment.commissionCount} commissions • {formatDate(payment.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-lg font-medium text-white">
                                            {formatCurrency(payment.totalAmount)}
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            Sellers: {formatCurrency(payment.sellerTotal)} • Platform: {formatCurrency(payment.platformTotal)}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
