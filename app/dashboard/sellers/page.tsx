'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getAllPlatformSellers } from '@/app/actions/sellers'

// =============================================
// TYPES
// =============================================

interface Seller {
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
// MAIN PAGE
// =============================================

export default function AllSellersPage() {
    const t = useTranslations('dashboard.sellers')
    const tCommon = useTranslations('common')
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sellers, setSellers] = useState<Seller[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCountries, setSelectedCountries] = useState<string[]>([])
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([])

    // Load sellers
    useEffect(() => {
        loadSellers()
    }, [selectedCountries, selectedIndustries, selectedActivityTypes])

    async function loadSellers() {
        setLoading(true)
        try {
            const result = await getAllPlatformSellers({
                search: searchQuery,
                countries: selectedCountries,
                industries: selectedIndustries,
                activityTypes: selectedActivityTypes
            })
            if (result.success && result.sellers) {
                setSellers(result.sellers)
            } else {
                console.error('Failed to load sellers:', result.error)
                setSellers([])
            }
        } catch (error) {
            console.error('Error loading sellers:', error)
            setSellers([])
        } finally {
            setLoading(false)
        }
    }

    // Filter sellers by search
    const filteredSellers = useMemo(() => {
        if (!searchQuery) return sellers

        return sellers.filter(seller =>
            seller.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [sellers, searchQuery])

    return (
        <div className="relative min-h-screen">
            {/* Subtle grid background */}
            <div className="fixed inset-0 bg-grid-small-black opacity-[0.015] pointer-events-none" />

            <div className="relative space-y-4 pb-20">
                {/* Header */}
                <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                        {t('allSellers')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {t('discover')}
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
                        />
                    </div>

                    {/* Filters */}
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

                    {/* Clear filters */}
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

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                    </div>
                ) : filteredSellers.length === 0 ? (
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
                            <tbody className="divide-y divide-slate-100">
                                {filteredSellers.map((seller) => (
                                    <tr
                                        key={seller.id}
                                        onClick={() => router.push(`/dashboard/sellers/${seller.id}`)}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
