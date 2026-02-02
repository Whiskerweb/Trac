'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, Loader2, Gift, Zap } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    created_at: string
    matured_at?: string | null
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

export default function SellerWalletPage() {
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
        } catch (err) {
            console.error('Failed to load wallet:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cents / 100)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        })
    }

    const getStatusLabel = (status: Commission['status']) => {
        const labels = {
            PENDING: 'En cours',
            PROCEED: 'Disponible',
            COMPLETE: 'Verse'
        }
        return labels[status]
    }

    const getDaysLeft = (commission: Commission) => {
        if (commission.status !== 'PENDING') return null
        const holdDays = commission.hold_days || 30
        const createdAt = new Date(commission.created_at)
        const maturesAt = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        return Math.max(0, Math.ceil((maturesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    }

    const totalEarned = wallet.pending + (wallet.balance || 0) + (wallet.due || 0) + wallet.paid_total
    const isStripeMode = wallet.method === 'STRIPE_CONNECT'
    const mainAmount = isStripeMode ? wallet.due : wallet.balance

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
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
            {/* Hero Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">
                    {isStripeMode ? 'Prochain versement' : 'Solde disponible'}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl md:text-7xl font-extralight tracking-tight text-neutral-900">
                        {formatCurrency(mainAmount || 0)}
                    </span>
                    <span className="text-2xl font-light text-neutral-300">EUR</span>
                </div>

                {/* Sub info */}
                {wallet.pending > 0 && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-4 text-sm text-neutral-400"
                    >
                        +{formatCurrency(wallet.pending)} EUR en maturation
                    </motion.p>
                )}

                {/* Stripe auto badge */}
                {isStripeMode && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-1.5 mt-6 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full"
                    >
                        <Zap className="w-3 h-3" />
                        <span>Versement automatique</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Action Card - Platform Mode */}
            {!isStripeMode && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <Link
                        href="/seller/gift-cards"
                        className="group block bg-white rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-neutral-900">Cartes cadeaux</h3>
                                    <p className="text-sm text-neutral-500">Amazon, Netflix, Spotify...</p>
                                </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                    </Link>
                </motion.div>
            )}

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-12"
            >
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(totalEarned)}</p>
                    <p className="text-xs text-neutral-400 mt-1">Total gagne</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(wallet.pending)}</p>
                    <p className="text-xs text-neutral-400 mt-1">En attente</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(wallet.paid_total)}</p>
                    <p className="text-xs text-neutral-400 mt-1">Verse</p>
                </div>
            </motion.div>

            {/* Commission History */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">Historique</h2>
                    <span className="text-xs text-neutral-300">{wallet.commissions.length} transactions</span>
                </div>

                {wallet.commissions.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-neutral-400 text-sm">Aucune commission</p>
                        <p className="text-neutral-300 text-xs mt-1">Partagez vos liens pour commencer</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <AnimatePresence>
                            {wallet.commissions.slice(0, 10).map((commission, index) => {
                                const daysLeft = getDaysLeft(commission)
                                return (
                                    <motion.div
                                        key={commission.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className="group flex items-center justify-between py-4 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors cursor-default"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                commission.status === 'COMPLETE' ? 'bg-neutral-300' :
                                                commission.status === 'PROCEED' ? 'bg-green-500' :
                                                'bg-amber-400'
                                            }`} />
                                            <div>
                                                <p className="text-sm text-neutral-600">
                                                    {getStatusLabel(commission.status)}
                                                    {daysLeft !== null && daysLeft > 0 && (
                                                        <span className="text-neutral-400 ml-2">
                                                            {daysLeft}j
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

            {/* How it works - collapsed by default */}
            <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 group"
            >
                <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform" />
                    Comment ca fonctionne
                </summary>
                <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                    <p><span className="text-neutral-400">1.</span> Les commissions sont en attente 30 jours</p>
                    <p><span className="text-neutral-400">2.</span> La startup paie apres validation</p>
                    <p><span className="text-neutral-400">3.</span> {isStripeMode ? 'Transfert automatique sous 2-3 jours' : 'Echangez contre des cartes cadeaux'}</p>
                </div>
            </motion.details>

            {/* Connect Stripe CTA - Platform Mode */}
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
                        Connecter Stripe pour des retraits en cash
                    </Link>
                </motion.div>
            )}
        </motion.div>
    )
}
