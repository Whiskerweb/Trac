'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Wallet, Clock, TrendingUp, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalPayoutData } from '@/app/actions/portal'
import { staggerContainer, staggerItem, springGentle } from '@/lib/animations'

export default function PortalPayoutsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.payouts')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [payoutData, setPayoutData] = useState<{
        balance: { available: number; pending: number; paid: number; total: number }
        payout: { method: string; stripeConnected: boolean; paypalEmail: string | null; iban: string | null }
    } | null>(null)
    const [loading, setLoading] = useState(true)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const loadData = useCallback(async () => {
        const result = await getPortalPayoutData(workspaceSlug)
        if (result.success && result.data) {
            setPayoutData(result.data)
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="space-y-3 py-4">
                <div className="skeleton-shimmer h-32 rounded-2xl" />
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
                    ))}
                </div>
                <div className="skeleton-shimmer h-24 rounded-2xl" />
            </div>
        )
    }

    if (!payoutData) return null

    const { balance, payout } = payoutData

    const payoutMethodLabel = payout.method === 'STRIPE_CONNECT' && payout.stripeConnected
        ? 'Stripe Connect'
        : payout.method === 'PAYPAL' ? 'PayPal'
        : payout.method === 'IBAN' ? 'IBAN'
        : t('platformWallet')

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-5"
        >
            {/* Hero balance */}
            <motion.div
                variants={staggerItem}
                transition={springGentle}
                className="bg-white rounded-2xl border border-gray-100 card-hover p-6 sm:p-8 text-center"
            >
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{t('availableBalance')}</p>
                <p className="text-4xl sm:text-5xl font-bold text-gray-900">
                    {(balance.available / 100).toFixed(2)}<span className="text-lg font-normal text-gray-400 ml-1">&euro;</span>
                </p>
                {balance.pending > 0 && (
                    <p className="text-xs text-amber-600 mt-2 badge-pop">{t('pendingMaturation')}: {(balance.pending / 100).toFixed(2)}&euro;</p>
                )}
            </motion.div>

            {/* Stats grid */}
            <motion.div
                variants={staggerItem}
                transition={springGentle}
                className="grid grid-cols-3 gap-3"
            >
                <div className="bg-white rounded-2xl border border-gray-100 p-4 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px] text-gray-500">{t('totalEarned')}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                        {((balance.available + balance.pending + balance.paid) / 100).toFixed(0)}&euro;
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-[11px] text-gray-500">{t('pending')}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{(balance.pending / 100).toFixed(0)}&euro;</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4" style={{ color: primaryColor }} />
                        <span className="text-[11px] text-gray-500">{t('paidOut')}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{(balance.paid / 100).toFixed(0)}&euro;</p>
                </div>
            </motion.div>

            {/* Payout method */}
            <motion.div
                variants={staggerItem}
                transition={springGentle}
                className="bg-white rounded-2xl border border-gray-100 card-hover p-5"
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('payoutMethod')}</p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{payoutMethodLabel}</p>
                        <p className="text-[11px] text-gray-400">
                            {payout.stripeConnected ? t('stripeConnectedDesc') : t('stripeNotConnectedDesc')}
                        </p>
                    </div>
                    {payout.stripeConnected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    )}
                </div>

                {!payout.stripeConnected && payout.method === 'STRIPE_CONNECT' && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-700">{t('connectStripe')}</p>
                    </div>
                )}
            </motion.div>

            {/* How payouts work */}
            <motion.div
                variants={staggerItem}
                transition={springGentle}
                className="bg-white rounded-2xl border border-gray-100 card-hover p-5"
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('howItWorks')}</p>
                <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                        { label: t('lifecycleSale'), color: '#3b82f6' },
                        { label: t('lifecycleHold'), color: '#f59e0b' },
                        { label: t('lifecycleAvailable'), color: primaryColor },
                        { label: t('lifecyclePaid'), color: '#10b981' },
                    ].map((step, i) => (
                        <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
                            {i > 0 && <span className="text-gray-300">&rarr;</span>}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 badge-pop">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: step.color }} />
                                <span className="text-xs font-medium text-gray-700">{step.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
