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

    // KPI from API (no filtering on mock data needed anymore)
    const displayKPI = kpi

    // Display data - API DATA ONLY (no mock fallback)
    const displayLocations = useMemo((): LocationItem[] => {
        // Use API data directly
        if (apiCountries.length > 0) {
            return apiCountries.map((c: any) => ({ name: c.name, flag: c.flag || '🌍', count: c.clicks || 0 }))
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

    const displayCities = useMemo((): LocationItem[] => {
        if (apiCities.length > 0) {
            return apiCities.map((c: any) => ({ name: c.name, country: c.country || '', flag: c.flag || '🌍', count: c.clicks || 0 }))
        }
        return []
    }, [apiCities])

    // Regions - Not available in Tinybird yet, return empty
    const displayRegions = useMemo((): LocationItem[] => [], [])

    // Continents - Not available in Tinybird yet, return empty
    const displayContinents = useMemo((): LocationItem[] => [], [])

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
