'use client'

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Loader2, ChevronRight, ChevronDown, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
    fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants
} from '@/lib/animations'
import { getAllPlatformSellers } from '@/app/actions/sellers'
import { getMySellers, type MySeller } from '@/app/actions/sellers'
import { RequestsTab } from '@/components/dashboard/sellers/RequestsTab'
import { OrganizationsTab } from '@/components/dashboard/sellers/OrganizationsTab'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

// =============================================
// TYPES
// =============================================

interface PlatformSeller {
    id: string
    name: string
    avatar: string
    avatarUrl?: string | null
    status: 'active' | 'pending' | 'inactive'
    activityType: string
    country?: string | null
    globalStats: {
        totalClicks: number
        totalSales: number
        totalEarnings: number
        totalPayout: number
        conversionRate: number
        activeMissions: number
    }
}

// =============================================
// CONSTANTS
// =============================================

const COUNTRIES = [
    { value: 'FR', label: 'France' },
    { value: 'US', label: 'États-Unis' },
    { value: 'GB', label: 'Royaume-Uni' },
    { value: 'DE', label: 'Allemagne' },
    { value: 'ES', label: 'Espagne' },
    { value: 'IT', label: 'Italie' },
    { value: 'CA', label: 'Canada' },
    { value: 'BE', label: 'Belgique' },
    { value: 'CH', label: 'Suisse' }
]

const INDUSTRIES = [
    { value: 'SaaS', label: 'SaaS' },
    { value: 'E-commerce', label: 'E-commerce' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Education', label: 'Éducation' },
    { value: 'Healthcare', label: 'Health' },
    { value: 'Real Estate', label: 'Immobilier' }
]

const ACTIVITY_TYPES = [
    { value: 'CONTENT_CREATOR', label: 'Content creator' },
    { value: 'SALES_REP', label: 'Commercial' },
    { value: 'INFLUENCER', label: 'Influenceur' },
    { value: 'MARKETER', label: 'Marketeur' },
    { value: 'BLOGGER', label: 'Blogueur' },
    { value: 'DEVELOPER', label: 'Developer' },
    { value: 'CONSULTANT', label: 'Consultant' },
    { value: 'OTHER', label: 'Autre' }
]

// =============================================
// UTILS
// =============================================

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount)
}

function formatNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString('fr-FR')
}

// =============================================
// COMPONENTS
// =============================================

function Avatar({ initials, imageUrl }: { initials: string; imageUrl?: string }) {
    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={initials}
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
        )
    }

    return (
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px] tracking-tight">
            {initials}
        </div>
    )
}

function StatusBadge({ status }: { status: 'active' | 'pending' | 'inactive' }) {
    const t = useTranslations('dashboard.sellers.applications.statusLabels')
    const styles = {
        active: 'bg-green-50 text-green-700',
        pending: 'bg-orange-50 text-orange-700',
        inactive: 'bg-gray-100 text-gray-500'
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium badge-pop ${styles[status]}`}>
            {t(status)}
        </span>
    )
}

function FilterDropdown({ label, options, selected, onChange }: {
    label: string
    options: { value: string; label: string }[]
    selected: string[]
    onChange: (values: string[]) => void
}) {
    const [isOpen, setIsOpen] = useState(false)

    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value))
        } else {
            onChange([...selected, value])
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 hover:border-slate-900 transition-colors"
            >
                {label}
                {selected.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded font-bold">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 max-h-64 overflow-y-auto">
                        {options.map(option => (
                            <label
                                key={option.value}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option.value)}
                                    onChange={() => toggleOption(option.value)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-xs font-medium text-slate-700">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// =============================================
// LOADING FALLBACK
// =============================================

function SellersLoading() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-7 w-32 rounded-lg skeleton-shimmer" />
                <div className="h-10 w-64 rounded-lg skeleton-shimmer" />
            </div>
            <div className="h-10 w-full max-w-xs rounded-lg skeleton-shimmer" />
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-16 border-b border-slate-100 skeleton-shimmer" />
                ))}
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE (Suspense wrapper)
// =============================================

export default function SellersPage() {
    return (
        <Suspense fallback={<SellersLoading />}>
            <SellersContent />
        </Suspense>
    )
}

// =============================================
// SELLERS CONTENT
// =============================================

function SellersContent() {
    const t = useTranslations('dashboard.sellers')
    const tApp = useTranslations('dashboard.sellers.applications')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const searchParams = useSearchParams()

    const viewParam = searchParams.get('view')
    const currentView = (['all', 'my', 'requests', 'orgs'] as const).includes(viewParam as any)
        ? viewParam as 'all' | 'my' | 'requests' | 'orgs'
        : 'all'

    // All sellers state
    const [allLoading, setAllLoading] = useState(true)
    const [allSellers, setAllSellers] = useState<PlatformSeller[]>([])
    const [allSearchQuery, setAllSearchQuery] = useState('')
    const [selectedCountries, setSelectedCountries] = useState<string[]>([])
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([])

    // My sellers state
    const [myLoading, setMyLoading] = useState(true)
    const [mySellers, setMySellers] = useState<MySeller[]>([])
    const [myStats, setMyStats] = useState({ total: 0, active: 0, totalClicks: 0, totalCommissions: 0 })
    const [mySearchQuery, setMySearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

    // Load all sellers
    const loadAllSellers = useCallback(async () => {
        setAllLoading(true)
        try {
            const result = await getAllPlatformSellers({
                search: allSearchQuery,
                countries: selectedCountries,
                industries: selectedIndustries,
                activityTypes: selectedActivityTypes
            })
            if (result.success && result.sellers) {
                setAllSellers(result.sellers)
            } else {
                setAllSellers([])
            }
        } catch {
            setAllSellers([])
        } finally {
            setAllLoading(false)
        }
    }, [allSearchQuery, selectedCountries, selectedIndustries, selectedActivityTypes])

    // Load my sellers
    const loadMySellers = useCallback(async (silent = false) => {
        if (!silent) setMyLoading(true)
        try {
            const result = await getMySellers()
            if (result.success) {
                setMySellers(result.sellers || [])
                setMyStats(result.stats || { total: 0, active: 0, totalClicks: 0, totalCommissions: 0 })
            }
        } catch {
            // silent
        } finally {
            if (!silent) setMyLoading(false)
        }
    }, [])

    // Initial load for both datasets
    useEffect(() => {
        loadAllSellers()
        loadMySellers()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch all sellers when filters change
    useEffect(() => {
        loadAllSellers()
    }, [selectedCountries, selectedIndustries, selectedActivityTypes]) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-refresh my sellers every 30s (only when My view is active)
    useEffect(() => {
        if (currentView !== 'my') return
        const interval = setInterval(() => loadMySellers(true), 30000)
        return () => clearInterval(interval)
    }, [currentView, loadMySellers])

    // Switch view
    const switchView = (view: 'all' | 'my' | 'requests' | 'orgs') => {
        if (view === 'all') {
            router.replace('/dashboard/sellers')
        } else {
            router.replace(`/dashboard/sellers?view=${view}`)
        }
    }

    // Filter all sellers by search
    const filteredAllSellers = useMemo(() => {
        if (!allSearchQuery) return allSellers
        return allSellers.filter(s =>
            s.name.toLowerCase().includes(allSearchQuery.toLowerCase())
        )
    }, [allSellers, allSearchQuery])

    // Filter my sellers by search + status
    const filteredMySellers = useMemo(() => {
        return mySellers.filter(s => {
            const matchesSearch = mySearchQuery === '' ||
                s.name.toLowerCase().includes(mySearchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || s.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [mySellers, mySearchQuery, statusFilter])

    return (
        <div className="relative min-h-screen">
            <div className="fixed inset-0 bg-grid-small-black opacity-[0.015] pointer-events-none" />

            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="relative space-y-4 pb-20">
                {/* Header + Tab Toggle */}
                <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">
                            {t('title')}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {currentView === 'all' ? t('discover') : tApp('sellersWillAppear').replace('Sellers will appear here when they join your missions', t('discover'))}
                        </p>
                    </div>

                    {/* Tab Toggle */}
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-x-auto bg-white">
                        {([
                            { key: 'all', label: t('viewAll') },
                            { key: 'my', label: t('viewMy') },
                            { key: 'requests', label: t('viewRequests') },
                            { key: 'orgs', label: t('viewOrgs') },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => switchView(tab.key)}
                                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors btn-press flex-shrink-0 ${
                                    currentView === tab.key
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* === ALL SELLERS VIEW === */}
                {currentView === 'all' && (
                    <>
                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={allSearchQuery}
                                    onChange={(e) => setAllSearchQuery(e.target.value)}
                                    placeholder={t('searchPlaceholder')}
                                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <FilterDropdown
                                    label={t('country')}
                                    options={COUNTRIES}
                                    selected={selectedCountries}
                                    onChange={setSelectedCountries}
                                />
                                <FilterDropdown
                                    label={t('industries')}
                                    options={INDUSTRIES}
                                    selected={selectedIndustries}
                                    onChange={setSelectedIndustries}
                                />
                                <FilterDropdown
                                    label={t('activityType')}
                                    options={ACTIVITY_TYPES}
                                    selected={selectedActivityTypes}
                                    onChange={setSelectedActivityTypes}
                                />
                                {(selectedCountries.length > 0 || selectedIndustries.length > 0 || selectedActivityTypes.length > 0) && (
                                    <button
                                        onClick={() => {
                                            setSelectedCountries([])
                                            setSelectedIndustries([])
                                            setSelectedActivityTypes([])
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        {t('reset')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        {allLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <TraaactionLoader size={20} className="text-gray-400" />
                            </div>
                        ) : filteredAllSellers.length === 0 ? (
                            <div className="border border-slate-200 rounded-xl p-12 text-center bg-white">
                                <div className="w-10 h-10 border-2 border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Search className="w-5 h-5 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">
                                    {t('noSellerFound')}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {t('tryModifying')}
                                </p>
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                                <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {t('seller')}
                                                </th>
                                                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {tCommon('clicks')}
                                                </th>
                                                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {t('revenue')}
                                                </th>
                                                <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {t('payout')}
                                                </th>
                                                <th className="w-12"></th>
                                            </tr>
                                        </thead>
                                        <motion.tbody variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                                            {filteredAllSellers.map((seller) => (
                                                <motion.tr
                                                    key={seller.id}
                                                    variants={staggerItem}
                                                    transition={springGentle}
                                                    onClick={() => router.push(`/dashboard/sellers/${seller.id}`)}
                                                    className="hover:bg-slate-50 cursor-pointer transition-colors group row-hover"
                                                >
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl || undefined} />
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-slate-900 truncate text-xs">
                                                                    {seller.name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-400 truncate">
                                                                    {seller.activityType}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs font-semibold text-slate-900">
                                                            {formatNumber(seller.globalStats.totalClicks)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-slate-900">
                                                            {formatCurrency(seller.globalStats.totalEarnings / 100)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-xs font-bold text-green-600">
                                                            {formatCurrency(seller.globalStats.totalPayout / 100)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="inline-flex items-center justify-center w-7 h-7 border border-slate-200 rounded-lg group-hover:border-slate-900 group-hover:bg-slate-900 transition-all">
                                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </motion.tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden divide-y divide-slate-100">
                                    {filteredAllSellers.map((seller) => (
                                        <div
                                            key={seller.id}
                                            onClick={() => router.push(`/dashboard/sellers/${seller.id}`)}
                                            className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl || undefined} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-900 text-sm">
                                                        {seller.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {seller.activityType}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                                                        {tCommon('clicks')}
                                                    </div>
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {formatNumber(seller.globalStats.totalClicks)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                                                        {t('revenue')}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {formatCurrency(seller.globalStats.totalEarnings / 100)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                                                        {t('payout')}
                                                    </div>
                                                    <div className="text-sm font-bold text-green-600">
                                                        {formatCurrency(seller.globalStats.totalPayout / 100)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* === MY SELLERS VIEW === */}
                {currentView === 'my' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 bg-white border border-slate-200 rounded-xl">
                            <div>
                                <p className="text-xs sm:text-sm text-slate-500">{tApp('totalSellers')}</p>
                                <p className="text-xl sm:text-2xl font-semibold text-slate-900">{myStats.total}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-500">{tApp('active')}</p>
                                <p className="text-xl sm:text-2xl font-semibold text-green-600">{myStats.active}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-500">{tApp('totalClicks')}</p>
                                <p className="text-xl sm:text-2xl font-semibold text-slate-900">{formatNumber(myStats.totalClicks)}</p>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-500">{tApp('commissionsPaid')}</p>
                                <p className="text-xl sm:text-2xl font-semibold text-slate-900">{formatCurrency(myStats.totalCommissions / 100)}</p>
                            </div>
                        </div>

                        {/* Search and Status Filter */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1 sm:max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={tApp('searchPlaceholder')}
                                    value={mySearchQuery}
                                    onChange={(e) => setMySearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                                {(['all', 'active', 'pending', 'inactive'] as const).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium transition-colors ${statusFilter === status
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {status === 'all' && tApp('all')}
                                        {status === 'active' && tApp('actives')}
                                        {status === 'pending' && tApp('pending')}
                                        {status === 'inactive' && tApp('inactives')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* My Sellers Table */}
                        {myLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <TraaactionLoader size={20} className="text-gray-400" />
                            </div>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                    <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-2">{tApp('seller')}</div>
                                        <div>{tApp('status')}</div>
                                        <div>{tApp('missions')}</div>
                                        <div>{tApp('clicks')}</div>
                                        <div className="text-right">{tApp('commissions')}</div>
                                        <div></div>
                                    </div>

                                    {filteredMySellers.length === 0 ? (
                                        <div className="px-6 py-12 text-center">
                                            <motion.div variants={floatVariants} animate="float" className="inline-block">
                                                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            </motion.div>
                                            <p className="text-slate-900 font-medium">{tApp('noSellerFound')}</p>
                                            <p className="text-slate-500 text-sm mt-1">
                                                {tApp('sellersWillAppear')}
                                            </p>
                                        </div>
                                    ) : (
                                        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-slate-50">
                                            {filteredMySellers.map((seller) => (
                                                <motion.div
                                                    key={seller.id}
                                                    variants={staggerItem}
                                                    transition={springGentle}
                                                    onClick={() => router.push(`/dashboard/sellers/applications/${seller.id}`)}
                                                    className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-slate-50 cursor-pointer transition-colors group row-hover"
                                                >
                                                    <div className="col-span-2 flex items-center gap-3">
                                                        <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl} />
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{seller.name}</p>
                                                            <p className="text-xs text-slate-500">{seller.activityType}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <StatusBadge status={seller.status} />
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        {seller.missionsCount}
                                                    </div>
                                                    <div className="text-sm text-slate-600">
                                                        {formatNumber(seller.totalClicks)}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-medium text-green-600">
                                                            {formatCurrency(seller.commissionEarned / 100)}
                                                        </span>
                                                        {seller.totalSales > 0 && (
                                                            <span className="block text-xs text-slate-400">
                                                                {seller.totalSales} {seller.totalSales > 1 ? tApp('sales') : tApp('sale')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden">
                                    {filteredMySellers.length === 0 ? (
                                        <div className="px-6 py-12 text-center">
                                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-900 font-medium">{tApp('noSellerFound')}</p>
                                            <p className="text-slate-500 text-sm mt-1">
                                                {tApp('sellersWillAppear')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-50">
                                            {filteredMySellers.map((seller) => (
                                                <div
                                                    key={seller.id}
                                                    onClick={() => router.push(`/dashboard/sellers/applications/${seller.id}`)}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="text-sm font-medium text-slate-900">{seller.name}</p>
                                                                <StatusBadge status={seller.status} />
                                                            </div>
                                                            <p className="text-xs text-slate-500">{seller.activityType}</p>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-0.5">{tApp('missions')}</div>
                                                            <div className="text-sm text-slate-900">{seller.missionsCount}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-slate-500 mb-0.5">{tApp('clicks')}</div>
                                                            <div className="text-sm text-slate-900">{formatNumber(seller.totalClicks)}</div>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <div className="text-xs text-slate-500 mb-0.5">{tApp('commissions')}</div>
                                                            <div className="text-sm font-medium text-green-600">
                                                                {formatCurrency(seller.commissionEarned / 100)}
                                                            </div>
                                                            {seller.totalSales > 0 && (
                                                                <div className="text-xs text-slate-400 mt-0.5">
                                                                    {seller.totalSales} {seller.totalSales > 1 ? tApp('sales') : tApp('sale')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* === REQUESTS VIEW === */}
                {currentView === 'requests' && <RequestsTab />}

                {/* === ORGANIZATIONS VIEW === */}
                {currentView === 'orgs' && <OrganizationsTab />}
            </motion.div>
        </div>
    )
}
