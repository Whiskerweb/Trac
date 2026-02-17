'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
    X, Link2, Loader2, Check, Copy, Globe,
    Shuffle, ChevronDown, ExternalLink,
    Image as ImageIcon, Upload, Trash2,
    Eye, Twitter, Linkedin, Facebook, Tag, Plus
} from 'lucide-react'
import { createMarketingLink, getMarketingTags, createMarketingTag } from '@/app/actions/marketing-links'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { getStartupProfile } from '@/app/actions/startup-profile'
import { PREDEFINED_CHANNELS } from '@/lib/marketing/channels'
import { TAG_COLORS, getTagColor } from '@/lib/marketing/tags'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'
import { nanoid } from 'nanoid'

interface TagOption {
    id: string
    name: string
    color: string
}

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

    const [startupLogo, setStartupLogo] = useState<string | null>(null)

    // OG Preview
    const [ogTitle, setOgTitle] = useState('')
    const [ogDescription, setOgDescription] = useState('')
    const [ogImage, setOgImage] = useState('')
    const [uploadingOg, setUploadingOg] = useState(false)
    const [activePreviewTab, setActivePreviewTab] = useState<'generic' | 'twitter' | 'linkedin' | 'facebook'>('generic')

    // Domain
    const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null)
    const [selectedDomain, setSelectedDomain] = useState<string>('')
    const [showDomainDropdown, setShowDomainDropdown] = useState(false)

    // Tags
    const [availableTags, setAvailableTags] = useState<TagOption[]>([])
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [showNewTag, setShowNewTag] = useState(false)
    const [inlineTagName, setInlineTagName] = useState('')
    const [inlineTagColor, setInlineTagColor] = useState(TAG_COLORS[0].hex)

    // UTM popover ref
    const utmRef = useRef<HTMLDivElement>(null)

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
            setOgTitle('')
            setOgDescription('')
            setOgImage('')
            setActivePreviewTab('generic')
            setSelectedTagIds([])
            setShowNewTag(false)
            setInlineTagName('')
            setInlineTagColor(TAG_COLORS[0].hex)
            setError('')
            setCopied(false)

            getMarketingTags().then(res => {
                if (res.success && res.data) {
                    setAvailableTags(res.data as TagOption[])
                }
            })
            getVerifiedDomainForWorkspace().then(res => {
                if (res.success && res.domain) {
                    setVerifiedDomain(res.domain)
                    setSelectedDomain(res.domain)
                } else {
                    setVerifiedDomain(null)
                    setSelectedDomain(defaultDomain)
                }
            })
            getStartupProfile().then(res => {
                if (res.success && res.profile?.logoUrl) {
                    setStartupLogo(res.profile.logoUrl)
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

    // Click outside UTM popover
    useEffect(() => {
        if (!showUtm) return
        const handleClickOutside = (e: MouseEvent) => {
            if (utmRef.current && !utmRef.current.contains(e.target as Node)) {
                setShowUtm(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showUtm])

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
            og_title: ogTitle.trim() || undefined,
            og_description: ogDescription.trim() || undefined,
            og_image: ogImage || undefined,
            tagIds: selectedTagIds.length ? selectedTagIds : undefined,
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

    const utmFieldCount = [utmSource, utmMedium, utmCampaign, utmTerm, utmContent].filter(v => v.trim()).length

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
            <div className={`bg-white rounded-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${result ? 'max-w-md' : 'max-w-3xl'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h2 className="text-sm font-medium text-gray-900">
                        {result ? t('modal.linkCreated') : t('create.title')}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-4 h-4" />
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

                        <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between mb-6">
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
                        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                            <QRCodeWithLogo
                                value={result.short_url}
                                size={140}
                                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                viewBox="0 0 256 256"
                                logoUrl={startupLogo || undefined}
                            />
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors text-sm"
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
                                className="flex-1 py-2 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                                {t('modal.createAnother')}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Creation Form */
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 min-h-[420px]">

                            {/* LEFT: Form (3 cols) */}
                            <div className="md:col-span-3 p-5 space-y-4">
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
                                        className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                                        autoFocus
                                    />
                                </div>

                                {/* Short Link: domain dropdown + slug */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-medium text-gray-700">
                                            {t('modal.shortLink')}
                                        </label>
                                        <button
                                            onClick={handleRandomizeSlug}
                                            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                                        >
                                            <Shuffle className="w-3 h-3" /> {t('modal.randomize')}
                                        </button>
                                    </div>
                                    <div className="flex rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-300 transition-all overflow-hidden">
                                        {/* Domain selector */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-r border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
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
                                                                selectedDomain === opt.value ? 'text-gray-900 font-medium' : 'text-gray-700'
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
                                            className="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent min-w-0"
                                        />
                                    </div>
                                </div>

                                {/* Channel selector (pills) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                            className="w-full px-3.5 py-2 mt-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
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
                                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                                    />
                                </div>

                                {/* Tags */}
                                {availableTags.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('modal.tags')}
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {availableTags.map(tag => {
                                                const tc = getTagColor(tag.color)
                                                const isSelected = selectedTagIds.includes(tag.id)
                                                return (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTagIds(prev =>
                                                                isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                                                            )
                                                        }}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                            isSelected
                                                                ? `${tc.bg} ${tc.text} shadow-sm`
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full ${tc.dot}`} />
                                                        {tag.name}
                                                    </button>
                                                )
                                            })}
                                            <button
                                                type="button"
                                                onClick={() => setShowNewTag(!showNewTag)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                                            >
                                                <Plus className="w-3 h-3" />
                                                {t('tags.create')}
                                            </button>
                                        </div>
                                        {showNewTag && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="text"
                                                    value={inlineTagName}
                                                    onChange={(e) => setInlineTagName(e.target.value)}
                                                    onKeyDown={async (e) => {
                                                        if (e.key === 'Enter' && inlineTagName.trim()) {
                                                            e.preventDefault()
                                                            const res = await createMarketingTag(inlineTagName, inlineTagColor)
                                                            if (res.success && res.data) {
                                                                const newTag = res.data as TagOption
                                                                setAvailableTags(prev => [...prev, newTag])
                                                                setSelectedTagIds(prev => [...prev, newTag.id])
                                                                setInlineTagName('')
                                                                setShowNewTag(false)
                                                            }
                                                        }
                                                    }}
                                                    placeholder={t('tags.namePlaceholder')}
                                                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-0.5">
                                                    {TAG_COLORS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => setInlineTagColor(c.hex)}
                                                            className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                                                                inlineTagColor === c.hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!inlineTagName.trim()) return
                                                        const res = await createMarketingTag(inlineTagName, inlineTagColor)
                                                        if (res.success && res.data) {
                                                            const newTag = res.data as TagOption
                                                            setAvailableTags(prev => [...prev, newTag])
                                                            setSelectedTagIds(prev => [...prev, newTag.id])
                                                            setInlineTagName('')
                                                            setShowNewTag(false)
                                                        }
                                                    }}
                                                    disabled={!inlineTagName.trim()}
                                                    className="px-2.5 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-all"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg border border-red-100">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: Preview sidebar (2 cols) */}
                            <div className="md:col-span-2 md:border-l border-gray-200 bg-gray-50/50 p-5 space-y-4">
                                {/* QR Code compact */}
                                <div>
                                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('modal.qrPreview')}</h3>
                                    <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-center">
                                        <QRCodeWithLogo
                                            value={url || `https://${selectedDomain}`}
                                            size={80}
                                            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                                            viewBox="0 0 256 256"
                                            logoUrl={startupLogo || undefined}
                                        />
                                    </div>
                                </div>

                                {/* Custom Link Preview */}
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                                        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('modal.customLinkPreview')}</h3>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        {/* Social tab icons */}
                                        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
                                            {([
                                                { id: 'generic' as const, Icon: Globe },
                                                { id: 'twitter' as const, Icon: Twitter },
                                                { id: 'linkedin' as const, Icon: Linkedin },
                                                { id: 'facebook' as const, Icon: Facebook },
                                            ]).map(({ id, Icon }) => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => setActivePreviewTab(id)}
                                                    className={`p-1.5 rounded-md transition-colors ${
                                                        activePreviewTab === id
                                                            ? 'bg-gray-100 text-gray-700'
                                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </button>
                                            ))}
                                        </div>

                                        {/* Image upload zone */}
                                        {ogImage ? (
                                            <div className="relative">
                                                <img src={ogImage} alt="OG preview" className="w-full h-[140px] object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setOgImage('')}
                                                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-[140px] border-b border-dashed border-gray-200 cursor-pointer hover:bg-gray-50/50 transition-all">
                                                {uploadingOg ? (
                                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Upload className="w-5 h-5 text-gray-300 mb-1" />
                                                        <span className="text-xs text-gray-400">{t('create.ogImageUpload')}</span>
                                                        <span className="text-[10px] text-gray-300 mt-0.5">{t('create.ogImageHint')}</span>
                                                    </>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setUploadingOg(true)
                                                        try {
                                                            const formData = new FormData()
                                                            formData.append('file', file)
                                                            formData.append('type', 'og_image')
                                                            const res = await fetch('/api/upload', { method: 'POST', body: formData })
                                                            const data = await res.json()
                                                            if (data.success) setOgImage(data.url)
                                                        } catch { /* ignore */ }
                                                        setUploadingOg(false)
                                                    }}
                                                />
                                            </label>
                                        )}

                                        {/* OG Title */}
                                        <div className="px-3 pt-3">
                                            <input
                                                type="text"
                                                value={ogTitle}
                                                onChange={(e) => setOgTitle(e.target.value)}
                                                placeholder="Add a title..."
                                                className="w-full text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent"
                                            />
                                        </div>

                                        {/* OG Description */}
                                        <div className="px-3 pt-1 pb-2">
                                            <textarea
                                                value={ogDescription}
                                                onChange={(e) => setOgDescription(e.target.value)}
                                                placeholder="Add a description..."
                                                rows={2}
                                                className="w-full text-xs text-gray-500 placeholder:text-gray-300 focus:outline-none bg-transparent resize-none"
                                            />
                                        </div>

                                        {/* URL preview */}
                                        <div className="px-3 pb-2.5">
                                            <p className="text-[11px] text-gray-400 truncate">{url || previewUrl}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Domain badge */}
                                {verifiedDomain && selectedDomain === verifiedDomain && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-xs text-emerald-700 font-medium">{t('modal.customDomainActive')}</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-0.5 ml-5.5">{verifiedDomain}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Bar — toolbar style */}
                        <div className="border-t border-gray-200 px-5 py-3 bg-white sticky bottom-0 z-10 flex items-center justify-between">
                            {/* Left: UTM pill */}
                            <div className="relative" ref={utmRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowUtm(!showUtm)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        showUtm || utmFieldCount > 0
                                            ? 'bg-gray-900 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <Tag className="w-3 h-3" />
                                    UTM
                                    {utmFieldCount > 0 && (
                                        <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">{utmFieldCount}</span>
                                    )}
                                </button>

                                {/* UTM Popover */}
                                {showUtm && (
                                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-4 space-y-2.5">
                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{t('create.utmParameters')}</h4>
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
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right: Cancel + Create */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClose}
                                    className="py-2 px-4 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                                >
                                    {t('modal.cancel')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !url.trim()}
                                    className="py-2 px-5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
                                >
                                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {t('create.submit')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
