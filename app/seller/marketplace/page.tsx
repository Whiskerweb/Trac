'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getMarketplaceMissions } from '@/app/actions/marketplace-actions'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'

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
    // Multi-commission fields
    lead_enabled: boolean
    lead_reward_amount: number | null
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
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

// Helper to format reward display
function formatRewardAmount(amount: number | null, structure: string | null): string {
    if (amount === null) return ''
    if (structure === 'PERCENTAGE') {
        return `${amount}%`
    }
    return `${amount}€`
}

// Helper to check if mission has multiple commission types
function hasMultipleCommissions(mission: Mission): boolean {
    const enabledCount = [
        mission.lead_enabled,
        mission.sale_enabled,
        mission.recurring_enabled
    ].filter(Boolean).length
    return enabledCount > 1
}

// =============================================
// CATEGORIES - Minimal, no emojis
// =============================================

// Must match exactly the INDUSTRIES from startup profile creation
// Main categories shown by default
const MAIN_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'SaaS', label: 'SaaS' },
    { id: 'E-commerce', label: 'E-commerce' },
    { id: 'FinTech', label: 'FinTech' },
    { id: 'AI / ML', label: 'AI / ML' },
    { id: 'MarTech', label: 'Marketing' },
]

// Secondary categories shown when expanded
const MORE_CATEGORIES = [
    { id: 'HealthTech', label: 'Health' },
    { id: 'EdTech', label: 'Education' },
    { id: 'Cybersecurity', label: 'Cyber' },
    { id: 'CleanTech', label: 'CleanTech' },
    { id: 'FoodTech', label: 'Food' },
    { id: 'PropTech', label: 'Real Estate' },
    { id: 'LegalTech', label: 'Legal' },
    { id: 'HRTech', label: 'HR' },
    { id: 'Gaming', label: 'Gaming' },
    { id: 'Media', label: 'Media' },
    { id: 'Marketplace', label: 'Marketplace' },
    { id: 'B2B Services', label: 'B2B' },
    { id: 'Consumer Apps', label: 'Consumer' },
]

// =============================================
// PROGRAM ROW - Full width minimalist row
// =============================================

function ProgramRow({ mission, index }: { mission: Mission; index: number }) {
    return (
        <Link href={`/seller/marketplace/${mission.id}`}>
            <div
                className="group flex items-center gap-5 px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 card-hover"
            >
                {/* Logo */}
                {mission.startup.logo_url ? (
                    <img
                        src={mission.startup.logo_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-white">
                            {mission.startup.name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Main info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                            {mission.startup.name}
                        </h3>
                        {mission.startup.industry && (
                            <span className="hidden sm:inline text-[10px] text-gray-400 uppercase tracking-wider px-2 py-0.5 bg-gray-50 rounded-full">
                                {mission.startup.industry}
                            </span>
                        )}
                        {mission.visibility === 'PRIVATE' && (
                            <span className="text-[10px] text-amber-600 uppercase tracking-wider px-2 py-0.5 bg-amber-50 rounded-full font-medium">
                                Private
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        {mission.title}
                    </p>
                </div>

                {/* Rewards */}
                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                    {hasMultipleCommissions(mission) ? (
                        <>
                            {mission.lead_enabled && mission.lead_reward_amount && (
                                <div className="text-center px-3 py-1.5 bg-purple-50 rounded-lg">
                                    <p className="text-sm font-semibold text-purple-900">{mission.lead_reward_amount}€</p>
                                    <p className="text-[10px] text-purple-600">lead</p>
                                </div>
                            )}
                            {mission.sale_enabled && mission.sale_reward_amount && (
                                <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-lg">
                                    <p className="text-sm font-semibold text-emerald-900">{formatRewardAmount(mission.sale_reward_amount, mission.sale_reward_structure)}</p>
                                    <p className="text-[10px] text-emerald-600">sale</p>
                                </div>
                            )}
                            {mission.recurring_enabled && mission.recurring_reward_amount && (
                                <div className="text-center px-3 py-1.5 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-semibold text-blue-900">{formatRewardAmount(mission.recurring_reward_amount, mission.recurring_reward_structure)}</p>
                                    <p className="text-[10px] text-blue-600">recurring</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-right">
                            <p className="text-base font-semibold text-gray-900">{mission.reward}</p>
                            <p className="text-[10px] text-gray-400">per conversion</p>
                        </div>
                    )}
                </div>

                {/* Mobile rewards */}
                <div className="md:hidden text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{mission.reward}</p>
                </div>

                {/* Partners count */}
                <div className="hidden sm:block text-right flex-shrink-0 w-16">
                    <p className="text-xs text-gray-400">
                        {mission.partners_count}
                    </p>
                    <p className="text-[10px] text-gray-300">partners</p>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
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
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchFocused, setSearchFocused] = useState(false)
    const [showAllCategories, setShowAllCategories] = useState(false)
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
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
            >
                {/* Header - Minimal */}
                <motion.header variants={fadeInUp} transition={springGentle} className="text-center mb-12">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
                        Programs
                    </h1>
                    <p className="text-gray-500 text-[15px]">
                        Find the program that suits you
                    </p>
                </motion.header>

                {/* Search - Spotlight inspired */}
                <motion.div variants={fadeInUp} transition={springGentle} className="max-w-xl mx-auto mb-12">
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
                                placeholder="Search..."
                                className="w-full pl-14 pr-20 py-4 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none rounded-2xl"
                            />
                            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 bg-gray-50 rounded-lg font-medium">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>
                </motion.div>

                {/* Categories - Subtle pills with expand */}
                <nav className="flex items-center justify-center gap-1.5 mb-12 flex-wrap">
                    {/* Main categories - always visible */}
                    {MAIN_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`
                                px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 btn-press
                                ${selectedCategory === cat.id
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }
                            `}
                        >
                            {cat.label}
                        </button>
                    ))}

                    {/* More categories - shown when expanded */}
                    {showAllCategories && MORE_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`
                                px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200 btn-press
                                ${selectedCategory === cat.id
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }
                            `}
                        >
                            {cat.label}
                        </button>
                    ))}

                    {/* Toggle button */}
                    <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className={`
                            px-3 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-200
                            flex items-center gap-1
                            ${showAllCategories
                                ? 'text-violet-600 bg-violet-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }
                        `}
                    >
                        {showAllCategories ? 'Less' : 'More'}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllCategories ? 'rotate-180' : ''}`} />
                    </button>
                </nav>

                {/* Content */}
                {(() => {
                    // Filter out missions where user is already enrolled
                    const availableMissions = missions.filter(m => m.enrollment?.status !== 'APPROVED')

                    if (loading) {
                        return (
                            <div className="space-y-2 py-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex items-center gap-5 px-5 py-4 bg-white rounded-xl border border-gray-100">
                                        <div className="w-10 h-10 rounded-lg skeleton-shimmer flex-shrink-0" />
                                        <div className="flex-1">
                                            <div className="h-4 w-36 rounded skeleton-shimmer mb-2" />
                                            <div className="h-3 w-48 rounded skeleton-shimmer" />
                                        </div>
                                        <div className="hidden md:block h-8 w-16 rounded-lg skeleton-shimmer" />
                                        <div className="hidden sm:block h-6 w-12 rounded skeleton-shimmer" />
                                    </div>
                                ))}
                            </div>
                        )
                    }

                    if (availableMissions.length === 0) {
                        return (
                            <div className="text-center py-32">
                                <p className="text-gray-400 text-[15px] mb-2">
                                    {missions.length > 0 && availableMissions.length === 0
                                        ? 'You have joined all available programs'
                                        : 'No programs found'
                                    }
                                </p>
                                {(search || selectedCategory !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearch('')
                                            setSelectedCategory('all')
                                        }}
                                        className="text-[13px] text-violet-500 hover:text-violet-600 font-medium"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        )
                    }

                    return (
                        <>
                            {/* Results count - Very subtle */}
                            <motion.p variants={fadeInUp} transition={springGentle} className="text-[11px] text-gray-400 uppercase tracking-wider mb-6 text-center">
                                {availableMissions.length} program{availableMissions.length !== 1 ? 's' : ''} available
                            </motion.p>

                            {/* List */}
                            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-2">
                                {availableMissions.map((mission, index) => (
                                    <motion.div key={mission.id} variants={staggerItem}>
                                        <ProgramRow
                                            mission={mission}
                                            index={index}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </>
                    )
                })()}
            </motion.div>
        </div>
    )
}
