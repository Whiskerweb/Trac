'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Link2, ChevronDown, ChevronUp,
    Loader2, ExternalLink
} from 'lucide-react'
import { createMarketingLink } from '@/app/actions/marketing-links'
import { PREDEFINED_CHANNELS, getChannelConfig } from '@/lib/marketing/channels'

export default function CreateMarketingLinkPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()

    const [url, setUrl] = useState('')
    const [slug, setSlug] = useState('')
    const [channel, setChannel] = useState('')
    const [campaign, setCampaign] = useState('')
    const [showUtm, setShowUtm] = useState(false)
    const [utmSource, setUtmSource] = useState('')
    const [utmMedium, setUtmMedium] = useState('')
    const [utmCampaign, setUtmCampaign] = useState('')
    const [utmTerm, setUtmTerm] = useState('')
    const [utmContent, setUtmContent] = useState('')
    const [customChannel, setCustomChannel] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const appUrl = typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        : ''

    const previewUrl = useMemo(() => {
        const s = slug.trim() || 'your-slug'
        return `${appUrl}/s/${s}`
    }, [slug, appUrl])

    const effectiveChannel = channel === '__custom' ? `custom:${customChannel}` : channel

    const handleSubmit = async () => {
        setError('')
        if (!url.trim()) {
            setError(t('create.errorUrlRequired'))
            return
        }

        setSubmitting(true)
        const res = await createMarketingLink({
            url: url.trim(),
            slug: slug.trim() || undefined,
            channel: effectiveChannel || undefined,
            campaign: campaign.trim() || undefined,
            utm_source: utmSource.trim() || undefined,
            utm_medium: utmMedium.trim() || undefined,
            utm_campaign: utmCampaign.trim() || undefined,
            utm_term: utmTerm.trim() || undefined,
            utm_content: utmContent.trim() || undefined,
        })

        if (res.success) {
            router.push('/dashboard/marketing/links')
        } else {
            setError(res.error || 'Error')
        }
        setSubmitting(false)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('create.back')}
                </button>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('create.title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('create.subtitle')}</p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* Destination URL */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('create.destinationUrl')} <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/landing-page"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                    />
                </div>

                {/* Custom Slug */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('create.customSlug')}
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all">
                        <span className="pl-3.5 pr-1 text-sm text-gray-400 select-none">{appUrl}/s/</span>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="auto-generated"
                            className="flex-1 px-1 py-2.5 text-sm focus:outline-none bg-transparent"
                        />
                    </div>
                </div>

                {/* Channel Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('create.channel')}
                    </label>
                    <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all appearance-none bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[center_right_12px]"
                    >
                        <option value="">{t('create.selectChannel')}</option>
                        {PREDEFINED_CHANNELS.map(ch => (
                            <option key={ch.id} value={ch.id}>{ch.label}</option>
                        ))}
                        <option value="__custom">{t('create.customChannel')}</option>
                    </select>

                    {channel === '__custom' && (
                        <input
                            type="text"
                            value={customChannel}
                            onChange={(e) => setCustomChannel(e.target.value)}
                            placeholder={t('create.customChannelPlaceholder')}
                            className="w-full px-3.5 py-2.5 mt-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                        />
                    )}
                </div>

                {/* Campaign */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('create.campaign')}
                    </label>
                    <input
                        type="text"
                        value={campaign}
                        onChange={(e) => setCampaign(e.target.value)}
                        placeholder={t('create.campaignPlaceholder')}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                    />
                </div>

                {/* UTM Builder (collapsible) */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowUtm(!showUtm)}
                        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <span>{t('create.utmParameters')}</span>
                        {showUtm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {showUtm && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                            {[
                                { key: 'utm_source', value: utmSource, setter: setUtmSource, placeholder: 'instagram, google, newsletter' },
                                { key: 'utm_medium', value: utmMedium, setter: setUtmMedium, placeholder: 'social, cpc, email' },
                                { key: 'utm_campaign', value: utmCampaign, setter: setUtmCampaign, placeholder: 'spring_sale, launch_2026' },
                                { key: 'utm_term', value: utmTerm, setter: setUtmTerm, placeholder: 'keyword' },
                                { key: 'utm_content', value: utmContent, setter: setUtmContent, placeholder: 'banner_v2, cta_red' },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{field.key}</label>
                                    <input
                                        type="text"
                                        value={field.value}
                                        onChange={(e) => field.setter(e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('create.preview')}</p>
                    <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <p className="text-sm font-mono text-gray-700 truncate">{previewUrl}</p>
                    </div>
                    {url && (
                        <div className="flex items-center gap-2 mt-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-400 truncate">{url}</p>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Link2 className="w-4 h-4" />
                    )}
                    {t('create.submit')}
                </button>
            </div>
        </div>
    )
}
