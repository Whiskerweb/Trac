'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    ExternalLink, Link2, MousePointerClick,
    Instagram, Mail, Search, Youtube, Linkedin,
    Facebook, Twitter, Music2, Leaf, Globe, Tag
} from 'lucide-react'
import { getMarketingChannelStats } from '@/app/actions/marketing-links'
import { getChannelConfig, PREDEFINED_CHANNELS } from '@/lib/marketing/channels'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Instagram, Mail, Search, Youtube, Linkedin,
    Facebook, Twitter, Music2, Leaf, Globe, Tag,
}

interface ChannelStat {
    channel: string
    linkCount: number
    totalClicks: number
}

export default function MarketingChannelsPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [stats, setStats] = useState<ChannelStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMarketingChannelStats().then(res => {
            if (res.success) {
                setStats(res.data as ChannelStat[])
            }
            setLoading(false)
        })
    }, [])

    // Merge predefined channels with stats
    const channelCards = PREDEFINED_CHANNELS.map(ch => {
        const stat = stats.find(s => s.channel === ch.id)
        return {
            config: ch,
            linkCount: stat?.linkCount || 0,
            totalClicks: stat?.totalClicks || 0,
        }
    })

    // Add custom channels not in predefined
    const predefinedIds = new Set(PREDEFINED_CHANNELS.map(c => c.id))
    const customChannels = stats
        .filter(s => !predefinedIds.has(s.channel))
        .map(s => ({
            config: getChannelConfig(s.channel),
            linkCount: s.linkCount,
            totalClicks: s.totalClicks,
        }))

    const allChannels = [...channelCards, ...customChannels]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('channels.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('channels.subtitle')}</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
                            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-16 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allChannels.map(({ config, linkCount, totalClicks }) => {
                        const IconComponent = ICON_MAP[config.icon] || Globe

                        return (
                            <button
                                key={config.id}
                                onClick={() => router.push(`/dashboard/marketing/links?channel=${config.id}`)}
                                className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-gray-300 transition-all group"
                            >
                                <div className={`w-11 h-11 rounded-xl ${config.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                                    <IconComponent className={`w-5 h-5 ${config.textColor}`} />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Link2 className="w-3 h-3" />
                                        {linkCount} {t('channels.links')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MousePointerClick className="w-3 h-3" />
                                        {totalClicks.toLocaleString()} {t('clicks')}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
