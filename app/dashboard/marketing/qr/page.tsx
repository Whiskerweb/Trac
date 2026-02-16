'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Download, QrCode, ExternalLink, MousePointerClick,
    Link2, Palette
} from 'lucide-react'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'
import { getMarketingLinks } from '@/app/actions/marketing-links'
import { getStartupProfile } from '@/app/actions/startup-profile'
import { getChannelConfig } from '@/lib/marketing/channels'

interface MarketingLink {
    id: string
    slug: string
    original_url: string
    short_url: string
    clicks: number
    channel: string | null
    campaign: string | null
}

const QR_COLORS = [
    '#000000', '#6B21A8', '#1D4ED8', '#059669',
    '#D97706', '#DC2626', '#7C3AED', '#0891B2',
]

export default function MarketingQRPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('link')

    const [links, setLinks] = useState<MarketingLink[]>([])
    const [loading, setLoading] = useState(true)
    const [qrColor, setQrColor] = useState('#000000')
    const [qrSize, setQrSize] = useState(200)
    const [startupLogo, setStartupLogo] = useState<string | null>(null)

    useEffect(() => {
        getMarketingLinks().then(res => {
            if (res.success) {
                setLinks(res.data as unknown as MarketingLink[])
            }
            setLoading(false)
        })
        getStartupProfile().then(res => {
            if (res.success && res.profile?.logoUrl) {
                setStartupLogo(res.profile.logoUrl)
            }
        })
    }, [])

    const downloadQR = useCallback((linkSlug: string, linkId: string, format: 'png' | 'svg') => {
        const svgEl = document.getElementById(`qr-${linkId}`)
        if (!svgEl) return

        const svg = svgEl.querySelector('svg')
        if (!svg) return

        if (format === 'svg') {
            const svgData = new XMLSerializer().serializeToString(svg)
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `qr-${linkSlug}.svg`
            a.click()
            URL.revokeObjectURL(url)
        } else {
            const svgData = new XMLSerializer().serializeToString(svg)
            const canvas = document.createElement('canvas')
            canvas.width = qrSize * 2
            canvas.height = qrSize * 2
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.onload = () => {
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
                const pngUrl = canvas.toDataURL('image/png')
                const a = document.createElement('a')
                a.href = pngUrl
                a.download = `qr-${linkSlug}.png`
                a.click()
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
        }
    }, [qrSize])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('qr.title')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{t('qr.subtitle')}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 bg-white rounded-xl border border-gray-200 px-5 py-3">
                <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">{t('qr.color')}</span>
                    <div className="flex items-center gap-1">
                        {QR_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setQrColor(color)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                    qrColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">{t('qr.size')}</span>
                    <select
                        value={qrSize}
                        onChange={(e) => setQrSize(Number(e.target.value))}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value={128}>128px</option>
                        <option value={200}>200px</option>
                        <option value={300}>300px</option>
                        <option value={512}>512px</option>
                    </select>
                </div>
            </div>

            {/* QR Code Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                            <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mb-4" />
                            <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
                        </div>
                    ))}
                </div>
            ) : !links.length ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center">
                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{t('qr.empty')}</h3>
                    <p className="text-sm text-gray-500">{t('qr.emptyDesc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {links.map(link => {
                        const channelCfg = getChannelConfig(link.channel)
                        const isHighlighted = highlightId === link.id

                        return (
                            <div
                                key={link.id}
                                className={`bg-white rounded-xl border p-6 transition-all hover:shadow-md ${
                                    isHighlighted ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'
                                }`}
                            >
                                {/* QR Code */}
                                <div
                                    id={`qr-${link.id}`}
                                    className="flex justify-center mb-4"
                                >
                                    <QRCodeWithLogo
                                        value={link.short_url}
                                        size={Math.min(qrSize, 200)}
                                        fgColor={qrColor}
                                        bgColor="#FFFFFF"
                                        logoUrl={startupLogo || undefined}
                                    />
                                </div>

                                {/* Link info */}
                                <div className="text-center mb-3">
                                    <p className="text-sm font-semibold text-gray-900">/{link.slug}</p>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${channelCfg.color} ${channelCfg.textColor}`}>
                                            {channelCfg.label}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <MousePointerClick className="w-3 h-3" /> {link.clicks}
                                        </span>
                                    </div>
                                </div>

                                {/* Download actions */}
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => downloadQR(link.slug, link.id, 'png')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        PNG
                                    </button>
                                    <button
                                        onClick={() => downloadQR(link.slug, link.id, 'svg')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        SVG
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
