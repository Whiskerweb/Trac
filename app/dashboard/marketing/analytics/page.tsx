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
    TrendingUp,
    MousePointerClick,
    DollarSign,
    Users2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { getMarketingLinks } from '@/app/actions/marketing-links'
import { getChannelConfig } from '@/lib/marketing/channels'
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
    type: 'country' | 'device' | 'city' | 'region' | 'continent' | 'browser' | 'os' | 'event_type'
    value: string
    label: string
    icon?: React.ReactNode
}

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

interface LinkData {
    id: string
    slug: string
    clicks: number
    channel: string | null
    campaign: string | null
}

const kpiFetcher = async (url: string): Promise<KPIResponse> => {
    const res = await fetch(`${url}&_t=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'include'
    })
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
}

const breakdownFetcher = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return { data: [] }
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
// GEO DATA MAPS
// =============================================

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
    'France': { name: 'France', flag: '🇫🇷' }, 'Germany': { name: 'Germany', flag: '🇩🇪' },
    'United Kingdom': { name: 'United Kingdom', flag: '🇬🇧' }, 'United States': { name: 'United States', flag: '🇺🇸' },
    'Morocco': { name: 'Morocco', flag: '🇲🇦' }, 'Spain': { name: 'Spain', flag: '🇪🇸' },
    'Italy': { name: 'Italy', flag: '🇮🇹' }, 'Canada': { name: 'Canada', flag: '🇨🇦' },
    'Netherlands': { name: 'Netherlands', flag: '🇳🇱' }, 'Belgium': { name: 'Belgium', flag: '🇧🇪' },
    'Switzerland': { name: 'Switzerland', flag: '🇨🇭' }, 'Japan': { name: 'Japan', flag: '🇯🇵' },
    'Australia': { name: 'Australia', flag: '🇦🇺' }, 'Brazil': { name: 'Brazil', flag: '🇧🇷' },
    'FR': { name: 'France', flag: '🇫🇷' }, 'DE': { name: 'Germany', flag: '🇩🇪' },
    'GB': { name: 'United Kingdom', flag: '🇬🇧' }, 'US': { name: 'United States', flag: '🇺🇸' },
    'MA': { name: 'Morocco', flag: '🇲🇦' }, 'ES': { name: 'Spain', flag: '🇪🇸' },
    'IT': { name: 'Italy', flag: '🇮🇹' }, 'CA': { name: 'Canada', flag: '🇨🇦' },
    'NL': { name: 'Netherlands', flag: '🇳🇱' }, 'BE': { name: 'Belgium', flag: '🇧🇪' },
    'CH': { name: 'Switzerland', flag: '🇨🇭' }, 'JP': { name: 'Japan', flag: '🇯🇵' },
    'AU': { name: 'Australia', flag: '🇦🇺' }, 'BR': { name: 'Brazil', flag: '🇧🇷' },
    'PT': { name: 'Portugal', flag: '🇵🇹' }, 'PL': { name: 'Poland', flag: '🇵🇱' },
    'IN': { name: 'India', flag: '🇮🇳' }, 'CN': { name: 'China', flag: '🇨🇳' },
}

const COUNTRY_FLAGS: Record<string, string> = {
    'France': '🇫🇷', 'FR': '🇫🇷', 'Germany': '🇩🇪', 'DE': '🇩🇪',
    'United Kingdom': '🇬🇧', 'GB': '🇬🇧', 'United States': '🇺🇸', 'US': '🇺🇸',
    'Morocco': '🇲🇦', 'MA': '🇲🇦', 'Spain': '🇪🇸', 'ES': '🇪🇸',
    'Italy': '🇮🇹', 'IT': '🇮🇹', 'Canada': '🇨🇦', 'CA': '🇨🇦',
    'Netherlands': '🇳🇱', 'NL': '🇳🇱', 'Belgium': '🇧🇪', 'BE': '🇧🇪',
    'Switzerland': '🇨🇭', 'CH': '🇨🇭', 'Japan': '🇯🇵', 'JP': '🇯🇵',
    'Australia': '🇦🇺', 'AU': '🇦🇺', 'Brazil': '🇧🇷', 'BR': '🇧🇷',
    'Portugal': '🇵🇹', 'PT': '🇵🇹',
}

const COUNTRY_TO_CONTINENT: Record<string, string> = {
    'France': 'Europe', 'Germany': 'Europe', 'United Kingdom': 'Europe', 'Spain': 'Europe',
    'Italy': 'Europe', 'Netherlands': 'Europe', 'Belgium': 'Europe', 'Switzerland': 'Europe',
    'Portugal': 'Europe', 'Poland': 'Europe', 'United States': 'North America',
    'Canada': 'North America', 'Mexico': 'North America', 'Brazil': 'South America',
    'Japan': 'Asia', 'China': 'Asia', 'India': 'Asia', 'Australia': 'Oceania',
    'Morocco': 'Africa', 'South Africa': 'Africa',
    'FR': 'Europe', 'DE': 'Europe', 'GB': 'Europe', 'US': 'North America',
    'CA': 'North America', 'ES': 'Europe', 'IT': 'Europe', 'NL': 'Europe',
    'BE': 'Europe', 'CH': 'Europe', 'JP': 'Asia', 'AU': 'Oceania',
    'BR': 'South America', 'PT': 'Europe', 'MA': 'Africa', 'IN': 'Asia', 'CN': 'Asia',
}

const CITY_TO_REGION: Record<string, string> = {
    'Paris': 'Île-de-France', 'Lyon': 'Auvergne-Rhône-Alpes',
    'Marseille': 'Provence-Alpes-Côte d\'Azur', 'Bordeaux': 'Nouvelle-Aquitaine',
    'Toulouse': 'Occitanie', 'Nantes': 'Pays de la Loire', 'Nice': 'Provence-Alpes-Côte d\'Azur',
    'Lille': 'Hauts-de-France', 'Strasbourg': 'Grand Est', 'Rennes': 'Bretagne',
    'Brest': 'Bretagne', 'Rouen': 'Normandie',
}

// =============================================
// HELPERS
// =============================================

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
}

function bucketTimeseriesData(
    data: Array<{ date: string; clicks: number; leads: number; sales: number; revenue: number }>,
    maxPoints: number = 20
) {
    if (data.length <= maxPoints) return data
    const bucketSize = Math.ceil(data.length / maxPoints)
    const bucketed: typeof data = []
    for (let i = 0; i < data.length; i += bucketSize) {
        const slice = data.slice(i, Math.min(i + bucketSize, data.length))
        if (slice.length === 0) continue
        const startDate = slice[0].date
        const endDate = slice[slice.length - 1].date
        const formatShort = (d: string) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
            const date = new Date(d + 'T00:00:00')
            if (isNaN(date.getTime())) return d
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        }
        const label = startDate === endDate ? formatShort(startDate) : `${formatShort(startDate)} - ${formatShort(endDate)}`
        const aggregated = slice.reduce(
            (acc, d) => ({ date: label, clicks: acc.clicks + d.clicks, leads: acc.leads + d.leads, sales: acc.sales + d.sales, revenue: acc.revenue + d.revenue }),
            { date: label, clicks: 0, leads: 0, sales: 0, revenue: 0 }
        )
        bucketed.push(aggregated)
    }
    return bucketed
}

// =============================================
// DROPDOWN
// =============================================

function Dropdown({ trigger, children, isOpen, onClose }: {
    trigger: React.ReactNode; children: React.ReactNode; isOpen: boolean; onClose: () => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) onClose()
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])
    return (
        <div ref={ref} className="relative">
            {trigger}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-lg shadow-black/[0.03] z-50 min-w-[220px] py-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    )
}

// =============================================
// FILTER BADGE — pill style
// =============================================

function FilterBadge({ filter, onRemove, isText }: { filter: ActiveFilter; onRemove: () => void; isText: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-white border border-gray-200/80 rounded-full text-[13px] shadow-sm shadow-black/[0.02] animate-in fade-in zoom-in-95 duration-200">
            {filter.icon}
            <span className="text-gray-400">{filter.type}</span>
            <span className="text-gray-300">{isText}</span>
            <span className="font-medium text-gray-800">{filter.label}</span>
            <button onClick={onRemove} className="ml-0.5 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-3 h-3 text-gray-400" />
            </button>
        </div>
    )
}

// =============================================
// LIST ITEM — refined row
// =============================================

function SimpleListItem({ icon, label, count, percentage = 100, isSelected, onClick }: {
    icon?: React.ReactNode; label: string; count: number; percentage?: number; isSelected: boolean; onClick: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`group relative flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all duration-200
                ${isSelected
                    ? 'bg-purple-50/60'
                    : 'hover:bg-gray-50/60'
                }`}
        >
            {/* Progress bar — very subtle */}
            <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${isSelected ? 'bg-purple-100/50' : 'bg-gray-100/40 group-hover:bg-gray-100/60'}`}
                style={{ width: `${Math.min(percentage * 0.55, 55)}%` }}
            />
            {/* Left indicator */}
            {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-full" />}

            <div className="relative flex items-center gap-2.5">
                {icon}
                <span className={`text-[13px] ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-700 font-medium'}`}>{label}</span>
            </div>
            <span className={`relative text-[13px] tabular-nums ${isSelected ? 'font-semibold text-purple-700' : 'text-gray-400 font-medium'}`}>
                {formatNumber(count)}
            </span>
        </div>
    )
}

// =============================================
// ANALYTICS CARD — Apple-style section
// =============================================

function AnalyticsCard({ title, tabs, activeTab, onTabChange, children, settingsLabel }: {
    title: string; tabs?: { key: string; label: string }[]; activeTab?: string
    onTabChange?: (tab: string) => void; children: React.ReactNode; settingsLabel?: string
}) {
    return (
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl overflow-hidden shadow-sm shadow-black/[0.02]">
            <div className="px-5 py-3.5 border-b border-gray-100/80">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {tabs ? tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => onTabChange?.(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                                    activeTab === tab.key
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        )) : (
                            <span className="text-sm font-semibold text-gray-900">{title}</span>
                        )}
                    </div>
                    {settingsLabel && (
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{settingsLabel}</span>
                    )}
                </div>
            </div>
            <div className="divide-y divide-gray-50/80">{children}</div>
        </div>
    )
}

// =============================================
// CHANNEL BAR — refined
// =============================================

function ChannelBar({ label, icon, color, count, total }: {
    label: string; icon: React.ReactNode; color: string; count: number; total: number
}) {
    const pct = total > 0 ? (count / total) * 100 : 0
    return (
        <div className="group">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shadow-sm`}>
                        {icon}
                    </div>
                    <span className="text-[13px] font-medium text-gray-700">{label}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{count.toLocaleString()}</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">{pct.toFixed(0)}%</span>
                </div>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                />
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function MarketingAnalyticsPage() {
    const t = useTranslations('dashboard')
    const tm = useTranslations('dashboard.marketing')

    const DATE_RANGES = DATE_RANGE_KEYS.map(range => ({
        ...range,
        label: t(`dateRanges.${range.labelKey}`)
    }))

    // State
    const [dateRangeOpen, setDateRangeOpen] = useState(false)
    const [selectedRangeValue, setSelectedRangeValue] = useState('30d')
    const selectedRange = DATE_RANGES.find(r => r.value === selectedRangeValue) || DATE_RANGES[4]
    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
    const [activeEventTypes, setActiveEventTypes] = useState<Set<string>>(new Set(['clicks', 'leads', 'sales']))
    const [locationTab, setLocationTab] = useState('countries')
    const [deviceTab, setDeviceTab] = useState('devices')

    // Marketing links for channel/campaign breakdowns (DB-based)
    const [marketingLinks, setMarketingLinks] = useState<LinkData[]>([])
    useEffect(() => {
        getMarketingLinks().then(res => {
            if (res.success) setMarketingLinks(res.data as unknown as LinkData[])
        })
    }, [])

    // Calculate dates
    const dateFrom = selectedRange.value === 'yesterday'
        ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
        : format(subDays(new Date(), selectedRange.days), 'yyyy-MM-dd')
    const dateTo = format(new Date(), 'yyyy-MM-dd')

    // Build filter params for KPI
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
        if (activeEventTypes.size < 3) params.push(`event_type=${Array.from(activeEventTypes).join(',')}`)
        return params.length ? '&' + params.join('&') : ''
    }

    // Build filter params for breakdown (excluding a dimension for cross-filtering)
    const buildFilterParams = (excludeType?: string) => {
        const params: string[] = []
        const countryFilters = activeFilters.filter(f => f.type === 'country').map(f => f.value)
        const cityFilters = activeFilters.filter(f => f.type === 'city').map(f => f.value)
        const regionFilters = activeFilters.filter(f => f.type === 'region').map(f => f.value)
        const continentFilters = activeFilters.filter(f => f.type === 'continent').map(f => f.value)
        const deviceFilters = activeFilters.filter(f => f.type === 'device').map(f => f.value)
        const browserFilters = activeFilters.filter(f => f.type === 'browser').map(f => f.value)
        const osFilters = activeFilters.filter(f => f.type === 'os').map(f => f.value)
        if (countryFilters.length && excludeType !== 'country') params.push(`country=${countryFilters.join(',')}`)
        if (cityFilters.length && excludeType !== 'city') params.push(`city=${cityFilters.join(',')}`)
        if (regionFilters.length && excludeType !== 'region') params.push(`region=${regionFilters.join(',')}`)
        if (continentFilters.length && excludeType !== 'continent') params.push(`continent=${continentFilters.join(',')}`)
        if (deviceFilters.length && excludeType !== 'device') params.push(`device=${deviceFilters.join(',')}`)
        if (browserFilters.length && excludeType !== 'browser') params.push(`browser=${browserFilters.join(',')}`)
        if (osFilters.length && excludeType !== 'os') params.push(`os=${osFilters.join(',')}`)
        if (activeEventTypes.size < 3) params.push(`event_type=${Array.from(activeEventTypes).join(',')}`)
        return params.length ? '&' + params.join('&') : ''
    }

    // Fetch KPIs (with source=marketing)
    const { data: kpiData, mutate, isValidating } = useSWR<KPIResponse>(
        `/api/stats/kpi?source=marketing&date_from=${dateFrom}&date_to=${dateTo}${buildKpiFilterParams()}`,
        kpiFetcher,
        { revalidateOnFocus: false }
    )

    // Fetch breakdowns (with source=marketing)
    const { data: countriesData } = useSWR(
        `/api/stats/breakdown?source=marketing&dimension=countries&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('country')}`,
        breakdownFetcher, { revalidateOnFocus: false }
    )
    const { data: citiesData } = useSWR(
        `/api/stats/breakdown?source=marketing&dimension=cities&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('city')}`,
        breakdownFetcher, { revalidateOnFocus: false }
    )
    const { data: devicesData } = useSWR(
        `/api/stats/breakdown?source=marketing&dimension=devices&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('device')}`,
        breakdownFetcher, { revalidateOnFocus: false }
    )
    const { data: browsersData } = useSWR(
        `/api/stats/breakdown?source=marketing&dimension=browsers&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('browser')}`,
        breakdownFetcher, { revalidateOnFocus: false }
    )
    const { data: osData } = useSWR(
        `/api/stats/breakdown?source=marketing&dimension=os&date_from=${dateFrom}&date_to=${dateTo}${buildFilterParams('os')}`,
        breakdownFetcher, { revalidateOnFocus: false }
    )

    // Process API data
    const apiCountries = countriesData?.data || []
    const apiCities = citiesData?.data || []
    const apiDevices = devicesData?.data || []
    const apiBrowsers = browsersData?.data || []
    const apiOS = osData?.data || []
    const kpi = kpiData?.data?.[0] || { clicks: 0, leads: 0, sales: 0, revenue: 0, timeseries: [] }

    // Display data
    const displayLocations = useMemo((): (LocationItem & { code: string })[] => {
        return apiCountries.map((c: any) => {
            const info = COUNTRY_INFO[c.name] || { name: c.name, flag: '🌍' }
            return { name: info.name, flag: info.flag, count: c.clicks || 0, code: c.name }
        })
    }, [apiCountries])

    const displayDevices = useMemo((): DeviceItem[] => {
        return apiDevices.map((d: any) => ({
            name: d.name, icon: d.name === 'Desktop' ? Laptop : Smartphone, count: d.clicks || 0
        }))
    }, [apiDevices])

    const displayCities = useMemo((): LocationItem[] => {
        return apiCities.map((c: any) => ({
            name: c.name, country: c.country || 'Unknown', flag: COUNTRY_FLAGS[c.country] || '🌍', count: c.clicks || 0
        }))
    }, [apiCities])

    const displayRegions = useMemo((): LocationItem[] => {
        if (apiCities.length === 0) return []
        const regionCounts: Record<string, number> = {}
        apiCities.forEach((city: any) => {
            const region = CITY_TO_REGION[city.name] || 'Other'
            regionCounts[region] = (regionCounts[region] || 0) + (city.clicks || 0)
        })
        return Object.entries(regionCounts)
            .map(([name, count]) => ({ name, flag: '🇫🇷', count }))
            .sort((a, b) => b.count - a.count)
    }, [apiCities])

    const displayContinents = useMemo((): LocationItem[] => {
        if (apiCountries.length === 0) return []
        const continentCounts: Record<string, number> = {}
        apiCountries.forEach((country: any) => {
            const continent = COUNTRY_TO_CONTINENT[country.name] || 'Other'
            continentCounts[continent] = (continentCounts[continent] || 0) + (country.clicks || 0)
        })
        const flags: Record<string, string> = {
            'Europe': '🇪🇺', 'North America': '🌎', 'South America': '🌎',
            'Asia': '🌏', 'Africa': '🌍', 'Oceania': '🌏', 'Other': '🌐'
        }
        return Object.entries(continentCounts)
            .map(([name, count]) => ({ name, flag: flags[name] || '🌐', count }))
            .sort((a, b) => b.count - a.count)
    }, [apiCountries])

    const displayBrowsers = useMemo((): AnalyticsItem[] => {
        return apiBrowsers.map((b: any) => ({ name: b.name, count: b.clicks || 0 }))
    }, [apiBrowsers])

    const displayOS = useMemo((): AnalyticsItem[] => {
        return apiOS.map((o: any) => ({ name: o.name, count: o.clicks || 0 }))
    }, [apiOS])

    // Channel breakdown (DB-based)
    const totalDbClicks = useMemo(() => marketingLinks.reduce((sum, l) => sum + l.clicks, 0), [marketingLinks])
    const channelBreakdown = useMemo(() => {
        const map = new Map<string, number>()
        for (const link of marketingLinks) {
            const ch = link.channel || 'other'
            map.set(ch, (map.get(ch) || 0) + link.clicks)
        }
        return Array.from(map.entries())
            .map(([channel, clicks]) => ({ channel, clicks, config: getChannelConfig(channel) }))
            .sort((a, b) => b.clicks - a.clicks)
    }, [marketingLinks])

    // Campaign breakdown (DB-based)
    const campaignBreakdown = useMemo(() => {
        const map = new Map<string, number>()
        for (const link of marketingLinks) {
            if (link.campaign) map.set(link.campaign, (map.get(link.campaign) || 0) + link.clicks)
        }
        return Array.from(map.entries())
            .map(([name, clicks]) => ({ name, clicks }))
            .sort((a, b) => b.clicks - a.clicks)
    }, [marketingLinks])

    // Timeseries
    const displayTimeseries = useMemo(() => {
        const ts = kpi.timeseries || []
        if (ts.length === 0) return []
        return bucketTimeseriesData(ts, 20)
    }, [kpi.timeseries])

    // Max values for percentage bars
    const maxLocation = Math.max(...displayLocations.map(l => l.count), 1)
    const maxDevice = Math.max(...displayDevices.map(d => d.count), 1)
    const maxCity = Math.max(...displayCities.map(c => c.count), 1)
    const maxRegion = Math.max(...displayRegions.map(r => r.count), 1)
    const maxContinent = Math.max(...displayContinents.map(c => c.count), 1)
    const maxBrowser = Math.max(...displayBrowsers.map(b => b.count), 1)
    const maxOS = Math.max(...displayOS.map(o => o.count), 1)

    // Handlers
    const handleSelectRange = (range: typeof DATE_RANGES[0]) => {
        setSelectedRangeValue(range.value)
        setDateRangeOpen(false)
    }

    const toggleFilter = (type: ActiveFilter['type'], value: string, label: string, icon?: React.ReactNode) => {
        setActiveFilters(prev => {
            const exists = prev.find(f => f.type === type && f.value === value)
            if (exists) return prev.filter(f => !(f.type === type && f.value === value))
            return [...prev, { type, value, label, icon }]
        })
    }

    const toggleEventType = (type: 'clicks' | 'leads' | 'sales') => {
        setActiveEventTypes(prev => {
            if (prev.size === 3) return new Set([type])
            if (prev.size === 1 && prev.has(type)) return new Set(['clicks', 'leads', 'sales'])
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

    // ESC to clear filters
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && (activeFilters.length > 0 || activeEventTypes.size < 3)) clearAllFilters()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeFilters.length, activeEventTypes.size, clearAllFilters])

    return (
        <div className="space-y-6">
            {/* ===== HEADER ===== */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">{tm('analytics.title')}</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">{tm('analytics.subtitle')}</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date Range — pill selector */}
                    <Dropdown
                        isOpen={dateRangeOpen}
                        onClose={() => setDateRangeOpen(false)}
                        trigger={
                            <button
                                onClick={() => setDateRangeOpen(!dateRangeOpen)}
                                className="flex items-center gap-2 px-3.5 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl text-[13px] font-medium text-gray-600 hover:border-gray-300 hover:bg-white transition-all shadow-sm shadow-black/[0.02]"
                            >
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {selectedRange.label}
                                <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                            </button>
                        }
                    >
                        {DATE_RANGES.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => handleSelectRange(range)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-[13px] transition-colors rounded-lg mx-1 ${
                                    selectedRange.value === range.value
                                        ? 'text-gray-900 font-medium bg-gray-50'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                                style={{ width: 'calc(100% - 8px)' }}
                            >
                                {range.label}
                                {selectedRange.value === range.value && <Check className="w-3.5 h-3.5 text-purple-500" />}
                            </button>
                        ))}
                    </Dropdown>

                    {/* Refresh */}
                    <button
                        onClick={() => mutate()}
                        disabled={isValidating}
                        className={`p-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-white transition-all shadow-sm shadow-black/[0.02] ${isValidating ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ===== ACTIVE FILTERS ===== */}
            {(activeFilters.length > 0 || activeEventTypes.size < 3) && (
                <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                    {activeEventTypes.size < 3 && (
                        <div className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-purple-50 border border-purple-200/50 rounded-full text-[13px]">
                            <span className="text-purple-600 font-medium">
                                {t('filters.showing')}: {Array.from(activeEventTypes).join(', ')}
                            </span>
                            <button
                                onClick={() => setActiveEventTypes(new Set(['clicks', 'leads', 'sales']))}
                                className="p-1 rounded-full text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    {activeFilters.map((filter) => (
                        <FilterBadge
                            key={`${filter.type}-${filter.value}`}
                            filter={filter}
                            onRemove={() => removeFilter(filter.type, filter.value)}
                            isText={t('filters.is')}
                        />
                    ))}
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {t('filters.clearFilters')}
                        <kbd className="ml-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-400">esc</kbd>
                    </button>
                </div>
            )}

            {/* ===== ANALYTICS CHART (KPIs + funnel/timeseries) ===== */}
            <AnalyticsChart
                clicks={kpi.clicks}
                leads={kpi.leads}
                sales={kpi.sales}
                revenue={kpi.revenue}
                timeseries={displayTimeseries}
                activeEventTypes={activeEventTypes}
                onEventTypeToggle={toggleEventType}
            />

            {/* ===== BREAKDOWNS GRID ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Locations */}
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
                >
                    {locationTab === 'countries' && displayLocations.map((loc) => (
                        <SimpleListItem
                            key={loc.code}
                            icon={<span className="text-base leading-none">{loc.flag}</span>}
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
                            icon={<span className="text-base leading-none">{city.flag}</span>}
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
                            icon={<span className="text-base leading-none">{region.flag}</span>}
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
                            icon={<span className="text-base leading-none">{cont.flag}</span>}
                            label={cont.name}
                            count={cont.count}
                            percentage={(cont.count / maxContinent) * 100}
                            isSelected={activeFilters.some(f => f.type === 'continent' && f.value === cont.name)}
                            onClick={() => toggleFilter('continent', cont.name, cont.name, <span className="text-sm">{cont.flag}</span>)}
                        />
                    ))}
                </AnalyticsCard>

                {/* Devices */}
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
                >
                    {deviceTab === 'devices' && displayDevices.map((device) => {
                        const Icon = device.icon
                        return (
                            <SimpleListItem
                                key={device.name}
                                icon={<Icon className="w-4 h-4 text-gray-400" />}
                                label={device.name}
                                count={device.count}
                                percentage={(device.count / maxDevice) * 100}
                                isSelected={activeFilters.some(f => f.type === 'device' && f.value === device.name)}
                                onClick={() => toggleFilter('device', device.name, device.name, <Icon className="w-3.5 h-3.5 text-gray-400" />)}
                            />
                        )
                    })}
                    {deviceTab === 'browsers' && displayBrowsers.map((browser) => (
                        <SimpleListItem
                            key={browser.name}
                            icon={<Globe className="w-4 h-4 text-gray-400" />}
                            label={browser.name}
                            count={browser.count}
                            percentage={(browser.count / maxBrowser) * 100}
                            isSelected={activeFilters.some(f => f.type === 'browser' && f.value === browser.name)}
                            onClick={() => toggleFilter('browser', browser.name, browser.name, <Globe className="w-3.5 h-3.5 text-gray-400" />)}
                        />
                    ))}
                    {deviceTab === 'os' && displayOS.map((os) => (
                        <SimpleListItem
                            key={os.name}
                            icon={<Monitor className="w-4 h-4 text-gray-400" />}
                            label={os.name}
                            count={os.count}
                            percentage={(os.count / maxOS) * 100}
                            isSelected={activeFilters.some(f => f.type === 'os' && f.value === os.name)}
                            onClick={() => toggleFilter('os', os.name, os.name, <Monitor className="w-3.5 h-3.5 text-gray-400" />)}
                        />
                    ))}
                </AnalyticsCard>
            </div>

            {/* ===== CHANNEL & CAMPAIGN ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Channels */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 shadow-sm shadow-black/[0.02]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900">{tm('analytics.byChannel')}</h2>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                            {t('kpi.clicks').toUpperCase()}
                        </span>
                    </div>
                    {channelBreakdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                <TrendingUp className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-[13px] text-gray-400">{tm('analytics.noData')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {channelBreakdown.map(({ channel, clicks, config }) => (
                                <ChannelBar
                                    key={channel}
                                    label={config.label}
                                    icon={<Globe className={`w-3.5 h-3.5 ${config.textColor}`} />}
                                    color={config.color}
                                    count={clicks}
                                    total={totalDbClicks}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Campaigns */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 shadow-sm shadow-black/[0.02]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-gray-900">{tm('analytics.byCampaign')}</h2>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
                            {t('kpi.clicks').toUpperCase()}
                        </span>
                    </div>
                    {campaignBreakdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                <TrendingUp className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-[13px] text-gray-400">{tm('analytics.noData')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaignBreakdown.map(({ name, clicks }) => {
                                const pct = totalDbClicks > 0 ? (clicks / totalDbClicks) * 100 : 0
                                return (
                                    <div key={name} className="group">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[13px] font-medium text-gray-700">{name}</span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{clicks.toLocaleString()}</span>
                                                <span className="text-[11px] text-gray-400 tabular-nums">{pct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-out"
                                                style={{ width: `${Math.max(pct, 1)}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
