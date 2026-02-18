'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import {
    Calendar,
    RefreshCw,
    Globe,
    Monitor,
    Smartphone,
    Laptop,
    Check,
    ChevronDown,
    X,
    MapPin
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { GlobeVisualization } from '@/components/dashboard/GlobeVisualization'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { StartupOnboardingChecklist } from '@/components/dashboard/StartupOnboardingChecklist'
import { subDays, format } from 'date-fns'
import { dropdownVariants, springSnappy } from '@/lib/animations'

// =============================================
// TYPES & FETCHER
// =============================================

interface KPIData {
    clicks: number
    leads: number
    sales: number
    revenue: number
    timeseries?: Array<{
        date: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    }>
}

interface KPIResponse {
    data: KPIData[]
}

interface ActiveFilter {
    type: 'country' | 'device' | 'city' | 'region' | 'continent' | 'browser' | 'os' | 'event_type'
    value: string
    label: string
    icon?: React.ReactNode
}

// Analytics display item types
interface LocationItem {
    name: string
    flag: string
    count: number
    country?: string
}

interface DeviceItem {
    name: string
    count: number
    icon: React.ComponentType<{ className?: string }>
}

interface AnalyticsItem {
    name: string
    count: number
}

const kpiFetcher = async (url: string): Promise<KPIResponse> => {
    const res = await fetch(`${url}&_t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

// =============================================
// DATE RANGES
// =============================================

const DATE_RANGE_KEYS = [
    { labelKey: 'today', value: 'today', days: 0 },
    { labelKey: 'yesterday', value: 'yesterday', days: 1 },
    { labelKey: 'last7days', value: '7d', days: 7 },
    { labelKey: 'last14days', value: '14d', days: 14 },
    { labelKey: 'last30days', value: '30d', days: 30 },
    { labelKey: 'last90days', value: '90d', days: 90 },
    { labelKey: 'last12months', value: '12m', days: 365 },
    { labelKey: 'allTime', value: 'all', days: 3650 },
]

// =============================================
// COUNTRY FLAGS FOR DISPLAY
// =============================================

const COUNTRY_FLAGS: Record<string, string> = {
    'France': '🇫🇷',
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Canada': '🇨🇦',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Japan': '🇯🇵',
    'Australia': '🇦🇺',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'India': '🇮🇳',
    'China': '🇨🇳',
}

// Helper: Bucket timeseries data to max N points
function bucketTimeseriesData(
    data: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>,
    maxPoints: number = 20
): Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }> {
    if (data.length <= maxPoints) return data

    const bucketSize = Math.ceil(data.length / maxPoints)
    const bucketed: typeof data = []

    for (let i = 0; i < data.length; i += bucketSize) {
        const slice = data.slice(i, Math.min(i + bucketSize, data.length))
        if (slice.length === 0) continue

        const startDate = slice[0].date
        const endDate = slice[slice.length - 1].date

        // Format label: "20 janv." or "20 janv. - 27 janv." for ranges
        const formatShort = (d: string) => {
            // Check if it's a valid ISO date (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
            const date = new Date(d + 'T00:00:00')
            if (isNaN(date.getTime())) return d
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        }
        const label = startDate === endDate
            ? formatShort(startDate)
            : `${formatShort(startDate)} - ${formatShort(endDate)}`

        const aggregated = slice.reduce(
            (acc, d) => ({
                date: label,
                clicks: acc.clicks + d.clicks,
                leads: acc.leads + d.leads,
                sales: acc.sales + d.sales,
                revenue: acc.revenue + d.revenue,
            }),
            { date: label, clicks: 0, leads: 0, sales: 0, revenue: 0 }
        )

        bucketed.push(aggregated)
    }

    return bucketed
}

// =============================================
// HELPERS
// =============================================

function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
}

// =============================================
// DROPDOWN COMPONENT
// =============================================

function Dropdown({
    trigger,
    children,
    isOpen,
    onClose
}: {
    trigger: React.ReactNode
    children: React.ReactNode
    isOpen: boolean
    onClose: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    return (
        <div ref={ref} className="relative">
            {trigger}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// =============================================
// FILTER BADGE COMPONENT
// =============================================

function FilterBadge({
    filter,
    onRemove,
    isText
}: {
    filter: ActiveFilter
    onRemove: () => void
    isText: string
}) {
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm animate-in fade-in slide-in-from-left-2 duration-200">
            {filter.icon}
            <span className="text-gray-500 capitalize">{filter.type}</span>
            <span className="text-gray-400">{isText}</span>
            <span className="font-semibold text-gray-900">{filter.label}</span>
            <button
                onClick={onRemove}
                className="ml-1 p-0.5 rounded hover:bg-gray-200 transition-colors"
            >
                <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
        </div>
    )
}

// =============================================
// SIMPLE LIST ITEM (Traaaction minimal style)
// =============================================

function SimpleListItem({
    icon,
    label,
    count,
    percentage = 100,
    isSelected,
    onClick
}: {
    icon?: React.ReactNode
    label: string
    count: number
    percentage?: number
    isSelected: boolean
    onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`relative flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors duration-150 
                ${isSelected
                    ? 'border-l-2 border-blue-500'
                    : 'hover:bg-gray-50/50 border-l-2 border-transparent'}`}
        >
            {/* Background bar - thinner height, light violet */}
            <div
                className={`absolute top-1 bottom-1 left-0 rounded-r transition-all duration-300 ${isSelected ? 'bg-violet-100' : 'bg-violet-50'}`}
                style={{ width: `${Math.min(percentage * 0.6, 60)}%` }}
            />

            {/* Content */}
            <div className="relative flex items-center gap-3">
                {icon}
                <span className={`text-sm ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {label}
                </span>
            </div>
            <span className="relative text-sm text-gray-500">{formatNumber(count)}</span>
        </div>
    )
}

// =============================================
// ANALYTICS CARD WITH TABS (Traaaction style)
// =============================================

function AnalyticsCard({
    title,
    tabs,
    activeTab,
    onTabChange,
    children,
    settingsLabel,
    itemCount = 0,
    maxItems = 8,
    viewAllText = 'View All',
    tabGroupId = 'analytics'
}: {
    title: string
    tabs?: { key: string; label: string }[]
    activeTab?: string
    onTabChange?: (tab: string) => void
    children: React.ReactNode
    settingsLabel?: string
    itemCount?: number
    maxItems?: number
    viewAllText?: string
    tabGroupId?: string
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header with tabs */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {tabs ? (
                            tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => onTabChange?.(tab.key)}
                                    className={`relative text-sm font-medium transition-colors pb-1 ${activeTab === tab.key
                                        ? 'text-gray-900'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <motion.div
                                            layoutId={`tab-indicator-${tabGroupId}`}
                                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 rounded-full"
                                            transition={springSnappy}
                                        />
                                    )}
                                </button>
                            ))
                        ) : (
                            <span className="font-semibold text-gray-900">{title}</span>
                        )}
                    </div>
                    {settingsLabel && (
                        <span className="text-xs text-gray-400 uppercase tracking-wider">{settingsLabel}</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="divide-y divide-gray-50">
                {children}
            </div>

            {/* View All footer - only show if more items than maxItems */}
            {itemCount > maxItems && (
                <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                    <button className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                        {viewAllText}
                    </button>
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN DASHBOARD PAGE
// =============================================

export default function DashboardPage() {
    const t = useTranslations('dashboard')

    // Build DATE_RANGES with translated labels
    const DATE_RANGES = DATE_RANGE_KEYS.map(range => ({
        ...range,
        label: t(`dateRanges.${range.labelKey}`)
    }))

    // Date range state - store the value, not the object
    const [dateRangeOpen, setDateRangeOpen] = useState(false)
    const [selectedRangeValue, setSelectedRangeValue] = useState('30d') // Last 30 days
    const selectedRange = DATE_RANGES.find(r => r.value === selectedRangeValue) || DATE_RANGES[4]

    // Filter state
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])

    // Event type filter state (default: all selected)
    const [activeEventTypes, setActiveEventTypes] = useState<Set<string>>(
        new Set(['clicks', 'leads', 'sales'])
    )

    // Tab state for analytics cards (use keys, not translated labels)
    const [locationTab, setLocationTab] = useState('countries')
    const [deviceTab, setDeviceTab] = useState('devices')

    // Calculate dates from range
    const dateFrom = selectedRange.value === 'yesterday'
        ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
        : format(subDays(new Date(), selectedRange.days), 'yyyy-MM-dd')
    const dateTo = format(new Date(), 'yyyy-MM-dd')

    // Build filter params for KPI (no exclusion - apply all filters)
    const buildKpiFilterParams = () => {
        const params: string[] = []
        const countryFilters = activeFilters.filter(f => f.type === 'country').map(f => f.value)
        const cityFilters = activeFilters.filter(f => f.type === 'city').map(f => f.value)
        const regionFilters = activeFilters.filter(f => f.type === 'region').map(f => f.value)
        const continentFilters = activeFilters.filter(f => f.type === 'continent').map(f => f.value)
        const deviceFilters = activeFilters.filter(f => f.type === 'device').map(f => f.value)
        const browserFilters = activeFilters.filter(f => f.type === 'browser').map(f => f.value)
        const osFilters = activeFilters.filter(f => f.type === 'os').map(f => f.value)

        if (countryFilters.length) params.push(`country=${countryFilters.join(',')}`)
        if (cityFilters.length) params.push(`city=${cityFilters.join(',')}`)
        if (regionFilters.length) params.push(`region=${regionFilters.join(',')}`)
        if (continentFilters.length) params.push(`continent=${continentFilters.join(',')}`)
        if (deviceFilters.length) params.push(`device=${deviceFilters.join(',')}`)
        if (browserFilters.length) params.push(`browser=${browserFilters.join(',')}`)
        if (osFilters.length) params.push(`os=${osFilters.join(',')}`)

        // Add event type filter (only if not all types are selected)
        if (activeEventTypes.size < 3) {
            params.push(`event_type=${Array.from(activeEventTypes).join(',')}`)
        }

        return params.length ? '&' + params.join('&') : ''
    }

    // Fetch KPIs with date range and filters
    const { data: kpiData, mutate, isValidating } = useSWR<KPIResponse>(
        `/api/stats/kpi?date_from=${dateFrom}&date_to=${dateTo}${buildKpiFilterParams()}`,
        kpiFetcher,
        { revalidateOnFocus: false }
    )

    // Fetch breakdown data from real API
    const breakdownFetcher = async (url: string) => {
        const res = await fetch(url, {
            cache: 'no-store',
            credentials: 'include'
        })
        if (!res.ok) return { data: [] }
        return res.json()
    }

    // Build filter query string from active filters, excluding a specific type for cross-filtering
    const buildFilterParams = (excludeType?: string) => {
        const params: string[] = []
        const countryFilters = activeFilters.filter(f => f.type === 'country').map(f => f.value)
        const cityFilters = activeFilters.filter(f => f.type === 'city').map(f => f.value)
        const regionFilters = activeFilters.filter(f => f.type === 'region').map(f => f.value)
        const continentFilters = activeFilters.filter(f => f.type === 'continent').map(f => f.value)
        const deviceFilters = activeFilters.filter(f => f.type === 'device').map(f => f.value)
        const browserFilters = activeFilters.filter(f => f.type === 'browser').map(f => f.value)
        const osFilters = activeFilters.filter(f => f.type === 'os').map(f => f.value)

        // Each dimension excludes its own type to show all values in that dimension
        if (countryFilters.length && excludeType !== 'country') params.push(`country=${countryFilters.join(',')}`)
        if (cityFilters.length && excludeType !== 'city') params.push(`city=${cityFilters.join(',')}`)
        if (regionFilters.length && excludeType !== 'region') params.push(`region=${regionFilters.join(',')}`)
        if (continentFilters.length && excludeType !== 'continent') params.push(`continent=${continentFilters.join(',')}`)
        if (deviceFilters.length && excludeType !== 'device') params.push(`device=${deviceFilters.join(',')}`)
        if (browserFilters.length && excludeType !== 'browser') params.push(`browser=${browserFilters.join(',')}`)
        if (osFilters.length && excludeType !== 'os') params.push(`os=${osFilters.join(',')}`)

        // Add event type filter (breakdowns should also respect event type)
        if (activeEventTypes.size < 3) {
            params.push(`event_type=${Array.from(activeEventTypes).join(',')}`)
        }

        return params.length ? '&' + params.join('&') : ''
    }

    // Each dimension uses filters EXCEPT its own type (cross-filtering)
    const { data: countriesData } = useSWR(
        `/api/stats/breakdown?dimension=countries&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('country')}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: citiesData } = useSWR(
        `/api/stats/breakdown?dimension=cities&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('city')}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: devicesData } = useSWR(
        `/api/stats/breakdown?dimension=devices&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('device')}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: browsersData } = useSWR(
        `/api/stats/breakdown?dimension=browsers&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('browser')}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: osData } = useSWR(
        `/api/stats/breakdown?dimension=os&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('os')}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )

    // Use API data or fallback to mock data
    const apiCountries = countriesData?.data || []
    const apiCities = citiesData?.data || []
    const apiDevices = devicesData?.data || []
    const apiBrowsers = browsersData?.data || []
    const apiOS = osData?.data || []

    const kpi = kpiData?.data?.[0] || { clicks: 0, leads: 0, sales: 0, revenue: 0, timeseries: [] }

    // Get active filter values by type
    const countryFilters = activeFilters.filter(f => f.type === 'country').map(f => f.value)
    const deviceFilters = activeFilters.filter(f => f.type === 'device').map(f => f.value)
    const cityFilters = activeFilters.filter(f => f.type === 'city').map(f => f.value)
    const regionFilters = activeFilters.filter(f => f.type === 'region').map(f => f.value)
    const continentFilters = activeFilters.filter(f => f.type === 'continent').map(f => f.value)
    const browserFilters = activeFilters.filter(f => f.type === 'browser').map(f => f.value)
    const osFilters = activeFilters.filter(f => f.type === 'os').map(f => f.value)

    // KPI from API (no filtering on mock data needed anymore)
    const displayKPI = kpi

    // Country ISO to name and flag mapping
    const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
        // Full names (already correct)
        'France': { name: 'France', flag: '🇫🇷' },
        'Germany': { name: 'Germany', flag: '🇩🇪' },
        'United Kingdom': { name: 'United Kingdom', flag: '🇬🇧' },
        'United States': { name: 'United States', flag: '🇺🇸' },
        'Morocco': { name: 'Morocco', flag: '🇲🇦' },
        'Spain': { name: 'Spain', flag: '🇪🇸' },
        'Italy': { name: 'Italy', flag: '🇮🇹' },
        'Canada': { name: 'Canada', flag: '🇨🇦' },
        'Netherlands': { name: 'Netherlands', flag: '🇳🇱' },
        'Belgium': { name: 'Belgium', flag: '🇧🇪' },
        'Switzerland': { name: 'Switzerland', flag: '🇨🇭' },
        'Japan': { name: 'Japan', flag: '🇯🇵' },
        'Australia': { name: 'Australia', flag: '🇦🇺' },
        'Brazil': { name: 'Brazil', flag: '🇧🇷' },
        // ISO codes
        'FR': { name: 'France', flag: '🇫🇷' },
        'DE': { name: 'Germany', flag: '🇩🇪' },
        'GB': { name: 'United Kingdom', flag: '🇬🇧' },
        'UK': { name: 'United Kingdom', flag: '🇬🇧' },
        'US': { name: 'United States', flag: '🇺🇸' },
        'MA': { name: 'Morocco', flag: '🇲🇦' },
        'ES': { name: 'Spain', flag: '🇪🇸' },
        'IT': { name: 'Italy', flag: '🇮🇹' },
        'CA': { name: 'Canada', flag: '🇨🇦' },
        'NL': { name: 'Netherlands', flag: '🇳🇱' },
        'BE': { name: 'Belgium', flag: '🇧🇪' },
        'CH': { name: 'Switzerland', flag: '🇨🇭' },
        'JP': { name: 'Japan', flag: '🇯🇵' },
        'AU': { name: 'Australia', flag: '🇦🇺' },
        'BR': { name: 'Brazil', flag: '🇧🇷' },
        'PT': { name: 'Portugal', flag: '🇵🇹' },
        'PL': { name: 'Poland', flag: '🇵🇱' },
        'AT': { name: 'Austria', flag: '🇦🇹' },
        'SE': { name: 'Sweden', flag: '🇸🇪' },
        'NO': { name: 'Norway', flag: '🇳🇴' },
        'DK': { name: 'Denmark', flag: '🇩🇰' },
        'FI': { name: 'Finland', flag: '🇫🇮' },
        'IE': { name: 'Ireland', flag: '🇮🇪' },
        'MX': { name: 'Mexico', flag: '🇲🇽' },
        'AR': { name: 'Argentina', flag: '🇦🇷' },
        'CL': { name: 'Chile', flag: '🇨🇱' },
        'CO': { name: 'Colombia', flag: '🇨🇴' },
        'CN': { name: 'China', flag: '🇨🇳' },
        'IN': { name: 'India', flag: '🇮🇳' },
        'KR': { name: 'South Korea', flag: '🇰🇷' },
        'SG': { name: 'Singapore', flag: '🇸🇬' },
        'HK': { name: 'Hong Kong', flag: '🇭🇰' },
        'TH': { name: 'Thailand', flag: '🇹🇭' },
        'VN': { name: 'Vietnam', flag: '🇻🇳' },
        'ID': { name: 'Indonesia', flag: '🇮🇩' },
        'MY': { name: 'Malaysia', flag: '🇲🇾' },
        'PH': { name: 'Philippines', flag: '🇵🇭' },
        'NZ': { name: 'New Zealand', flag: '🇳🇿' },
        'ZA': { name: 'South Africa', flag: '🇿🇦' },
        'EG': { name: 'Egypt', flag: '🇪🇬' },
        'NG': { name: 'Nigeria', flag: '🇳🇬' },
        'AE': { name: 'United Arab Emirates', flag: '🇦🇪' },
        'IL': { name: 'Israel', flag: '🇮🇱' },
        'TR': { name: 'Turkey', flag: '🇹🇷' },
        'RU': { name: 'Russia', flag: '🇷🇺' },
    }

    // Display data - API DATA ONLY (no mock fallback)
    const displayLocations = useMemo((): (LocationItem & { code: string })[] => {
        // Use API data directly
        if (apiCountries.length > 0) {
            return apiCountries.map((c: any) => {
                const info = COUNTRY_INFO[c.name] || { name: c.name, flag: '🌍' }
                // Keep original code for filtering, display name for UI
                return { name: info.name, flag: info.flag, count: c.clicks || 0, code: c.name }
            })
        }
        // Return empty if no data
        return []
    }, [apiCountries])

    const displayDevices = useMemo((): DeviceItem[] => {
        if (apiDevices.length > 0) {
            return apiDevices.map((d: any) => ({
                name: d.name,
                icon: d.name === 'Desktop' ? Laptop : Smartphone,
                count: d.clicks || 0
            }))
        }
        return []
    }, [apiDevices])

    // Country code to flag mapping
    const COUNTRY_FLAGS: Record<string, string> = {
        'France': '🇫🇷', 'FR': '🇫🇷', 'Germany': '🇩🇪', 'DE': '🇩🇪',
        'United Kingdom': '🇬🇧', 'GB': '🇬🇧', 'UK': '🇬🇧',
        'United States': '🇺🇸', 'US': '🇺🇸', 'Morocco': '🇲🇦', 'MA': '🇲🇦',
        'Spain': '🇪🇸', 'ES': '🇪🇸', 'Italy': '🇮🇹', 'IT': '🇮🇹',
        'Canada': '🇨🇦', 'CA': '🇨🇦', 'Netherlands': '🇳🇱', 'NL': '🇳🇱',
        'Belgium': '🇧🇪', 'BE': '🇧🇪', 'Switzerland': '🇨🇭', 'CH': '🇨🇭',
        'Japan': '🇯🇵', 'JP': '🇯🇵', 'Australia': '🇦🇺', 'AU': '🇦🇺',
        'Brazil': '🇧🇷', 'BR': '🇧🇷', 'Portugal': '🇵🇹', 'PT': '🇵🇹',
    }

    const displayCities = useMemo((): LocationItem[] => {
        if (apiCities.length > 0) {
            return apiCities.map((c: any) => {
                const flag = COUNTRY_FLAGS[c.country] || '🌍'
                return { name: c.name, country: c.country || '', flag, count: c.clicks || 0 }
            })
        }
        return []
    }, [apiCities])

    // Regions - Derived from cities
    const displayRegions = useMemo((): LocationItem[] => {
        if (apiCities.length === 0) return []

        // City to Region mapping
        const CITY_TO_REGION: Record<string, string> = {
            // Brittany
            'Brest': 'Bretagne', 'Concarneau': 'Bretagne', 'Quimper': 'Bretagne',
            'Guilers': 'Bretagne', 'Lorient': 'Bretagne', 'Vannes': 'Bretagne',
            'Saint-Brieuc': 'Bretagne', 'Morlaix': 'Bretagne', 'Rennes': 'Bretagne',
            // Normandy
            'Pont-Audemer': 'Normandie', 'Rouen': 'Normandie', 'Le Havre': 'Normandie', 'Caen': 'Normandie',
            // Île-de-France
            'Paris': 'Île-de-France',
            // Other French regions
            'Lyon': 'Auvergne-Rhône-Alpes', 'Marseille': 'Provence-Alpes-Côte d\'Azur',
            'Bordeaux': 'Nouvelle-Aquitaine', 'Toulouse': 'Occitanie', 'Nantes': 'Pays de la Loire',
            'Nice': 'Provence-Alpes-Côte d\'Azur', 'Lille': 'Hauts-de-France', 'Strasbourg': 'Grand Est',
            // Morocco
            'Rabat': 'Rabat-Salé-Kénitra', 'Casablanca': 'Casablanca-Settat', 'Marrakech': 'Marrakech-Safi',
        }

        const regionCounts: Record<string, number> = {}
        apiCities.forEach((city: any) => {
            const region = CITY_TO_REGION[city.name] || 'Other'
            regionCounts[region] = (regionCounts[region] || 0) + (city.clicks || 0)
        })

        // Region to country flag mapping
        const REGION_FLAGS: Record<string, string> = {
            'Bretagne': '🇫🇷', 'Normandie': '🇫🇷', 'Île-de-France': '🇫🇷',
            'Auvergne-Rhône-Alpes': '🇫🇷', 'Provence-Alpes-Côte d\'Azur': '🇫🇷',
            'Nouvelle-Aquitaine': '🇫🇷', 'Occitanie': '🇫🇷', 'Pays de la Loire': '🇫🇷',
            'Hauts-de-France': '🇫🇷', 'Grand Est': '🇫🇷',
            'Rabat-Salé-Kénitra': '🇲🇦', 'Casablanca-Settat': '🇲🇦', 'Marrakech-Safi': '🇲🇦',
            'Other': '🌍',
        }

        return Object.entries(regionCounts)
            .map(([name, count]) => ({ name, flag: REGION_FLAGS[name] || '📍', count }))
            .sort((a, b) => b.count - a.count)
    }, [apiCities])

    // Continents - Derived from countries
    const displayContinents = useMemo((): LocationItem[] => {
        if (apiCountries.length === 0) return []

        const COUNTRY_TO_CONTINENT: Record<string, string> = {
            // Full names
            'France': 'Europe', 'Germany': 'Europe', 'United Kingdom': 'Europe', 'Spain': 'Europe',
            'Italy': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe',
            'Portugal': 'Europe', 'Poland': 'Europe', 'Austria': 'Europe', 'Sweden': 'Europe',
            'Norway': 'Europe', 'Denmark': 'Europe', 'Finland': 'Europe', 'Ireland': 'Europe',
            'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
            'Brazil': 'South America', 'Argentina': 'South America', 'Chile': 'South America', 'Colombia': 'South America',
            'Japan': 'Asia', 'China': 'Asia', 'South Korea': 'Asia', 'India': 'Asia',
            'Singapore': 'Asia', 'Thailand': 'Asia', 'Vietnam': 'Asia', 'Indonesia': 'Asia',
            'Malaysia': 'Asia', 'Philippines': 'Asia', 'Hong Kong': 'Asia',
            'Australia': 'Oceania', 'New Zealand': 'Oceania',
            'Morocco': 'Africa', 'South Africa': 'Africa', 'Egypt': 'Africa', 'Nigeria': 'Africa',
            'United Arab Emirates': 'Asia', 'Israel': 'Asia', 'Turkey': 'Europe', 'Russia': 'Europe',
            // ISO codes
            'FR': 'Europe', 'DE': 'Europe', 'GB': 'Europe', 'UK': 'Europe', 'ES': 'Europe',
            'IT': 'Europe', 'NL': 'Europe', 'BE': 'Europe', 'CH': 'Europe', 'PT': 'Europe',
            'PL': 'Europe', 'AT': 'Europe', 'SE': 'Europe', 'NO': 'Europe', 'DK': 'Europe',
            'FI': 'Europe', 'IE': 'Europe', 'TR': 'Europe', 'RU': 'Europe',
            'US': 'North America', 'CA': 'North America', 'MX': 'North America',
            'BR': 'South America', 'AR': 'South America', 'CL': 'South America', 'CO': 'South America',
            'JP': 'Asia', 'CN': 'Asia', 'KR': 'Asia', 'IN': 'Asia', 'SG': 'Asia',
            'TH': 'Asia', 'VN': 'Asia', 'ID': 'Asia', 'MY': 'Asia', 'PH': 'Asia', 'HK': 'Asia',
            'AU': 'Oceania', 'NZ': 'Oceania',
            'MA': 'Africa', 'ZA': 'Africa', 'EG': 'Africa', 'NG': 'Africa',
            'AE': 'Asia', 'IL': 'Asia',
        }

        const continentCounts: Record<string, number> = {}
        apiCountries.forEach((country: any) => {
            const continent = COUNTRY_TO_CONTINENT[country.name] || 'Other'
            continentCounts[continent] = (continentCounts[continent] || 0) + (country.clicks || 0)
        })

        const CONTINENT_FLAGS: Record<string, string> = {
            'Europe': '🇪🇺', 'North America': '🌎', 'South America': '🌎',
            'Asia': '🌏', 'Africa': '🌍', 'Oceania': '🌏', 'Other': '🌐'
        }

        return Object.entries(continentCounts)
            .map(([name, count]) => ({ name, flag: CONTINENT_FLAGS[name] || '🌐', count }))
            .sort((a, b) => b.count - a.count)
    }, [apiCountries])

    const displayBrowsers = useMemo((): AnalyticsItem[] => {
        if (apiBrowsers.length > 0) {
            return apiBrowsers.map((b: any) => ({ name: b.name, count: b.clicks || 0 }))
        }
        return []
    }, [apiBrowsers])

    const displayOS = useMemo((): AnalyticsItem[] => {
        if (apiOS.length > 0) {
            return apiOS.map((o: any) => ({ name: o.name, count: o.clicks || 0 }))
        }
        return []
    }, [apiOS])

    // Get timeseries from KPI API data
    const getFilteredTimeseries = useCallback(() => {
        const apiTimeseries = kpi.timeseries || []

        // If no API data, return empty array
        if (apiTimeseries.length === 0) {
            return []
        }

        // Bucket to max 20 points for long date ranges
        return bucketTimeseriesData(apiTimeseries, 20)
    }, [kpi.timeseries])

    const displayTimeseries = getFilteredTimeseries()

    const maxLocation = Math.max(...displayLocations.map((l: { count: number }) => l.count), 1)
    const maxDevice = Math.max(...displayDevices.map((d: { count: number }) => d.count), 1)
    const maxCity = Math.max(...displayCities.map((c: { count: number }) => c.count), 1)
    const maxRegion = Math.max(...displayRegions.map((r: { count: number }) => r.count), 1)
    const maxContinent = Math.max(...displayContinents.map((c: { count: number }) => c.count), 1)
    const maxBrowser = Math.max(...displayBrowsers.map((b: { count: number }) => b.count), 1)
    const maxOS = Math.max(...displayOS.map((o: { count: number }) => o.count), 1)

    const handleSelectRange = (range: typeof DATE_RANGES[0]) => {
        setSelectedRangeValue(range.value)
        setDateRangeOpen(false)
    }

    const toggleFilter = (type: ActiveFilter['type'], value: string, label: string, icon?: React.ReactNode) => {
        setActiveFilters(prev => {
            const exists = prev.find(f => f.type === type && f.value === value)
            if (exists) {
                return prev.filter(f => !(f.type === type && f.value === value))
            } else {
                return [...prev, { type, value, label, icon }]
            }
        })
    }

    const toggleEventType = (type: 'clicks' | 'leads' | 'sales') => {
        setActiveEventTypes(prev => {
            // If all types are selected, clicking one filters to only that type
            if (prev.size === 3) {
                return new Set([type])
            }
            // If only this type is selected, clicking again shows all
            if (prev.size === 1 && prev.has(type)) {
                return new Set(['clicks', 'leads', 'sales'])
            }
            // Otherwise, set to only this type
            return new Set([type])
        })
    }

    const removeFilter = (type: ActiveFilter['type'], value: string) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === type && f.value === value)))
    }

    const clearAllFilters = useCallback(() => {
        setActiveFilters([])
        setActiveEventTypes(new Set(['clicks', 'leads', 'sales']))
    }, [])

    // ESC key to clear filters
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (activeFilters.length > 0 || activeEventTypes.size < 3)) {
                clearAllFilters()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeFilters.length, activeEventTypes.size, clearAllFilters])

    const isCountrySelected = (name: string) => activeFilters.some(f => f.type === 'country' && f.value === name)
    const isDeviceSelected = (name: string) => activeFilters.some(f => f.type === 'device' && f.value === name)

    return (
        <div className="space-y-6">
            {/* Startup Onboarding Checklist */}
            <StartupOnboardingChecklist />

            {/* Date Range Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Date Range Dropdown */}
                    <Dropdown
                        isOpen={dateRangeOpen}
                        onClose={() => setDateRangeOpen(false)}
                        trigger={
                            <button
                                onClick={() => setDateRangeOpen(!dateRangeOpen)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
                            >
                                <Calendar className="w-4 h-4 text-gray-500" />
                                {selectedRange.label}
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                        }
                    >
                        {DATE_RANGES.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => handleSelectRange(range)}
                                className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {range.label}
                                {selectedRange.value === range.value && (
                                    <Check className="w-4 h-4 text-violet-600" />
                                )}
                            </button>
                        ))}
                    </Dropdown>
                </div>

                <button
                    onClick={() => mutate()}
                    disabled={isValidating}
                    className={`p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors ${isValidating ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Active Filters Bar */}
            {(activeFilters.length > 0 || activeEventTypes.size < 3) && (
                <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Event Type Filter Badge */}
                    {activeEventTypes.size < 3 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 border border-violet-200 rounded-lg">
                            <span className="text-sm text-violet-700 font-medium">
                                {t('filters.showing')}: {Array.from(activeEventTypes).join(', ')}
                            </span>
                            <button
                                onClick={() => setActiveEventTypes(new Set(['clicks', 'leads', 'sales']))}
                                className="text-violet-500 hover:text-violet-700 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Dimension Filters */}
                    {activeFilters.map((filter) => (
                        <FilterBadge
                            key={`${filter.type}-${filter.value}`}
                            filter={filter}
                            onRemove={() => removeFilter(filter.type, filter.value)}
                            isText={t('filters.is')}
                        />
                    ))}

                    {/* Clear All Button */}
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        {t('filters.clearFilters')}
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">ESC</span>
                    </button>
                </div>
            )}

            {/* Analytics Chart */}
            <AnalyticsChart
                clicks={displayKPI.clicks}
                leads={displayKPI.leads}
                sales={displayKPI.sales}
                revenue={displayKPI.revenue}
                timeseries={displayTimeseries}
                activeEventTypes={activeEventTypes}
                onEventTypeToggle={toggleEventType}
            />

            {/* Analytics Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Locations Card */}
                <AnalyticsCard
                    title={t('locations.title')}
                    tabs={[
                        { key: 'countries', label: t('locations.countries') },
                        { key: 'cities', label: t('locations.cities') },
                        { key: 'regions', label: t('locations.regions') },
                        { key: 'continents', label: t('locations.continents') }
                    ]}
                    activeTab={locationTab}
                    onTabChange={setLocationTab}
                    settingsLabel={t('kpi.clicks').toUpperCase()}
                    viewAllText={t('viewAll')}
                    tabGroupId="locations"
                >
                    {locationTab === 'countries' && displayLocations.map((loc) => (
                        <SimpleListItem
                            key={loc.code}
                            icon={<span className="text-lg">{loc.flag}</span>}
                            label={loc.name}
                            count={loc.count}
                            percentage={(loc.count / maxLocation) * 100}
                            isSelected={activeFilters.some(f => f.type === 'country' && f.value === loc.code)}
                            onClick={() => toggleFilter('country', loc.code, loc.name, <span className="text-sm">{loc.flag}</span>)}
                        />
                    ))}
                    {locationTab === 'cities' && displayCities.map((city) => (
                        <SimpleListItem
                            key={city.name}
                            icon={<span className="text-lg">{city.flag}</span>}
                            label={city.name}
                            count={city.count}
                            percentage={(city.count / maxCity) * 100}
                            isSelected={activeFilters.some(f => f.type === 'city' && f.value === city.name)}
                            onClick={() => toggleFilter('city', city.name, city.name, <span className="text-sm">{city.flag}</span>)}
                        />
                    ))}
                    {locationTab === 'regions' && displayRegions.map((region) => (
                        <SimpleListItem
                            key={region.name}
                            icon={<span className="text-lg">{region.flag}</span>}
                            label={region.name}
                            count={region.count}
                            percentage={(region.count / maxRegion) * 100}
                            isSelected={activeFilters.some(f => f.type === 'region' && f.value === region.name)}
                            onClick={() => toggleFilter('region', region.name, region.name, <span className="text-sm">{region.flag}</span>)}
                        />
                    ))}
                    {locationTab === 'continents' && displayContinents.map((cont) => (
                        <SimpleListItem
                            key={cont.name}
                            icon={<span className="text-lg">{cont.flag}</span>}
                            label={cont.name}
                            count={cont.count}
                            percentage={(cont.count / maxContinent) * 100}
                            isSelected={activeFilters.some(f => f.type === 'continent' && f.value === cont.name)}
                            onClick={() => toggleFilter('continent', cont.name, cont.name, <span className="text-sm">{cont.flag}</span>)}
                        />
                    ))}
                </AnalyticsCard>

                {/* Devices Card */}
                <AnalyticsCard
                    title={t('devices.title')}
                    tabs={[
                        { key: 'devices', label: t('devices.devices') },
                        { key: 'browsers', label: t('devices.browsers') },
                        { key: 'os', label: t('devices.os') }
                    ]}
                    activeTab={deviceTab}
                    onTabChange={setDeviceTab}
                    settingsLabel={t('kpi.clicks').toUpperCase()}
                    viewAllText={t('viewAll')}
                    tabGroupId="devices"
                >
                    {deviceTab === 'devices' && displayDevices.map((device) => {
                        const Icon = device.icon
                        return (
                            <SimpleListItem
                                key={device.name}
                                icon={<Icon className="w-4 h-4 text-gray-500" />}
                                label={device.name}
                                count={device.count}
                                percentage={(device.count / maxDevice) * 100}
                                isSelected={isDeviceSelected(device.name)}
                                onClick={() => toggleFilter('device', device.name, device.name, <Icon className="w-3.5 h-3.5 text-gray-500" />)}
                            />
                        )
                    })}
                    {deviceTab === 'browsers' && displayBrowsers.map((browser) => (
                        <SimpleListItem
                            key={browser.name}
                            icon={<Globe className="w-4 h-4 text-gray-500" />}
                            label={browser.name}
                            count={browser.count}
                            percentage={(browser.count / maxBrowser) * 100}
                            isSelected={activeFilters.some(f => f.type === 'browser' && f.value === browser.name)}
                            onClick={() => toggleFilter('browser', browser.name, browser.name, <Globe className="w-3.5 h-3.5 text-gray-500" />)}
                        />
                    ))}
                    {deviceTab === 'os' && displayOS.map((os) => (
                        <SimpleListItem
                            key={os.name}
                            icon={<Monitor className="w-4 h-4 text-gray-500" />}
                            label={os.name}
                            count={os.count}
                            percentage={(os.count / maxOS) * 100}
                            isSelected={activeFilters.some(f => f.type === 'os' && f.value === os.name)}
                            onClick={() => toggleFilter('os', os.name, os.name, <Monitor className="w-3.5 h-3.5 text-gray-500" />)}
                        />
                    ))}
                </AnalyticsCard>
            </div>

            {/* Geographic Distribution & Live Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3D Globe Visualization */}
                <GlobeVisualization />

                {/* Live Activity Feed */}
                <ActivityFeed />
            </div>
        </div>
    )
}
