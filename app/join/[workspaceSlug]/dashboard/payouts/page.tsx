'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Loader2, Wallet, CreditCard, ArrowRight, CheckCircle2, Clock, ShoppingCart } from 'lucide-react'
import { getPortalPayoutInfo } from '@/app/actions/portal'
import { usePortalData } from '../layout'

export default function PortalPayoutsPage() {
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string
    const portalData = usePortalData()
    const t = useTranslations('portal.payouts')

    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        balance: { balance: number; pending: number; due: number; paid_total: number }
        payoutMethod: string
        stripeConnected: boolean
        recentPayouts: { id: string; amount: number; source: string; paidAt: string | null; recurringMonth: number | null }[]
    } | null>(null)

    const primaryColor = portalData?.data.workspace.portal_primary_color || '#7C3AED'

    useEffect(() => {
        async function load() {
            const result = await getPortalPayoutInfo(workspaceSlug)
            if (result.success && result.data) {
                setData(result.data)
            }
            setLoading(false)
        }
        load()
    }, [workspaceSlug])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!data) return null

    const lifecycleSteps = [
        { icon: ShoppingCart, label: t('lifecycleSale'), color: '#6b7280' },
        { icon: Clock, label: t('lifecycleHold'), color: '#f59e0b' },
        { icon: Wallet, label: t('lifecycleAvailable'), color: primaryColor },
        { icon: CheckCircle2, label: t('lifecyclePaid'), color: '#10b981' },
    ]

    return (
        <div className="space-y-5">
            {/* Hero balance */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-8 text-center"
            >
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('availableBalance')}</p>
                <p className="text-4xl sm:text-5xl font-bold text-gray-900">
                    {(data.balance.balance / 100).toFixed(2)}<span className="text-xl font-normal text-gray-400 ml-1">&euro;</span>
                </p>
                {data.stripeConnected && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                        <CheckCircle2 className="w-3 h-3" />
                        {t('automaticPayout')}
                    </div>
                )}
            </motion.div>

            {/* Stats grid */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-3 gap-3"
            >
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-lg font-bold text-gray-900">{((data.balance.pending + data.balance.due + data.balance.paid_total + data.balance.balance) / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('totalEarned')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-lg font-bold text-amber-600">{(data.balance.pending / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('pending')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-lg font-bold text-emerald-600">{(data.balance.paid_total / 100).toFixed(2)}&euro;</p>
                    <p className="text-[10px] text-gray-400 uppercase">{t('paidOut')}</p>
                </div>
            </motion.div>

            {/* Lifecycle explainer */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <p className="text-sm font-semibold text-gray-900 mb-4">{t('howItWorks')}</p>
                <div className="flex items-center justify-between">
                    {lifecycleSteps.map((step, i) => (
                        <div key={step.label} className="flex items-center">
                            <div className="text-center">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
                                    style={{ backgroundColor: `${step.color}12` }}
                                >
                                    <step.icon className="w-4.5 h-4.5" style={{ color: step.color }} />
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{step.label}</p>
                            </div>
                            {i < lifecycleSteps.length - 1 && (
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 mx-2 sm:mx-4 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Payout method */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('payoutMethod')}</p>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <CreditCard className="w-5 h-5" style={{ color: primaryColor }} />
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            {data.payoutMethod === 'STRIPE_CONNECT' ? 'Stripe Connect' :
                             data.payoutMethod === 'PAYPAL' ? 'PayPal' :
                             data.payoutMethod === 'IBAN' ? 'IBAN' :
                             t('platformWallet')}
                        </p>
                        <p className="text-xs text-gray-500">
                            {data.stripeConnected ? t('stripeConnectedDesc') : t('stripeNotConnectedDesc')}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Recent paid commissions */}
            {data.recentPayouts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                >
                    <p className="text-sm font-semibold text-gray-900 mb-3">{t('recentPayments')}</p>
                    <div className="space-y-2">
                        {data.recentPayouts.map(p => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{(p.amount / 100).toFixed(2)}&euro;</p>
                                    <p className="text-[11px] text-gray-400">
                                        {p.source}{p.recurringMonth ? ` #${p.recurringMonth}` : ''}
                                    </p>
                                </div>
                                {p.paidAt && (
                                    <span className="text-xs text-gray-400">{new Date(p.paidAt).toLocaleDateString()}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
