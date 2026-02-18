'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    X,
    Link2,
    Loader2,
    Check,
    Copy,
    Globe,
    Shuffle,
    ChevronDown,
    QrCode,
    Image as ImageIcon,
    Twitter
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createShortLink } from '@/app/actions/links'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { getStartupProfile } from '@/app/actions/startup-profile'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'
import { nanoid } from 'nanoid'

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

    // Form States
    const [url, setUrl] = useState('')
    const [slug, setSlug] = useState('')
    const [tags, setTags] = useState('') // UI only for now
    const [comments, setComments] = useState('') // UI only for now
    const [startupLogo, setStartupLogo] = useState<string | null>(null)

    // Domain
    const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null)
    const [selectedDomain, setSelectedDomain] = useState<string>('')
    const [showDomainDropdown, setShowDomainDropdown] = useState(false)

    const defaultDomain = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/^https?:\/\//, '')
        : ''

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setResult(null)
            setUrl('')
            setSlug('')
            setTags('')
            setComments('')
            setError('')
            setShowDomainDropdown(false)

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

    const domainOptions = useMemo(() => {
        const opts = [{ label: defaultDomain, value: defaultDomain }]
        if (verifiedDomain && verifiedDomain !== defaultDomain) {
            opts.unshift({ label: verifiedDomain, value: verifiedDomain })
        }
        return opts
    }, [verifiedDomain, defaultDomain])

    // Auto-generate slug from URL
    useEffect(() => {
        if (!url || slug) return

        try {
            const urlObj = new URL(url)
            // Extract domain/brand
            const domain = urlObj.hostname.replace('www.', '').split('.')[0]
            // Extract last path segment if clean
            const path = urlObj.pathname.split('/').filter(p => p).pop()

            const candidate = path && path.length < 20 ? path : domain
            // Simple clean: alphanumeric + hyphen
            const cleanSlug = candidate.toLowerCase().replace(/[^a-z0-9-]/g, '')

            if (cleanSlug) {
                // Don't auto-set immediately, let user type?
                // Actually Dub sets it. Let's suggest it.
            }
        } catch {
            // Invalid URL, ignore
        }
    }, [url, slug])

    if (!isOpen) return null

    const handleRandomizeSlug = () => {
        setSlug(nanoid(7)) // 7 chars like Traaaction/Bitly
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)

        const formData = new FormData()
        formData.append('url', url)
        if (slug) formData.append('slug', slug)
        if (verifiedDomain && selectedDomain === verifiedDomain) {
            formData.append('domain', verifiedDomain)
        }

        // Tags and Comments are ignored for now as agreed

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
        if (!loading) onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${result ? 'max-w-md' : 'max-w-5xl'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                            <Globe className="w-5 h-5 text-gray-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {result ? 'Link Created' : 'New Link'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {result ? (
                    // Success View (Centered, smaller)
                    <div className="p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h3>
                        <p className="text-gray-500 mb-8">Your short link has been created and is ready to use.</p>

                        <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                </div>
                                <code className="text-gray-900 font-medium truncate">
                                    {result.short_url.replace(/^https?:\/\//, '')}
                                </code>
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="ml-4 p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-500 hover:text-blue-500"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setResult(null)
                                    setUrl('')
                                    setSlug('')
                                }}
                                className="flex-1 py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-lg shadow-gray-900/10"
                            >
                                Create Another
                            </button>
                        </div>
                    </div>
                ) : (
                    // Creation Form (Split View)
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[500px]">

                            {/* LEFT COLUMN: Inputs */}
                            <div className="md:col-span-2 p-8 space-y-8">
                                {/* URL Input */}
                                <div className="space-y-3">
                                    <label htmlFor="url" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        Destination URL
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <Link2 className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="url"
                                            id="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://traaaction.com/help/article/what-is-dub"
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm text-base"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Short Link Input */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="slug" className="text-sm font-semibold text-gray-700">Short Link</label>
                                        <button onClick={handleRandomizeSlug} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
                                            <Shuffle className="w-3 h-3" /> Randomize
                                        </button>
                                    </div>
                                    <div className="flex rounded-xl shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                                                className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-r border-gray-200 text-gray-500 font-medium hover:bg-gray-100 transition-colors select-none whitespace-nowrap"
                                            >
                                                <Globe className="w-4 h-4" />
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
                                                            <Globe className="w-4 h-4" />
                                                            {opt.label}
                                                            {selectedDomain === opt.value && <Check className="w-3 h-3 ml-auto" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            id="slug"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder="custom-slug"
                                            className="flex-1 px-4 py-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Tags (UI only) */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700">Tags</label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="Select tags..."
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Comments (UI only) */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700">Comments (Optional)</label>
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Add comments for your team..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                    />
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Previews */}
                            <div className="md:border-l border-gray-100 bg-gray-50/50 p-8 space-y-8 h-full">

                                {/* QR Code Preview */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-700">QR Code</h3>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center aspect-ratio-1">
                                        <div className="bg-white p-2 rounded-lg">
                                            <QRCodeWithLogo
                                                value={url || 'https://trac.to'}
                                                size={120}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                viewBox="0 0 256 256"
                                                logoUrl={startupLogo || undefined}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Social Preview */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-gray-700">Social Preview</h3>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                        <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100 relative overflow-hidden">
                                            {/* Placeholder for OG Image */}
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                            {/* Mock image text if url exists */}
                                            {url && tryParseUrl(url) && (
                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white backdrop-blur-sm">
                                                    {tryParseUrl(url)?.hostname}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <div className="font-semibold text-gray-900 truncate">
                                                {url && tryParseUrl(url) ? (
                                                    // Mock title from URL
                                                    tryParseUrl(url)?.pathname.split('/').filter(p => p).pop()?.replace(/-/g, ' ') || 'Home'
                                                ) : (
                                                    <div className="h-4 w-3/4 rounded skeleton-shimmer"></div>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 line-clamp-2">
                                                {url && tryParseUrl(url) ? (
                                                    `Link to ${url}`
                                                ) : (
                                                    <div className="h-3 w-1/2 rounded skeleton-shimmer"></div>
                                                )}
                                            </div>
                                            <div className="pt-2 flex items-center gap-2">
                                                {url && tryParseUrl(url) ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                                            {tryParseUrl(url)?.hostname[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{tryParseUrl(url)?.hostname}</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                                        <div className="h-3 w-20 bg-gray-100 rounded"></div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer (Sticky) */}
                        <div className="border-t border-gray-100 p-6 bg-white sticky bottom-0 z-10 flex items-center justify-between">
                            <div className="text-xs text-gray-400 hidden sm:block">
                                Pro Tip: Press ⌘+K to open this modal anytime
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 sm:flex-none py-2.5 px-6 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || !url}
                                    className="flex-1 sm:flex-none py-2.5 px-6 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 text-white font-medium rounded-lg transition-all shadow-lg shadow-gray-900/10 flex items-center justify-center gap-2 min-w-[120px] btn-press"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

function tryParseUrl(url: string): URL | null {
    try {
        return new URL(url)
    } catch {
        return null
    }
}
