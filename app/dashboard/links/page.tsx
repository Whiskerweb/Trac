'use client'

import { useState, useEffect } from 'react'
import { Plus, Link2, ExternalLink, Copy, Trash2, BarChart3, Check, MousePointer2 } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'

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
        if (!confirm('Delete this link?')) return
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

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <main className="flex-1 ml-64">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Links</h1>
                            <p className="text-gray-500 mt-1">Manage your tracked short links</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-4 h-4" />
                            Create Link
                        </button>
                    </div>

                    {/* Links List */}
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading...</div>
                    ) : links.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Link2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No links yet</h3>
                            <p className="text-gray-500 mb-6">Create your first tracked short link to get started</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100"
                            >
                                <Plus className="w-4 h-4" />
                                Create Link
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {links.map((link) => (
                                <div key={link.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-blue-600">
                                                    /s/{link.slug}
                                                </span>
                                                <button
                                                    onClick={() => copyLink(link.slug, link.id)}
                                                    className="p-1 hover:bg-gray-100 rounded"
                                                    title="Copy link"
                                                >
                                                    {copiedId === link.id ? (
                                                        <Check className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="truncate max-w-md">{link.destination}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {/* Clicks */}
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <MousePointer2 className="w-4 h-4" />
                                                <span className="font-medium">{link.clicks || 0}</span>
                                                <span className="text-xs text-gray-400">clicks</span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={`${baseUrl}/s/${link.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                                    title="Open link"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => deleteLink(link.id)}
                                                    className="p-2 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
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
                    )}
                </div>
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Link</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destination URL
                                </label>
                                <input
                                    type="url"
                                    value={newLinkUrl}
                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                    placeholder="https://example.com/page"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Custom Slug (optional)
                                </label>
                                <div className="flex items-center">
                                    <span className="text-gray-500 text-sm mr-2">/s/</span>
                                    <input
                                        type="text"
                                        value={newLinkSlug}
                                        onChange={(e) => setNewLinkSlug(e.target.value)}
                                        placeholder="my-link"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createLink}
                                disabled={!newLinkUrl || creating}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
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
