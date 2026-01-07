'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
    MousePointer2,
    CreditCard,
    DollarSign,
    BarChart3,
    Loader2,
    Plus,
    RefreshCw,
    AlertCircle,
    ArrowUpRight,
    Link as LinkIcon,
    Copy,
    Check,
    Trash2,
    ExternalLink,
    Rocket
} from 'lucide-react'
import Link from 'next/link'
import { deleteShortLink } from '@/app/actions/links'
import { ActivityLog } from '@/components/ActivityLog'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { LinkDrawer } from '@/components/dashboard/LinkDrawer'
import { AffiliateLeaderboard } from '@/components/dashboard/AffiliateLeaderboard'
import { subDays, format } from 'date-fns'

interface KPIData {
    clicks: number
    sales: number
    revenue: number
    conversion_rate: number
    timeseries?: Array<{
        date: string
        clicks: number
        sales: number
        revenue: number
    }>
    affiliates?: Array<{
        affiliate_id: string
        total_clicks: number
        total_sales: number
        total_revenue: number
    }>
}

interface KPIResponse {
    data: KPIData[]
    meta?: { user_id?: string }
}

interface ShortLink {
    id: string
    slug: string
    original_url: string
    clicks: number
    created_at: string
}

const kpiFetcher = async (url: string): Promise<KPIResponse> => {
    const cacheBuster = `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
    const res = await fetch(cacheBuster, {
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        }
    })
    if (!res.ok) {
        throw new Error('Failed to fetch KPIs')
    }
    return res.json()
}

const linksFetcher = async (url: string): Promise<ShortLink[]> => {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    // API returns { success: true, links: [...] } with destination field
    return (data.links || []).map((link: { id: string; slug: string; destination: string; clicks: number; created_at: string }) => ({
        id: link.id,
        slug: link.slug,
        original_url: link.destination,  // Map destination → original_url
        clicks: link.clicks,
        created_at: link.created_at,
    }))
}

// Dub.co Style Minimalist KPI Card
function KPICard({
    title,
    value,
    icon: Icon,
}: {
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between h-full hover:border-gray-300 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <Icon className="w-4 h-4 text-gray-400" strokeWidth={2} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-black tracking-tight">{value}</span>
            </div>
        </div>
    )
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(cents / 100)
}

function LinkRow({ link, onDelete, onClick }: { link: ShortLink; onDelete: () => void; onClick: () => void }) {
    const [copied, setCopied] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const shortUrl = `${window.location.origin}/s/${link.slug}`

    const copyToClipboard = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await navigator.clipboard.writeText(shortUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('Delete this link?')) return
        setDeleting(true)
        await deleteShortLink(link.id)
        onDelete()
        setDeleting(false)
    }

    return (
        <tr
            className="group hover:bg-gray-50/50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
            onClick={onClick}
        >
            <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <LinkIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">/{link.slug}</span>
                            <button
                                onClick={copyToClipboard}
                                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 max-w-[200px] truncate">{link.original_url}</p>
                    </div>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200">
                        {link.clicks} clicks
                    </span>
                </div>
            </td>
            <td className="py-3 px-4 text-gray-500 text-xs text-right">
                {new Date(link.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </td>
            <td className="py-3 px-4 text-right">
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </td>
        </tr>
    )
}

export default function DashboardPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null)

    // Date range state (default: last 30 days)
    const [selectedRange, setSelectedRange] = useState('30d')
    const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

    // Fetch KPIs with date range parameters
    const kpiUrl = `/api/stats/kpi?date_from=${dateFrom}&date_to=${dateTo}`
    const { data: kpiData, error: kpiError, isLoading: kpiLoading, mutate: mutateKpi } = useSWR<KPIResponse>(kpiUrl, kpiFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 5000,
    })

    // Handle date range change
    const handleRangeChange = (range: string, from: string, to: string) => {
        setSelectedRange(range)
        setDateFrom(from)
        setDateTo(to)
    }

    // Fetch user's short links (manual refresh only)
    const { data: links, error: linksError, isLoading: linksLoading, mutate: mutateLinks } = useSWR<ShortLink[]>(
        '/api/links/short',
        linksFetcher,
        { revalidateOnFocus: false }
    )

    const kpi = kpiData?.data?.[0] || { clicks: 0, sales: 0, revenue: 0, conversion_rate: 0 }

    if (kpiError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-semibold text-red-800">Error loading data</h3>
                    <p className="text-xs text-red-600 mt-1">Please try refreshing the page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-black tracking-tight">Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your performance and manage links.</p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangePicker
                        selectedRange={selectedRange}
                        onRangeChange={handleRangeChange}
                    />
                    <button
                        onClick={() => {
                            mutateKpi()
                            mutateLinks()
                        }}
                        className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 rounded-lg transition-all"
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <Link
                        href="/dashboard/missions"
                        className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-all shadow-sm"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>Lancer une Mission</span>
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    title="Total Clicks"
                    value={kpi.clicks.toLocaleString('en-US')}
                    icon={MousePointer2}
                />
                <KPICard
                    title="Total Sales"
                    value={kpi.sales.toLocaleString('en-US')}
                    icon={CreditCard}
                />
                <KPICard
                    title="Revenue"
                    value={formatCurrency(kpi.revenue)}
                    icon={DollarSign}
                />
                <KPICard
                    title="Conversion"
                    value={`${kpi.conversion_rate.toFixed(1)}%`}
                    icon={BarChart3}
                />
            </div>

            {/* Chart + Leaderboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-base font-semibold text-gray-900">Performance Trend</h2>
                    </div>
                    {/* Placeholder for now, assuming AnalyticsChart is compatible or needs minor tweaks. 
                        If it's too colorful, I might need to adjust it later, but structural it's fine. */}
                    <AnalyticsChart
                        data={kpiData?.data?.[0]?.timeseries || []}
                        isLoading={kpiLoading}
                    />
                </div>

                {/* Affiliate Leaderboard */}
                <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Top Affiliates</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <AffiliateLeaderboard
                            data={kpiData?.data?.[0]?.affiliates || []}
                            isLoading={kpiLoading}
                        />
                    </div>
                </div>
            </div>

            {/* Links Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <h2 className="text-base font-semibold text-gray-900">Recent Links</h2>
                    <button className="text-xs font-medium text-gray-500 hover:text-black flex items-center gap-1">
                        View All <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>

                {linksLoading ? (
                    <div className="p-12 flex justify-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : links && links.length > 0 ? (
                    <table className="w-full">
                        <tbody className="divide-y divide-gray-50">
                            {links.map((link) => (
                                <LinkRow
                                    key={link.id}
                                    link={link}
                                    onDelete={() => mutateLinks()}
                                    onClick={() => setSelectedLink(link)}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <LinkIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900">No links created</h3>
                        <p className="text-gray-500 text-xs mt-1 mb-4">Get started by launching your first mission.</p>
                        <Link
                            href="/dashboard/missions"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-all"
                        >
                            <Rocket className="w-4 h-4" />
                            Lancer une Mission
                        </Link>
                    </div>
                )}
            </div>

            {/* Drawers */}
            {selectedLink && (
                <LinkDrawer
                    isOpen={!!selectedLink}
                    onClose={() => setSelectedLink(null)}
                    link={selectedLink}
                    onDelete={async () => {
                        await deleteShortLink(selectedLink.id)
                        mutateLinks()
                    }}
                />
            )}
        </div>
    )
}
