'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, Loader2, Gift, Zap, X, AlertTriangle, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'

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
    const [showStripeModal, setShowStripeModal] = useState(false)
    const [connectingStripe, setConnectingStripe] = useState(false)
    // Force re-render for countdown updates
    const [, setTick] = useState(0)

    useEffect(() => {
        loadWallet()
    }, [])

    // Update countdown every hour for real-time display
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1)
        }, 3600000) // Update every hour
        return () => clearInterval(interval)
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

    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

    const formatDate = (dateString: string, expanded?: boolean) => {
        const d = new Date(dateString)
        if (expanded) {
            const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            const time = `${d.getHours()}h${d.getMinutes().toString().padStart(2, '0')}`
            return `${date} ${time}`
        }
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }

    const getStatusLabel = (status: Commission['status']) => {
        const labels = {
            PENDING: 'Maturing',
            PROCEED: 'Available',
            COMPLETE: 'Paid out'
        }
        return labels[status]
    }

    const getTimeUntilAvailable = useCallback((commission: Commission): { days: number; hours: number; text: string } | null => {
        if (commission.status !== 'PENDING') return null
        const holdDays = commission.hold_days || 30
        const createdAt = new Date(commission.created_at)
        const maturesAt = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        const diffMs = maturesAt.getTime() - now.getTime()

        if (diffMs <= 0) return { days: 0, hours: 0, text: 'Ready soon' }

        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
        const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

        // Format the display text
        if (days === 0) {
            return { days, hours, text: hours <= 1 ? 'Less than 1h' : `${hours}h remaining` }
        } else if (days === 1) {
            return { days, hours, text: '1 day remaining' }
        } else {
            return { days, hours, text: `${days} days remaining` }
        }
    }, [])

    const totalEarned = wallet.pending + (wallet.balance || 0) + (wallet.due || 0) + wallet.paid_total
    const isStripeMode = wallet.method === 'STRIPE_CONNECT'
    const mainAmount = isStripeMode ? wallet.due : wallet.balance

    async function handleConnectStripe() {
        setConnectingStripe(true)
        try {
            const response = await fetch('/api/seller/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ country: 'FR' })
            })
            const data = await response.json()

            if (data.success && data.onboardingUrl) {
                window.location.href = data.onboardingUrl
            } else if (data.alreadyEnabled) {
                setShowStripeModal(false)
                loadWallet()
            } else {
                console.error('Failed to connect Stripe:', data.error)
                setConnectingStripe(false)
            }
        } catch (err) {
            console.error('Failed to connect Stripe:', err)
            setConnectingStripe(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <div className="text-center mb-16">
                    <div className="h-4 w-24 rounded skeleton-shimmer mx-auto mb-4" />
                    <div className="h-16 w-64 rounded-xl skeleton-shimmer mx-auto mb-4" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-4 sm:p-6 text-center">
                            <div className="h-8 w-20 rounded skeleton-shimmer mx-auto mb-2" />
                            <div className="h-3 w-16 rounded skeleton-shimmer mx-auto" />
                        </div>
                    ))}
                </div>
                <div className="space-y-1">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center justify-between py-4 px-4">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full skeleton-shimmer" />
                                <div>
                                    <div className="h-4 w-20 rounded skeleton-shimmer mb-1" />
                                    <div className="h-3 w-16 rounded skeleton-shimmer" />
                                </div>
                            </div>
                            <div className="h-4 w-24 rounded skeleton-shimmer" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Hero Balance */}
            <motion.div
                variants={fadeInUp}
                transition={springGentle}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">
                    {isStripeMode ? 'Next payout' : 'Available balance'}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl sm:text-6xl md:text-7xl font-extralight tracking-tight text-neutral-900">
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
                        +{formatCurrency(wallet.pending)} EUR maturing
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
                        <span>Automatic payout</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Action Card - Platform Mode */}
            {!isStripeMode && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
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
                                    <h3 className="font-medium text-neutral-900">Gift cards</h3>
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
                variants={fadeInUp}
                transition={springGentle}
                className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-100 rounded-2xl overflow-hidden mb-12"
            >
                <div className="bg-white p-4 sm:p-6 text-center card-hover">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(totalEarned)}</p>
                    <p className="text-xs text-neutral-400 mt-1">Total earned</p>
                </div>
                <div className="bg-white p-4 sm:p-6 text-center card-hover">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(wallet.pending)}</p>
                    <p className="text-xs text-neutral-400 mt-1">Pending</p>
                </div>
                <div className="bg-white p-4 sm:p-6 text-center card-hover">
                    <p className="text-2xl font-light text-neutral-900">{formatCurrency(wallet.paid_total)}</p>
                    <p className="text-xs text-neutral-400 mt-1">Paid out</p>
                </div>
            </motion.div>

            {/* Commission History */}
            <motion.div
                variants={fadeInUp}
                transition={springGentle}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400">History</h2>
                    <span className="text-xs text-neutral-300">{wallet.commissions.length} transactions</span>
                </div>

                {wallet.commissions.length === 0 ? (
                    <div className="text-center py-16">
                        <motion.div variants={floatVariants} animate="float" className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-5 h-5 text-neutral-400" />
                        </motion.div>
                        <p className="text-neutral-400 text-sm">No commissions</p>
                        <p className="text-neutral-300 text-xs mt-1">Share your links to get started</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <AnimatePresence>
                            {wallet.commissions.slice(0, 10).map((commission, index) => {
                                const timeInfo = getTimeUntilAvailable(commission)
                                return (
                                    <Link key={commission.id} href={`/seller/commissions/${commission.id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className="group flex items-center justify-between py-4 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer row-hover"
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
                                                        {timeInfo && (
                                                            <span className="text-neutral-400 ml-2 text-xs">
                                                                {timeInfo.text}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p
                                                        className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setExpandedDates(prev => {
                                                                const next = new Set(prev)
                                                                next.has(commission.id) ? next.delete(commission.id) : next.add(commission.id)
                                                                return next
                                                            })
                                                        }}
                                                    >
                                                        {formatDate(commission.created_at, expandedDates.has(commission.id))}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-neutral-900 tabular-nums">
                                                    +{formatCurrency(commission.commission_amount)} EUR
                                                </p>
                                                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                                            </div>
                                        </motion.div>
                                    </Link>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* How it works - collapsed by default */}
            <motion.details
                variants={fadeInUp}
                transition={springGentle}
                className="mt-12 group"
            >
                <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform" />
                    How it works
                </summary>
                <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                    <p><span className="text-neutral-400">1.</span> Commissions are pending for 30 days</p>
                    <p><span className="text-neutral-400">2.</span> The startup pays after validation</p>
                    <p><span className="text-neutral-400">3.</span> {isStripeMode ? 'Automatic transfer within 2-3 days' : 'Exchange for gift cards'}</p>
                </div>
            </motion.details>

            {/* Connect Stripe CTA - Platform Mode */}
            {!isStripeMode && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className="mt-12"
                >
                    <button
                        onClick={() => setShowStripeModal(true)}
                        className="group w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/20 text-left btn-press"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">Connect Stripe</h3>
                                    <p className="text-sm text-white/60">Receive payouts directly to your bank</p>
                                </div>
                            </div>
                            <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                    </button>
                </motion.div>
            )}

            {/* Stripe Connect Modal */}
            <AnimatePresence>
                {showStripeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !connectingStripe && setShowStripeModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-neutral-900">Connect to Stripe</h2>
                                {!connectingStripe && (
                                    <button
                                        onClick={() => setShowStripeModal(false)}
                                        className="p-2 -mr-2 rounded-lg hover:bg-neutral-100 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-neutral-400" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Warning Card */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-amber-900 mb-1">Important notice</h3>
                                            <p className="text-sm text-amber-800">
                                                Your current wallet balance of <span className="font-semibold">{formatCurrency(wallet.balance)} EUR</span> cannot be transferred to Stripe. This amount will remain available for gift cards only.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="space-y-4 text-sm text-neutral-600">
                                    <p>
                                        By connecting Stripe, all your <span className="font-medium text-neutral-900">future earnings</span> will be automatically transferred to your bank account.
                                    </p>
                                    <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>Automatic payouts every week</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>Direct deposit to your bank</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>No minimum withdrawal amount</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                                <button
                                    onClick={() => setShowStripeModal(false)}
                                    disabled={connectingStripe}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConnectStripe}
                                    disabled={connectingStripe}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-900 text-white hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 btn-press"
                                >
                                    {connectingStripe ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        'Continue to Stripe'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
