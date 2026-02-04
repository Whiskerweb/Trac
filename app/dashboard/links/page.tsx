'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Link2, ExternalLink, Copy, Trash2, Check, MousePointer2, Calendar, Search, Filter, Rocket } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ShortLink {
    id: string
    slug: string
    destination: string
    clicks: number
    created_at: string
}

export default function LinksPage() {
    const t = useTranslations('dashboard.links')
    const tCommon = useTranslations('common')
    const [links, setLinks] = useState<ShortLink[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

    useEffect(() => {
        fetchLinks()
    }, [])

    async function fetchLinks() {
        try {
            const res = await fetch('/api/links/short')
            const data = await res.json()
            if (data.success) {
                setLinks(data.links || [])
            }
        } catch (err) {
            console.error('Failed to fetch links:', err)
        }
        setLoading(false)
    }



    async function deleteLink(id: string) {
        if (!confirm(t('deleteConfirm'))) return
        try {
            await fetch(`/api/links/short?id=${id}`, { method: 'DELETE' })
            setLinks(links.filter(l => l.id !== id))
        } catch (err) {
            console.error('Failed to delete link:', err)
        }
    }

    function copyLink(slug: string, id: string) {
        navigator.clipboard.writeText(`${baseUrl}/s/${slug}`)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const filteredLinks = links.filter(link =>
        link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="w-full max-w-6xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
                    <p className="text-gray-500 mt-1">{t('manage')}</p>
                </div>
                <Link
                    href="/dashboard/missions"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-all shadow-sm text-sm"
                >
                    <Rocket className="w-4 h-4" />
                    {t('launchMission')}
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black/10 focus:border-gray-300 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Links List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mb-2"></div>
                    <p className="text-sm">{t('loading')}</p>
                </div>
            ) : filteredLinks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Link2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noCreated')}</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        {t('launchToGenerate')}
                    </p>
                    <Link
                        href="/dashboard/missions"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm shadow-sm transition-all"
                    >
                        <Rocket className="w-4 h-4" />
                        {t('launchMission')}
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {filteredLinks.map((link) => (
                            <div key={link.id} className="p-4 hover:bg-gray-50/50 transition-colors group">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center gap-3">
                                            {/* Icon Placeholder */}
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                                                <Link2 className="w-5 h-5 text-gray-500" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900 truncate">
                                                        /{link.slug}
                                                    </span>
                                                    <button
                                                        onClick={() => copyLink(link.slug, link.id)}
                                                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                                        title={t('copyLink')}
                                                    >
                                                        {copiedId === link.id ? (
                                                            <Check className="w-3.5 h-3.5 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <a
                                                        href={link.destination}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 hover:text-gray-700 transition-colors truncate max-w-[300px]"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        {link.destination}
                                                    </a>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(link.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        {/* Clicks */}
                                        <Link href={`/dashboard/links/${link.id}`} className="group/stats block">
                                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 group-hover/stats:border-gray-200 transition-all">
                                                <MousePointer2 className="w-4 h-4 text-gray-500" />
                                                <span className="font-semibold text-gray-900">{link.clicks.toLocaleString()}</span>
                                                <span className="text-xs text-gray-400">{t('clicks')}</span>
                                            </div>
                                        </Link>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`${baseUrl}/s/${link.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                                                title={t('openPublicLink')}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => deleteLink(link.id)}
                                                className="p-2 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                                title={t('delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Modal Removed */}
        </div>
    )
}
