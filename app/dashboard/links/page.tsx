'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Link2, ExternalLink, Copy, Trash2, Check, MousePointer2, Calendar, Search, Filter } from 'lucide-react'

interface ShortLink {
    id: string
    slug: string
    destination: string
    clicks: number
    created_at: string
}

export default function LinksPage() {
    const [links, setLinks] = useState<ShortLink[]>([])
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newLinkUrl, setNewLinkUrl] = useState('')
    const [newLinkSlug, setNewLinkSlug] = useState('')
    const [creating, setCreating] = useState(false)
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

    async function createLink() {
        if (!newLinkUrl) return
        setCreating(true)
        try {
            const res = await fetch('/api/links/short', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: newLinkUrl,
                    slug: newLinkSlug || undefined
                })
            })
            const data = await res.json()
            if (data.success) {
                setLinks([data.link, ...links])
                setNewLinkUrl('')
                setNewLinkSlug('')
                setShowCreateModal(false)
            }
        } catch (err) {
            console.error('Failed to create link:', err)
        }
        setCreating(false)
    }

    async function deleteLink(id: string) {
        if (!confirm('Are you sure you want to delete this link?')) return
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
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Links</h1>
                    <p className="text-gray-500 mt-1">Manage and track your short links.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-all shadow-sm text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Link
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search links..."
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
                    <p className="text-sm">Loading links...</p>
                </div>
            ) : filteredLinks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Link2 className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No links created</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Create your first tracked short link to start gathering insights.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create Link
                    </button>
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
                                                        title="Copy link"
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
                                                <span className="text-xs text-gray-400">clicks</span>
                                            </div>
                                        </Link>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`${baseUrl}/s/${link.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Open Public Link"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => deleteLink(link.id)}
                                                className="p-2 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
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

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Create New Link</h2>
                            <p className="text-sm text-gray-500 mt-1">Shorten a new URL to track clicks.</p>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Destination URL
                                </label>
                                <input
                                    type="url"
                                    value={newLinkUrl}
                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                    placeholder="https://example.com/page"
                                    autoFocus
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm placeholder:text-gray-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Short Link
                                </label>
                                <div className="flex items-center">
                                    <div className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg px-3 py-2 text-gray-500 text-sm">
                                        /s/
                                    </div>
                                    <input
                                        type="text"
                                        value={newLinkSlug}
                                        onChange={(e) => setNewLinkSlug(e.target.value)}
                                        placeholder="(optional) custom-slug"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm placeholder:text-gray-400 z-10"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5">
                                    Leave blank to generate a random slug.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 rounded-md text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createLink}
                                disabled={!newLinkUrl || creating}
                                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {creating ? 'Creating...' : 'Create Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
