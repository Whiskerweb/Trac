'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { Loader2, Search, Clock, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, buttonTap } from '@/lib/animations'
import {
    getWorkspaceCommissions,
    getCommissionDetail,
    type CommissionItem,
    type CommissionDetail,
} from '@/app/actions/commissions'
import {
    getUnpaidCommissions,
    createPaymentSession,
    checkPaymentStatus,
} from '@/app/actions/payouts'

// =============================================
// HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20AC`
}

function formatDate(date: Date | string | null): string {
    if (!date) return '--'
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}

function holdRemaining(commission: CommissionItem): number {
    const created = new Date(commission.createdAt)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, 30 - elapsed)
}

function holdProgress(commission: CommissionItem): number {
    const holdDays = commission.rewardType === 'LEAD' ? 3 : 30
    const created = new Date(commission.createdAt)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(100, Math.round((elapsed / holdDays) * 100))
}

// =============================================
// BADGES
// =============================================

function TypeBadge({ type }: { type: 'SALE' | 'LEAD' | 'RECURRING' | null }) {
    const t = useTranslations('dashboard.commissions.type')
    if (!type) return null
    const styles: Record<string, string> = {
        SALE: 'bg-purple-50 text-purple-700',
        LEAD: 'bg-emerald-50 text-emerald-700',
        RECURRING: 'bg-blue-50 text-blue-700',
    }
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide badge-pop ${styles[type] || 'bg-gray-50 text-gray-700'}`}>
            {t(type.toLowerCase() as 'sale' | 'lead' | 'recurring').toUpperCase()}
        </span>
    )
}

// =============================================
// KPI CARD
// =============================================

function KpiCard({ dotColor, label, value, sub }: { dotColor: string; label: string; value: string; sub: string }) {
    return (
        <div className="flex-1 min-w-0 p-4 bg-white border border-gray-200 rounded-xl card-hover">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: dotColor }} />
                <span className="text-xs font-medium text-gray-400">{label}</span>
            </div>
            <div className="text-xl font-bold tracking-tight text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
        </div>
    )
}

// =============================================
// COMMISSION CARD
// =============================================

function CommissionCard({
    commission,
    onClick,
    showCheckbox,
    isSelected,
    onToggleSelect,
}: {
    commission: CommissionItem
    onClick: () => void
    showCheckbox?: boolean
    isSelected?: boolean
    onToggleSelect?: () => void
}) {
    const t = useTranslations('dashboard.pipeline')
    const remaining = holdRemaining(commission)
    const progress = holdProgress(commission)

    return (
        <div
            className="p-3.5 rounded-lg border border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white hover:shadow-sm cursor-pointer transition-all active:scale-[0.99] relative row-hover"
            onClick={onClick}
        >
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {showCheckbox && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onToggleSelect?.()
                            }}
                            className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 hover:border-blue-400'
                            }`}
                        >
                            {isSelected && <Check className="w-3 h-3" />}
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0">
                        {getInitials(commission.partnerName)}
                    </div>
                    <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{commission.partnerName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{commission.missionName}</div>
                    </div>
                </div>
                <div className="text-[15px] font-bold tracking-tight text-gray-900 ml-3 whitespace-nowrap">
                    {formatCurrency(commission.commissionAmount)}
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <TypeBadge type={commission.rewardType} />
                    {commission.isPortalExclusive && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-600 badge-pop">
                            Portal
                        </span>
                    )}
                </div>
                {commission.status === 'PENDING' && (
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {remaining}{t('holdDaysShort')}
                    </span>
                )}
                {commission.status === 'PROCEED' && (
                    <span className="text-[11px] text-gray-400">{formatDate(commission.maturedAt)}</span>
                )}
                {commission.status === 'COMPLETE' && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {formatDate(commission.paidAt)}
                    </span>
                )}
            </div>
            {commission.status === 'PENDING' && (
                <div className="mt-2.5 h-[3px] rounded-full bg-gray-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-amber-500 progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    )
}

// =============================================
// COLUMN
// =============================================

function Column({
    status,
    commissions,
    dotColor,
    countBg,
    countColor,
    totalColor,
    hidden,
    onCardClick,
    showCheckbox,
    selectedIds,
    onToggleSelect,
    children,
}: {
    status: string
    commissions: CommissionItem[]
    dotColor: string
    countBg: string
    countColor: string
    totalColor: string
    hidden: boolean
    onCardClick: (id: string) => void
    showCheckbox?: boolean
    selectedIds?: Set<string>
    onToggleSelect?: (id: string) => void
    children?: React.ReactNode
}) {
    const total = commissions.reduce((sum, c) => sum + c.commissionAmount, 0)

    return (
        <div
            className={`flex-1 min-w-0 origin-top transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                hidden
                    ? 'flex-[0_0_0%] opacity-0 scale-x-[0.92] scale-y-[0.98] -mx-[7px] pointer-events-none overflow-hidden'
                    : 'flex-[1_1_0%] opacity-100'
            }`}
            style={{ transitionProperty: 'flex, opacity, transform, margin' }}
        >
            {/* Column Header */}
            <div className="px-3.5 py-3 rounded-t-xl flex items-center justify-between bg-white border border-gray-200 border-b-0">
                <div className="flex items-center gap-2">
                    <div className="w-[7px] h-[7px] rounded-full" style={{ background: dotColor }} />
                    <span className="text-[13px] font-semibold text-gray-900">{status}</span>
                    <span
                        className="text-[11px] font-semibold px-[7px] py-px rounded-full"
                        style={{ background: countBg, color: countColor }}
                    >
                        {commissions.length}
                    </span>
                </div>
                <span className="text-[13px] font-semibold" style={{ color: totalColor }}>
                    {formatCurrency(total)}
                </span>
            </div>

            {/* Column Body */}
            <div className="rounded-b-xl p-1.5 flex flex-col gap-1.5 bg-white border border-gray-200 border-t-0 min-h-[300px]">
                {commissions.map((c) => (
                    <CommissionCard
                        key={c.id}
                        commission={c}
                        onClick={() => onCardClick(c.id)}
                        showCheckbox={showCheckbox}
                        isSelected={selectedIds?.has(c.id)}
                        onToggleSelect={() => onToggleSelect?.(c.id)}
                    />
                ))}
                {children}
            </div>
        </div>
    )
}

// =============================================
// DRAWER
// =============================================

function Drawer({
    detail,
    loading,
    onClose,
}: {
    detail: CommissionDetail | null
    loading: boolean
    onClose: () => void
}) {
    const t = useTranslations('dashboard.pipeline.drawer')
    const tType = useTranslations('dashboard.commissions.type')
    const tDetail = useTranslations('dashboard.commissions.detail')

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100]"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 w-[440px] max-w-full h-dvh bg-white border-l border-gray-200 shadow-[-20px_0_60px_rgba(0,0,0,0.08)] z-[101] flex flex-col overflow-hidden"
            >
                {/* Head */}
                <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <span className="text-[13px] font-semibold text-gray-400">{t('title')}</span>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-300 flex items-center justify-center transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-full skeleton-shimmer" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-32 rounded skeleton-shimmer" />
                                    <div className="h-3 w-48 rounded skeleton-shimmer" />
                                </div>
                            </div>
                            <div className="h-16 rounded-lg skeleton-shimmer" />
                            <div className="grid grid-cols-2 gap-2">
                                {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-lg skeleton-shimmer" />)}
                            </div>
                            <div className="h-20 rounded-lg skeleton-shimmer" />
                        </div>
                    ) : detail ? (
                        <>
                            {/* Profile */}
                            <div className="flex items-center gap-3.5 mb-6">
                                {detail.seller.avatar ? (
                                    <img
                                        src={detail.seller.avatar}
                                        alt=""
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-base font-bold text-gray-600">
                                        {getInitials(detail.seller.name || detail.seller.email)}
                                    </div>
                                )}
                                <div>
                                    <div className="text-base font-bold tracking-tight">{detail.seller.name || detail.seller.email}</div>
                                    <div className="text-xs text-gray-400">{detail.seller.email}</div>
                                </div>
                            </div>

                            {/* Mission */}
                            {detail.mission && (
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                        {detail.mission.title.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold">{detail.mission.title}</div>
                                            {detail.mission.isPortalExclusive && (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 badge-pop">
                                                    Portal
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-gray-400 mt-0.5">
                                            <TypeBadge type={detail.commissionSource} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Financial Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-6">
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{tDetail('grossTTC')}</div>
                                    <div className="text-[15px] font-bold tracking-tight">{formatCurrency(detail.grossAmount)}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{tDetail('netHT')}</div>
                                    <div className="text-[15px] font-bold tracking-tight">{formatCurrency(detail.netAmount)}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{tDetail('sellerCommission')}</div>
                                    <div className="text-[15px] font-bold tracking-tight text-emerald-600">{formatCurrency(detail.commissionAmount)}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{tDetail('platformFee15')}</div>
                                    <div className="text-[15px] font-bold tracking-tight text-gray-400">{formatCurrency(detail.platformFee)}</div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">{tDetail('lifecycle')}</div>
                            <div className="flex items-start mb-6">
                                {(['PENDING', 'PROCEED', 'COMPLETE'] as const).map((step, i) => {
                                    const currentIdx = ['PENDING', 'PROCEED', 'COMPLETE'].indexOf(detail.status)
                                    const isDone = i < currentIdx
                                    const isCurrent = i === currentIdx
                                    const dates = [detail.createdAt, detail.maturedAt, detail.paidAt]

                                    return (
                                        <div key={step} className="contents">
                                            <div className="flex-1 flex flex-col items-center">
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 mb-1.5 ${
                                                        isDone
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : isCurrent
                                                              ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_4px_rgba(37,99,235,0.08)]'
                                                              : 'border-gray-200 bg-white'
                                                    }`}
                                                >
                                                    {isDone && <Check className="w-2.5 h-2.5 text-emerald-500" />}
                                                </div>
                                                <span
                                                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                                                        isDone ? 'text-emerald-500' : isCurrent ? 'text-blue-500' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {step}
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-0.5">
                                                    {formatDate(dates[i])}
                                                </span>
                                            </div>
                                            {i < 2 && (
                                                <div
                                                    className={`flex-[0.7] h-0.5 mt-3 ${isDone ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Hold Banner (PENDING only) */}
                            {detail.status === 'PENDING' && (
                                <div className="p-3 rounded-lg border border-amber-100 bg-amber-50 mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-amber-600">{t('retention')}</span>
                                        <span className="text-xs font-semibold text-amber-600">
                                            {(() => {
                                                const holdDays = detail.holdDays || 30
                                                const created = new Date(detail.createdAt)
                                                const now = new Date()
                                                const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
                                                const remaining = Math.max(0, holdDays - elapsed)
                                                return `${remaining}${t('daysShort')} / ${holdDays}${t('daysShort')}`
                                            })()}
                                        </span>
                                    </div>
                                    <div className="h-1 rounded-full bg-black/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-amber-500 progress-fill"
                                            style={{
                                                width: `${Math.min(100, Math.round(
                                                    ((Date.now() - new Date(detail.createdAt).getTime()) / (1000 * 60 * 60 * 24)) /
                                                    (detail.holdDays || 30) * 100
                                                ))}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Dates */}
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Dates</div>
                            <div className="bg-gray-50 border border-gray-100 rounded-lg overflow-hidden mb-5">
                                <div className="flex justify-between px-3.5 py-2.5">
                                    <span className="text-xs text-gray-400">{tDetail('createdAt')}</span>
                                    <span className="text-xs font-semibold text-gray-500">{formatDate(detail.createdAt)}</span>
                                </div>
                                <div className="flex justify-between px-3.5 py-2.5 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">{tDetail('maturedAt')}</span>
                                    <span className="text-xs font-semibold text-gray-500">{detail.maturedAt ? formatDate(detail.maturedAt) : t('inProgress')}</span>
                                </div>
                                <div className="flex justify-between px-3.5 py-2.5 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">{tDetail('paidAt')}</span>
                                    <span className="text-xs font-semibold text-gray-500">{detail.paidAt ? formatDate(detail.paidAt) : '--'}</span>
                                </div>
                            </div>

                            {/* Org / Group / Referral info */}
                            {detail.orgInfo && (
                                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 mb-3">
                                    {tDetail('organization')}: {detail.orgInfo.name}
                                    {detail.orgInfo.isLeaderCut && ` (${tDetail('leaderCut')})`}
                                </div>
                            )}
                            {detail.groupInfo && (
                                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 mb-3">
                                    {tDetail('group')}: {detail.groupInfo.name}
                                </div>
                            )}
                            {detail.referralInfo && (
                                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5 mb-3">
                                    {tDetail('referral')}: {tDetail('referralGeneration', { gen: detail.referralInfo.generation })}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </motion.div>
        </>
    )
}

// =============================================
// MAIN CONTENT (inside Suspense)
// =============================================

function PipelineContent() {
    const t = useTranslations('dashboard.pipeline')
    const tComm = useTranslations('dashboard.commissions')
    const searchParams = useSearchParams()

    // Data state
    const [commissions, setCommissions] = useState<CommissionItem[]>([])
    const [stats, setStats] = useState({ total: 0, pending: 0, proceed: 0, complete: 0, platformFees: 0 })
    const [loading, setLoading] = useState(true)

    // Filter state (multi-select toggles)
    const [filters, setFilters] = useState({ PENDING: true, PROCEED: true, COMPLETE: true })

    // Search
    const [searchQuery, setSearchQuery] = useState('')

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [drawerDetail, setDrawerDetail] = useState<CommissionDetail | null>(null)
    const [drawerLoading, setDrawerLoading] = useState(false)

    // Payment state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [paying, setPaying] = useState(false)
    const [paymentSuccess, setPaymentSuccess] = useState(false)

    // Data loading
    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)

        const result = await getWorkspaceCommissions(1, 200)
        if (result.success) {
            setCommissions(result.commissions || [])
            setStats(result.stats || { total: 0, pending: 0, proceed: 0, complete: 0, platformFees: 0 })
        }

        if (!silent) setLoading(false)
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Auto-refresh 30s
    useEffect(() => {
        const interval = setInterval(() => loadData(true), 30000)
        return () => clearInterval(interval)
    }, [loadData])

    // Poll payment status on return from Stripe
    useEffect(() => {
        const paymentId = searchParams.get('payment_id')
        const wasRedirected = searchParams.get('success') === 'true'

        if (paymentId && wasRedirected) {
            let attempts = 0
            const maxAttempts = 15
            let cancelled = false

            const pollStatus = async () => {
                if (cancelled) return
                attempts++
                const status = await checkPaymentStatus(paymentId)

                if (status === 'PAID') {
                    setPaymentSuccess(true)
                    setSelectedIds(new Set())
                    loadData()
                } else if (attempts < maxAttempts && !cancelled) {
                    setTimeout(pollStatus, 2000)
                }
            }

            pollStatus()
            return () => { cancelled = true }
        }
    }, [searchParams, loadData])

    // Client-side search
    const filteredCommissions = useMemo(() => {
        if (searchQuery === '') return commissions
        const q = searchQuery.toLowerCase()
        return commissions.filter(
            (c) =>
                c.partnerName.toLowerCase().includes(q) ||
                c.partnerEmail.toLowerCase().includes(q) ||
                c.missionName.toLowerCase().includes(q)
        )
    }, [commissions, searchQuery])

    // Split by status
    const pending = useMemo(() => filteredCommissions.filter((c) => c.status === 'PENDING'), [filteredCommissions])
    const proceed = useMemo(() => filteredCommissions.filter((c) => c.status === 'PROCEED'), [filteredCommissions])
    const complete = useMemo(() => filteredCommissions.filter((c) => c.status === 'COMPLETE'), [filteredCommissions])

    // Toggle filter (must keep at least 1 active)
    const toggleFilter = (status: 'PENDING' | 'PROCEED' | 'COMPLETE') => {
        const activeCount = Object.values(filters).filter(Boolean).length
        if (filters[status] && activeCount <= 1) return
        setFilters((prev) => ({ ...prev, [status]: !prev[status] }))
    }

    // Open drawer
    const openDrawer = async (id: string) => {
        setDrawerOpen(true)
        setDrawerLoading(true)
        const result = await getCommissionDetail(id)
        if (result.success && result.commission) {
            setDrawerDetail(result.commission)
        }
        setDrawerLoading(false)
    }

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false)
        setDrawerDetail(null)
    }, [])

    // Payment: toggle selection
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Payment: minimum 10€ per seller
    const MIN_PAYOUT_THRESHOLD = 1000 // 10€ in cents

    // Payment: total for selected
    const selectedTotal = useMemo(() => {
        return proceed
            .filter((c) => selectedIds.has(c.id))
            .reduce((sum, c) => sum + c.commissionAmount + c.platformFee, 0)
    }, [proceed, selectedIds])

    // Check which sellers are below the 10€ minimum
    const sellersBelowMinimum = useMemo(() => {
        const sellerTotals = new Map<string, { name: string; total: number }>()
        proceed
            .filter((c) => selectedIds.has(c.id))
            .forEach((c) => {
                const existing = sellerTotals.get(c.partnerId)
                const amount = c.commissionAmount + c.platformFee
                if (existing) {
                    existing.total += amount
                } else {
                    sellerTotals.set(c.partnerId, { name: c.partnerName, total: amount })
                }
            })
        const below = new Map<string, { name: string; total: number }>()
        sellerTotals.forEach((v, k) => {
            if (v.total < MIN_PAYOUT_THRESHOLD) below.set(k, v)
        })
        return below
    }, [proceed, selectedIds])

    // Payment: pay
    const handlePay = async () => {
        if (selectedIds.size === 0) return
        setPaying(true)
        const result = await createPaymentSession(Array.from(selectedIds))
        if (result.success && result.checkoutUrl) {
            window.location.href = result.checkoutUrl
        } else {
            setPaying(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl skeleton-shimmer" />)}
                </div>
                <div className="h-96 rounded-xl skeleton-shimmer" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('title')}</h1>
                <span className="text-[13px] font-medium text-gray-400">
                    {commissions.length} commissions
                </span>
            </div>

            {/* KPI Row */}
            <motion.div className="flex gap-3 mb-5 flex-wrap sm:flex-nowrap" variants={staggerContainer} initial="hidden" animate="visible">
                <motion.div className="flex-1 min-w-0" variants={staggerItem} transition={springGentle}>
                    <KpiCard
                        dotColor="#D97706"
                        label={t('pending')}
                        value={formatCurrency(stats.pending)}
                        sub={`${pending.length} commission${pending.length > 1 ? 's' : ''}`}
                    />
                </motion.div>
                <motion.div className="flex-1 min-w-0" variants={staggerItem} transition={springGentle}>
                    <KpiCard
                        dotColor="#2563EB"
                        label={t('proceed')}
                        value={formatCurrency(stats.proceed)}
                        sub={`${proceed.length} commission${proceed.length > 1 ? 's' : ''}`}
                    />
                </motion.div>
                <motion.div className="flex-1 min-w-0" variants={staggerItem} transition={springGentle}>
                    <KpiCard
                        dotColor="#059669"
                        label={t('complete')}
                        value={formatCurrency(stats.complete)}
                        sub={`${complete.length} commission${complete.length > 1 ? 's' : ''}`}
                    />
                </motion.div>
            </motion.div>

            {/* Filter Bar + Search */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                    {([
                        { key: 'PENDING' as const, dot: '#D97706', label: 'Pending', count: pending.length },
                        { key: 'PROCEED' as const, dot: '#2563EB', label: 'Proceed', count: proceed.length },
                        { key: 'COMPLETE' as const, dot: '#059669', label: 'Complete', count: complete.length },
                    ]).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => toggleFilter(f.key)}
                            className={`flex items-center gap-[7px] px-3.5 py-1.5 rounded-full border text-[13px] font-medium select-none transition-all ${
                                filters[f.key]
                                    ? 'bg-gray-900 border-gray-900 text-white'
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background: filters[f.key] ? 'currentColor' : f.dot,
                                    opacity: filters[f.key] ? 1 : 0.5,
                                }}
                            />
                            {f.label}
                            <span
                                className={`text-[11px] font-semibold px-[7px] py-px rounded-full ${
                                    filters[f.key]
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 max-w-xs ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Board */}
            <div className="flex gap-3.5 items-start min-h-[calc(100vh-320px)] flex-col lg:flex-row">
                <Column
                    status="Pending"
                    commissions={pending}
                    dotColor="#D97706"
                    countBg="#FEF3C7"
                    countColor="#D97706"
                    totalColor="#D97706"
                    hidden={!filters.PENDING}
                    onCardClick={openDrawer}
                />
                <Column
                    status="Proceed"
                    commissions={proceed}
                    dotColor="#2563EB"
                    countBg="#DBEAFE"
                    countColor="#2563EB"
                    totalColor="#2563EB"
                    hidden={!filters.PROCEED}
                    onCardClick={openDrawer}
                    showCheckbox
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                >
                    {/* Sticky Pay Bar */}
                    {selectedIds.size > 0 && (
                        <div className="sticky bottom-0 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {selectedIds.size} {t('selected')}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatCurrency(selectedTotal)}</p>
                                </div>
                                <button
                                    onClick={handlePay}
                                    disabled={paying || sellersBelowMinimum.size > 0}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors btn-press"
                                >
                                    {paying ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : null}
                                    {t('pay')}
                                </button>
                            </div>
                            {sellersBelowMinimum.size > 0 && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
                                    <p className="font-semibold mb-1">{t('minimumWarning')}</p>
                                    {Array.from(sellersBelowMinimum.values()).map((s) => (
                                        <p key={s.name}>&bull; {t('minimumDetail', { name: s.name, amount: formatCurrency(s.total) })}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Column>
                <Column
                    status="Complete"
                    commissions={complete}
                    dotColor="#059669"
                    countBg="#D1FAE5"
                    countColor="#059669"
                    totalColor="#059669"
                    hidden={!filters.COMPLETE}
                    onCardClick={openDrawer}
                />
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {drawerOpen && (
                    <Drawer
                        detail={drawerDetail}
                        loading={drawerLoading}
                        onClose={closeDrawer}
                    />
                )}
            </AnimatePresence>

            {/* Payment Success Toast */}
            <AnimatePresence>
                {paymentSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-lg z-[200]"
                    >
                        <Check className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">{t('paymentSuccess')}</p>
                            <p className="text-sm text-green-600">{t('paymentProcessing')}</p>
                        </div>
                        <button
                            onClick={() => setPaymentSuccess(false)}
                            className="ml-2 text-green-600 hover:text-green-800"
                        >
                            &times;
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// =============================================
// EXPORT (Suspense wrapper for useSearchParams)
// =============================================

export default function PipelinePage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-6 animate-pulse p-4 sm:p-6 lg:p-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl skeleton-shimmer" />)}
                    </div>
                    <div className="h-96 rounded-xl skeleton-shimmer" />
                </div>
            }
        >
            <PipelineContent />
        </Suspense>
    )
}
