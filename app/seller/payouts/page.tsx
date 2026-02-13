'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Zap, ArrowRight, ChevronRight } from 'lucide-react'
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

    const getStatusInfo = (status: Commission['status']) => {
        const info = {
            PENDING: { label: 'Maturing', color: 'bg-amber-400' },
            PROCEED: { label: 'Available', color: 'bg-emerald-500' },
            COMPLETE: { label: 'Paid out', color: 'bg-neutral-300' }
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
            {/* Hero - Total Earned */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-16"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-4">
                    Total earned
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
                        <span>Automatic payouts</span>
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
                    <p className="text-xs text-neutral-400 mt-1">Pending</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-emerald-600 tabular-nums">
                        {formatCurrency(wallet.due)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Available</p>
                </div>
                <div className="bg-white p-6 text-center">
                    <p className="text-2xl font-light text-neutral-900 tabular-nums">
                        {formatCurrency(wallet.paid_total)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">Paid out</p>
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
                        {pendingCount} pending
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {proceedCount} available
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                        {completeCount} paid out
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
                            Your earnings are automatically transferred to your bank account.
                        </p>
                        <p className="text-xs text-neutral-400">
                            2-3 business days after the startup's payment.
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-sm text-neutral-700 mb-3">
                            Your available earnings are credited to your Traaaction Wallet.
                        </p>
                        <Link
                            href="/seller/wallet"
                            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            View my Wallet
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
                        History
                    </h2>
                    <span className="text-xs text-neutral-300">
                        {wallet.commissions.length} commissions
                    </span>
                </div>

                {wallet.commissions.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-neutral-400 text-sm">No commissions</p>
                        <p className="text-neutral-300 text-xs mt-1">
                            Sales attributed to your links will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <AnimatePresence>
                            {wallet.commissions.slice(0, 15).map((commission, index) => {
                                const statusInfo = getStatusInfo(commission.status)
                                const timeInfo = getTimeUntilAvailable(commission)

                                return (
                                    <Link key={commission.id} href={`/seller/commissions/${commission.id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 * index }}
                                            className="group flex items-center justify-between py-4 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                                                <div>
                                                    <p className="text-sm text-neutral-700">
                                                        {statusInfo.label}
                                                        {timeInfo && (
                                                            <span className="text-neutral-400 ml-2 text-xs">
                                                                {timeInfo.text}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-neutral-400">
                                                        {formatDate(commission.created_at)}
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

            {/* How it works - Collapsible */}
            <motion.details
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 group"
            >
                <summary className="text-xs uppercase tracking-[0.15em] text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors list-none flex items-center gap-2">
                    <span className="w-4 h-px bg-neutral-200 group-open:rotate-90 transition-transform origin-left" />
                    How it works
                </summary>
                <div className="mt-6 pl-6 space-y-4 text-sm text-neutral-500 border-l border-neutral-100">
                    <p>
                        <span className="text-neutral-400">1.</span>{' '}
                        Your commissions remain pending for 30 days
                    </p>
                    <p>
                        <span className="text-neutral-400">2.</span>{' '}
                        The startup validates and makes the payment
                    </p>
                    <p>
                        <span className="text-neutral-400">3.</span>{' '}
                        {isStripeMode
                            ? 'Automatic transfer to your bank account'
                            : 'Amount credited to your Traaaction Wallet'}
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
                        Connect Stripe for direct payouts
                    </Link>
                </motion.div>
            )}
        </motion.div>
    )
}
