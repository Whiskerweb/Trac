'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Users, Coins, TrendingUp, ExternalLink, AlertCircle, ChevronLeft, ChevronRight, Share2, ChevronRight as ChevronRightIcon, Search, Loader2 } from 'lucide-react'
import { getMyReferralData, getReferralSubTree } from '@/app/actions/sellers'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'

// =============================================
// Generation Badge
// =============================================

function GenerationBadge({ generation }: { generation: number }) {
    const t = useTranslations('sellerReferral')
    const config = {
        1: { label: t('gen1Badge'), bg: 'bg-violet-100', text: 'text-violet-700' },
        2: { label: t('gen2Badge'), bg: 'bg-purple-100', text: 'text-purple-600' },
        3: { label: t('gen3Badge'), bg: 'bg-fuchsia-100', text: 'text-fuchsia-500' },
    }[generation]
    if (!config) return null
    return (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full badge-pop ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    )
}

// =============================================
// Referral Row
// =============================================

function ReferralRow({
    seller,
    generation,
    isExpanded,
    onToggle,
    locale,
    formatAmount,
}: {
    seller: any
    generation: number
    isExpanded: boolean
    onToggle: () => void
    locale: string
    formatAmount: (cents: number) => string
}) {
    const t = useTranslations('sellerReferral')
    const canExpand = seller.hasSubReferrals && generation < 3
    const initial = (seller.name || seller.email || '?')[0].toUpperCase()

    return (
        <div
            onClick={canExpand ? onToggle : undefined}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors row-hover ${
                canExpand ? 'cursor-pointer hover:bg-neutral-50' : ''
            }`}
        >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-neutral-500">{initial}</span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{seller.name || seller.email}</p>
                    <GenerationBadge generation={generation} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        seller.status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                        seller.status === 'BANNED' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                        {seller.status === 'APPROVED' ? t('active') : seller.status}
                    </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    {t('joined')} {new Date(seller.joinedAt).toLocaleDateString(locale)}
                    {seller.salesCount > 0 && <> · {seller.salesCount} {t('sales')}</>}
                    {seller.earningsFromThem > 0 && <> · <span className="text-violet-600 font-medium">{formatAmount(seller.earningsFromThem)}</span></>}
                </p>
            </div>

            {/* Sub count + chevron */}
            <div className="flex items-center gap-2 shrink-0">
                {seller.subReferralCount > 0 && (
                    <span className="text-[10px] text-gray-400">
                        {t('subReferralCount', { count: seller.subReferralCount })}
                    </span>
                )}
                {canExpand && (
                    <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                )}
            </div>
        </div>
    )
}

// =============================================
// Sub Referral List (animated container)
// =============================================

function SubReferralList({
    sellerId,
    generation,
    isExpanded,
    subReferrals,
    loadingSub,
    expanded,
    onToggle,
    locale,
    formatAmount,
    subReferralsMap,
    loadingSubSet,
}: {
    sellerId: string
    generation: number
    isExpanded: boolean
    subReferrals: any[] | undefined
    loadingSub: boolean
    expanded: Set<string>
    onToggle: (id: string, gen: number) => void
    locale: string
    formatAmount: (cents: number) => string
    subReferralsMap: Record<string, any[]>
    loadingSubSet: Set<string>
}) {
    const t = useTranslations('sellerReferral')
    const indent = generation === 1 ? 'pl-8' : 'pl-16'

    return (
        <AnimatePresence>
            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <div className={`${indent} border-l-2 border-neutral-100 ml-5`}>
                        {loadingSub ? (
                            <div className="flex items-center gap-2 py-3 px-3">
                                <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                <span className="text-xs text-gray-400">{t('loadingSub')}</span>
                            </div>
                        ) : subReferrals && subReferrals.length > 0 ? (
                            subReferrals.map((sub: any) => (
                                <div key={sub.id}>
                                    <ReferralRow
                                        seller={sub}
                                        generation={generation + 1}
                                        isExpanded={expanded.has(sub.id)}
                                        onToggle={() => onToggle(sub.id, generation + 1)}
                                        locale={locale}
                                        formatAmount={formatAmount}
                                    />
                                    {/* Gen3 nested (terminal — no further expansion) */}
                                    {generation + 1 === 2 && (
                                        <SubReferralList
                                            sellerId={sub.id}
                                            generation={2}
                                            isExpanded={expanded.has(sub.id)}
                                            subReferrals={subReferralsMap[sub.id]}
                                            loadingSub={loadingSubSet.has(sub.id)}
                                            expanded={expanded}
                                            onToggle={onToggle}
                                            locale={locale}
                                            formatAmount={formatAmount}
                                            subReferralsMap={subReferralsMap}
                                            loadingSubSet={loadingSubSet}
                                        />
                                    )}
                                </div>
                            ))
                        ) : subReferrals ? (
                            <p className="text-[11px] text-gray-400 py-3 px-3">{t('noSubReferrals')}</p>
                        ) : null}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// =============================================
// Main Page
// =============================================

export default function ReferralPage() {
    const t = useTranslations('sellerReferral')
    const locale = useLocale()

    const [data, setData] = useState<any>(null)
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState<'link' | 'code' | null>(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [subReferrals, setSubReferrals] = useState<Record<string, any[]>>({})
    const [loadingSub, setLoadingSub] = useState<Set<string>>(new Set())

    const loadData = useCallback((p: number, s?: string) => {
        setLoading(true)
        setError(false)
        getMyReferralData(p, s || undefined).then(result => {
            if (result.success) {
                setData(result)
                setError(false)
            } else {
                setError(true)
            }
            setLoading(false)
        }).catch(() => {
            setError(true)
            setLoading(false)
        })
    }, [])

    useEffect(() => {
        loadData(page, debouncedSearch)
    }, [loadData, page, debouncedSearch])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
            setExpanded(new Set())
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    async function toggleExpand(sellerId: string, generation: number) {
        if (expanded.has(sellerId)) {
            setExpanded(prev => { const next = new Set(prev); next.delete(sellerId); return next })
            return
        }
        setExpanded(prev => new Set(prev).add(sellerId))

        if (!subReferrals[sellerId]) {
            setLoadingSub(prev => new Set(prev).add(sellerId))
            try {
                const result = await getReferralSubTree(sellerId, generation)
                if (result.success && result.referrals) {
                    setSubReferrals(prev => ({ ...prev, [sellerId]: result.referrals! }))
                }
            } catch {
                // silently fail
            }
            setLoadingSub(prev => { const next = new Set(prev); next.delete(sellerId); return next })
        }
    }

    function copyToClipboard(text: string, type: 'link' | 'code') {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopied(type)
                setTimeout(() => setCopied(null), 2000)
            })
            .catch(() => {})
    }

    function formatAmount(cents: number) {
        return (cents / 100).toFixed(2) + '\u00A0\u20AC'
    }

    // Loading skeleton
    if (loading && !data) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                    <div className="space-y-6">
                        <div>
                            <div className="h-7 rounded w-56 mb-2 skeleton-shimmer" />
                            <div className="h-4 rounded w-96 skeleton-shimmer" />
                        </div>
                        <div className="rounded-xl border border-gray-100 h-32 skeleton-shimmer" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-gray-100 h-20 skeleton-shimmer" />
                            <div className="rounded-xl border border-gray-100 h-20 skeleton-shimmer" />
                            <div className="rounded-xl border border-gray-100 h-20 skeleton-shimmer" />
                        </div>
                        <div className="rounded-xl border border-gray-100 h-48 skeleton-shimmer" />
                        <div className="rounded-xl border border-gray-100 h-32 skeleton-shimmer" />
                    </div>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !data) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">{t('errorTitle')}</p>
                    <button
                        onClick={() => loadData(page, debouncedSearch)}
                        className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                    >
                        {t('errorRetry')}
                    </button>
                </div>
            </div>
        )
    }

    if (!data) return null

    const gen = data.earningsByGeneration

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                {/* Header */}
                <motion.header variants={fadeInUp} transition={springGentle} className="mb-10">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">{t('title')}</h1>
                    <p className="text-gray-500 text-[15px]">{t('subtitle')}</p>
                    {data.referredBy && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-3 py-1.5">
                            <Users className="w-3.5 h-3.5 text-violet-500" />
                            <span className="text-xs text-violet-700">
                                {t('referredBy')} <span className="font-medium">{data.referredBy.name || data.referredBy.email}</span>
                            </span>
                        </div>
                    )}
                </motion.header>

                {/* Share Link Card */}
                <motion.div variants={fadeInUp} transition={springGentle} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 card-hover">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('yourLink')}</h3>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono truncate">
                            {data.referralLink}
                        </div>
                        <button
                            onClick={() => copyToClipboard(data.referralLink, 'link')}
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors btn-press"
                        >
                            {copied === 'link' ? <Check className={`w-3.5 h-3.5 copy-success`} /> : <Copy className="w-3.5 h-3.5" />}
                            {copied === 'link' ? t('copied') : t('copy')}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{t('code')}:</span>
                        <code className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {data.referralCode}
                        </code>
                        <button
                            onClick={() => copyToClipboard(data.referralCode, 'code')}
                            className="text-xs text-gray-400 hover:text-gray-600"
                        >
                            {copied === 'code' ? <Check className="w-3 h-3 inline copy-success" /> : <Copy className="w-3 h-3 inline" />}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Overview */}
                <motion.div variants={fadeInUp} transition={springGentle} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 card-hover">
                        <Users className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{data.stats.totalReferred}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.referred')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 card-hover">
                        <Coins className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{formatAmount(data.stats.totalEarnings)}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.earned')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 card-hover">
                        <TrendingUp className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{data.stats.totalCommissions}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.commissions')}</p>
                    </div>
                </motion.div>

                {/* Earnings by generation breakdown */}
                {gen && (
                    <motion.div variants={fadeInUp} transition={springGentle} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 card-hover">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('generations.title')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { key: 'gen1', label: t('gen1'), rate: '5%', data: gen.gen1, badgeColor: 'bg-violet-100 text-violet-700' },
                                { key: 'gen2', label: t('gen2'), rate: '3%', data: gen.gen2, badgeColor: 'bg-purple-100 text-purple-600' },
                                { key: 'gen3', label: t('gen3'), rate: '2%', data: gen.gen3, badgeColor: 'bg-fuchsia-100 text-fuchsia-500' },
                            ].map(g => (
                                <div key={g.key} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-medium text-gray-500">{g.label}</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full badge-pop ${g.badgeColor}`}>{g.rate}</span>
                                    </div>
                                    <p className="text-base font-semibold text-gray-900">{formatAmount(g.data.amount)}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {g.data.referredCount} {t('generations.sellers')} · {g.data.count} {t('generations.commissions')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ============ Referral Tree ============ */}
                <motion.div variants={fadeInUp} transition={springGentle} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 card-hover">
                    {/* Header with title + search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                {t('network')}
                            </h3>
                            {data.totalInNetwork > 0 && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {t('totalInNetwork', { count: data.totalInNetwork })}
                                </p>
                            )}
                        </div>
                        {data.stats.totalReferred > 0 && (
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder={t('searchPlaceholder')}
                                    className="w-full sm:w-56 pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-200 focus:border-violet-300 transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    {/* List */}
                    {data.referredSellers.length > 0 ? (
                        <>
                            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-0.5">
                                {data.referredSellers.map((seller: any) => (
                                    <div key={seller.id}>
                                        <ReferralRow
                                            seller={seller}
                                            generation={1}
                                            isExpanded={expanded.has(seller.id)}
                                            onToggle={() => toggleExpand(seller.id, 1)}
                                            locale={locale}
                                            formatAmount={formatAmount}
                                        />
                                        {/* Gen2 sub-list */}
                                        <SubReferralList
                                            sellerId={seller.id}
                                            generation={1}
                                            isExpanded={expanded.has(seller.id)}
                                            subReferrals={subReferrals[seller.id]}
                                            loadingSub={loadingSub.has(seller.id)}
                                            expanded={expanded}
                                            onToggle={toggleExpand}
                                            locale={locale}
                                            formatAmount={formatAmount}
                                            subReferralsMap={subReferrals}
                                            loadingSubSet={loadingSub}
                                        />
                                    </div>
                                ))}
                            </motion.div>

                            {/* Pagination */}
                            {data.pagination && data.pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                    <p className="text-[11px] text-gray-400">
                                        {t('page')} {data.pagination.page} / {data.pagination.totalPages}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page <= 1}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                                            disabled={page >= data.pagination.totalPages}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : debouncedSearch ? (
                        <div className="text-center py-8">
                            <motion.div variants={floatVariants} animate="float" className="inline-block">
                                <Search className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            </motion.div>
                            <p className="text-sm text-gray-400">{t('searchNoResults', { query: debouncedSearch })}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <motion.div variants={floatVariants} animate="float" className="inline-block">
                                <Share2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            </motion.div>
                            <p className="text-sm text-gray-400">{t('noReferrals')}</p>
                        </div>
                    )}
                </motion.div>

                {/* How it works (compact, at the bottom) */}
                <motion.div variants={fadeInUp} transition={springGentle} className="bg-white rounded-xl border border-gray-100 p-5 mb-6 card-hover">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('howItWorks')}</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-lg font-semibold text-violet-600 mb-1">5%</div>
                            <p className="text-[11px] text-gray-500">{t('gen1')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 1</p>
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-purple-500 mb-1">3%</div>
                            <p className="text-[11px] text-gray-500">{t('gen2')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 2</p>
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-fuchsia-400 mb-1">2%</div>
                            <p className="text-[11px] text-gray-500">{t('gen3')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 3</p>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center mt-4">{t('disclaimer')}</p>
                </motion.div>

                {/* CTA footer */}
                <motion.div variants={fadeInUp} transition={springGentle} className="text-center">
                    <Link
                        href="/affiliate"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {t('learnMore')}
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </motion.div>
            </div>
        </motion.div>
    )
}
