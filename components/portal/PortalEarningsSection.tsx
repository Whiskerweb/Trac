'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ChevronDown, CreditCard, Loader2 } from 'lucide-react'
import { getPortalCommissions } from '@/app/actions/portal'
import PortalCommissionTable from './PortalCommissionTable'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

interface RecentCommission {
    id: string
    amount: number
    status: string
    source: string
    createdAt: string
    maturedAt: string | null
    holdDays: number
    recurringMonth: number | null
    rate: string | null
}

interface PortalEarningsSectionProps {
    workspaceSlug: string
    recentCommissions: RecentCommission[]
    payout: {
        method: string
        stripeConnected: boolean
        balance: number
        pending: number
        due: number
        paidTotal: number
    }
    primaryColor: string
}

const statusDot: Record<string, string> = {
    PENDING: '#f59e0b',
    PROCEED: '#7C3AED',
    COMPLETE: '#10b981',
}

export default function PortalEarningsSection({
    workspaceSlug, recentCommissions, payout, primaryColor,
}: PortalEarningsSectionProps) {
    const t = useTranslations('portal.dashboard')
    const tComm = useTranslations('portal.commissions')
    const tPay = useTranslations('portal.payouts')
    const [showMore, setShowMore] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [allCommissions, setAllCommissions] = useState<RecentCommission[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    const handleShowMore = async () => {
        if (!showMore) {
            setShowMore(true)
            setLoadingMore(true)
            const result = await getPortalCommissions(workspaceSlug, 1)
            if (result.success && result.data) {
                setAllCommissions(result.data.commissions as RecentCommission[])
                setHasMore(result.data.page < result.data.totalPages)
                setPage(1)
            }
            setLoadingMore(false)
        }
    }

    const handleLoadPage = async (nextPage: number) => {
        setLoadingMore(true)
        const result = await getPortalCommissions(workspaceSlug, nextPage)
        if (result.success && result.data) {
            setAllCommissions(result.data.commissions as RecentCommission[])
            setHasMore(result.data.page < result.data.totalPages)
            setPage(nextPage)
        }
        setLoadingMore(false)
    }

    const getDaysLeft = (createdAt: string, holdDays: number) => {
        const created = new Date(createdAt)
        const maturesAt = new Date(created.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        return Math.max(0, Math.ceil((maturesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    }

    const displayedCommissions = showMore ? allCommissions : recentCommissions

    const payoutMethodLabel = payout.method === 'STRIPE_CONNECT' && payout.stripeConnected
        ? 'Stripe Connect'
        : payout.method === 'PAYPAL' ? 'PayPal'
        : payout.method === 'IBAN' ? 'IBAN'
        : tPay('platformWallet')

    return (
        <div className="space-y-4">
            {/* Recent Earnings */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <p className="text-sm font-semibold text-gray-900 mb-4">{t('earnings')}</p>

                {displayedCommissions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-400">{tComm('empty')}</p>
                    </div>
                ) : showMore ? (
                    <>
                        {loadingMore ? (
                            <div className="flex items-center justify-center py-8">
                                <TraaactionLoader size={20} className="text-gray-400" />
                            </div>
                        ) : (
                            <PortalCommissionTable
                                commissions={allCommissions}
                                primaryColor={primaryColor}
                            />
                        )}
                        {!loadingMore && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {page > 1 && (
                                    <button
                                        onClick={() => handleLoadPage(page - 1)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Previous
                                    </button>
                                )}
                                {hasMore && (
                                    <button
                                        onClick={() => handleLoadPage(page + 1)}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                            {displayedCommissions.map((c) => {
                                const dotColor = c.status === 'PROCEED' ? primaryColor : (statusDot[c.status] || '#9ca3af')
                                const daysLeft = c.status === 'PENDING' ? getDaysLeft(c.createdAt, c.holdDays) : 0
                                let typeLabel = c.source
                                if (c.source === 'RECURRING' && c.recurringMonth) {
                                    typeLabel = `REC #${c.recurringMonth}`
                                }

                                return (
                                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50/50 transition-colors">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium text-gray-700">
                                                {(c.amount / 100).toFixed(2)}&euro;
                                            </span>
                                            <span className="text-[11px] text-gray-400 ml-2">{typeLabel}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {c.status === 'PENDING' && daysLeft > 0 ? (
                                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                    {tComm('availableIn', { days: daysLeft })}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400">
                                                    {new Date(c.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <button
                            onClick={handleShowMore}
                            className="flex items-center gap-1 mx-auto mt-3 text-xs font-medium transition-colors"
                            style={{ color: primaryColor }}
                        >
                            {t('showMore')}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                    </>
                )}
            </motion.div>

            {/* Payout Method */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('payoutMethod')}</p>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{payoutMethodLabel}</p>
                        <p className="text-[11px] text-gray-400">
                            {payout.stripeConnected ? tPay('stripeConnectedDesc') : tPay('stripeNotConnectedDesc')}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
