'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Loader2, ArrowRight } from 'lucide-react'
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
// CATEGORIES - Minimal, no emojis
// =============================================

const CATEGORIES = [
    { id: 'all', label: 'Tous' },
    { id: 'SaaS', label: 'SaaS' },
    { id: 'E-commerce', label: 'E-commerce' },
    { id: 'Finance', label: 'Finance' },
    { id: 'Health', label: 'Santé' },
    { id: 'Education', label: 'Éducation' },
    { id: 'Marketing', label: 'Marketing' },
]

// =============================================
// PROGRAM CARD - Ultra minimal
// =============================================

function ProgramCard({ mission, index }: { mission: Mission; index: number }) {
    const isEnrolled = mission.enrollment?.status === 'APPROVED'

    return (
        <Link href={`/seller/marketplace/${mission.id}`}>
            <article
                className="group relative bg-white rounded-2xl p-6 transition-all duration-500 ease-out hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1"
                style={{
                    animationDelay: `${index * 50}ms`,
                    opacity: 0,
                    animation: 'fadeSlideIn 0.6s ease-out forwards'
                }}
            >
                {/* Subtle border that appears on hover */}
                <div className="absolute inset-0 rounded-2xl border border-gray-100 group-hover:border-gray-200 transition-colors duration-300" />

                {/* Content */}
                <div className="relative">
                    {/* Logo + Status */}
                    <div className="flex items-start justify-between mb-6">
                        {mission.startup.logo_url ? (
                            <img
                                src={mission.startup.logo_url}
                                alt=""
                                className="w-11 h-11 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                                <span className="text-base font-medium text-gray-400">
                                    {mission.startup.name.charAt(0)}
                                </span>
                            </div>
                        )}

                        {isEnrolled && (
                            <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                Membre
                            </span>
                        )}
                    </div>

                    {/* Startup name */}
                    <h3 className="text-[15px] font-semibold text-gray-900 mb-1 tracking-tight">
                        {mission.startup.name}
                    </h3>

                    {/* Industry tag */}
                    {mission.startup.industry && (
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-4">
                            {mission.startup.industry}
                        </p>
                    )}

                    {/* Reward - The hero element */}
                    <div className="flex items-baseline gap-1.5 mb-4">
                        <span className="text-2xl font-semibold tracking-tight text-gray-900">
                            {mission.reward}
                        </span>
                        <span className="text-xs text-gray-400">
                            par conversion
                        </span>
                    </div>

                    {/* Hover reveal: Arrow */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-xs text-gray-400">
                            {mission.partners_count} partenaire{mission.partners_count !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1 text-gray-400 group-hover:text-violet-500 transition-colors duration-300">
                            <span className="text-xs font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                Explorer
                            </span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                    </div>
                </div>
            </article>
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
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchFocused, setSearchFocused] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    async function loadMissions() {
        setLoading(true)
        const result = await getMarketplaceMissions({
            search: search || undefined,
            industry: selectedCategory === 'all' ? undefined : selectedCategory
        })

        if (result.success && result.missions) {
            setMissions(result.missions as Mission[])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMissions()
    }, [selectedCategory])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadMissions()
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Keyboard shortcut for search
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.key === 'Escape') {
                searchRef.current?.blur()
                setSearch('')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes fadeSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <div className="max-w-5xl mx-auto px-6 py-16">
                {/* Header - Minimal */}
                <header className="text-center mb-12">
                    <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">
                        Programmes
                    </h1>
                    <p className="text-gray-500 text-[15px]">
                        Trouvez le programme qui vous correspond
                    </p>
                </header>

                {/* Search - Spotlight inspired */}
                <div className="max-w-xl mx-auto mb-12">
                    <div
                        className={`relative transition-all duration-300 ${
                            searchFocused
                                ? 'transform scale-[1.02]'
                                : ''
                        }`}
                    >
                        <div className={`
                            relative bg-white rounded-2xl transition-all duration-300
                            ${searchFocused
                                ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.15),0_8px_40px_-12px_rgba(0,0,0,0.1)]'
                                : 'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)]'
                            }
                        `}>
                            <Search className={`
                                absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200
                                ${searchFocused ? 'text-violet-500' : 'text-gray-300'}
                            `} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder="Rechercher..."
                                className="w-full pl-14 pr-20 py-4 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none rounded-2xl"
                            />
                            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 bg-gray-50 rounded-lg font-medium">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Categories - Subtle pills */}
                <nav className="flex items-center justify-center gap-1 mb-12 flex-wrap">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`
                                px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200
                                ${selectedCategory === cat.id
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }
                            `}
                        >
                            {cat.label}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="text-center py-32">
                        <p className="text-gray-400 text-[15px] mb-2">
                            Aucun programme trouvé
                        </p>
                        {(search || selectedCategory !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearch('')
                                    setSelectedCategory('all')
                                }}
                                className="text-[13px] text-violet-500 hover:text-violet-600 font-medium"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Results count - Very subtle */}
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-6 text-center">
                            {missions.length} programme{missions.length !== 1 ? 's' : ''}
                        </p>

                        {/* Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {missions.map((mission, index) => (
                                <ProgramCard
                                    key={mission.id}
                                    mission={mission}
                                    index={index}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
