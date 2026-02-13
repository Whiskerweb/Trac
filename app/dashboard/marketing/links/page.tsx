'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    Plus, Search, Copy, QrCode, BarChart3,
    Pencil, Trash2, ExternalLink, Link2, Check,
    MousePointerClick
} from 'lucide-react'
import { getMarketingLinks, deleteMarketingLink } from '@/app/actions/marketing-links'
import { PREDEFINED_CHANNELS, getChannelConfig } from '@/lib/marketing/channels'
import { CreateLinkModal } from '@/components/marketing/CreateLinkModal'

interface MarketingLink {
    id: string
    slug: string
    original_url: string
    short_url: string
    clicks: number
    channel: string | null
    campaign: string | null
    created_at: Date
}

export default function MarketingLinksPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [links, setLinks] = useState<MarketingLink[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeChannel, setActiveChannel] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const loadLinks = useCallback(async () => {
        const res = await getMarketingLinks({
            search: search || undefined,
            channel: activeChannel || undefined,
        })
        if (res.success) {
            setLinks(res.data as unknown as MarketingLink[])
        }
        setLoading(false)
    }, [search, activeChannel])

    useEffect(() => {
        setLoading(true)
        const timeout = setTimeout(loadLinks, 300)
        return () => clearTimeout(timeout)
    }, [loadLinks])

    const handleCopy = async (link: MarketingLink) => {
        await navigator.clipboard.writeText(link.short_url)
        setCopiedId(link.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        const res = await deleteMarketingLink(id)
        if (res.success) {
            setLinks(prev => prev.filter(l => l.id !== id))
        }
        setDeletingId(null)
    }

    const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('links.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {links.length} {t('links.linksCount')} · {totalClicks.toLocaleString()} {t('clicks')}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('createLink')}
                </button>
            </div>

            {/* Search + Channel Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('links.searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setActiveChannel(null)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            !activeChannel
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('links.allChannels')}
                    </button>
                    {PREDEFINED_CHANNELS.filter(c => c.id !== 'other').map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannel(activeChannel === channel.id ? null : channel.id)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                activeChannel === channel.id
                                    ? `${channel.color} ${channel.textColor}`
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {channel.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Links List */}
            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                <div className="h-3 w-48 bg-gray-100 rounded" />
                            </div>
                            <div className="h-5 w-16 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
            ) : !links.length ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Link2 className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{t('links.empty')}</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{t('links.emptyDesc')}</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('overview.createFirst')}
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
                    {links.map((link) => {
                        const channelCfg = getChannelConfig(link.channel)
                        const isCopied = copiedId === link.id
                        const isDeleting = deletingId === link.id

                        return (
                            <div
                                key={link.id}
                                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
                            >
                                {/* Channel icon */}
                                <div className={`w-10 h-10 rounded-xl ${channelCfg.color} flex items-center justify-center flex-shrink-0`}>
                                    <ExternalLink className={`w-4.5 h-4.5 ${channelCfg.textColor}`} />
                                </div>

                                {/* Link info */}
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => router.push(`/dashboard/marketing/links/${link.id}`)}
                                >
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            /{link.slug}
                                        </p>
                                        {link.campaign && (
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium hidden sm:inline">
                                                {link.campaign}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{link.original_url}</p>
                                </div>

                                {/* Clicks */}
                                <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                                    <MousePointerClick className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-700 tabular-nums">{link.clicks.toLocaleString()}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => handleCopy(link)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title={t('links.copy')}
                                    >
                                        {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => router.push(`/dashboard/marketing/qr?link=${link.id}`)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title={t('links.qrCode')}
                                    >
                                        <QrCode className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => router.push(`/dashboard/marketing/links/${link.id}`)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title={t('links.analytics')}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(link.id)}
                                        disabled={isDeleting}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title={t('links.delete')}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <CreateLinkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false)
                    loadLinks()
                }}
            />
        </div>
    )
}
