'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Check,
    Loader2,
    Upload,
    X,
    FileText,
    Globe,
    Users,
    ShoppingCart,
    Search,
    ChevronDown,
    Plus,
    Sparkles,
    Lock,
    Link as LinkIcon,
    Mail,
    Copy,
    ExternalLink,
    RefreshCw
} from 'lucide-react'

// =============================================
// TYPES
// =============================================

type WizardStep = 1 | 2 | 3 | 4
type RewardStructure = 'FLAT' | 'PERCENTAGE'
type CountryFilterType = 'ALL' | 'INCLUDE' | 'EXCLUDE'
type MissionVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'

interface WizardDataV2 {
    title: string
    description: string
    photoUrl: string | null
    targetUrl: string
    visibility: MissionVisibility  // ✅ NEW: Mission access type
    lead: {
        enabled: boolean
        amount: number
    }
    sale: {
        enabled: boolean
        structure: RewardStructure
        amount: number
    }
    recurring: {
        enabled: boolean
        structure: RewardStructure
        amount: number
        duration: number | null
    }
    contactEmail: string | null
    helpCenterUrl: string | null
    documents: Array<{
        title: string
        url: string
        type: string
    }>
    countryFilter: {
        type: CountryFilterType
        countries: string[]
    }
}

interface UploadedDocument {
    id: string
    name: string
    url: string
    size: number
    uploading?: boolean
}

// =============================================
// CONSTANTS
// =============================================

const STEPS = [
    { id: 1, title: 'Mission Details', subtitle: 'Basic information' },
    { id: 2, title: 'Commission Setup', subtitle: 'How partners earn' },
    { id: 3, title: 'Resources & Reach', subtitle: 'Support & targeting' },
    { id: 4, title: 'Access Control', subtitle: 'Who can join' },
] as const

const DURATION_OPTIONS = [
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 12, label: '12 months' },
    { value: 24, label: '24 months' },
    { value: 36, label: '36 months' },
    { value: 48, label: '48 months' },
    { value: 0, label: 'Lifetime' },
]

// Popular countries shown first
const POPULAR_COUNTRIES = [
    { code: 'FR', name: 'France' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'CA', name: 'Canada' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
]

// All countries (alphabetically sorted)
const ALL_COUNTRIES = [
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CA', name: 'Canada' },
    { code: 'CL', name: 'Chile' },
    { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EG', name: 'Egypt' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'EE', name: 'Estonia' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GE', name: 'Georgia' },
    { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GR', name: 'Greece' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'IT', name: 'Italy' },
    { code: 'CI', name: 'Ivory Coast' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JP', name: 'Japan' },
    { code: 'JO', name: 'Jordan' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LY', name: 'Libya' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MO', name: 'Macau' },
    { code: 'MK', name: 'Macedonia' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MX', name: 'Mexico' },
    { code: 'MD', name: 'Moldova' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NO', name: 'Norway' },
    { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PA', name: 'Panama' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'KR', name: 'South Korea' },
    { code: 'ES', name: 'Spain' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
]

// =============================================
// TOGGLE COMPONENT
// =============================================

function Toggle({
    enabled,
    onChange,
    disabled = false
}: {
    enabled: boolean
    onChange: (value: boolean) => void
    disabled?: boolean
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                transition-colors duration-200 ease-in-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${enabled ? 'bg-gray-900' : 'bg-gray-200'}
            `}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
                    ${enabled ? 'translate-x-5' : 'translate-x-0.5'}
                    mt-0.5
                `}
            />
        </button>
    )
}

// =============================================
// COMMISSION CARD COMPONENT
// =============================================

function CommissionCard({
    icon: Icon,
    title,
    description,
    enabled,
    onToggle,
    children
}: {
    icon: React.ElementType
    title: string
    description: string
    enabled: boolean
    onToggle: (value: boolean) => void
    children?: React.ReactNode
}) {
    return (
        <div
            className={`
                relative rounded-xl sm:rounded-2xl border-2 transition-all duration-300 overflow-hidden
                ${enabled
                    ? 'border-gray-900 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_4px_24px_rgba(0,0,0,0.08)]'
                    : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
                }
            `}
        >
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors
                        ${enabled ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}
                    `}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                    </div>
                </div>
                <Toggle enabled={enabled} onChange={onToggle} />
            </div>

            {/* Configuration - Animated expand */}
            <div
                className={`
                    grid transition-all duration-300 ease-in-out
                    ${enabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                `}
            >
                <div className="overflow-hidden">
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-gray-100">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

// =============================================
// COUNTRY SELECTOR COMPONENT
// =============================================

function getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
}

function CountrySelector({
    selected,
    onChange,
    filterType
}: {
    selected: string[]
    onChange: (countries: string[]) => void
    filterType: 'INCLUDE' | 'EXCLUDE'
}) {
    const [search, setSearch] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Get country object from code
    const getCountryByCode = (code: string) =>
        ALL_COUNTRIES.find(c => c.code === code) || { code, name: code }

    // Filter countries based on search
    const searchLower = search.toLowerCase().trim()
    const filteredCountries = searchLower
        ? ALL_COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(searchLower) ||
            c.code.toLowerCase().includes(searchLower)
        )
        : []

    const toggleCountry = (code: string) => {
        if (selected.includes(code)) {
            onChange(selected.filter(c => c !== code))
        } else {
            onChange([...selected, code])
        }
        setSearch('')
        searchInputRef.current?.focus()
    }

    const removeCountry = (code: string) => {
        onChange(selected.filter(c => c !== code))
    }

    // Countries to show: popular ones not yet selected
    const availablePopular = POPULAR_COUNTRIES.filter(c => !selected.includes(c.code))
    const selectedCountries = selected.map(getCountryByCode)

    return (
        <div className="space-y-4">
            {/* Selected countries */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedCountries.map(country => (
                        <span
                            key={country.code}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs sm:text-sm font-medium"
                        >
                            <span>{getFlagEmoji(country.code)}</span>
                            <span className="truncate max-w-[120px] sm:max-w-none">{country.name}</span>
                            <button
                                onClick={() => removeCountry(country.code)}
                                className="ml-1 text-gray-400 hover:text-white transition-colors shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for a country..."
                    className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-3 border border-gray-200 rounded-xl text-base
                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                        placeholder:text-gray-400 transition-all"
                />
            </div>

            {/* Search results */}
            {search && filteredCountries.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                    <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.slice(0, 10).map(country => {
                            const isSelected = selected.includes(country.code)
                            return (
                                <button
                                    key={country.code}
                                    onClick={() => toggleCountry(country.code)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0
                                        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    <span className="text-xl">{getFlagEmoji(country.code)}</span>
                                    <span className="flex-1 font-medium text-gray-900">{country.name}</span>
                                    <span className="text-sm text-gray-400">{country.code}</span>
                                    {isSelected && <Check className="w-4 h-4 text-gray-900" />}
                                </button>
                            )
                        })}
                    </div>
                    {filteredCountries.length > 10 && (
                        <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                            +{filteredCountries.length - 10} more results
                        </div>
                    )}
                </div>
            )}

            {/* No results */}
            {search && filteredCountries.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                    No countries found for "{search}"
                </div>
            )}

            {/* Popular countries (shown when not searching) */}
            {!search && availablePopular.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                        {filterType === 'INCLUDE' ? 'Popular countries' : 'Quick add'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availablePopular.map(country => (
                            <button
                                key={country.code}
                                onClick={() => toggleCountry(country.code)}
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-gray-50 hover:bg-gray-100
                                    rounded-xl text-xs sm:text-sm font-medium text-gray-700 transition-colors border border-gray-100"
                            >
                                <span>{getFlagEmoji(country.code)}</span>
                                <span className="hidden xs:inline">{country.name}</span>
                                <span className="xs:hidden">{country.code}</span>
                                <Plus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Helper text */}
            <p className="text-xs text-gray-400">
                {filterType === 'INCLUDE'
                    ? `Only partners from ${selected.length === 0 ? 'selected' : 'these ' + selected.length} countries can join this program.`
                    : `Partners from ${selected.length === 0 ? 'selected' : 'these ' + selected.length} countries will not see this program.`
                }
            </p>
        </div>
    )
}

// =============================================
// WIZARD SIDEBAR
// =============================================

function WizardSidebar({
    currentStep,
    completedSteps,
    onStepClick
}: {
    currentStep: WizardStep
    completedSteps: number[]
    onStepClick: (step: WizardStep) => void
}) {
    return (
        <div className="hidden lg:flex lg:w-72 bg-white border-r border-gray-100 flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
                <Link
                    href="/dashboard/missions"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Missions
                </Link>
            </div>

            {/* Steps */}
            <div className="flex-1 p-4 sm:p-6">
                <div className="space-y-1">
                    {STEPS.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id)
                        const isActive = currentStep === step.id
                        const isClickable = isCompleted || step.id <= currentStep

                        return (
                            <button
                                key={step.id}
                                onClick={() => isClickable && onStepClick(step.id as WizardStep)}
                                disabled={!isClickable}
                                className={`
                                    w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl text-left transition-all
                                    ${isActive ? 'bg-gray-900 text-white' : ''}
                                    ${!isActive && isClickable ? 'hover:bg-gray-50' : ''}
                                    ${!isClickable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                {/* Step indicator */}
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                                    ${isCompleted && !isActive ? 'bg-gray-900 text-white' : ''}
                                    ${isActive ? 'bg-white text-gray-900' : ''}
                                    ${!isCompleted && !isActive ? 'bg-gray-100 text-gray-400' : ''}
                                `}>
                                    {isCompleted && !isActive ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.id
                                    )}
                                </div>

                                {/* Step text */}
                                <div>
                                    <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                        {step.title}
                                    </div>
                                    <div className={`text-sm mt-0.5 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {step.subtitle}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Footer decoration */}
            <div className="p-4 sm:p-6 border-t border-gray-100">
                <div className="flex items-center gap-3 text-gray-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">Creating your partner program</span>
                </div>
            </div>
        </div>
    )
}

// =============================================
// STEP 1: MISSION DETAILS
// =============================================

function Step1MissionDetails({
    data,
    onChange
}: {
    data: WizardDataV2
    onChange: (updates: Partial<WizardDataV2>) => void
}) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'logo')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()
            if (result.success && result.url) {
                onChange({ photoUrl: result.url })
            }
        } catch (error) {
            console.error('Upload failed:', error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6 sm:space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Mission Details
                </h1>
                <p className="text-gray-500 mt-2 text-base sm:text-lg">
                    Define what makes your partner program unique.
                </p>
            </div>

            {/* Mission Title */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                    Mission Title
                </label>
                <input
                    type="text"
                    value={data.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="e.g., Growth Partner Program"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-base
                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                        placeholder:text-gray-400 transition-all"
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                    Short Description
                </label>
                <textarea
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Describe what partners will promote and how they'll succeed..."
                    rows={4}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-base resize-none
                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                        placeholder:text-gray-400 transition-all"
                />
            </div>

            {/* Mission Banner */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                    Mission Banner
                </label>
                <p className="text-sm text-gray-500">
                    A visual that represents your program. Displayed in the marketplace.
                </p>

                <div className="mt-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="sr-only"
                    />

                    {data.photoUrl ? (
                        <div className="relative group">
                            <div className="aspect-[3/1] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100">
                                <img
                                    src={data.photoUrl}
                                    alt="Mission banner"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button
                                onClick={() => onChange({ photoUrl: null })}
                                className="absolute top-2 sm:top-3 right-2 sm:right-3 p-2 bg-white/90 backdrop-blur rounded-lg
                                    opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full aspect-[3/1] rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200
                                hover:border-gray-300 hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-2 sm:gap-3"
                        >
                            {uploading ? (
                                <Loader2 className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400 animate-spin" />
                            ) : (
                                <>
                                    <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Upload className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-gray-900">Click to upload</span>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                </>
                            )}
                        </button>
                    )}

                    {/* Or paste URL */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="text-xs text-gray-400 font-medium">OR PASTE URL</span>
                        <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <input
                        type="url"
                        value={data.photoUrl?.startsWith('data:') ? '' : (data.photoUrl || '')}
                        onChange={(e) => onChange({ photoUrl: e.target.value || null })}
                        placeholder="https://example.com/banner.jpg"
                        className="mt-3 w-full px-3 sm:px-4 py-3 border border-gray-200 rounded-xl text-sm
                            focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                            placeholder:text-gray-400 transition-all"
                    />
                </div>
            </div>

            {/* Target URL */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900">
                    Target URL
                </label>
                <p className="text-sm text-gray-500">
                    Where people will land when clicking partner referral links.
                </p>
                <input
                    type="url"
                    value={data.targetUrl}
                    onChange={(e) => onChange({ targetUrl: e.target.value })}
                    placeholder="https://yourproduct.com"
                    className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-base
                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                        placeholder:text-gray-400 transition-all"
                />
            </div>
        </div>
    )
}

// =============================================
// STEP 2: COMMISSION SETUP
// =============================================

function Step2CommissionSetup({
    data,
    onChange
}: {
    data: WizardDataV2
    onChange: (updates: Partial<WizardDataV2>) => void
}) {
    const atLeastOneEnabled = data.lead.enabled || data.sale.enabled || data.recurring.enabled

    return (
        <div className="space-y-6 sm:space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Commission Setup
                </h1>
                <p className="text-gray-500 mt-2 text-base sm:text-lg">
                    Configure how your partners will earn. Enable one or more commission types.
                </p>
            </div>

            {/* Validation warning */}
            {!atLeastOneEnabled && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-amber-600 text-sm font-bold">!</span>
                    </div>
                    <p className="text-sm text-amber-800">
                        Enable at least one commission type to continue.
                    </p>
                </div>
            )}

            {/* Commission Cards */}
            <div className="space-y-4">
                {/* Lead Commission */}
                <CommissionCard
                    icon={Users}
                    title="Lead Commission"
                    description="Pay for each sign-up or qualified lead"
                    enabled={data.lead.enabled}
                    onToggle={(enabled) => onChange({ lead: { ...data.lead, enabled } })}
                >
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Amount per lead
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                            <input
                                type="number"
                                value={data.lead.amount || ''}
                                onChange={(e) => onChange({
                                    lead: { ...data.lead, amount: parseFloat(e.target.value) || 0 }
                                })}
                                placeholder="5"
                                className="w-full pl-9 pr-16 py-3 border border-gray-200 rounded-xl
                                    focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                per lead
                            </span>
                        </div>
                    </div>
                </CommissionCard>

                {/* Sale Commission */}
                <CommissionCard
                    icon={ShoppingCart}
                    title="Sale Commission"
                    description="Pay for each successful purchase"
                    enabled={data.sale.enabled}
                    onToggle={(enabled) => {
                        onChange({ sale: { ...data.sale, enabled } })
                        // Disable recurring if sale is disabled
                        if (!enabled) {
                            onChange({ recurring: { ...data.recurring, enabled: false } })
                        }
                    }}
                >
                    <div className="space-y-4">
                        {/* Structure */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Commission type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onChange({ sale: { ...data.sale, structure: 'FLAT' } })}
                                    className={`
                                        px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                        ${data.sale.structure === 'FLAT'
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    Fixed amount
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange({ sale: { ...data.sale, structure: 'PERCENTAGE' } })}
                                    className={`
                                        px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                        ${data.sale.structure === 'PERCENTAGE'
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }
                                    `}
                                >
                                    Percentage
                                </button>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                {data.sale.structure === 'FLAT' ? 'Amount per sale' : 'Percentage of sale'}
                            </label>
                            <div className="relative">
                                {data.sale.structure === 'FLAT' && (
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                )}
                                <input
                                    type="number"
                                    value={data.sale.amount || ''}
                                    onChange={(e) => onChange({
                                        sale: { ...data.sale, amount: parseFloat(e.target.value) || 0 }
                                    })}
                                    placeholder={data.sale.structure === 'FLAT' ? '25' : '10'}
                                    className={`
                                        w-full py-3 border border-gray-200 rounded-xl
                                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                                        ${data.sale.structure === 'FLAT' ? 'pl-9 pr-16' : 'pl-4 pr-12'}
                                    `}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                    {data.sale.structure === 'FLAT' ? 'per sale' : '%'}
                                </span>
                            </div>
                        </div>

                        {/* Recurring toggle — inside Sale card */}
                        <div className="pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => onChange({
                                    recurring: {
                                        ...data.recurring,
                                        enabled: !data.recurring.enabled,
                                        // Default recurring to same structure/amount as sale if first time enabling
                                        ...(!data.recurring.enabled && data.recurring.amount === 0 ? {
                                            structure: data.sale.structure,
                                            amount: data.sale.amount
                                        } : {})
                                    }
                                })}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                                    ${data.recurring.enabled
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }
                                `}
                            >
                                <RefreshCw className={`w-4 h-4 shrink-0 ${data.recurring.enabled ? 'text-white' : 'text-gray-400'}`} />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">
                                        {data.recurring.enabled ? 'Recurring enabled' : 'Add recurring commission'}
                                    </span>
                                    <p className={`text-xs mt-0.5 ${data.recurring.enabled ? 'text-gray-300' : 'text-gray-400'}`}>
                                        Earn on subscription renewals too
                                    </p>
                                </div>
                                {data.recurring.enabled ? (
                                    <Check className="w-4 h-4 shrink-0" />
                                ) : (
                                    <Plus className="w-4 h-4 shrink-0 text-gray-400" />
                                )}
                            </button>

                            {/* Recurring config — animated expand */}
                            <div
                                className={`
                                    grid transition-all duration-300 ease-in-out
                                    ${data.recurring.enabled ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}
                                `}
                            >
                                <div className="overflow-hidden">
                                    <div className="space-y-4 bg-gray-50 rounded-xl p-4">
                                        {/* Recurring structure */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Recurring commission type
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onChange({ recurring: { ...data.recurring, structure: 'FLAT' } })}
                                                    className={`
                                                        px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                                        ${data.recurring.structure === 'FLAT'
                                                            ? 'bg-gray-900 text-white'
                                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                        }
                                                    `}
                                                >
                                                    Fixed amount
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onChange({ recurring: { ...data.recurring, structure: 'PERCENTAGE' } })}
                                                    className={`
                                                        px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                                        ${data.recurring.structure === 'PERCENTAGE'
                                                            ? 'bg-gray-900 text-white'
                                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                        }
                                                    `}
                                                >
                                                    Percentage
                                                </button>
                                            </div>
                                        </div>

                                        {/* Recurring amount */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                {data.recurring.structure === 'FLAT' ? 'Amount per renewal' : 'Percentage per renewal'}
                                            </label>
                                            <div className="relative">
                                                {data.recurring.structure === 'FLAT' && (
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                                                )}
                                                <input
                                                    type="number"
                                                    value={data.recurring.amount || ''}
                                                    onChange={(e) => onChange({
                                                        recurring: { ...data.recurring, amount: parseFloat(e.target.value) || 0 }
                                                    })}
                                                    placeholder={data.recurring.structure === 'FLAT' ? '10' : '5'}
                                                    className={`
                                                        w-full py-3 border border-gray-200 rounded-xl bg-white
                                                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                                                        ${data.recurring.structure === 'FLAT' ? 'pl-9 pr-20' : 'pl-4 pr-12'}
                                                    `}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                                    {data.recurring.structure === 'FLAT' ? 'per month' : '%'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Duration
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={data.recurring.duration ?? 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value)
                                                        onChange({
                                                            recurring: { ...data.recurring, duration: val === 0 ? null : val }
                                                        })
                                                    }}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white
                                                        focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                                                        appearance-none cursor-pointer"
                                                >
                                                    {DURATION_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {data.recurring.duration === null
                                                    ? 'Partner earns on every renewal, forever.'
                                                    : `Partner earns on the first ${data.recurring.duration} renewals.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CommissionCard>
            </div>
        </div>
    )
}

// =============================================
// STEP 3: RESOURCES & REACH
// =============================================

function Step3ResourcesReach({
    data,
    onChange
}: {
    data: WizardDataV2
    onChange: (updates: Partial<WizardDataV2>) => void
}) {
    const [documents, setDocuments] = useState<UploadedDocument[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file.type !== 'application/pdf') continue
            if (file.size > 10 * 1024 * 1024) continue
            if (documents.length >= 10) break

            const tempId = `temp-${Date.now()}-${i}`
            const newDoc: UploadedDocument = {
                id: tempId,
                name: file.name,
                url: '',
                size: file.size,
                uploading: true
            }

            setDocuments(prev => [...prev, newDoc])

            try {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('type', 'doc')

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                })

                const result = await response.json()
                if (result.success && result.url) {
                    setDocuments(prev => prev.map(d =>
                        d.id === tempId
                            ? { ...d, url: result.url, uploading: false }
                            : d
                    ))

                    // Update parent data
                    onChange({
                        documents: [...data.documents, {
                            title: file.name.replace('.pdf', ''),
                            url: result.url,
                            type: 'PDF'
                        }]
                    })
                }
            } catch (error) {
                setDocuments(prev => prev.filter(d => d.id !== tempId))
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removeDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index))
        onChange({
            documents: data.documents.filter((_, i) => i !== index)
        })
    }

    return (
        <div className="space-y-6 sm:space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Resources & Reach
                </h1>
                <p className="text-gray-500 mt-2 text-base sm:text-lg">
                    Help your partners succeed and define your target markets.
                </p>
            </div>

            {/* Support Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                        Support Email
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="email"
                        value={data.contactEmail || ''}
                        onChange={(e) => onChange({ contactEmail: e.target.value || null })}
                        placeholder="partners@company.com"
                        className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-base
                            focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                            placeholder:text-gray-400 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                        Help Center URL
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                        type="url"
                        value={data.helpCenterUrl || ''}
                        onChange={(e) => onChange({ helpCenterUrl: e.target.value || null })}
                        placeholder="https://help.company.com"
                        className="w-full px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-200 rounded-xl text-base
                            focus:outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5
                            placeholder:text-gray-400 transition-all"
                    />
                </div>
            </div>

            {/* Documents */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-900">
                        Partner Resources
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                        Upload pitch decks, brand kits, or sales guides. PDF files only, max 10MB each.
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleDocumentUpload}
                    className="sr-only"
                />

                {/* Document list */}
                {documents.length > 0 && (
                    <div className="space-y-2">
                        {documents.map((doc, index) => (
                            <div
                                key={doc.id}
                                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl"
                            >
                                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {doc.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(doc.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                {doc.uploading ? (
                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0" />
                                ) : (
                                    <button
                                        onClick={() => removeDocument(index)}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload button */}
                {documents.length < 10 && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 sm:py-4 border-2 border-dashed border-gray-200 rounded-xl
                            hover:border-gray-300 hover:bg-gray-50 transition-all
                            flex items-center justify-center gap-2 text-gray-600"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium text-sm sm:text-base">Add document</span>
                    </button>
                )}

                {documents.length >= 10 && (
                    <p className="text-sm text-gray-500 text-center">
                        Maximum 10 documents reached
                    </p>
                )}
            </div>

            {/* Country Filter */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-900">
                        Geographic Targeting
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                        Define which countries can access this program.
                    </p>
                </div>

                {/* Filter type selection */}
                <div className="space-y-3">
                    {[
                        { value: 'ALL' as const, label: 'All countries', desc: 'Available to partners worldwide' },
                        { value: 'INCLUDE' as const, label: 'Specific countries only', desc: 'Restrict to selected countries' },
                        { value: 'EXCLUDE' as const, label: 'Exclude countries', desc: 'Available everywhere except selected' },
                    ].map(option => (
                        <label
                            key={option.value}
                            className={`
                                flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all
                                ${data.countryFilter.type === option.value
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }
                            `}
                        >
                            <input
                                type="radio"
                                name="countryFilter"
                                value={option.value}
                                checked={data.countryFilter.type === option.value}
                                onChange={() => onChange({
                                    countryFilter: { ...data.countryFilter, type: option.value, countries: [] }
                                })}
                                className="sr-only"
                            />
                            <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                                ${data.countryFilter.type === option.value
                                    ? 'border-white'
                                    : 'border-gray-300'
                                }
                            `}>
                                {data.countryFilter.type === option.value && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                )}
                            </div>
                            <div>
                                <div className="font-medium">{option.label}</div>
                                <div className={`text-sm mt-0.5 ${data.countryFilter.type === option.value ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {option.desc}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Country selector */}
                {(data.countryFilter.type === 'INCLUDE' || data.countryFilter.type === 'EXCLUDE') && (
                    <div className="mt-6 p-5 bg-gray-50 rounded-xl">
                        <CountrySelector
                            selected={data.countryFilter.countries}
                            onChange={(countries) => onChange({
                                countryFilter: { ...data.countryFilter, countries }
                            })}
                            filterType={data.countryFilter.type}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

// =============================================
// STEP 4: ACCESS CONTROL (Who can join?)
// =============================================

function Step4AccessControl({
    data,
    onChange
}: {
    data: WizardDataV2
    onChange: (updates: Partial<WizardDataV2>) => void
}) {
    return (
        <div className="space-y-6 sm:space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                    Who can join?
                </h1>
                <p className="text-gray-500 mt-2 text-base sm:text-lg">
                    Choose how partners discover and access your program.
                </p>
            </div>

            {/* Visibility Options */}
            <div className="space-y-4">
                {/* PUBLIC */}
                <button
                    type="button"
                    onClick={() => onChange({ visibility: 'PUBLIC' })}
                    className={`
                        w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200
                        ${data.visibility === 'PUBLIC'
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }
                    `}
                >
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`
                            w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center shrink-0
                            ${data.visibility === 'PUBLIC' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}
                        `}>
                            <Globe className="w-5 sm:w-6 h-5 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Public</h3>
                                <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-medium rounded-full">
                                    Recommended
                                </span>
                            </div>
                            <p className="text-gray-500 mt-1 text-sm sm:text-base">
                                Your program is visible in the marketplace. Any partner can join instantly and start promoting.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Maximum visibility
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Instant onboarding
                                </span>
                            </div>
                        </div>
                        {data.visibility === 'PUBLIC' && (
                            <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </button>

                {/* PRIVATE */}
                <button
                    type="button"
                    onClick={() => onChange({ visibility: 'PRIVATE' })}
                    className={`
                        w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200
                        ${data.visibility === 'PRIVATE'
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }
                    `}
                >
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`
                            w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center shrink-0
                            ${data.visibility === 'PRIVATE' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}
                        `}>
                            <Lock className="w-5 sm:w-6 h-5 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Private</h3>
                            <p className="text-gray-500 mt-1 text-sm sm:text-base">
                                Your program is visible in the marketplace, but partners must request access. You approve or reject each request.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Quality control
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Review applications
                                </span>
                            </div>
                        </div>
                        {data.visibility === 'PRIVATE' && (
                            <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </button>

                {/* INVITE ONLY */}
                <button
                    type="button"
                    onClick={() => onChange({ visibility: 'INVITE_ONLY' })}
                    className={`
                        w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200
                        ${data.visibility === 'INVITE_ONLY'
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }
                    `}
                >
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`
                            w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center shrink-0
                            ${data.visibility === 'INVITE_ONLY' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}
                        `}>
                            <LinkIcon className="w-5 sm:w-6 h-5 sm:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Invite Only</h3>
                            <p className="text-gray-500 mt-1 text-sm sm:text-base">
                                Your program is hidden from the marketplace. Only partners with your unique invite link can join. Also required for proposing deals to organizations.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Exclusive access
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Full control
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    Organization deals
                                </span>
                            </div>
                        </div>
                        {data.visibility === 'INVITE_ONLY' && (
                            <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* Info box for Invite Only */}
            {data.visibility === 'INVITE_ONLY' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900">How invite links work</h4>
                            <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                                After creating your program, you'll get a unique invite link that you can share with partners.
                                Find it on your mission's detail page under <span className="font-medium text-gray-700">"Invite Partners"</span>.
                            </p>
                            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg w-full sm:w-auto">
                                    <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="text-gray-500 font-mono text-xs truncate">traaaction.com/invite/abc123</span>
                                </div>
                                <span className="text-gray-400 text-xs sm:text-sm">Example link</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN WIZARD PAGE
// =============================================

export default function CreateMissionWizardV2() {
    const router = useRouter()
    const [step, setStep] = useState<WizardStep>(1)
    const [completedSteps, setCompletedSteps] = useState<number[]>([])
    const [loading, setLoading] = useState(false)

    const [data, setData] = useState<WizardDataV2>({
        title: '',
        description: '',
        photoUrl: null,
        targetUrl: '',
        visibility: 'PUBLIC',  // ✅ NEW: Default to public
        lead: { enabled: false, amount: 0 },
        sale: { enabled: true, structure: 'PERCENTAGE', amount: 10 },
        recurring: { enabled: false, structure: 'PERCENTAGE', amount: 0, duration: 12 },
        contactEmail: null,
        helpCenterUrl: null,
        documents: [],
        countryFilter: { type: 'ALL', countries: [] }
    })

    const updateData = useCallback((updates: Partial<WizardDataV2>) => {
        setData(prev => ({ ...prev, ...updates }))
    }, [])

    const canContinue = useCallback(() => {
        if (step === 1) {
            return data.title.trim() !== '' && data.targetUrl.trim() !== ''
        }
        if (step === 2) {
            const atLeastOneEnabled = data.lead.enabled || data.sale.enabled || data.recurring.enabled
            const leadValid = !data.lead.enabled || data.lead.amount > 0
            const saleValid = !data.sale.enabled || data.sale.amount > 0
            const recurringValid = !data.recurring.enabled || data.recurring.amount > 0
            return atLeastOneEnabled && leadValid && saleValid && recurringValid
        }
        if (step === 3) {
            // Country filter validation
            if (data.countryFilter.type !== 'ALL' && data.countryFilter.countries.length === 0) {
                return false
            }
            return true
        }
        if (step === 4) {
            // Visibility is always set (defaults to PUBLIC)
            return true
        }
        return true
    }, [step, data])

    const handleContinue = () => {
        if (step < 4 && canContinue()) {
            setCompletedSteps(prev => [...new Set([...prev, step])])
            setStep((step + 1) as WizardStep)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as WizardStep)
        }
    }

    const handleStepClick = (clickedStep: WizardStep) => {
        if (completedSteps.includes(clickedStep) || clickedStep <= step) {
            setStep(clickedStep)
        }
    }

    const handleFinish = async () => {
        if (!canContinue()) return

        setLoading(true)
        try {
            const { createMissionFromWizardV2 } = await import('@/app/actions/missions')
            const result = await createMissionFromWizardV2(data)

            if (result.success) {
                router.push('/dashboard/missions')
            } else {
                alert(result.error || 'Failed to create mission')
            }
        } catch (error) {
            console.error('Failed to create mission:', error)
            alert('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col lg:flex-row z-50">
            {/* Mobile Header - Back button on mobile */}
            <div className="lg:hidden border-b border-gray-100 bg-white px-4 py-3">
                <Link
                    href="/dashboard/missions"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Missions
                </Link>
            </div>

            {/* Mobile Step Indicator */}
            <div className="lg:hidden border-b border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Step {step} of 4</span>
                    <div className="flex gap-1.5">
                        {STEPS.map((s) => (
                            <div
                                key={s.id}
                                className={`h-1.5 w-8 rounded-full transition-colors ${
                                    s.id === step
                                        ? 'bg-gray-900'
                                        : s.id < step || completedSteps.includes(s.id)
                                        ? 'bg-gray-300'
                                        : 'bg-gray-100'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar - Desktop only */}
            <WizardSidebar
                currentStep={step}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4 sm:px-8">
                        {step === 1 && <Step1MissionDetails data={data} onChange={updateData} />}
                        {step === 2 && <Step2CommissionSetup data={data} onChange={updateData} />}
                        {step === 3 && <Step3ResourcesReach data={data} onChange={updateData} />}
                        {step === 4 && <Step4AccessControl data={data} onChange={updateData} />}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-white">
                    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between gap-3">
                        <div>
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors text-sm sm:text-base"
                                >
                                    Back
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            {step < 4 ? (
                                <button
                                    onClick={handleContinue}
                                    disabled={!canContinue()}
                                    className={`
                                        px-6 sm:px-8 py-2.5 sm:py-3 font-semibold rounded-xl transition-all text-sm sm:text-base
                                        ${canContinue()
                                            ? 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/20'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    onClick={handleFinish}
                                    disabled={loading || !canContinue()}
                                    className={`
                                        px-6 sm:px-8 py-2.5 sm:py-3 font-semibold rounded-xl transition-all flex items-center gap-2 text-sm sm:text-base
                                        ${canContinue() && !loading
                                            ? 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/20'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="hidden sm:inline">Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="hidden sm:inline">Launch Program</span>
                                            <span className="sm:hidden">Launch</span>
                                            <Sparkles className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
