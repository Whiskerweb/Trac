'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft, Loader2, DollarSign, User, Calendar,
    Clock, Link2, RefreshCw, Users, Building2, Share2,
    ExternalLink, ArrowRight
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getCommissionDetail, type CommissionDetail } from '@/app/actions/commissions'

// =============================================
// HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return `€${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

function formatDateTime(date: Date): string {
    const d = new Date(date)
    return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

// =============================================
// BADGES
// =============================================

function StatusBadge({ status }: { status: CommissionDetail['status'] }) {
    const t = useTranslations('dashboard.commissions')
    const styles = {
        PENDING: 'bg-orange-50 text-orange-700 border-orange-200',
        PROCEED: 'bg-blue-50 text-blue-700 border-blue-200',
        COMPLETE: 'bg-green-50 text-green-700 border-green-200',
    }
    const labels = {
        PENDING: t('pending'),
        PROCEED: t('proceed'),
        COMPLETE: t('completed'),
    }
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

function TypeBadge({ type }: { type: 'SALE' | 'LEAD' | 'RECURRING' | null }) {
    const t = useTranslations('dashboard.commissions.type')
    if (!type) return null
    const styles: Record<string, string> = {
        SALE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        LEAD: 'bg-purple-50 text-purple-700 border-purple-200',
        RECURRING: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    const labels: Record<string, string> = {
        SALE: t('sale'),
        LEAD: t('lead'),
        RECURRING: t('recurring'),
    }
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
            {labels[type] || type}
        </span>
    )
}

// =============================================
// DETAIL ROW
// =============================================

function DetailRow({ label, value, highlight }: { label: string; value: string | React.ReactNode; highlight?: boolean }) {
    return (
        <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-medium ${highlight ? 'text-green-600' : 'text-gray-900'}`}>
                {value}
            </span>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function CommissionDetailPage() {
    const t = useTranslations('dashboard.commissions.detail')
    const tComm = useTranslations('dashboard.commissions')
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [commission, setCommission] = useState<CommissionDetail | null>(null)

    useEffect(() => {
        async function load() {
            if (!params.commissionId || typeof params.commissionId !== 'string') return

            const result = await getCommissionDetail(params.commissionId)
            if (result.success && result.commission) {
                setCommission(result.commission)
            }
            setLoading(false)
        }
        load()
    }, [params.commissionId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!commission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-900 font-medium">{t('notFound')}</p>
                <button
                    onClick={() => router.push('/dashboard/commissions')}
                    className="mt-4 text-sm text-blue-600 hover:underline"
                >
                    {t('backToList')}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/commissions')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                {t('backToList')}
            </button>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Left Column */}
                <div className="flex-1 space-y-4 sm:space-y-6">
                    {/* Header */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <StatusBadge status={commission.status} />
                            <TypeBadge type={commission.commissionSource} />
                        </div>

                        <p className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight">
                            {formatCurrency(commission.commissionAmount)}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-sm text-gray-500">{commission.commissionRate}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-sm text-gray-500">{formatDateTime(commission.createdAt)}</span>
                        </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                            {t('financialBreakdown')}
                        </h2>
                        <div className="divide-y divide-gray-100">
                            {commission.commissionSource !== 'LEAD' && (
                                <>
                                    <DetailRow label={t('grossTTC')} value={formatCurrency(commission.grossAmount)} />
                                    <DetailRow label={t('tax')} value={`- ${formatCurrency(commission.taxAmount)}`} />
                                    <DetailRow label={t('netHT')} value={formatCurrency(commission.netAmount)} />
                                    <DetailRow label={t('stripeFee')} value={`- ${formatCurrency(commission.stripeFee)}`} />
                                    <div className="border-t border-gray-200 mt-1 pt-1" />
                                </>
                            )}
                            <DetailRow
                                label={t('sellerCommission')}
                                value={formatCurrency(commission.commissionAmount)}
                                highlight
                            />
                            <DetailRow label={t('platformFee15')} value={formatCurrency(commission.platformFee)} />
                        </div>
                    </div>

                    {/* Mission */}
                    {commission.mission && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                {t('mission')}
                            </h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{commission.mission.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${commission.mission.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {commission.mission.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{commission.mission.reward} {t('perConversion')}</span>
                                    </div>
                                </div>
                                <Link
                                    href={`/dashboard/missions/${commission.mission.id}`}
                                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                >
                                    {t('viewMission')}
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Subscription Info (if recurring) */}
                    {commission.subscriptionId && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-blue-500" />
                                    {t('subscription')}
                                </div>
                            </h2>
                            <div className="divide-y divide-gray-100">
                                <DetailRow label={t('subscriptionId')} value={
                                    <code className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                                        {commission.subscriptionId.slice(0, 24)}...
                                    </code>
                                } />
                                {commission.recurringMonth != null && (
                                    <DetailRow
                                        label={t('recurringMonth')}
                                        value={
                                            commission.recurringMax
                                                ? `${commission.recurringMonth} / ${commission.recurringMax}`
                                                : `${commission.recurringMonth} (${t('lifetime')})`
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Org / Group / Referral conditional sections */}
                    {(commission.orgInfo || commission.groupInfo || commission.referralInfo) && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 space-y-4">
                            {commission.orgInfo && (
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-violet-500" />
                                            {t('organization')}
                                        </div>
                                    </h2>
                                    <p className="text-sm text-gray-900">{commission.orgInfo.name}</p>
                                    {commission.orgInfo.isLeaderCut && (
                                        <span className="inline-flex mt-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                                            {t('leaderCut')}
                                        </span>
                                    )}
                                </div>
                            )}

                            {commission.groupInfo && (
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-500" />
                                            {t('group')}
                                        </div>
                                    </h2>
                                    <p className="text-sm text-gray-900">{commission.groupInfo.name}</p>
                                </div>
                            )}

                            {commission.referralInfo && (
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                                        <div className="flex items-center gap-2">
                                            <Share2 className="w-4 h-4 text-amber-500" />
                                            {t('referral')}
                                        </div>
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        {t('referralGeneration', { gen: commission.referralInfo.generation })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Sidebar */}
                <div className="w-full lg:w-72 lg:shrink-0 space-y-4 sm:space-y-6">
                    {/* Seller Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                            {t('seller')}
                        </h3>
                        <div className="flex items-center gap-3 mb-4">
                            {commission.seller.avatar ? (
                                <img
                                    src={commission.seller.avatar}
                                    alt={commission.seller.name || ''}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                                    {(commission.seller.name || commission.seller.email)
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {commission.seller.name || commission.seller.email}
                                </p>
                                {commission.seller.name && (
                                    <p className="text-xs text-gray-500 truncate">{commission.seller.email}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            {commission.seller.country && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">{t('country')}</span>
                                    <span className="text-gray-900">{commission.seller.country}</span>
                                </div>
                            )}
                            {commission.seller.profileType && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">{t('type')}</span>
                                    <span className="text-gray-900 capitalize">{commission.seller.profileType.toLowerCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lifecycle */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                            {t('lifecycle')}
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('createdAt')}</p>
                                    <p className="text-sm text-gray-900">{formatDateTime(commission.createdAt)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">{t('holdPeriod')}</p>
                                    <p className="text-sm text-gray-900">{commission.holdDays} {t('days')}</p>
                                </div>
                            </div>

                            {commission.maturedAt && (
                                <div className="flex items-start gap-3">
                                    <ArrowRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">{t('maturedAt')}</p>
                                        <p className="text-sm text-gray-900">{formatDateTime(commission.maturedAt)}</p>
                                    </div>
                                </div>
                            )}

                            {commission.paidAt && (
                                <div className="flex items-start gap-3">
                                    <DollarSign className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">{t('paidAt')}</p>
                                        <p className="text-sm text-gray-900">{formatDateTime(commission.paidAt)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Startup Payment */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                            {t('startupPayment')}
                        </h3>
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${commission.startupPaymentStatus === 'PAID'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                            {commission.startupPaymentStatus === 'PAID' ? t('paid') : t('unpaid')}
                        </span>
                    </div>

                    {/* Link Info */}
                    {commission.linkSlug && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                                {t('trackingLink')}
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                                    <code className="text-xs font-mono text-gray-600 truncate">/s/{commission.linkSlug}</code>
                                </div>
                                {commission.linkClicks != null && (
                                    <p className="text-sm text-gray-500">
                                        {commission.linkClicks} {t('clicks')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
