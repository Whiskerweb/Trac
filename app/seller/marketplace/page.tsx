'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    Search, Loader2, ChevronRight, Users, ExternalLink,
    Sparkles, X, SlidersHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { getMarketplaceMissions } from '@/app/actions/marketplace-actions'

// =============================================
// TYPES
// =============================================

interface Mission {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    industry: string | null
    gain_type: string | null
    startup: {
        name: string
        slug: string
        logo_url: string | null
        industry: string | null
        description: string | null
        website_url: string | null
    }
    workspace_name: string
    has_resources: boolean
    partners_count: number
    enrollment: { status: string; linkSlug?: string } | null
    request: { status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null
}

// =============================================
// INDUSTRY FILTERS
// =============================================

const INDUSTRIES = [
    { id: 'all', label: 'Tous', icon: '✨' },
    { id: 'SaaS', label: 'SaaS', icon: '💻' },
    { id: 'E-commerce', label: 'E-commerce', icon: '🛒' },
    { id: 'Finance', label: 'Finance', icon: '💰' },
    { id: 'Health', label: 'Santé', icon: '🏥' },
    { id: 'Education', label: 'Éducation', icon: '📚' },
    { id: 'Marketing', label: 'Marketing', icon: '📣' },
    { id: 'Tech', label: 'Tech', icon: '🚀' },
]

// =============================================
// MISSION CARD - Minimalist Design
// =============================================

function MissionCard({ mission }: { mission: Mission }) {
    const isEnrolled = mission.enrollment?.status === 'APPROVED'
    const isPending = mission.request?.status === 'PENDING'

    return (
        <Link href={`/seller/marketplace/${mission.id}`}>
            <div className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer h-full flex flex-col">
                {/* Header: Startup info */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Logo */}
                    {mission.startup.logo_url ? (
                        <img
                            src={mission.startup.logo_url}
                            alt={mission.startup.name}
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                            {mission.startup.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Startup name & industry */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                            {mission.startup.name}
                        </h3>
                        {mission.startup.industry && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {mission.startup.industry}
                            </p>
                        )}
                    </div>

                    {/* Status badge */}
                    {isEnrolled ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                            Rejoint
                        </span>
                    ) : isPending ? (
                        <span className="px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                            En attente
                        </span>
                    ) : null}
                </div>

                {/* Mission title */}
                <h4 className="text-base font-medium text-gray-800 mb-2 line-clamp-1">
                    {mission.title}
                </h4>

                {/* Description */}
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                    {mission.description || 'Rejoignez ce programme et gagnez des commissions sur chaque conversion.'}
                </p>

                {/* Footer: Reward & Partners */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-semibold text-violet-600">{mission.reward}</span>
                        <span className="text-xs text-gray-400">/ conversion</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>{mission.partners_count}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                </div>
            </div>
        </Link>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function SellerMarketplacePage() {
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedIndustry, setSelectedIndustry] = useState('all')
    const [showFilters, setShowFilters] = useState(false)

    async function loadMissions() {
        setLoading(true)
        const result = await getMarketplaceMissions({
            search: search || undefined,
            industry: selectedIndustry === 'all' ? undefined : selectedIndustry
        })

        if (result.success && result.missions) {
            setMissions(result.missions as Mission[])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMissions()
    }, [selectedIndustry])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadMissions()
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Filter missions client-side for instant feedback
    const filteredMissions = useMemo(() => {
        return missions
    }, [missions])

    // Get unique industries from missions for dynamic filter
    const availableIndustries = useMemo(() => {
        const industries = new Set<string>()
        missions.forEach(m => {
            if (m.startup.industry) industries.add(m.startup.industry)
            if (m.industry) industries.add(m.industry)
        })
        return Array.from(industries)
    }, [missions])

    const activeFiltersCount = (selectedIndustry !== 'all' ? 1 : 0) + (search ? 1 : 0)

    return (
        <div className="min-h-screen bg-[#FAFAFB]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-6 h-6 text-violet-500" />
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Marketplace
                        </h1>
                    </div>
                    <p className="text-gray-500">
                        Découvrez des programmes d'affiliation et commencez à générer des revenus.
                    </p>
                </div>

                {/* Search & Filters Bar */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher une startup ou un programme..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    showFilters || activeFiltersCount > 0
                                        ? 'bg-violet-50 text-violet-700'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Filtres
                                {activeFiltersCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-violet-600 text-white text-xs rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Industry Filters */}
                    {showFilters && (
                        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                Secteur d'activité
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {INDUSTRIES.map((industry) => (
                                    <button
                                        key={industry.id}
                                        onClick={() => setSelectedIndustry(industry.id)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            selectedIndustry === industry.id
                                                ? 'bg-violet-600 text-white shadow-sm'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <span>{industry.icon}</span>
                                        {industry.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick filters - always visible */}
                    {!showFilters && (
                        <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            {INDUSTRIES.slice(0, 6).map((industry) => (
                                <button
                                    key={industry.id}
                                    onClick={() => setSelectedIndustry(industry.id)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                        selectedIndustry === industry.id
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <span>{industry.icon}</span>
                                    {industry.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results count */}
                {!loading && (
                    <p className="text-sm text-gray-500 mb-4">
                        {filteredMissions.length} programme{filteredMissions.length !== 1 ? 's' : ''} disponible{filteredMissions.length !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                    </div>
                ) : filteredMissions.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                        <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-6 h-6 text-violet-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Aucun programme trouvé
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {search
                                ? `Aucun résultat pour "${search}"`
                                : 'Aucun programme disponible dans cette catégorie.'}
                        </p>
                        {(search || selectedIndustry !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearch('')
                                    setSelectedIndustry('all')
                                }}
                                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                Réinitialiser les filtres
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMissions.map((mission) => (
                            <MissionCard key={mission.id} mission={mission} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
