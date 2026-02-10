'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Users, Coins, TrendingUp, ExternalLink, AlertCircle, ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import { getMyReferralData } from '@/app/actions/sellers'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function ReferralPage() {
    const t = useTranslations('sellerReferral')
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState<'link' | 'code' | null>(null)
    const [page, setPage] = useState(1)

    const loadData = useCallback((p: number = 1) => {
        setLoading(true)
        setError(false)
        getMyReferralData(p).then(result => {
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
        loadData(page)
    }, [loadData, page])

    function copyToClipboard(text: string, type: 'link' | 'code') {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    function formatAmount(cents: number) {
        return (cents / 100).toFixed(2) + '€'
    }

    // Loading skeleton
    if (loading && !data) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                    <div className="animate-pulse space-y-6">
                        <div>
                            <div className="h-7 bg-gray-200 rounded w-56 mb-2" />
                            <div className="h-4 bg-gray-100 rounded w-96" />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-32" />
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-24" />
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                            <div className="bg-white rounded-xl border border-gray-100 p-4 h-20" />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-32" />
                        <div className="bg-white rounded-xl border border-gray-100 p-5 h-48" />
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
                        onClick={() => loadData(page)}
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
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                {/* Header */}
                <header className="mb-10">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">{t('title')}</h1>
                    <p className="text-gray-500 text-[15px]">{t('subtitle')}</p>
                </header>

                {/* How it works */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('howItWorks')}</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-lg font-semibold text-violet-600 mb-1">5%</div>
                            <p className="text-[11px] text-gray-500">{t('gen1')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 1</p>
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-violet-500 mb-1">3%</div>
                            <p className="text-[11px] text-gray-500">{t('gen2')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 2</p>
                        </div>
                        <div>
                            <div className="text-lg font-semibold text-violet-400 mb-1">2%</div>
                            <p className="text-[11px] text-gray-500">{t('gen3')}</p>
                            <p className="text-[10px] text-gray-400">{t('generation')} 3</p>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center mt-4">{t('disclaimer')}</p>
                </div>

                {/* Share section */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('yourLink')}</h3>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono truncate">
                            {data.referralLink}
                        </div>
                        <button
                            onClick={() => copyToClipboard(data.referralLink, 'link')}
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors"
                        >
                            {copied === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
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
                            {copied === 'code' ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <Users className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{data.stats.totalReferred}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.referred')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <Coins className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{formatAmount(data.stats.totalEarnings)}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.earned')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <TrendingUp className="w-4 h-4 text-gray-400 mb-2" />
                        <p className="text-xl font-semibold text-gray-900">{data.stats.totalCommissions}</p>
                        <p className="text-[11px] text-gray-400">{t('stats.commissions')}</p>
                    </div>
                </div>

                {/* Earnings by generation */}
                {gen && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('generations.title')}</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { key: 'gen1', label: t('gen1'), rate: '5%', data: gen.gen1, color: 'violet-600' },
                                { key: 'gen2', label: t('gen2'), rate: '3%', data: gen.gen2, color: 'violet-500' },
                                { key: 'gen3', label: t('gen3'), rate: '2%', data: gen.gen3, color: 'violet-400' },
                            ].map(g => (
                                <div key={g.key} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-medium text-gray-500">{g.label}</span>
                                        <span className={`text-[10px] font-semibold text-${g.color}`}>{g.rate}</span>
                                    </div>
                                    <p className="text-base font-semibold text-gray-900">{formatAmount(g.data.amount)}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {g.data.referredCount} {t('generations.sellers')} · {g.data.count} {t('generations.commissions')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Referred by */}
                {data.referredBy && (
                    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
                        <p className="text-xs text-gray-400 mb-1">{t('referredBy')}</p>
                        <p className="text-sm font-medium text-gray-900">{data.referredBy.name || data.referredBy.email}</p>
                    </div>
                )}

                {/* Referred sellers list */}
                <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
                        {t('yourReferrals')} ({data.pagination?.total ?? data.referredSellers.length})
                    </h3>

                    {data.referredSellers.length > 0 ? (
                        <>
                            <div className="space-y-3">
                                {data.referredSellers.map((seller: any) => (
                                    <div key={seller.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{seller.name || seller.email}</p>
                                            <p className="text-[11px] text-gray-400">
                                                {t('joined')} {new Date(seller.joinedAt).toLocaleDateString()} · {seller.salesCount} {t('sales')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3 shrink-0">
                                            {seller.earningsFromThem > 0 && (
                                                <span className="text-[11px] font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                                    {formatAmount(seller.earningsFromThem)} {t('earnedFromThem')}
                                                </span>
                                            )}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                seller.status === 'APPROVED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {seller.status === 'APPROVED' ? t('active') : seller.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

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
                    ) : (
                        <div className="text-center py-8">
                            <Share2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm text-gray-400">{t('noReferrals')}</p>
                        </div>
                    )}
                </div>

                {/* CTA footer */}
                <div className="text-center">
                    <Link
                        href="/affiliate"
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {t('learnMore')}
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
