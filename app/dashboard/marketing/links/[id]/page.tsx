'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import {
    ArrowLeft, Copy, QrCode, ExternalLink,
    MousePointerClick, Globe, Smartphone, Monitor,
    Check, Link2, Calendar, Tag, Pencil, Trash2
} from 'lucide-react'
import { getMarketingLink, deleteMarketingLink } from '@/app/actions/marketing-links'
import { getChannelConfig } from '@/lib/marketing/channels'

interface LinkData {
    id: string
    slug: string
    original_url: string
    short_url: string
    clicks: number
    channel: string | null
    campaign: string | null
    created_at: string
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    utm_term: string | null
    utm_content: string | null
}

export default function MarketingLinkDetailPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const params = useParams()
    const linkId = params.id as string

    const [link, setLink] = useState<LinkData | null>(null)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        getMarketingLink(linkId).then(res => {
            if (res.success && res.data) {
                setLink(res.data as unknown as LinkData)
            }
            setLoading(false)
        })
    }, [linkId])

    const handleCopy = async () => {
        if (!link) return
        await navigator.clipboard.writeText(link.short_url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDelete = async () => {
        if (!link) return
        const res = await deleteMarketingLink(link.id)
        if (res.success) {
            router.push('/dashboard/marketing/links')
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 animate-pulse">
                    <div className="h-8 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-64 bg-gray-100 rounded" />
                </div>
            </div>
        )
    }

    if (!link) {
        return (
            <div className="text-center py-20">
                <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('detail.notFound')}</p>
                <button
                    onClick={() => router.push('/dashboard/marketing/links')}
                    className="mt-4 text-sm text-purple-600 hover:text-purple-700"
                >
                    {t('create.back')}
                </button>
            </div>
        )
    }

    const channelCfg = getChannelConfig(link.channel)
    const createdDate = new Date(link.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    })

    const utmEntries = [
        { key: 'utm_source', value: link.utm_source },
        { key: 'utm_medium', value: link.utm_medium },
        { key: 'utm_campaign', value: link.utm_campaign },
        { key: 'utm_term', value: link.utm_term },
        { key: 'utm_content', value: link.utm_content },
    ].filter(u => u.value)

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Back */}
            <button
                onClick={() => router.push('/dashboard/marketing/links')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                {t('detail.backToLinks')}
            </button>

            {/* Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${channelCfg.color} flex items-center justify-center`}>
                            <ExternalLink className={`w-5 h-5 ${channelCfg.textColor}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-gray-900">/{link.slug}</h1>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${channelCfg.color} ${channelCfg.textColor}`}>
                                    {channelCfg.label}
                                </span>
                                {link.campaign && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                        <Tag className="w-2.5 h-2.5" />
                                        {link.campaign}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 mt-0.5 truncate max-w-lg">{link.original_url}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {createdDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? t('detail.copied') : t('links.copy')}
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/marketing/qr?link=${link.id}`)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <QrCode className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <MousePointerClick className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('detail.totalClicks')}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{link.clicks.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('detail.topCountry')}</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">--</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('detail.tinybirdNote')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('detail.topDevice')}</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">--</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('detail.tinybirdNote')}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-gray-500 font-medium">{t('detail.topReferrer')}</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">--</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('detail.tinybirdNote')}</p>
                </div>
            </div>

            {/* UTM Parameters */}
            {utmEntries.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">{t('detail.utmParameters')}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {utmEntries.map(u => (
                            <div key={u.key} className="bg-gray-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-medium text-gray-400 uppercase">{u.key}</p>
                                <p className="text-sm text-gray-700 font-medium">{u.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Short URL */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-3">{t('detail.shortUrl')}</h2>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-mono text-gray-700 flex-1 truncate">{link.short_url}</span>
                    <button
                        onClick={handleCopy}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium flex-shrink-0"
                    >
                        {copied ? t('detail.copied') : t('links.copy')}
                    </button>
                </div>
            </div>
        </div>
    )
}
