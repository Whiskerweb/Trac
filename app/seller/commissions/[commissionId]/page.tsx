'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, ChevronRight, Users, Building2, Share2, Repeat } from 'lucide-react'
import { getMyCommissionDetail } from '@/app/actions/sellers'
import { useTranslations } from 'next-intl'

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(cents / 100) + ' \u20AC'

const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

type CommissionDetail = NonNullable<Awaited<ReturnType<typeof getMyCommissionDetail>>['commission']>

export default function CommissionDetailPage() {
    const { commissionId } = useParams<{ commissionId: string }>()
    const router = useRouter()
    const t = useTranslations('seller.commissions.detail')
    const [loading, setLoading] = useState(true)
    const [commission, setCommission] = useState<CommissionDetail | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            const result = await getMyCommissionDetail(commissionId)
            if (result.success && result.commission) {
                setCommission(result.commission as CommissionDetail)
            } else {
                setError(result.error || 'Not found')
            }
            setLoading(false)
        }
        load()
    }, [commissionId])

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    if (error || !commission) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    {t('back')}
                </button>
                <div className="text-center py-16">
                    <p className="text-neutral-400 text-sm">{error || 'Commission not found'}</p>
                </div>
            </div>
        )
    }

    const statusColors: Record<string, string> = {
        PENDING: 'bg-amber-400',
        PROCEED: 'bg-green-500',
        COMPLETE: 'bg-neutral-300',
    }

    const statusLabels: Record<string, string> = {
        PENDING: t('statusPending'),
        PROCEED: t('statusProceed'),
        COMPLETE: t('statusComplete'),
    }

    const sourceLabels: Record<string, string> = {
        SALE: t('typeSale'),
        LEAD: t('typeLead'),
        RECURRING: t('typeRecurring'),
    }

    // Time until available for PENDING
    let timeInfo: string | null = null
    if (commission.status === 'PENDING') {
        const holdDays = commission.holdDays || 30
        const createdAt = new Date(commission.createdAt)
        const maturesAt = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const diffMs = maturesAt.getTime() - Date.now()
        if (diffMs > 0) {
            const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
            timeInfo = days <= 1 ? t('lessThanOneDay') : t('daysRemaining', { days })
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Back */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    {t('back')}
                </button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT COLUMN — 2/3 */}
                <div className="md:col-span-2 space-y-6">
                    {/* Commission Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border border-neutral-100 p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[commission.status]}`} />
                            <span className="text-sm font-medium text-neutral-700">{statusLabels[commission.status]}</span>
                            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-neutral-100 text-neutral-500 rounded-full">
                                {sourceLabels[commission.commissionSource]}
                            </span>
                            {timeInfo && (
                                <span className="text-xs text-neutral-400">{timeInfo}</span>
                            )}
                        </div>

                        <p className="text-4xl font-extralight text-neutral-900 tabular-nums mb-1">
                            +{formatCurrency(commission.commissionAmount)}
                        </p>
                        <p className="text-sm text-neutral-400">
                            {commission.commissionRate} · {formatDate(commission.createdAt)}
                        </p>

                        {/* Financial Breakdown */}
                        {(commission.commissionSource === 'SALE' || commission.commissionSource === 'RECURRING') && commission.grossAmount > 0 && (
                            <div className="mt-6 pt-5 border-t border-neutral-100">
                                <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-3">{t('financialBreakdown')}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">{t('grossAmount')}</span>
                                        <span className="text-neutral-700 tabular-nums">{formatCurrency(commission.grossAmount)}</span>
                                    </div>
                                    {commission.taxAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">{t('tax')}</span>
                                            <span className="text-neutral-700 tabular-nums">-{formatCurrency(commission.taxAmount)}</span>
                                        </div>
                                    )}
                                    {commission.stripeFee > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">{t('stripeFee')}</span>
                                            <span className="text-neutral-700 tabular-nums">-{formatCurrency(commission.stripeFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-neutral-500">{t('netAmount')}</span>
                                        <span className="text-neutral-700 tabular-nums">{formatCurrency(commission.netAmount)}</span>
                                    </div>
                                    <div className="h-px bg-neutral-100 my-1" />
                                    <div className="flex justify-between font-medium">
                                        <span className="text-neutral-700">{t('yourCommission')}</span>
                                        <span className="text-neutral-900 tabular-nums">{formatCurrency(commission.commissionAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-neutral-400">{t('platformFee')}</span>
                                        <span className="text-neutral-400 tabular-nums">{formatCurrency(commission.platformFee)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Group Info */}
                    {commission.groupInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <Users className="w-4 h-4 text-neutral-400" />
                                <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('group')}</h3>
                            </div>
                            <p className="text-sm text-neutral-700 font-medium">{commission.groupInfo.groupName}</p>
                            {commission.groupInfo.originSeller && (
                                <p className="text-sm text-neutral-500 mt-1">
                                    {t('generatedBy')} <span className="text-neutral-700">{commission.groupInfo.originSeller.name || commission.groupInfo.originSeller.email}</span>
                                </p>
                            )}
                        </motion.div>
                    )}

                    {/* Org Info */}
                    {commission.orgInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <Building2 className="w-4 h-4 text-neutral-400" />
                                <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('organization')}</h3>
                            </div>
                            <p className="text-sm text-neutral-700 font-medium">{commission.orgInfo.name}</p>
                            {commission.orgInfo.isLeaderCut && (
                                <p className="text-xs text-neutral-400 mt-1">{t('leaderCut')}</p>
                            )}
                        </motion.div>
                    )}

                    {/* Referral Info */}
                    {commission.referralInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <Share2 className="w-4 h-4 text-neutral-400" />
                                <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('referral')}</h3>
                            </div>
                            <p className="text-sm text-neutral-700">
                                {t('referralGeneration', { gen: commission.referralInfo.generation })}
                            </p>
                        </motion.div>
                    )}
                </div>

                {/* RIGHT COLUMN — 1/3 */}
                <div className="space-y-6">
                    {/* Mission Card */}
                    {commission.mission && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-4">{t('mission')}</h3>
                            <div className="flex items-center gap-3 mb-3">
                                {commission.mission.logoUrl ? (
                                    <img src={commission.mission.logoUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-neutral-400">
                                            {commission.mission.companyName?.charAt(0) || 'M'}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 truncate">{commission.mission.title}</p>
                                    <p className="text-xs text-neutral-400">{commission.mission.companyName}</p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-500 mb-3">{commission.mission.reward}</p>
                            <Link
                                href={`/seller/marketplace/${commission.mission.id}`}
                                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                            >
                                {t('viewMission')}
                                <ChevronRight className="w-3 h-3" />
                            </Link>
                        </motion.div>
                    )}

                    {/* Lifecycle */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="rounded-2xl border border-neutral-100 p-5"
                    >
                        <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-4">{t('lifecycle')}</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">{t('created')}</span>
                                <span className="text-neutral-700">{formatDate(commission.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">{t('holdDays')}</span>
                                <span className="text-neutral-700">{commission.holdDays} {t('days')}</span>
                            </div>
                            {commission.maturedAt && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">{t('maturedAt')}</span>
                                    <span className="text-neutral-700">{formatDate(commission.maturedAt)}</span>
                                </div>
                            )}
                            {commission.paidAt && (
                                <div className="flex justify-between">
                                    <span className="text-neutral-500">{t('paidAt')}</span>
                                    <span className="text-neutral-700">{formatDate(commission.paidAt)}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Link Info */}
                    {commission.linkSlug && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-4">{t('link')}</h3>
                            <p className="text-sm text-neutral-700 font-mono truncate mb-1">/s/{commission.linkSlug}</p>
                            <p className="text-xs text-neutral-400">{commission.linkClicks} {t('clicks')}</p>
                        </motion.div>
                    )}

                    {/* Subscription Info */}
                    {commission.commissionSource === 'RECURRING' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="rounded-2xl border border-neutral-100 p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-4">
                                <Repeat className="w-4 h-4 text-neutral-400" />
                                <h3 className="text-xs uppercase tracking-[0.15em] text-neutral-400">{t('subscription')}</h3>
                            </div>
                            <p className="text-sm text-neutral-700">
                                {t('month')} {commission.recurringMonth || 1}
                                {commission.recurringMax ? ` / ${commission.recurringMax}` : ` (${t('lifetime')})`}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}
