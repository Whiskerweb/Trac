'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search, Filter, ChevronDown, ChevronRight, X, Users,
    TrendingUp, DollarSign, Globe, Briefcase, Megaphone, Loader2
} from 'lucide-react'

// =============================================
// TYPES
// =============================================

interface Partner {
    id: string
    name: string
    email: string
    avatar: string
    country: string
    countryCode: string
    profileType: 'individual' | 'company'
    industryInterests: string[]
    salesChannels: string[]
    earningPreferences: string[]
    monthlyTraffic: string
    globalStats: {
        totalClicks: number
        totalSales: number
        totalEarnings: number
        conversionRate: number
        activeMissions: number
    }
}

// =============================================
// MOCK DATA (sorted by revenue)
// =============================================

const MOCK_PARTNERS: Partner[] = [
    {
        id: 'p1',
        name: 'Sophie Anderson',
        email: 'sophie@creator.io',
        avatar: 'SA',
        country: 'États-Unis',
        countryCode: '🇺🇸',
        profileType: 'individual' as const,
        industryInterests: ['AI', 'SaaS', 'E-commerce'],
        salesChannels: ['YouTube', 'Newsletter', 'Blog'],
        earningPreferences: ['Rev-share', 'Per sale'],
        monthlyTraffic: '50K - 100K',
        globalStats: { totalClicks: 45000, totalSales: 156, totalEarnings: 2450000, conversionRate: 2.4, activeMissions: 8 }
    },
    {
        id: 'p2',
        name: 'Marcus Chen',
        email: 'marcus@techreviews.com',
        avatar: 'MC',
        country: 'Canada',
        countryCode: '🇨🇦',
        profileType: 'company' as const,
        industryInterests: ['Tech', 'SaaS', 'Productivity'],
        salesChannels: ['Blog', 'Twitter', 'Podcast'],
        earningPreferences: ['Rev-share'],
        monthlyTraffic: '100K - 500K',
        globalStats: { totalClicks: 32000, totalSales: 98, totalEarnings: 1890000, conversionRate: 1.9, activeMissions: 5 }
    },
    {
        id: 'p3',
        name: 'Emma Laurent',
        email: 'emma@influencer.fr',
        avatar: 'EL',
        country: 'France',
        countryCode: '🇫🇷',
        profileType: 'individual' as const,
        industryInterests: ['Lifestyle', 'E-commerce', 'Fashion'],
        salesChannels: ['Instagram', 'TikTok', 'YouTube'],
        earningPreferences: ['Per sale', 'Fixed fee'],
        monthlyTraffic: '100K - 500K',
        globalStats: { totalClicks: 28000, totalSales: 210, totalEarnings: 1520000, conversionRate: 3.1, activeMissions: 12 }
    },
    {
        id: 'p4',
        name: 'David Kim',
        email: 'david@devblog.io',
        avatar: 'DK',
        country: 'Corée du Sud',
        countryCode: '🇰🇷',
        profileType: 'individual' as const,
        industryInterests: ['Developer Tools', 'AI', 'SaaS'],
        salesChannels: ['Blog', 'Newsletter', 'Twitter'],
        earningPreferences: ['Rev-share', 'Per lead'],
        monthlyTraffic: '10K - 50K',
        globalStats: { totalClicks: 18500, totalSales: 64, totalEarnings: 1280000, conversionRate: 2.8, activeMissions: 4 }
    },
    {
        id: 'p5',
        name: 'Lisa Mueller',
        email: 'lisa@marketing.de',
        avatar: 'LM',
        country: 'Allemagne',
        countryCode: '🇩🇪',
        profileType: 'company' as const,
        industryInterests: ['Marketing', 'SaaS', 'Finance'],
        salesChannels: ['LinkedIn', 'Newsletter', 'Webinars'],
        earningPreferences: ['Rev-share'],
        monthlyTraffic: '50K - 100K',
        globalStats: { totalClicks: 15200, totalSales: 47, totalEarnings: 940000, conversionRate: 1.6, activeMissions: 3 }
    },
    {
        id: 'p6',
        name: 'James Wilson',
        email: 'james@affiliate.uk',
        avatar: 'JW',
        country: 'Royaume-Uni',
        countryCode: '🇬🇧',
        profileType: 'individual' as const,
        industryInterests: ['Finance', 'Crypto', 'Trading'],
        salesChannels: ['YouTube', 'Twitter', 'Discord'],
        earningPreferences: ['Per sale', 'Rev-share'],
        monthlyTraffic: '10K - 50K',
        globalStats: { totalClicks: 12400, totalSales: 38, totalEarnings: 760000, conversionRate: 2.1, activeMissions: 6 }
    },
    {
        id: 'p7',
        name: 'Ana Garcia',
        email: 'ana@contentcreator.es',
        avatar: 'AG',
        country: 'Espagne',
        countryCode: '🇪🇸',
        profileType: 'individual' as const,
        industryInterests: ['Education', 'Health', 'Lifestyle'],
        salesChannels: ['Instagram', 'Blog', 'Newsletter'],
        earningPreferences: ['Fixed fee', 'Per sale'],
        monthlyTraffic: '10K - 50K',
        globalStats: { totalClicks: 9800, totalSales: 89, totalEarnings: 520000, conversionRate: 3.5, activeMissions: 7 }
    },
    {
        id: 'p8',
        name: 'Takeshi Yamamoto',
        email: 'takeshi@techblog.jp',
        avatar: 'TY',
        country: 'Japon',
        countryCode: '🇯🇵',
        profileType: 'company' as const,
        industryInterests: ['Tech', 'Gaming', 'AI'],
        salesChannels: ['Blog', 'YouTube', 'Twitter'],
        earningPreferences: ['Rev-share'],
        monthlyTraffic: '50K - 100K',
        globalStats: { totalClicks: 8200, totalSales: 32, totalEarnings: 410000, conversionRate: 1.4, activeMissions: 2 }
    }
].sort((a, b) => b.globalStats.totalEarnings - a.globalStats.totalEarnings)

// Filter options
const COUNTRIES = ['États-Unis', 'Canada', 'France', 'Allemagne', 'Royaume-Uni', 'Espagne', 'Japon', 'Corée du Sud']
const INDUSTRIES = ['AI', 'SaaS', 'E-commerce', 'Tech', 'Finance', 'Marketing', 'Lifestyle', 'Education', 'Health', 'Developer Tools', 'Gaming', 'Fashion', 'Crypto', 'Trading', 'Productivity']
const CHANNELS = ['YouTube', 'Blog', 'Newsletter', 'Twitter', 'Instagram', 'TikTok', 'LinkedIn', 'Podcast', 'Discord', 'Webinars']
const EARNING_PREFS = ['Rev-share', 'Per sale', 'Per lead', 'Fixed fee']
const TRAFFIC_RANGES = ['< 10K', '10K - 50K', '50K - 100K', '100K - 500K', '500K+']

// =============================================
// COMPONENTS
// =============================================

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600 text-sm">
            {initials}
        </div>
    )
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

function FilterDropdown({
    label,
    options,
    selected,
    onChange,
    icon: Icon
}: {
    label: string
    options: string[]
    selected: string[]
    onChange: (values: string[]) => void
    icon: React.ComponentType<{ className?: string }>
}) {
    const [isOpen, setIsOpen] = useState(false)

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option))
        } else {
            onChange([...selected, option])
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${selected.length > 0
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
            >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {selected.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2 max-h-64 overflow-y-auto">
                        {options.map(option => (
                            <label
                                key={option}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => toggleOption(option)}
                                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function PartnerCard({ partner, onClick }: { partner: Partner; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar initials={partner.avatar} />
                    <div>
                        <h3 className="font-medium text-gray-900">{partner.name}</h3>
                        <p className="text-sm text-gray-500">{partner.email}</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>

            {/* Location & Interests */}
            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm">{partner.countryCode} {partner.country}</span>
                <span className="text-gray-300">•</span>
                <div className="flex gap-1 flex-wrap">
                    {partner.industryInterests.slice(0, 2).map(interest => (
                        <span key={interest} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {interest}
                        </span>
                    ))}
                    {partner.industryInterests.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                            +{partner.industryInterests.length - 2}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(partner.globalStats.totalEarnings / 100)}</p>
                    <p className="text-xs text-gray-500">Earnings</p>
                </div>
                <div>
                    <p className="text-lg font-semibold text-gray-900">{partner.globalStats.totalSales.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Sales</p>
                </div>
                <div>
                    <p className="text-lg font-semibold text-gray-900">{formatNumber(partner.globalStats.totalClicks)}</p>
                    <p className="text-xs text-gray-500">Clicks</p>
                </div>
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function AllPartnersPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [partners, setPartners] = useState<Partner[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCountries, setSelectedCountries] = useState<string[]>([])
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [selectedChannels, setSelectedChannels] = useState<string[]>([])
    const [selectedEarnings, setSelectedEarnings] = useState<string[]>([])

    // Load partners
    useEffect(() => {
        async function loadPartners() {
            try {
                // TODO: Uncomment when API is ready
                // const result = await getAllPlatformPartners()
                // if (result.success && result.partners) {
                //     setPartners(result.partners)
                // } else {
                //     setPartners(MOCK_PARTNERS)
                // }

                // For now, use mock data
                setPartners(MOCK_PARTNERS)
            } catch (error) {
                console.error('Error loading partners:', error)
                setPartners(MOCK_PARTNERS)
            } finally {
                setLoading(false)
            }
        }
        loadPartners()
    }, [])

    // Filter partners
    const filteredPartners = useMemo(() => {
        return partners.filter(partner => {
            // Search
            const matchesSearch = !searchQuery ||
                partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                partner.email.toLowerCase().includes(searchQuery.toLowerCase())

            // Country filter
            const matchesCountry = selectedCountries.length === 0 ||
                selectedCountries.includes(partner.country)

            // Industry filter
            const matchesIndustry = selectedIndustries.length === 0 ||
                partner.industryInterests.some(i => selectedIndustries.includes(i))

            // Channel filter
            const matchesChannel = selectedChannels.length === 0 ||
                partner.salesChannels.some(c => selectedChannels.includes(c))

            // Earning preferences filter
            const matchesEarning = selectedEarnings.length === 0 ||
                partner.earningPreferences.some(e => selectedEarnings.includes(e))

            return matchesSearch && matchesCountry && matchesIndustry && matchesChannel && matchesEarning
        })
    }, [searchQuery, selectedCountries, selectedIndustries, selectedChannels, selectedEarnings])

    const hasActiveFilters = selectedCountries.length > 0 || selectedIndustries.length > 0 ||
        selectedChannels.length > 0 || selectedEarnings.length > 0

    const clearAllFilters = () => {
        setSelectedCountries([])
        setSelectedIndustries([])
        setSelectedChannels([])
        setSelectedEarnings([])
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un partner..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                    />
                </div>

                {/* Filter dropdowns */}
                <FilterDropdown
                    label="Pays"
                    icon={Globe}
                    options={COUNTRIES}
                    selected={selectedCountries}
                    onChange={setSelectedCountries}
                />
                <FilterDropdown
                    label="Intérêts"
                    icon={Briefcase}
                    options={INDUSTRIES}
                    selected={selectedIndustries}
                    onChange={setSelectedIndustries}
                />
                <FilterDropdown
                    label="Canaux"
                    icon={Megaphone}
                    options={CHANNELS}
                    selected={selectedChannels}
                    onChange={setSelectedChannels}
                />
                <FilterDropdown
                    label="Rémunération"
                    icon={DollarSign}
                    options={EARNING_PREFS}
                    selected={selectedEarnings}
                    onChange={setSelectedEarnings}
                />

                {/* Clear filters */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-4 h-4" />
                        Effacer
                    </button>
                )}
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-500">
                {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}
                {hasActiveFilters && ` correspondant${filteredPartners.length !== 1 ? 's' : ''}`}
                <span className="text-gray-400 ml-2">• Triés par revenus</span>
            </div>

            {/* Partners Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : filteredPartners.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-1">Aucun partner trouvé</h3>
                    <p className="text-gray-500 text-sm">Essayez de modifier vos filtres</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPartners.map(partner => (
                        <PartnerCard
                            key={partner.id}
                            partner={partner}
                            onClick={() => router.push(`/dashboard/partners/applications/${partner.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
