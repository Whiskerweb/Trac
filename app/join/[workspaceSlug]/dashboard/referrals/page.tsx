'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Check, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalReferrals } from '@/app/actions/portal'
import { portalPath } from '@/components/portal/portal-utils'

interface ReferralSeller {
    id: string
    name: string | null
    email: string
    status: string
    joinedAt: string
    salesCount: number
    totalEarnings: number
    subReferralCount: number
}

interface ReferralStats {
    totalReferred: number
    totalEarnings: number
    genStats: {
        gen1: { amount: number; count: number }
        gen2: { amount: number; count: number }
        gen3: { amount: number; count: number }
    }
}

export default function PortalReferralsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.referrals')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [referrals, setReferrals] = useState<ReferralSeller[]>([])
    const [stats, setStats] = useState<ReferralStats | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'
    const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}${portalPath(workspaceSlug)}?ref=${data.referralCode}`

    const loadReferrals = useCallback(async (p: number, s?: string) => {
        setLoading(true)
        const result = await getPortalReferrals(workspaceSlug, p, s || undefined)
        if (result.success && result.data) {
            setReferrals(result.data.referrals)
            setStats(result.data.stats)
            setPage(result.data.pagination.page)
            setTotalPages(result.data.pagination.totalPages)
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadReferrals(1) }, [loadReferrals])

    const handleSearch = (val: string) => {
        setSearch(val)
        const timeout = setTimeout(() => loadReferrals(1, val), 300)
        return () => clearTimeout(timeout)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-5">
            {/* Referral Link */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-sm font-semibold text-gray-900 mb-3">{t('yourLink')}</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 overflow-hidden">
                            <code className="text-xs text-gray-700 break-all">{referralLink}</code>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-4 py-3 text-white rounded-xl text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? t('copyLink') : t('copyLink')}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Row */}
            {stats && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{stats.totalReferred}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('totalReferred')}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{(stats.totalEarnings / 100).toFixed(0)}&euro;</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('totalEarnings')}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>5%</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('gen1')}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">{(stats.genStats.gen1.amount / 100).toFixed(0)}&euro;</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <p className="text-lg font-bold" style={{ color: primaryColor }}>3% / 2%</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('gen2')} / {t('gen3')}</p>
                        <p className="text-xs font-semibold text-gray-700 mt-1">{((stats.genStats.gen2.amount + stats.genStats.gen3.amount) / 100).toFixed(0)}&euro;</p>
                    </div>
                </motion.div>
            )}

            {/* Referred sellers list */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
            >
                {/* Search */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder={t('search')}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    </div>
                ) : referrals.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">{t('noReferrals')}</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            {referrals.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50/50 transition-colors">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {(r.name || r.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{r.name || r.email}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {new Date(r.joinedAt).toLocaleDateString()} &middot; {r.salesCount} sales
                                            {r.subReferralCount > 0 && ` · ${r.subReferralCount} referrals`}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">{(r.totalEarnings / 100).toFixed(0)}&euro;</span>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button
                                    onClick={() => loadReferrals(page - 1, search)}
                                    disabled={page <= 1}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                                <button
                                    onClick={() => loadReferrals(page + 1, search)}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    )
}
