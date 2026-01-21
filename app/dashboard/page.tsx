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
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { GlobeVisualization } from '@/components/dashboard/GlobeVisualization'
import { subDays, format } from 'date-fns'

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
    type: 'country' | 'device' | 'city' | 'region' | 'continent' | 'browser' | 'os'
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
    const res = await fetch(`${url}&_t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

// =============================================
// DATE RANGES
// =============================================

const DATE_RANGES = [
    { label: 'Today', value: 'today', days: 0 },
    { label: 'Yesterday', value: 'yesterday', days: 1 },
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 14 days', value: '14d', days: 14 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'Last 12 months', value: '12m', days: 365 },
    { label: 'All time', value: 'all', days: 3650 },
]

// =============================================
// MOCK DATA FOR ANALYTICS CARDS
// Cross-referenced data for linked filtering
// =============================================

// Raw click events with ALL dimensions for cross-filtering
const MOCK_EVENTS = [
    // France - Paris
    { country: 'France', city: 'Paris', region: 'Île-de-France', continent: 'Europe', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 280, leads: 15, sales: 4, revenue: 8500 },
    { country: 'France', city: 'Paris', region: 'Île-de-France', continent: 'Europe', device: 'Desktop', browser: 'Safari', os: 'macOS', clicks: 140, leads: 8, sales: 2, revenue: 4200 },
    { country: 'France', city: 'Paris', region: 'Île-de-France', continent: 'Europe', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 180, leads: 8, sales: 2, revenue: 4800 },
    { country: 'France', city: 'Paris', region: 'Île-de-France', continent: 'Europe', device: 'Mobile', browser: 'Chrome', os: 'Android', clicks: 100, leads: 4, sales: 1, revenue: 2500 },
    { country: 'France', city: 'Lyon', region: 'Auvergne-Rhône-Alpes', continent: 'Europe', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 85, leads: 4, sales: 1, revenue: 2100 },
    { country: 'France', city: 'Lyon', region: 'Auvergne-Rhône-Alpes', continent: 'Europe', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 62, leads: 3, sales: 1, revenue: 1800 },
    // United States - New York
    { country: 'United States', city: 'New York', region: 'New York', continent: 'North America', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 150, leads: 10, sales: 3, revenue: 6800 },
    { country: 'United States', city: 'New York', region: 'New York', continent: 'North America', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 85, leads: 5, sales: 1, revenue: 3200 },
    // United States - Los Angeles
    { country: 'United States', city: 'Los Angeles', region: 'California', continent: 'North America', device: 'Desktop', browser: 'Chrome', os: 'macOS', clicks: 95, leads: 6, sales: 2, revenue: 4500 },
    { country: 'United States', city: 'Los Angeles', region: 'California', continent: 'North America', device: 'Mobile', browser: 'Chrome', os: 'Android', clicks: 93, leads: 5, sales: 1, revenue: 2700 },
    // Germany
    { country: 'Germany', city: 'Berlin', region: 'Berlin', continent: 'Europe', device: 'Desktop', browser: 'Firefox', os: 'Windows', clicks: 120, leads: 7, sales: 2, revenue: 4100 },
    { country: 'Germany', city: 'Berlin', region: 'Berlin', continent: 'Europe', device: 'Mobile', browser: 'Chrome', os: 'Android', clicks: 68, leads: 4, sales: 1, revenue: 1800 },
    { country: 'Germany', city: 'Munich', region: 'Bavaria', continent: 'Europe', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 90, leads: 5, sales: 2, revenue: 3100 },
    { country: 'Germany', city: 'Munich', region: 'Bavaria', continent: 'Europe', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 34, leads: 2, sales: 0, revenue: 700 },
    // United Kingdom
    { country: 'United Kingdom', city: 'London', region: 'England', continent: 'Europe', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 80, leads: 5, sales: 1, revenue: 3200 },
    { country: 'United Kingdom', city: 'London', region: 'England', continent: 'Europe', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 64, leads: 4, sales: 1, revenue: 1600 },
    { country: 'United Kingdom', city: 'Manchester', region: 'England', continent: 'Europe', device: 'Desktop', browser: 'Edge', os: 'Windows', clicks: 45, leads: 3, sales: 1, revenue: 1600 },
    // Spain
    { country: 'Spain', city: 'Madrid', region: 'Madrid', continent: 'Europe', device: 'Desktop', browser: 'Chrome', os: 'Windows', clicks: 60, leads: 3, sales: 1, revenue: 2000 },
    { country: 'Spain', city: 'Madrid', region: 'Madrid', continent: 'Europe', device: 'Mobile', browser: 'Chrome', os: 'Android', clicks: 35, leads: 2, sales: 0, revenue: 600 },
    { country: 'Spain', city: 'Barcelona', region: 'Catalonia', continent: 'Europe', device: 'Desktop', browser: 'Firefox', os: 'Linux', clicks: 35, leads: 2, sales: 1, revenue: 1200 },
    { country: 'Spain', city: 'Barcelona', region: 'Catalonia', continent: 'Europe', device: 'Mobile', browser: 'Safari', os: 'iOS', clicks: 15, leads: 1, sales: 0, revenue: 400 },
]

// Country metadata
const COUNTRY_FLAGS: Record<string, string> = {
    'France': '🇫🇷',
    'United States': '🇺🇸',
    'Germany': '🇩🇪',
    'United Kingdom': '🇬🇧',
    'Spain': '🇪🇸',
}

// Derive aggregated locations from events
const MOCK_LOCATIONS = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.country]) acc[e.country] = { clicks: 0, leads: 0, sales: 0, revenue: 0 }
        acc[e.country].clicks += e.clicks
        acc[e.country].leads += e.leads
        acc[e.country].sales += e.sales
        acc[e.country].revenue += e.revenue
        return acc
    }, {} as Record<string, { clicks: number; leads: number; sales: number; revenue: number }>)
).map(([name, stats]) => ({
    name,
    flag: COUNTRY_FLAGS[name] || '🌍',
    count: stats.clicks,
    ...stats
}))

// Derive aggregated devices from events
const MOCK_DEVICES = [
    { name: 'Desktop', icon: Laptop },
    { name: 'Mobile', icon: Smartphone },
].map(d => {
    const stats = MOCK_EVENTS.filter(e => e.device === d.name).reduce(
        (acc, e) => ({
            clicks: acc.clicks + e.clicks,
            leads: acc.leads + e.leads,
            sales: acc.sales + e.sales,
            revenue: acc.revenue + e.revenue,
        }),
        { clicks: 0, leads: 0, sales: 0, revenue: 0 }
    )
    return { ...d, count: stats.clicks, ...stats }
})

// Derive cities from events
const MOCK_CITIES = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.city]) acc[e.city] = { clicks: 0, country: e.country }
        acc[e.city].clicks += e.clicks
        return acc
    }, {} as Record<string, { clicks: number; country: string }>)
).map(([name, stats]) => ({
    name,
    flag: COUNTRY_FLAGS[stats.country] || '🌍',
    count: stats.clicks,
})).sort((a, b) => b.count - a.count)

// Derive regions from events
const MOCK_REGIONS = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.region]) acc[e.region] = { clicks: 0, country: e.country }
        acc[e.region].clicks += e.clicks
        return acc
    }, {} as Record<string, { clicks: number; country: string }>)
).map(([name, stats]) => ({
    name,
    flag: COUNTRY_FLAGS[stats.country] || '🌍',
    count: stats.clicks,
})).sort((a, b) => b.count - a.count)

// Derive continents from events
const MOCK_CONTINENTS = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.continent]) acc[e.continent] = { clicks: 0 }
        acc[e.continent].clicks += e.clicks
        return acc
    }, {} as Record<string, { clicks: number }>)
).map(([name, stats]) => ({
    name,
    flag: name === 'Europe' ? '🌍' : name === 'North America' ? '🌎' : '🌏',
    count: stats.clicks,
})).sort((a, b) => b.count - a.count)

// Derive browsers from events
const MOCK_BROWSERS = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.browser]) acc[e.browser] = { clicks: 0 }
        acc[e.browser].clicks += e.clicks
        return acc
    }, {} as Record<string, { clicks: number }>)
).map(([name, stats]) => ({
    name,
    count: stats.clicks,
})).sort((a, b) => b.count - a.count)

// Derive OS from events
const MOCK_OS = Object.entries(
    MOCK_EVENTS.reduce((acc, e) => {
        if (!acc[e.os]) acc[e.os] = { clicks: 0 }
        acc[e.os].clicks += e.clicks
        return acc
    }, {} as Record<string, { clicks: number }>)
).map(([name, stats]) => ({
    name,
    count: stats.clicks,
})).sort((a, b) => b.count - a.count)

// Generate mock timeseries data (400 days for long range views) with country+device breakdown
const generateTimeseriesData = () => {
    const data: Array<{
        date: string
        country: string
        device: string
        clicks: number
        leads: number
        sales: number
        revenue: number
    }> = []

    const today = new Date()
    const totalDays = 400 // Cover more than a year

    for (let i = totalDays - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        // Use deterministic pseudo-random based on date for consistency
        const seed = date.getDate() + date.getMonth() * 31

        // Generate data for each country+device combo
        MOCK_EVENTS.forEach((event, idx) => {
            // Seeded variation (60-140% of daily average)
            const variation = 0.6 + ((seed + idx * 7) % 80) / 100
            const dailyFactor = event.clicks / 30 // Daily average

            data.push({
                date: dateStr,
                country: event.country,
                device: event.device,
                clicks: Math.round(dailyFactor * variation),
                leads: Math.round((event.leads / 30) * variation),
                sales: Math.round((event.sales / 30) * variation),
                revenue: Math.round((event.revenue / 30) * variation),
            })
        })
    }

    return data
}

const MOCK_TIMESERIES_RAW = generateTimeseriesData()

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
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    {children}
                </div>
            )}
        </div>
    )
}

// =============================================
// FILTER BADGE COMPONENT
// =============================================

function FilterBadge({
    filter,
    onRemove
}: {
    filter: ActiveFilter
    onRemove: () => void
}) {
    return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm animate-in fade-in slide-in-from-left-2 duration-200">
            {filter.icon}
            <span className="text-gray-500 capitalize">{filter.type}</span>
            <span className="text-gray-400">is</span>
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
    maxItems = 8
}: {
    title: string
    tabs?: string[]
    activeTab?: string
    onTabChange?: (tab: string) => void
    children: React.ReactNode
    settingsLabel?: string
    itemCount?: number
    maxItems?: number
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
                                    key={tab}
                                    onClick={() => onTabChange?.(tab)}
                                    className={`text-sm font-medium transition-colors ${activeTab === tab
                                        ? 'text-gray-900'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {tab}
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
                        View All
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
    // Date range state
    const [dateRangeOpen, setDateRangeOpen] = useState(false)
    const [selectedRange, setSelectedRange] = useState(DATE_RANGES[4]) // Last 30 days

    // Filter state
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])

    // Tab state for analytics cards
    const [locationTab, setLocationTab] = useState('Countries')
    const [deviceTab, setDeviceTab] = useState('Devices')

    // Calculate dates from range
    const dateFrom = selectedRange.value === 'yesterday'
        ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
        : format(subDays(new Date(), selectedRange.days), 'yyyy-MM-dd')
    const dateTo = format(new Date(), 'yyyy-MM-dd')

    // Fetch KPIs with date range
    const { data: kpiData, mutate, isValidating } = useSWR<KPIResponse>(
        `/api/stats/kpi?date_from=${dateFrom}&date_to=${dateTo}`,
        kpiFetcher,
        { revalidateOnFocus: false }
    )

    // Fetch breakdown data from real API
    const breakdownFetcher = async (url: string) => {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return { data: [] }
        return res.json()
    }

    const { data: countriesData } = useSWR(
        `/api/stats/breakdown?dimension=countries&date_from=${dateFrom}&date_to=${dateTo}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: citiesData } = useSWR(
        `/api/stats/breakdown?dimension=cities&date_from=${dateFrom}&date_to=${dateTo}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: devicesData } = useSWR(
        `/api/stats/breakdown?dimension=devices&date_from=${dateFrom}&date_to=${dateTo}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: browsersData } = useSWR(
        `/api/stats/breakdown?dimension=browsers&date_from=${dateFrom}&date_to=${dateTo}`,
        breakdownFetcher,
        { revalidateOnFocus: false }
    )
    const { data: osData } = useSWR(
        `/api/stats/breakdown?dimension=os&date_from=${dateFrom}&date_to=${dateTo}`,
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

    // Filter events based on ALL active filters
    const getFilteredEvents = useCallback(() => {
        let events = MOCK_EVENTS

        if (countryFilters.length > 0) events = events.filter(e => countryFilters.includes(e.country))
        if (deviceFilters.length > 0) events = events.filter(e => deviceFilters.includes(e.device))
        if (cityFilters.length > 0) events = events.filter(e => cityFilters.includes(e.city))
        if (regionFilters.length > 0) events = events.filter(e => regionFilters.includes(e.region))
        if (continentFilters.length > 0) events = events.filter(e => continentFilters.includes(e.continent))
        if (browserFilters.length > 0) events = events.filter(e => browserFilters.includes(e.browser))
        if (osFilters.length > 0) events = events.filter(e => osFilters.includes(e.os))

        return events
    }, [countryFilters, deviceFilters, cityFilters, regionFilters, continentFilters, browserFilters, osFilters])

    const filteredEvents = getFilteredEvents()

    // Calculate KPIs from filtered events
    const displayKPI = useMemo(() => {
        if (activeFilters.length === 0) return kpi

        const stats = filteredEvents.reduce(
            (acc, e) => ({
                clicks: acc.clicks + e.clicks,
                leads: acc.leads + e.leads,
                sales: acc.sales + e.sales,
                revenue: acc.revenue + e.revenue,
            }),
            { clicks: 0, leads: 0, sales: 0, revenue: 0 }
        )

        return { ...stats, timeseries: kpi.timeseries }
    }, [activeFilters.length, filteredEvents, kpi])

    // Helper: Aggregate filtered events by a property
    const aggregateBy = useCallback((events: typeof MOCK_EVENTS, prop: keyof typeof MOCK_EVENTS[0]) => {
        return Object.entries(
            events.reduce((acc, e) => {
                const key = e[prop] as string
                if (!acc[key]) acc[key] = { clicks: 0, leads: 0, sales: 0, revenue: 0, country: e.country }
                acc[key].clicks += e.clicks
                acc[key].leads += e.leads
                acc[key].sales += e.sales
                acc[key].revenue += e.revenue
                return acc
            }, {} as Record<string, { clicks: number; leads: number; sales: number; revenue: number; country: string }>)
        ).map(([name, stats]) => ({ name, count: stats.clicks, ...stats }))
    }, [])

    // Helper: Filter events excluding a specific filter type (for multi-selection within category)
    const getEventsExcludingFilterType = useCallback((excludeType: ActiveFilter['type']) => {
        let events = MOCK_EVENTS
        if (excludeType !== 'country' && countryFilters.length > 0) events = events.filter(e => countryFilters.includes(e.country))
        if (excludeType !== 'device' && deviceFilters.length > 0) events = events.filter(e => deviceFilters.includes(e.device))
        if (excludeType !== 'city' && cityFilters.length > 0) events = events.filter(e => cityFilters.includes(e.city))
        if (excludeType !== 'region' && regionFilters.length > 0) events = events.filter(e => regionFilters.includes(e.region))
        if (excludeType !== 'continent' && continentFilters.length > 0) events = events.filter(e => continentFilters.includes(e.continent))
        if (excludeType !== 'browser' && browserFilters.length > 0) events = events.filter(e => browserFilters.includes(e.browser))
        if (excludeType !== 'os' && osFilters.length > 0) events = events.filter(e => osFilters.includes(e.os))
        return events
    }, [countryFilters, deviceFilters, cityFilters, regionFilters, continentFilters, browserFilters, osFilters])

    // Display data - USE API DATA with mock fallback for cross-filtering
    const displayLocations = useMemo((): LocationItem[] => {
        // If we have API data and no filters, use it
        if (apiCountries.length > 0 && activeFilters.length === 0) {
            return apiCountries.map((c: any) => ({ name: c.name, flag: c.flag || '🌍', count: c.clicks || 0 }))
        }
        // Fallback to filtered mock data for cross-filtering
        return aggregateBy(getEventsExcludingFilterType('country'), 'country')
            .map(l => ({ ...l, flag: COUNTRY_FLAGS[l.name] || '🌍' }))
            .sort((a, b) => b.count - a.count)
    }, [apiCountries, activeFilters.length, getEventsExcludingFilterType, aggregateBy])

    const displayDevices = useMemo((): DeviceItem[] => {
        if (apiDevices.length > 0 && activeFilters.length === 0) {
            return apiDevices.map((d: any) => ({
                name: d.name,
                icon: d.name === 'Desktop' ? Laptop : Smartphone,
                count: d.clicks || 0
            }))
        }
        return aggregateBy(getEventsExcludingFilterType('device'), 'device')
            .map(d => ({ ...d, icon: d.name === 'Desktop' ? Laptop : Smartphone }))
            .sort((a, b) => b.count - a.count)
    }, [apiDevices, activeFilters.length, getEventsExcludingFilterType, aggregateBy])

    const displayCities = useMemo((): LocationItem[] => {
        if (apiCities.length > 0 && activeFilters.length === 0) {
            return apiCities.map((c: any) => ({ name: c.name, country: c.country || '', flag: c.flag || '🌍', count: c.clicks || 0 }))
        }
        return aggregateBy(getEventsExcludingFilterType('city'), 'city')
            .map(c => ({ ...c, flag: COUNTRY_FLAGS[c.country] || '🌍' }))
            .sort((a, b) => b.count - a.count)
    }, [apiCities, activeFilters.length, getEventsExcludingFilterType, aggregateBy])

    const displayRegions = useMemo((): LocationItem[] => aggregateBy(getEventsExcludingFilterType('region'), 'region')
        .map(r => ({ ...r, flag: COUNTRY_FLAGS[r.country] || '🌍' }))
        .sort((a, b) => b.count - a.count), [getEventsExcludingFilterType, aggregateBy])

    const displayContinents = useMemo((): LocationItem[] => aggregateBy(getEventsExcludingFilterType('continent'), 'continent')
        .map(c => ({ ...c, flag: c.name === 'Europe' ? '🌍' : c.name === 'North America' ? '🌎' : '🌏' }))
        .sort((a, b) => b.count - a.count), [getEventsExcludingFilterType, aggregateBy])

    const displayBrowsers = useMemo((): AnalyticsItem[] => {
        if (apiBrowsers.length > 0 && activeFilters.length === 0) {
            return apiBrowsers.map((b: any) => ({ name: b.name, count: b.clicks || 0 }))
        }
        return aggregateBy(getEventsExcludingFilterType('browser'), 'browser')
            .sort((a, b) => b.count - a.count)
    }, [apiBrowsers, activeFilters.length, getEventsExcludingFilterType, aggregateBy])

    const displayOS = useMemo((): AnalyticsItem[] => {
        if (apiOS.length > 0 && activeFilters.length === 0) {
            return apiOS.map((o: any) => ({ name: o.name, count: o.clicks || 0 }))
        }
        return aggregateBy(getEventsExcludingFilterType('os'), 'os')
            .sort((a, b) => b.count - a.count)
    }, [apiOS, activeFilters.length, getEventsExcludingFilterType, aggregateBy])

    // Get filtered and aggregated timeseries for the chart
    const getFilteredTimeseries = useCallback(() => {
        let rawData = MOCK_TIMESERIES_RAW

        // Apply date range filter
        rawData = rawData.filter(d => d.date >= dateFrom && d.date <= dateTo)

        // Apply country filters
        if (countryFilters.length > 0) {
            rawData = rawData.filter(d => countryFilters.includes(d.country))
        }

        // Apply device filters
        if (deviceFilters.length > 0) {
            rawData = rawData.filter(d => deviceFilters.includes(d.device))
        }

        // Aggregate by date
        const grouped = rawData.reduce((acc, d) => {
            if (!acc[d.date]) {
                acc[d.date] = { date: d.date, clicks: 0, leads: 0, sales: 0, revenue: 0 }
            }
            acc[d.date].clicks += d.clicks
            acc[d.date].leads += d.leads
            acc[d.date].sales += d.sales
            acc[d.date].revenue += d.revenue
            return acc
        }, {} as Record<string, { date: string; clicks: number; leads: number; sales: number; revenue: number }>)

        const sorted = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date))

        // Bucket to max 20 points for long date ranges
        return bucketTimeseriesData(sorted, 20)
    }, [dateFrom, dateTo, countryFilters, deviceFilters])

    const displayTimeseries = getFilteredTimeseries()

    const maxLocation = Math.max(...displayLocations.map((l: { count: number }) => l.count), 1)
    const maxDevice = Math.max(...displayDevices.map((d: { count: number }) => d.count), 1)
    const maxCity = Math.max(...displayCities.map((c: { count: number }) => c.count), 1)
    const maxRegion = Math.max(...displayRegions.map((r: { count: number }) => r.count), 1)
    const maxContinent = Math.max(...displayContinents.map((c: { count: number }) => c.count), 1)
    const maxBrowser = Math.max(...displayBrowsers.map((b: { count: number }) => b.count), 1)
    const maxOS = Math.max(...displayOS.map((o: { count: number }) => o.count), 1)

    const handleSelectRange = (range: typeof DATE_RANGES[0]) => {
        setSelectedRange(range)
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

    const removeFilter = (type: ActiveFilter['type'], value: string) => {
        setActiveFilters(prev => prev.filter(f => !(f.type === type && f.value === value)))
    }

    const clearAllFilters = useCallback(() => {
        setActiveFilters([])
    }, [])

    // ESC key to clear filters
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeFilters.length > 0) {
                clearAllFilters()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeFilters.length, clearAllFilters])

    const isCountrySelected = (name: string) => activeFilters.some(f => f.type === 'country' && f.value === name)
    const isDeviceSelected = (name: string) => activeFilters.some(f => f.type === 'device' && f.value === name)

    return (
        <div className="space-y-6">
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
            {activeFilters.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
                    {activeFilters.map((filter) => (
                        <FilterBadge
                            key={`${filter.type}-${filter.value}`}
                            filter={filter}
                            onRemove={() => removeFilter(filter.type, filter.value)}
                        />
                    ))}
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Clear Filters
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
            />

            {/* Analytics Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Locations Card */}
                <AnalyticsCard
                    title="Locations"
                    tabs={['Countries', 'Cities', 'Regions', 'Continents']}
                    activeTab={locationTab}
                    onTabChange={setLocationTab}
                    settingsLabel="CLICKS"
                >
                    {locationTab === 'Countries' && displayLocations.map((loc) => (
                        <SimpleListItem
                            key={loc.name}
                            icon={<span className="text-lg">{loc.flag}</span>}
                            label={loc.name}
                            count={loc.count}
                            percentage={(loc.count / maxLocation) * 100}
                            isSelected={isCountrySelected(loc.name)}
                            onClick={() => toggleFilter('country', loc.name, loc.name, <span className="text-sm">{loc.flag}</span>)}
                        />
                    ))}
                    {locationTab === 'Cities' && displayCities.map((city) => (
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
                    {locationTab === 'Regions' && displayRegions.map((region) => (
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
                    {locationTab === 'Continents' && displayContinents.map((cont) => (
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
                    title="Devices"
                    tabs={['Devices', 'Browsers', 'OS']}
                    activeTab={deviceTab}
                    onTabChange={setDeviceTab}
                    settingsLabel="CLICKS"
                >
                    {deviceTab === 'Devices' && displayDevices.map((device) => {
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
                    {deviceTab === 'Browsers' && displayBrowsers.map((browser) => (
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
                    {deviceTab === 'OS' && displayOS.map((os) => (
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

            {/* 3D Globe Visualization */}
            <GlobeVisualization />
        </div>
    )
}
