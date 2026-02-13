'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
    X, Link2, Loader2, Check, Copy, Globe,
    Shuffle, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import { createMarketingLink } from '@/app/actions/marketing-links'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { PREDEFINED_CHANNELS } from '@/lib/marketing/channels'
import QRCode from 'react-qr-code'
import { nanoid } from 'nanoid'

interface CreateLinkModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
    const t = useTranslations('dashboard.marketing')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<{ slug: string; short_url: string } | null>(null)
    const [copied, setCopied] = useState(false)

    // Form
    const [url, setUrl] = useState('')
    const [slug, setSlug] = useState('')
    const [channel, setChannel] = useState('')
    const [customChannel, setCustomChannel] = useState('')
    const [campaign, setCampaign] = useState('')
    const [showUtm, setShowUtm] = useState(false)
    const [utmSource, setUtmSource] = useState('')
    const [utmMedium, setUtmMedium] = useState('')
    const [utmCampaign, setUtmCampaign] = useState('')
    const [utmTerm, setUtmTerm] = useState('')
    const [utmContent, setUtmContent] = useState('')

    // Domain
    const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null)
    const [selectedDomain, setSelectedDomain] = useState<string>('')
    const [showDomainDropdown, setShowDomainDropdown] = useState(false)

    const defaultDomain = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/^https?:\/\//, '')
        : ''

    // Load verified domain on open
    useEffect(() => {
        if (isOpen) {
            setResult(null)
            setUrl('')
            setSlug('')
            setChannel('')
            setCustomChannel('')
            setCampaign('')
            setShowUtm(false)
            setUtmSource('')
            setUtmMedium('')
            setUtmCampaign('')
            setUtmTerm('')
            setUtmContent('')
            setError('')
            setCopied(false)

            getVerifiedDomainForWorkspace().then(res => {
                if (res.success && res.domain) {
                    setVerifiedDomain(res.domain)
                    setSelectedDomain(res.domain)
                } else {
                    setVerifiedDomain(null)
                    setSelectedDomain(defaultDomain)
                }
            })
        }
    }, [isOpen, defaultDomain])

    // Escape key
    useEffect(() => {
        if (!isOpen) return
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onClose()
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, loading, onClose])

    const domainOptions = useMemo(() => {
        const opts = [{ label: defaultDomain, value: defaultDomain }]
        if (verifiedDomain && verifiedDomain !== defaultDomain) {
            opts.unshift({ label: verifiedDomain, value: verifiedDomain })
        }
        return opts
    }, [verifiedDomain, defaultDomain])

    const previewUrl = useMemo(() => {
        const s = slug.trim() || 'your-slug'
        return `${selectedDomain}/s/${s}`
    }, [slug, selectedDomain])

    const effectiveChannel = channel === '__custom' ? `custom:${customChannel}` : channel

    if (!isOpen) return null

    const handleRandomizeSlug = () => {
        setSlug(nanoid(7))
    }

    async function handleSubmit() {
        setError('')
        if (!url.trim()) {
            setError(t('create.errorUrlRequired'))
            return
        }

        setLoading(true)
        const domainToSend = verifiedDomain && selectedDomain === verifiedDomain
            ? verifiedDomain
            : undefined

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
            domain: domainToSend,
        })

        if (res.success && res.data) {
            const shortUrl = domainToSend
                ? `https://${domainToSend}/s/${res.data.slug}`
                : res.data.short_url
            setResult({ slug: res.data.slug, short_url: shortUrl })
            onSuccess?.()
        } else {
            setError(res.error || 'Error')
        }
        setLoading(false)
    }

    const copyToClipboard = async () => {
        if (result?.short_url) {
            await navigator.clipboard.writeText(result.short_url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleClose = () => {
        if (!loading) onClose()
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${result ? 'max-w-md' : 'max-w-4xl'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                            <Link2 className="w-5 h-5 text-gray-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {result ? t('modal.linkCreated') : t('create.title')}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {result ? (
                    /* Success View */
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('modal.allSet')}</h3>
                        <p className="text-gray-500 mb-6">{t('modal.linkReady')}</p>

                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                </div>
                                <code className="text-gray-900 font-medium truncate text-sm">
                                    {result.short_url.replace(/^https?:\/\//, '')}
                                </code>
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="ml-4 p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-blue-500"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
                            <QRCode
                                value={result.short_url}
                                size={140}
                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                viewBox="0 0 256 256"
                            />
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
                            >
                                {t('modal.close')}
                            </button>
                            <button
                                onClick={() => {
                                    setResult(null)
                                    setUrl('')
                                    setSlug('')
                                    setChannel('')
                                    setCampaign('')
                                    setError('')
                                }}
                                className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
                            >
                                {t('modal.createAnother')}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Creation Form */
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 min-h-[480px]">

                            {/* LEFT: Form (3 cols) */}
                            <div className="md:col-span-3 p-6 space-y-5">
                                {/* Destination URL */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        {t('create.destinationUrl')} <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://example.com/landing-page"
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Short Link: domain dropdown + slug */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-semibold text-gray-700">
                                            {t('modal.shortLink')}
                                        </label>
                                        <button
                                            onClick={handleRandomizeSlug}
                                            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                                        >
                                            <Shuffle className="w-3 h-3" /> {t('modal.randomize')}
                                        </button>
                                    </div>
                                    <div className="flex rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-300 transition-all overflow-hidden">
                                        {/* Domain selector */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                                                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
                                            >
                                                <Globe className="w-3.5 h-3.5 text-gray-400" />
                                                {selectedDomain}
                                                {domainOptions.length > 1 && <ChevronDown className="w-3 h-3 text-gray-400" />}
                                                <span className="text-gray-300 ml-0.5">/s/</span>
                                            </button>
                                            {showDomainDropdown && domainOptions.length > 1 && (
                                                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                                                    {domainOptions.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => {
                                                                setSelectedDomain(opt.value)
                                                                setShowDomainDropdown(false)
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                                                                selectedDomain === opt.value ? 'text-purple-600 font-medium' : 'text-gray-700'
                                                            }`}
                                                        >
                                                            <Globe className="w-3.5 h-3.5" />
                                                            {opt.label}
                                                            {selectedDomain === opt.value && <Check className="w-3 h-3 ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="auto-generated"
                                            className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent min-w-0"
                                        />
                                    </div>
                                </div>

                                {/* Channel selector (pills) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('create.channel')}
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PREDEFINED_CHANNELS.filter(c => c.id !== 'other').map(ch => (
                                            <button
                                                key={ch.id}
                                                type="button"
                                                onClick={() => setChannel(channel === ch.id ? '' : ch.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    channel === ch.id
                                                        ? `${ch.color} ${ch.textColor} shadow-sm`
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {ch.label}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setChannel(channel === '__custom' ? '' : '__custom')}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                channel === '__custom'
                                                    ? 'bg-violet-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {t('create.customChannel')}
                                        </button>
                                    </div>
                                    {channel === '__custom' && (
                                        <input
                                            type="text"
                                            value={customChannel}
                                            onChange={(e) => setCustomChannel(e.target.value)}
                                            placeholder={t('create.customChannelPlaceholder')}
                                            className="w-full px-3.5 py-2 mt-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                        />
                                    )}
                                </div>

                                {/* Campaign */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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

                                {/* UTM toggle */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowUtm(!showUtm)}
                                        className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <span>{t('create.utmParameters')}</span>
                                        {showUtm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </button>
                                    {showUtm && (
                                        <div className="px-4 pb-3 space-y-2.5 border-t border-gray-100 pt-3">
                                            {[
                                                { key: 'utm_source', value: utmSource, setter: setUtmSource, placeholder: 'instagram, google, newsletter' },
                                                { key: 'utm_medium', value: utmMedium, setter: setUtmMedium, placeholder: 'social, cpc, email' },
                                                { key: 'utm_campaign', value: utmCampaign, setter: setUtmCampaign, placeholder: 'spring_sale, launch_2026' },
                                                { key: 'utm_term', value: utmTerm, setter: setUtmTerm, placeholder: 'keyword' },
                                                { key: 'utm_content', value: utmContent, setter: setUtmContent, placeholder: 'banner_v2, cta_red' },
                                            ].map(field => (
                                                <div key={field.key}>
                                                    <label className="block text-[11px] font-medium text-gray-400 mb-0.5">{field.key}</label>
                                                    <input
                                                        type="text"
                                                        value={field.value}
                                                        onChange={(e) => field.setter(e.target.value)}
                                                        placeholder={field.placeholder}
                                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Preview (2 cols) */}
                            <div className="md:col-span-2 md:border-l border-gray-100 bg-gray-50/50 p-6 space-y-5">
                                {/* QR Code */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('modal.qrPreview')}</h3>
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-center">
                                        <QRCode
                                            value={url || `https://${selectedDomain}`}
                                            size={130}
                                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                            viewBox="0 0 256 256"
                                        />
                                    </div>
                                </div>

                                {/* Link preview */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('create.preview')}</h3>
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
                                        <div className="flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                            <p className="text-sm font-mono text-gray-800 truncate">{previewUrl}</p>
                                        </div>
                                        {url && (
                                            <div className="flex items-center gap-2">
                                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <p className="text-xs text-gray-400 truncate">{url}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Channel + Campaign badges */}
                                {(channel || campaign) && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('modal.tags')}</h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            {channel && channel !== '__custom' && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                    {PREDEFINED_CHANNELS.find(c => c.id === channel)?.label || channel}
                                                </span>
                                            )}
                                            {channel === '__custom' && customChannel && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                                                    {customChannel}
                                                </span>
                                            )}
                                            {campaign && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    {campaign}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Domain info */}
                                {verifiedDomain && selectedDomain === verifiedDomain && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-xs text-emerald-700 font-medium">{t('modal.customDomainActive')}</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-0.5 ml-5.5">{verifiedDomain}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-6 py-4 bg-white sticky bottom-0 z-10 flex items-center justify-end gap-3">
                            <button
                                onClick={handleClose}
                                className="py-2.5 px-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                            >
                                {t('modal.cancel')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !url.trim()}
                                className="py-2.5 px-6 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                {t('create.submit')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
