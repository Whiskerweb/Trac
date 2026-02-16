'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
    Plus, Search, Copy, QrCode, Trash2,
    ExternalLink, Link2, Check, MousePointerClick,
    Download, ChevronDown
} from 'lucide-react'
import { getMarketingLinks, getMarketingOverview, getMarketingCampaigns, deleteMarketingLink } from '@/app/actions/marketing-links'
import { getStartupProfile } from '@/app/actions/startup-profile'
import { PREDEFINED_CHANNELS, getChannelConfig } from '@/lib/marketing/channels'
import { CreateLinkModal } from '@/components/marketing/CreateLinkModal'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'

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

interface CampaignOption {
    name: string
    linkCount: number
}

export default function MarketingLinksPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [links, setLinks] = useState<MarketingLink[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeChannel, setActiveChannel] = useState<string | null>(null)
    const [activeCampaign, setActiveCampaign] = useState<string | null>(null)
    const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [totalClicks, setTotalClicks] = useState(0)
    const [totalLinks, setTotalLinks] = useState(0)

    // QR popover state
    const [qrOpenId, setQrOpenId] = useState<string | null>(null)
    const [startupLogo, setStartupLogo] = useState<string | null>(null)
    const qrRef = useRef<HTMLDivElement>(null)

    // Campaign dropdown state
    const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
    const campaignRef = useRef<HTMLDivElement>(null)

    // Load startup logo once
    useEffect(() => {
        getStartupProfile().then(res => {
            if (res.success && res.profile?.logoUrl) {
                setStartupLogo(res.profile.logoUrl)
            }
        })
    }, [])

    // Load overview stats (total counts)
    useEffect(() => {
        getMarketingOverview().then(res => {
            if (res.success && res.data) {
                const d = res.data as { totalClicks: number; totalLinks: number }
                setTotalClicks(d.totalClicks)
                setTotalLinks(d.totalLinks)
            }
        })
    }, [])

    // Load campaigns for dropdown
    useEffect(() => {
        getMarketingCampaigns().then(res => {
            if (res.success && res.data) {
                setCampaigns((res.data as CampaignOption[]).map(c => ({ name: c.name, linkCount: c.linkCount })))
            }
        })
    }, [])

    const loadLinks = useCallback(async () => {
        const res = await getMarketingLinks({
            search: search || undefined,
            channel: activeChannel || undefined,
            campaign: activeCampaign || undefined,
        })
        if (res.success) {
            setLinks(res.data as unknown as MarketingLink[])
        }
        setLoading(false)
    }, [search, activeChannel, activeCampaign])

    useEffect(() => {
        setLoading(true)
        const timeout = setTimeout(loadLinks, 300)
        return () => clearTimeout(timeout)
    }, [loadLinks])

    // Close QR popover on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (qrRef.current && !qrRef.current.contains(e.target as Node)) {
                setQrOpenId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close campaign dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (campaignRef.current && !campaignRef.current.contains(e.target as Node)) {
                setCampaignDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
            setTotalLinks(prev => prev - 1)
        }
        setDeletingId(null)
    }

    const downloadQR = useCallback(async (linkSlug: string, linkId: string, format: 'png' | 'svg') => {
        const svgEl = document.getElementById(`qr-popover-${linkId}`)
        if (!svgEl) return
        const svg = svgEl.querySelector('svg')
        if (!svg) return

        const logoSrc = startupLogo || '/logos/28e3dff9-d0d8-4239-bdd4-810b36b7023a_1769596124427.png'

        const loadImage = (src: string): Promise<HTMLImageElement> =>
            new Promise((resolve, reject) => {
                const img = new Image()
                if (src.startsWith('http')) img.crossOrigin = 'anonymous'
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = src
            })

        const svgData = new XMLSerializer().serializeToString(svg)

        if (format === 'svg') {
            try {
                const logoImg = await loadImage(logoSrc)
                const tmpCanvas = document.createElement('canvas')
                tmpCanvas.width = logoImg.naturalWidth
                tmpCanvas.height = logoImg.naturalHeight
                tmpCanvas.getContext('2d')!.drawImage(logoImg, 0, 0)
                const logoDataUrl = tmpCanvas.toDataURL('image/png')

                const svgClone = svg.cloneNode(true) as SVGSVGElement
                const vbSize = svgClone.viewBox?.baseVal?.width || 256
                const logoSize = Math.round(vbSize * 0.22)
                const logoPadding = Math.round(logoSize * 0.15)
                const totalArea = logoSize + logoPadding * 2
                const center = vbSize / 2

                let defs = svgClone.querySelector('defs')
                if (!defs) {
                    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
                    svgClone.insertBefore(defs, svgClone.firstChild)
                }

                const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
                clipPath.setAttribute('id', 'logo-clip')
                const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                clipCircle.setAttribute('cx', String(center))
                clipCircle.setAttribute('cy', String(center))
                clipCircle.setAttribute('r', String(logoSize / 2))
                clipPath.appendChild(clipCircle)
                defs.appendChild(clipPath)

                const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
                bgCircle.setAttribute('cx', String(center))
                bgCircle.setAttribute('cy', String(center))
                bgCircle.setAttribute('r', String(totalArea / 2))
                bgCircle.setAttribute('fill', '#FFFFFF')
                svgClone.appendChild(bgCircle)

                const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image')
                imageEl.setAttribute('x', String(center - logoSize / 2))
                imageEl.setAttribute('y', String(center - logoSize / 2))
                imageEl.setAttribute('width', String(logoSize))
                imageEl.setAttribute('height', String(logoSize))
                imageEl.setAttribute('href', logoDataUrl)
                imageEl.setAttribute('clip-path', 'url(#logo-clip)')
                svgClone.appendChild(imageEl)

                const finalSvg = new XMLSerializer().serializeToString(svgClone)
                const blob = new Blob([finalSvg], { type: 'image/svg+xml;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `qr-${linkSlug}.svg`
                a.click()
                URL.revokeObjectURL(url)
            } catch {
                const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `qr-${linkSlug}.svg`
                a.click()
                URL.revokeObjectURL(url)
            }
        } else {
            const canvasSize = 400
            const canvas = document.createElement('canvas')
            canvas.width = canvasSize
            canvas.height = canvasSize
            const ctx = canvas.getContext('2d')!

            const qrImg = await loadImage('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))))
            ctx.drawImage(qrImg, 0, 0, canvasSize, canvasSize)

            try {
                const logoImg = await loadImage(logoSrc)
                const logoSize = Math.round(canvasSize * 0.22)
                const logoPadding = Math.round(logoSize * 0.15)
                const totalArea = logoSize + logoPadding * 2
                const center = canvasSize / 2

                ctx.beginPath()
                ctx.arc(center, center, totalArea / 2, 0, Math.PI * 2)
                ctx.fillStyle = '#FFFFFF'
                ctx.fill()

                ctx.save()
                ctx.beginPath()
                ctx.arc(center, center, logoSize / 2, 0, Math.PI * 2)
                ctx.clip()
                ctx.drawImage(logoImg, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize)
                ctx.restore()
            } catch {
                // Logo failed to load, export QR without it
            }

            const pngUrl = canvas.toDataURL('image/png')
            const a = document.createElement('a')
            a.href = pngUrl
            a.download = `qr-${linkSlug}.png`
            a.click()
        }
    }, [startupLogo])

    const refreshData = () => {
        setIsCreateModalOpen(false)
        loadLinks()
        getMarketingOverview().then(res => {
            if (res.success && res.data) {
                const d = res.data as { totalClicks: number; totalLinks: number }
                setTotalClicks(d.totalClicks)
                setTotalLinks(d.totalLinks)
            }
        })
        getMarketingCampaigns().then(res => {
            if (res.success && res.data) {
                setCampaigns((res.data as CampaignOption[]).map(c => ({ name: c.name, linkCount: c.linkCount })))
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header with KPI */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('links.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {totalLinks} {t('links.linksCount')} · {totalClicks.toLocaleString()} {t('clicks')}
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

            {/* Search + Channel Filters + Campaign Dropdown */}
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

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Channel pills */}
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

                    {/* Campaign dropdown */}
                    {campaigns.length > 0 && (
                        <div className="relative" ref={campaignRef}>
                            <button
                                onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    activeCampaign
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {activeCampaign || t('analytics.allCampaigns')}
                                <ChevronDown className={`w-3 h-3 transition-transform ${campaignDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {campaignDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                                    <button
                                        onClick={() => { setActiveCampaign(null); setCampaignDropdownOpen(false) }}
                                        className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                            !activeCampaign ? 'font-medium text-gray-900' : 'text-gray-600'
                                        }`}
                                    >
                                        {t('analytics.allCampaigns')}
                                    </button>
                                    {campaigns.map(c => (
                                        <button
                                            key={c.name}
                                            onClick={() => { setActiveCampaign(c.name); setCampaignDropdownOpen(false) }}
                                            className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                                activeCampaign === c.name ? 'font-medium text-gray-900' : 'text-gray-600'
                                            }`}
                                        >
                                            <span className="truncate">{c.name}</span>
                                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{c.linkCount}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
                        const isQrOpen = qrOpenId === link.id

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

                                    {/* QR button + popover */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setQrOpenId(isQrOpen ? null : link.id)}
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                isQrOpen
                                                    ? 'text-purple-600 bg-purple-50'
                                                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                            }`}
                                            title={t('links.qrCode')}
                                        >
                                            <QrCode className="w-3.5 h-3.5" />
                                        </button>

                                        {isQrOpen && (
                                            <div
                                                ref={qrRef}
                                                className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-50 w-56"
                                            >
                                                <div
                                                    id={`qr-popover-${link.id}`}
                                                    className="flex justify-center mb-3"
                                                >
                                                    <QRCodeWithLogo
                                                        value={link.short_url}
                                                        size={160}
                                                        fgColor="#000000"
                                                        bgColor="#FFFFFF"
                                                        logoUrl={startupLogo || undefined}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 text-center mb-3 font-mono truncate">/{link.slug}</p>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => downloadQR(link.slug, link.id, 'png')}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        PNG
                                                    </button>
                                                    <button
                                                        onClick={() => downloadQR(link.slug, link.id, 'svg')}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        SVG
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

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
                onSuccess={refreshData}
            />
        </div>
    )
}
