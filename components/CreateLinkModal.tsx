'use client'

import { useState } from 'react'
import { X, Link2, Loader2, Check, Copy } from 'lucide-react'
import { createShortLink } from '@/app/actions/links'

interface CreateLinkModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<{ slug: string; short_url: string } | null>(null)
    const [copied, setCopied] = useState(false)

    if (!isOpen) return null

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError('')
        setResult(null)

        const response = await createShortLink(formData)

        if (response.success && response.link) {
            setResult({
                slug: response.link.slug,
                short_url: response.link.short_url,
            })
            onSuccess?.()
        } else {
            setError(response.error || 'Failed to create link')
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
        setResult(null)
        setError('')
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">Create Short Link</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {result ? (
                        // Success state
                        <div className="space-y-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                <p className="text-green-400 font-medium mb-2">✅ Link created successfully!</p>
                                <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                                    <code className="text-blue-400 text-sm truncate flex-1">
                                        {result.short_url}
                                    </code>
                                    <button
                                        onClick={copyToClipboard}
                                        className="ml-2 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        // Form
                        <form action={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="url" className="block text-sm font-medium text-zinc-300 mb-2">
                                    Destination URL <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="url"
                                    id="url"
                                    name="url"
                                    required
                                    placeholder="https://example.com/very-long-url"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="slug" className="block text-sm font-medium text-zinc-300 mb-2">
                                    Custom Slug <span className="text-zinc-500">(optional)</span>
                                </label>
                                <div className="flex items-center">
                                    <span className="bg-zinc-800 border border-r-0 border-zinc-700 rounded-l-lg px-3 py-2.5 text-zinc-400 text-sm">
                                        /s/
                                    </span>
                                    <input
                                        type="text"
                                        id="slug"
                                        name="slug"
                                        placeholder="my-link"
                                        pattern="[a-zA-Z0-9-]+"
                                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Leave empty to auto-generate. Only letters, numbers, and hyphens allowed.
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Link'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
