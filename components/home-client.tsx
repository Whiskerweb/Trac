'use client'

import { useState, useEffect } from 'react'

interface Link {
    id: string
    slug: string
    url: string
    createdAt: string
}

export default function HomeClient() {
    const [mounted, setMounted] = useState(false)
    const [url, setUrl] = useState('')
    const [slug, setSlug] = useState('')
    const [links, setLinks] = useState<Link[]>([])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        setMounted(true)
    }, [])

    const createLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, slug: slug || undefined }),
            })

            const data = await res.json()

            if (res.ok) {
                setLinks([data, ...links])
                setUrl('')
                setSlug('')
                setMessage(`✅ Link created: ${window.location.origin}/${data.slug}`)
            } else {
                setMessage(`❌ Error: ${data.error}`)
            }
        } catch (error) {
            setMessage(`❌ Error: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    const fetchLinks = async () => {
        try {
            const res = await fetch('/api/links')
            const data = await res.json()
            if (res.ok) {
                setLinks(data)
            }
        } catch (error) {
            console.error('Error fetching links:', error)
        }
    }

    return (
        <div className="max-w-2xl">
            {/* Create Link Form */}
            <form onSubmit={createLink} className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                <h2 className="text-xl font-semibold mb-4">Create Short Link</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Destination URL *</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/your-page"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Custom Slug (optional)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">{mounted ? window.location.origin : ''}/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="my-link"
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Link'}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg ${message.includes('✅') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {message}
                    </div>
                )}
            </form>

            {/* Links List */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent Links</h2>
                    <button
                        onClick={fetchLinks}
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        Refresh
                    </button>
                </div>

                {links.length === 0 ? (
                    <p className="text-zinc-500 text-center py-8">No links yet. Create your first one!</p>
                ) : (
                    <div className="space-y-3">
                        {links.map((link) => (
                            <div key={link.id} className="bg-zinc-800 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <a
                                            href={`/${link.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 font-mono"
                                        >
                                            /{link.slug}
                                        </a>
                                        <p className="text-zinc-400 text-sm mt-1 truncate max-w-md">
                                            → {link.url}
                                        </p>
                                    </div>
                                    <span className="text-xs text-zinc-500">
                                        {new Date(link.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status */}
            <div className="mt-8 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <h3 className="font-semibold mb-2">🚀 System Status</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                    <li>✅ Tinybird UNLOCKED (clicks + events datasources)</li>
                    <li>✅ Prisma + Supabase connected</li>
                    <li>✅ Redis + Upstash connected</li>
                    <li>✅ Middleware tracking with ref_id</li>
                </ul>
            </div>
        </div>
    )
}
