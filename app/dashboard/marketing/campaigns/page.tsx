'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    Tag, Link2, MousePointerClick, ArrowUpRight
} from 'lucide-react'
import { getMarketingCampaigns } from '@/app/actions/marketing-links'
import { getChannelConfig } from '@/lib/marketing/channels'

interface CampaignData {
    name: string
    linkCount: number
    totalClicks: number
    channels: string[]
}

export default function MarketingCampaignsPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<CampaignData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMarketingCampaigns().then(res => {
            if (res.success) {
                setCampaigns(res.data as CampaignData[])
            }
            setLoading(false)
        })
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('campaigns.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('campaigns.subtitle')}</p>
            </div>

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-5 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                <div className="h-3 w-48 bg-gray-100 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : !campaigns.length ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Tag className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{t('campaigns.empty')}</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">{t('campaigns.emptyDesc')}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
                    {campaigns.map((campaign) => (
                        <button
                            key={campaign.name}
                            onClick={() => router.push(`/dashboard/marketing/links?campaign=${encodeURIComponent(campaign.name)}`)}
                            className="flex items-center gap-4 w-full px-6 py-4 text-left hover:bg-gray-50/60 transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                                <Tag className="w-4.5 h-4.5 text-gray-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900">{campaign.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Link2 className="w-3 h-3" /> {campaign.linkCount} {t('campaigns.linksLabel')}
                                    </span>
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <MousePointerClick className="w-3 h-3" /> {campaign.totalClicks.toLocaleString()} {t('clicks')}
                                    </span>
                                </div>
                            </div>

                            {/* Channel badges */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {campaign.channels.slice(0, 3).map(ch => {
                                    const cfg = getChannelConfig(ch)
                                    return (
                                        <span
                                            key={ch}
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color} ${cfg.textColor}`}
                                        >
                                            {cfg.label}
                                        </span>
                                    )
                                })}
                                {campaign.channels.length > 3 && (
                                    <span className="text-[10px] text-gray-400">+{campaign.channels.length - 3}</span>
                                )}
                            </div>

                            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
