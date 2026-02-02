'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    CheckCircle2,
    AlertTriangle,
    Download,
    Loader2,
    Users,
    Gift,
    TrendingUp,
    Clock,
    RefreshCw,
    ChevronRight
} from 'lucide-react'

interface TreasuryData {
    treasury: {
        totalOwedToSellers: number
        totalPending: number
        totalDue: number
        totalPaidOut: number
        totalReceivedFromStartups: number
        totalReceivedForPlatformSellers: number
        totalPlatformFees: number
        totalGiftCardsPaid: number
        totalStripeConnectTransfers: number
        netPosition: number
        isReconciled: boolean
        discrepancy: number
        ledger: {
            totalCredits: number
            totalDebits: number
            netBalance: number
        }
    }
    sellers: Array<{
        id: string
        name: string | null
        email: string
        balance: number
        pending: number
        due: number
        paidTotal: number
        createdAt: string
    }>
    recentLedgerEntries: Array<{
        id: string
        sellerId: string
        type: 'CREDIT' | 'DEBIT'
        amount: number
        referenceType: string | null
        description: string | null
        balanceAfter: number | null
        createdAt: string
    }>
    startupPaymentsCount: number
    platformSellersCount: number
}

export default function AdminTreasuryPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<TreasuryData | null>(null)
    const [exporting, setExporting] = useState(false)

    useEffect(() => {
        loadTreasury()
    }, [])

    async function loadTreasury() {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/treasury')
            const result = await response.json()
            if (result.success) {
                setData(result)
            }
        } catch (err) {
            console.error('Failed to load treasury:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleExport() {
        setExporting(true)
        try {
            const response = await fetch('/api/admin/treasury/export')
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `traaaction-treasury-${new Date().toISOString().split('T')[0]}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setExporting(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cents / 100)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <p className="text-neutral-400">Failed to load</p>
            </div>
        )
    }

    const { treasury, sellers, recentLedgerEntries } = data

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold">Tresorerie</h1>
                        <p className="text-neutral-400 mt-1">
                            Reconciliation des fonds sellers PLATFORM
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadTreasury}
                            className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>Exporter CSV</span>
                        </button>
                    </div>
                </div>

                {/* Reconciliation Status */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl mb-8 flex items-center gap-4 ${
                        treasury.isReconciled
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-amber-500/10 border border-amber-500/20'
                    }`}
                >
                    {treasury.isReconciled ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                            <div>
                                <p className="font-medium text-green-400">Comptes reconcilies</p>
                                <p className="text-sm text-green-400/70">
                                    Les fonds correspondent aux soldes sellers
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            <div>
                                <p className="font-medium text-amber-400">Ecart detecte</p>
                                <p className="text-sm text-amber-400/70">
                                    Difference: {formatCurrency(treasury.discrepancy)} EUR
                                </p>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {/* Total Owed */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-sm text-neutral-400">Du aux sellers</span>
                        </div>
                        <p className="text-3xl font-semibold">{formatCurrency(treasury.totalOwedToSellers)}</p>
                        <p className="text-sm text-neutral-500 mt-1">EUR disponible</p>
                    </motion.div>

                    {/* Pending */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="text-sm text-neutral-400">En attente</span>
                        </div>
                        <p className="text-3xl font-semibold">{formatCurrency(treasury.totalPending)}</p>
                        <p className="text-sm text-neutral-500 mt-1">EUR en hold (30j)</p>
                    </motion.div>

                    {/* Gift Cards Paid */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <Gift className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-sm text-neutral-400">Gift cards payes</span>
                        </div>
                        <p className="text-3xl font-semibold">{formatCurrency(treasury.totalGiftCardsPaid)}</p>
                        <p className="text-sm text-neutral-500 mt-1">EUR sortis</p>
                    </motion.div>

                    {/* Platform Fees */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-sm text-neutral-400">Frais plateforme</span>
                        </div>
                        <p className="text-3xl font-semibold">{formatCurrency(treasury.totalPlatformFees)}</p>
                        <p className="text-sm text-neutral-500 mt-1">EUR (15%)</p>
                    </motion.div>
                </div>

                {/* Flow Summary */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Inflows */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowDownLeft className="w-5 h-5 text-green-400" />
                            <h3 className="font-medium">Entrees</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                                <span className="text-neutral-400">Recu des startups (total)</span>
                                <span className="font-medium">{formatCurrency(treasury.totalReceivedFromStartups)} EUR</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                                <span className="text-neutral-400">Part sellers PLATFORM</span>
                                <span className="font-medium">{formatCurrency(treasury.totalReceivedForPlatformSellers)} EUR</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-neutral-400">Ledger credits</span>
                                <span className="font-medium text-green-400">+{formatCurrency(treasury.ledger.totalCredits)} EUR</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Outflows */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                            <h3 className="font-medium">Sorties</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                                <span className="text-neutral-400">Gift cards livres</span>
                                <span className="font-medium">{formatCurrency(treasury.totalGiftCardsPaid)} EUR</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                                <span className="text-neutral-400">Stripe Connect transfers</span>
                                <span className="font-medium">{formatCurrency(treasury.totalStripeConnectTransfers)} EUR</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-neutral-400">Ledger debits</span>
                                <span className="font-medium text-red-400">-{formatCurrency(treasury.ledger.totalDebits)} EUR</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Two columns: Sellers + Recent Ledger */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Sellers with balances */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-violet-400" />
                                <h3 className="font-medium">Sellers PLATFORM</h3>
                            </div>
                            <span className="text-sm text-neutral-400">{data.platformSellersCount} sellers</span>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {sellers.filter(s => s.balance > 0 || s.pending > 0).map((seller) => (
                                <Link
                                    key={seller.id}
                                    href={`/admin/sellers/${seller.id}`}
                                    className="flex items-center justify-between p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors group"
                                >
                                    <div>
                                        <p className="font-medium">{seller.name || 'N/A'}</p>
                                        <p className="text-sm text-neutral-400">{seller.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-medium">{formatCurrency(seller.balance)} EUR</p>
                                            {seller.pending > 0 && (
                                                <p className="text-xs text-amber-400">+{formatCurrency(seller.pending)} pending</p>
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                                    </div>
                                </Link>
                            ))}

                            {sellers.filter(s => s.balance > 0 || s.pending > 0).length === 0 && (
                                <p className="text-center text-neutral-500 py-8">
                                    Aucun seller avec solde
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* Recent Ledger Entries */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="bg-neutral-900 rounded-xl p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <ArrowDownLeft className="w-5 h-5 text-blue-400" />
                            <h3 className="font-medium">Mouvements recents</h3>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {recentLedgerEntries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            entry.type === 'CREDIT' ? 'bg-green-400' : 'bg-red-400'
                                        }`} />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {entry.referenceType === 'COMMISSION' && 'Commission'}
                                                {entry.referenceType === 'GIFT_CARD_REDEMPTION' && 'Gift Card'}
                                                {entry.referenceType === 'ADJUSTMENT' && 'Ajustement'}
                                                {entry.referenceType === 'REFUND' && 'Remboursement'}
                                                {!entry.referenceType && entry.type}
                                            </p>
                                            <p className="text-xs text-neutral-400">
                                                {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-medium ${
                                            entry.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)} EUR
                                        </p>
                                        {entry.balanceAfter !== null && (
                                            <p className="text-xs text-neutral-500">
                                                Solde: {formatCurrency(entry.balanceAfter)} EUR
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {recentLedgerEntries.length === 0 && (
                                <p className="text-center text-neutral-500 py-8">
                                    Aucun mouvement
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Footer info */}
                <div className="mt-8 p-4 bg-neutral-900/50 rounded-xl">
                    <p className="text-sm text-neutral-500 text-center">
                        Les fonds des sellers PLATFORM sont conserves sur le compte Stripe principal de Traaaction.
                        Utilisez le rapport CSV pour votre comptable.
                    </p>
                </div>
            </div>
        </div>
    )
}
