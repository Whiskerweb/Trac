'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
    MousePointerClick, Globe, Monitor, Smartphone,
    BarChart3, Calendar
} from 'lucide-react'
import { getMarketingLinks, getMarketingChannelStats } from '@/app/actions/marketing-links'
import { PREDEFINED_CHANNELS, getChannelConfig } from '@/lib/marketing/channels'

interface LinkData {
    id: string
    slug: string
    clicks: number
    channel: string | null
    campaign: string | null
    created_at: string
}

export default function MarketingAnalyticsPage() {
    const t = useTranslations('dashboard.marketing')
    const [links, setLinks] = useState<LinkData[]>([])
    const [channelFilter, setChannelFilter] = useState<string>('')
    const [campaignFilter, setCampaignFilter] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMarketingLinks({
            channel: channelFilter || undefined,
            campaign: campaignFilter || undefined,
        }).then(res => {
            if (res.success) {
                setLinks(res.data as unknown as LinkData[])
            }
            setLoading(false)
        })
    }, [channelFilter, campaignFilter])

    const totalClicks = useMemo(() => links.reduce((sum, l) => sum + l.clicks, 0), [links])

    // Channel breakdown
    const channelBreakdown = useMemo(() => {
        const map = new Map<string, number>()
        for (const link of links) {
            const ch = link.channel || 'other'
            map.set(ch, (map.get(ch) || 0) + link.clicks)
        }
        return Array.from(map.entries())
            .map(([channel, clicks]) => ({ channel, clicks, config: getChannelConfig(channel) }))
            .sort((a, b) => b.clicks - a.clicks)
    }, [links])

    // Campaign breakdown
    const campaignBreakdown = useMemo(() => {
        const map = new Map<string, number>()
        for (const link of links) {
            if (link.campaign) {
                map.set(link.campaign, (map.get(link.campaign) || 0) + link.clicks)
            }
        }
        return Array.from(map.entries())
            .map(([name, clicks]) => ({ name, clicks }))
            .sort((a, b) => b.clicks - a.clicks)
    }, [links])

    // Unique campaigns for filter
    const allCampaigns = useMemo(() => {
        const s = new Set<string>()
        links.forEach(l => { if (l.campaign) s.add(l.campaign) })
        return Array.from(s)
    }, [links])

    // Date breakdown (clicks by day)
    const dailyClicks = useMemo(() => {
        const map = new Map<string, number>()
        for (const link of links) {
            const day = new Date(link.created_at).toISOString().slice(0, 10)
            map.set(day, (map.get(day) || 0) + link.clicks)
        }
        return Array.from(map.entries())
            .map(([date, clicks]) => ({ date, clicks }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [links])

    const maxDailyClicks = Math.max(...dailyClicks.map(d => d.clicks), 1)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('analytics.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('analytics.subtitle')}</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <select
                    value={channelFilter}
                    onChange={(e) => { setChannelFilter(e.target.value); setLoading(true) }}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                    <option value="">{t('analytics.allChannels')}</option>
                    {PREDEFINED_CHANNELS.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.label}</option>
                    ))}
                </select>
                <select
                    value={campaignFilter}
                    onChange={(e) => { setCampaignFilter(e.target.value); setLoading(true) }}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                    <option value="">{t('analytics.allCampaigns')}</option>
                    {allCampaigns.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <MousePointerClick className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('analytics.totalClicks')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {loading ? '--' : totalClicks.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('analytics.totalLinks')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {loading ? '--' : links.length}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('analytics.avgPerLink')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {loading ? '--' : links.length > 0 ? Math.round(totalClicks / links.length).toLocaleString() : '0'}
                    </p>
                </div>
            </div>

            {/* Chart — simple bar chart of clicks by creation date */}
            {dailyClicks.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t('analytics.clicksByDate')}</h2>
                    <div className="flex items-end gap-1 h-40">
                        {dailyClicks.slice(-30).map(d => (
                            <div
                                key={d.date}
                                className="flex-1 bg-purple-500 rounded-t-sm hover:bg-purple-600 transition-colors min-w-[4px] relative group"
                                style={{ height: `${Math.max((d.clicks / maxDailyClicks) * 100, 4)}%` }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                    {d.date}: {d.clicks}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Channel Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t('analytics.byChannel')}</h2>
                    {channelBreakdown.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">{t('analytics.noData')}</p>
                    ) : (
                        <div className="space-y-3">
                            {channelBreakdown.map(({ channel, clicks, config }) => {
                                const pct = totalClicks > 0 ? (clicks / totalClicks) * 100 : 0
                                return (
                                    <div key={channel}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-md ${config.color} flex items-center justify-center`}>
                                                    <Globe className={`w-3 h-3 ${config.textColor}`} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{config.label}</span>
                                            </div>
                                            <span className="text-sm text-gray-500 tabular-nums">{clicks.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${config.color}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Campaign Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t('analytics.byCampaign')}</h2>
                    {campaignBreakdown.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">{t('analytics.noData')}</p>
                    ) : (
                        <div className="space-y-3">
                            {campaignBreakdown.map(({ name, clicks }) => {
                                const pct = totalClicks > 0 ? (clicks / totalClicks) * 100 : 0
                                return (
                                    <div key={name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">{name}</span>
                                            <span className="text-sm text-gray-500 tabular-nums">{clicks.toLocaleString()} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-purple-500"
                                                style={{ width: `${pct}%` }}
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
