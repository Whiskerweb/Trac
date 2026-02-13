'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    MousePointerClick, Link2, TrendingUp, Crown,
    Plus, ArrowUpRight, ExternalLink
} from 'lucide-react'
import { getMarketingOverview } from '@/app/actions/marketing-links'
import { getChannelConfig } from '@/lib/marketing/channels'
import { CreateLinkModal } from '@/components/marketing/CreateLinkModal'

interface OverviewData {
    totalClicks: number
    totalLinks: number
    topChannel: string
    topChannelClicks: number
    bestLink: {
        id: string
        slug: string
        original_url: string
        short_url: string
        clicks: number
        channel: string | null
        campaign: string | null
    } | null
    topLinks: Array<{
        id: string
        slug: string
        original_url: string
        short_url: string
        clicks: number
        channel: string | null
        campaign: string | null
        created_at: Date
    }>
}

export default function MarketingOverviewPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    useEffect(() => {
        getMarketingOverview().then(res => {
            if (res.success && res.data) {
                setData(res.data as unknown as OverviewData)
            }
            setLoading(false)
        })
    }, [])

    const topChannelConfig = data ? getChannelConfig(data.topChannel) : null

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
                            <div className="h-8 w-16 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('overview.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('overview.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('createLink')}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <MousePointerClick className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{t('overview.totalClicks')}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                        {data?.totalClicks?.toLocaleString() || '0'}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Link2 className="w-4.5 h-4.5 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{t('overview.totalLinks')}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 tracking-tight">
                        {data?.totalLinks || 0}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{t('overview.topChannel')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {topChannelConfig && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${topChannelConfig.color} ${topChannelConfig.textColor}`}>
                                {topChannelConfig.label}
                            </span>
                        )}
                        <span className="text-sm text-gray-400">{data?.topChannelClicks || 0} clicks</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Crown className="w-4.5 h-4.5 text-amber-600" />
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{t('overview.bestLink')}</span>
                    </div>
                    {data?.bestLink ? (
                        <p className="text-sm font-mono text-gray-700 truncate">/{data.bestLink.slug}</p>
                    ) : (
                        <p className="text-sm text-gray-400">{t('overview.noLinks')}</p>
                    )}
                </div>
            </div>

            {/* Top Performing Links */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">{t('overview.topPerforming')}</h2>
                    <button
                        onClick={() => router.push('/dashboard/marketing/links')}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                    >
                        {t('overview.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {!data?.topLinks?.length ? (
                    <div className="px-6 py-16 text-center">
                        <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-4">{t('overview.noLinksYet')}</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {t('overview.createFirst')}
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {data.topLinks.map((link) => {
                            const channelCfg = getChannelConfig(link.channel)
                            return (
                                <div
                                    key={link.id}
                                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/dashboard/marketing/links/${link.id}`)}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-lg ${channelCfg.color} flex items-center justify-center flex-shrink-0`}>
                                            <ExternalLink className={`w-3.5 h-3.5 ${channelCfg.textColor}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">/{link.slug}</p>
                                            <p className="text-xs text-gray-400 truncate">{link.original_url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                        {link.campaign && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline">
                                                {link.campaign}
                                            </span>
                                        )}
                                        <span className="text-sm font-semibold text-gray-900 tabular-nums">
                                            {link.clicks.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-gray-400">{t('clicks')}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <CreateLinkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false)
                    // Reload overview data
                    setLoading(true)
                    getMarketingOverview().then(res => {
                        if (res.success && res.data) {
                            setData(res.data as unknown as OverviewData)
                        }
                        setLoading(false)
                    })
                }}
            />
        </div>
    )
}
