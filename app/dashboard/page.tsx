'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import {
    MousePointer2, CreditCard, DollarSign, BarChart3, AlertCircle,
    Loader2, Copy, Check, Plus, Link2, ExternalLink, Trash2, Puzzle, Target, ShoppingBag, RefreshCw
} from 'lucide-react'
import { CreateLinkModal } from '@/components/CreateLinkModal'
import { deleteShortLink } from '@/app/actions/links'
import { ActivityLog } from '@/components/ActivityLog'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { LinkDrawer } from '@/components/dashboard/LinkDrawer'
import { AffiliateLeaderboard } from '@/components/dashboard/AffiliateLeaderboard'
import Link from 'next/link'
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
    return res.json()
}

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
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3" style={{ letterSpacing: '0.05em' }}>
                        {title}
                    </h3>
                    <p className="text-3xl font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                        {value}
                    </p>
                </div>
                <Icon className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            </div>
        </div>
    )
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100)
}

function UserIdBadge({ userId }: { userId: string }) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(userId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 flex items-center gap-3 text-sm">
            <span className="text-zinc-400">🔑 User ID:</span>
            <code className="text-green-400 font-mono text-xs bg-zinc-900 px-2 py-1 rounded">
                {userId}
            </code>
            <button
                onClick={copyToClipboard}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Copy to clipboard"
            >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    )
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
            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <code className="text-blue-600 font-medium">/s/{link.slug}</code>
                    <button onClick={copyToClipboard} className="text-gray-400 hover:text-gray-600">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2 max-w-xs">
                    <span className="text-gray-600 truncate text-sm">{link.original_url}</span>
                    <a href={link.original_url} target="_blank" rel="noopener" className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </td>
            <td className="py-3 px-4 text-center">
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">
                    {link.clicks}
                </span>
            </td>
            <td className="py-3 px-4 text-gray-500 text-sm">
                {new Date(link.created_at).toLocaleDateString('fr-FR')}
            </td>
            <td className="py-3 px-4">
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
            </td>
        </tr>
    )
}

export default function DashboardPage() {
    const [userId, setUserId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null)

    // Date range state (default: last 30 days)
    const [selectedRange, setSelectedRange] = useState('30d')
    const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

    // Fetch user ID on mount
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user?.id) {
                    setUserId(data.user.id)
                }
            })
            .catch(() => { })
    }, [])

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

    if (kpiLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement des statistiques...</span>
                </div>
            </div>
        )
    }

    if (kpiError) {
        return (
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800">Erreur de chargement</h3>
                            <p className="text-red-700 mt-1">Impossible de charger les statistiques.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const kpi = kpiData?.data?.[0] || { clicks: 0, sales: 0, revenue: 0, conversion_rate: 0 }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-6xl mx-auto p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de vos performances</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                mutateKpi()
                                mutateLinks()
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Rafraîchir
                        </button>
                        <Link
                            href="/dashboard/marketplace"
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition-colors"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Marketplace
                        </Link>
                        <Link
                            href="/dashboard/missions"
                            className="flex items-center gap-2 px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium rounded-lg transition-colors"
                        >
                            <Target className="w-5 h-5" />
                            Missions
                        </Link>
                        <Link
                            href="/dashboard/integration"
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                        >
                            <Puzzle className="w-5 h-5" />
                            Integrations
                        </Link>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/25"
                        >
                            <Plus className="w-5 h-5" />
                            Create Link
                        </button>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        title="Clics"
                        value={kpi.clicks.toLocaleString('fr-FR')}
                        icon={MousePointer2}
                    />
                    <KPICard
                        title="Ventes"
                        value={kpi.sales.toLocaleString('fr-FR')}
                        icon={CreditCard}
                    />
                    <KPICard
                        title="Revenus"
                        value={formatCurrency(kpi.revenue)}
                        icon={DollarSign}
                    />
                    <KPICard
                        title="Taux de conversion"
                        value={`${kpi.conversion_rate.toFixed(2)}%`}
                        icon={BarChart3}
                    />
                </div>

                {/* Analytics Grid: Chart + Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Analytics Chart - Takes 2 columns */}
                    {kpiData?.data?.[0]?.timeseries && kpiData.data[0].timeseries.length > 0 ? (
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">Analytics Trend</h2>
                                </div>
                                <DateRangePicker
                                    selectedRange={selectedRange}
                                    onRangeChange={handleRangeChange}
                                />
                            </div>
                            <AnalyticsChart
                                data={kpiData.data[0].timeseries}
                                isLoading={kpiLoading}
                            />
                        </div>
                    ) : kpiLoading && !kpiData ? (
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-semibold text-gray-900">Analytics Trend</h2>
                                </div>
                                <DateRangePicker
                                    selectedRange={selectedRange}
                                    onRangeChange={handleRangeChange}
                                />
                            </div>
                            <AnalyticsChart
                                data={[]}
                                isLoading={true}
                            />
                        </div>
                    ) : null}

                    {/* Affiliate Leaderboard - Takes 1 column */}
                    <div className="lg:col-span-1">
                        <AffiliateLeaderboard
                            data={kpiData?.data?.[0]?.affiliates || []}
                            isLoading={kpiLoading}
                        />
                    </div>
                </div>

                {/* Short Links Section */}
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900">My Short Links</h2>
                        </div>
                        <span className="text-sm text-gray-500">
                            {links?.length || 0} links
                        </span>
                    </div>

                    {linksLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Loading links...
                        </div>
                    ) : links && links.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Link</th>
                                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Clicks</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>Créé le</th>
                                    <th className="py-3 px-4"></th>
                                </tr>
                            </thead>
                            <tbody>
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
                            <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">No links yet. Create your first short link!</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Create Link
                            </button>
                        </div>
                    )}
                </div>

                {/* Last updated info */}
                <p className="text-sm text-gray-400 mt-6 text-center">
                    Données actualisées automatiquement toutes les 30 secondes
                </p>
            </div>

            {/* Activity Log for debugging */}
            <div className="mt-8">
                <ActivityLog mode="startup" />
            </div>

            {/* Create Link Modal */}
            <CreateLinkModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => mutateLinks()}
            />

            {/* Link Details Drawer */}
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
