'use client'

import { useState, useEffect } from 'react'
import { Loader2, Zap, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    created_at: string
    matured_at: string | null
    hold_days?: number
}

interface WalletData {
    balance: number
    pending: number
    due: number
    paid_total: number
    canWithdraw: boolean
    method: string | null
    commissions: Commission[]
}

export default function PayoutsPage() {
    const [loading, setLoading] = useState(true)
    const [wallet, setWallet] = useState<WalletData>({
        balance: 0,
        pending: 0,
        due: 0,
        paid_total: 0,
        canWithdraw: false,
        method: null,
        commissions: []
    })

    useEffect(() => {
        loadWallet()
    }, [])

    async function loadWallet() {
        try {
            setLoading(true)
            const response = await fetch('/api/seller/wallet')
            const data = await response.json()
            if (data.success && data.wallet) {
                setWallet(data.wallet)
            }
        } catch (error) {
            console.error('Failed to load wallet:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(cents / 100)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        })
    }

    const getDaysUntilAvailable = (commission: Commission) => {
        if (commission.status !== 'PENDING') return null
        const holdDays = commission.hold_days || 30
        const createdAt = new Date(commission.created_at)
        const maturesAt = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        return Math.max(0, Math.ceil((maturesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    }

    const getStatusInfo = (status: Commission['status']) => {
        const info = {
            PENDING: { label: 'En maturation', color: 'bg-amber-400' },
            PROCEED: { label: 'Disponible', color: 'bg-emerald-500' },
            COMPLETE: { label: 'Verse', color: 'bg-neutral-300' }
        }
        return info[status]
    }

    const isStripeMode = wallet.method === 'STRIPE_CONNECT'
    const totalEarned = wallet.pending + wallet.due + wallet.paid_total

    // Group commissions by status for better visualization
    const pendingCount = wallet.commissions.filter(c => c.status === 'PENDING').length
    const proceedCount = wallet.commissions.filter(c => c.status === 'PROCEED').length
    const completeCount = wallet.commissions.filter(c => c.status === 'COMPLETE').length

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Chargement</span>
                </motion.div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Hero - Total Earned */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">
                    Total gagne
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl md:text-7xl font-extralight tracking-tight text-neutral-900">
                        {formatCurrency(totalEarned)}
                    </span>
                    <span className="text-2xl font-light text-neutral-300">EUR</span>
                </div>

                {/* Stripe Connect Badge */}
                {isStripeMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="inline-flex items-center gap-1.5 mt-6 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full"
                    >
                        <Zap className="w-3 h-3" />
                        <span>Versements automatiques</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-12"
            >
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">
                        {formatCurrency(wallet.pending)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">En attente</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-emerald-600 tabular-nums">
                        {formatCurrency(wallet.due)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Disponible</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">
                        {formatCurrency(wallet.paid_total)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Verse</p>
                </div>
            </motion.div>

            {/* Flow Explanation */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
            >
                <div className="flex items-center justify-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {pendingCount} en attente
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {proceedCount} disponible
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                        {completeCount} verse
                    </span>
                </div>
            </motion.div>

            {/* Payout Method Info */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-2xl p-6 mb-12"
            >
                {isStripeMode ? (
                    <div className="text-center">
                        <p className="text-sm text-neutral-700 mb-2">
                            Vos gains sont transferes automatiquement sur votre compte bancaire.
                        </p>
                        <p className="text-xs text-neutral-400">
                            Delai de 2-3 jours ouvrables apres le paiement de la startup.
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-sm text-neutral-700 mb-3">
                            Vos gains disponibles sont credites sur votre Wallet Traaaction.
                        </p>
                        <Link
                            href="/seller/wallet"
                            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            Voir mon Wallet
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}
            </motion.div>

            {/* Commission Timeline */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">
                        Historique
                    </h2>
                    <span className="text-xs text-neutral-300">
                        {wallet.commissions.length} commissions
                    </span>
                </div>

                {wallet.commissions.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-neutral-400 text-sm">Aucune commission</p>
                        <p className="text-neutral-300 text-xs mt-1">
                            Les ventes attribuees a vos liens apparaitront ici
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <AnimatePresence>
                            {wallet.commissions.slice(0, 15).map((commission, index) => {
                                const statusInfo = getStatusInfo(commission.status)
                                const daysLeft = getDaysUntilAvailable(commission)

                                return (
                                    <motion.div
                                        key={commission.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className="group flex items-center justify-between py-4 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                                            <div>
                                                <p className="text-sm text-neutral-700">
                                                    {statusInfo.label}
                                                    {daysLeft !== null && daysLeft > 0 && (
                                                        <span className="text-neutral-400 ml-2">
                                                            {daysLeft}j restants
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-neutral-400">
                                                    {formatDate(commission.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-medium text-neutral-900 tabular-nums">
                                            +{formatCurrency(commission.commission_amount)} EUR
                                        </p>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* How it works - Collapsible */}
            <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 group"
            >
                <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform origin-left" />
                    Comment ca fonctionne
                </summary>
                <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                    <p>
                        <span className="text-neutral-400">1.</span>{' '}
                        Vos commissions restent en attente pendant 30 jours
                    </p>
                    <p>
                        <span className="text-neutral-400">2.</span>{' '}
                        La startup valide et effectue le paiement
                    </p>
                    <p>
                        <span className="text-neutral-400">3.</span>{' '}
                        {isStripeMode
                            ? 'Transfert automatique vers votre compte bancaire'
                            : 'Montant credite sur votre Wallet Traaaction'}
                    </p>
                </div>
            </motion.details>

            {/* Settings Link */}
            {!isStripeMode && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 text-center"
                >
                    <Link
                        href="/seller/settings"
                        className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        Connecter Stripe pour des versements directs
                    </Link>
                </motion.div>
            )}
        </motion.div>
    )
}
