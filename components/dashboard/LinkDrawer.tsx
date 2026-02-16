'use client'

import { useEffect, useState } from 'react'
import {
    X,
    Copy,
    Check,
    ExternalLink,
    Edit2,
    Trash2,
    Share2,
    Globe,
    Save,
    BarChart3,
    Calendar,
    Loader2,
    Image as ImageIcon,
    Settings,
    TrendingUp,
    DollarSign,
    MousePointer2
} from 'lucide-react'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'
import { deleteShortLink } from '@/app/actions/links'
import { getStartupProfile } from '@/app/actions/startup-profile'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LinkDrawerProps {
    isOpen: boolean
    onClose: () => void
    link: {
        id: string
        slug: string
        original_url: string
        clicks: number
        created_at: string
    }
    onDelete?: () => void
}

export function LinkDrawer({ isOpen, onClose, link, onDelete }: LinkDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
    const [copied, setCopied] = useState(false)

    // Edit Form State
    const [url, setUrl] = useState(link.original_url)
    const [slug, setSlug] = useState(link.slug)
    const [tags, setTags] = useState('')
    const [comments, setComments] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [startupLogo, setStartupLogo] = useState<string | null>(null)

    const shortUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${link.slug}`

    // Reset state when link changes
    useEffect(() => {
        if (isOpen) {
            setActiveTab('overview') // Default to 'overview' (Stats) as requested
            setUrl(link.original_url)
            setSlug(link.slug)
            setTags('')
            setComments('')
            getStartupProfile().then(res => {
                if (res.success && res.profile?.logoUrl) {
                    setStartupLogo(res.profile.logoUrl)
                }
            })
        }
    }, [isOpen, link])

    // Lock body scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shortUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this link?')) return
        setIsDeleting(true)
        if (onDelete) await onDelete()
        setIsDeleting(false)
        onClose()
    }

    const handleSave = async () => {
        setIsSaving(true)
        await new Promise(r => setTimeout(r, 800))
        setIsSaving(false)
        setActiveTab('overview') // Switch back to stats after save
    }

    if (!isOpen) return null

    // Mock Data for Charts (Last 30 days)
    const mockData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - i))
        return {
            date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            clicks: Math.floor(((i * 1337 + link.clicks) % 100) / 5) + (link.clicks > 100 ? 5 : 0)
        }
    })

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header with Tabs */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 group flex items-center gap-2">
                                /{link.slug}
                                <a href={shortUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </h2>
                            <p className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-md">{link.original_url}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'overview'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'settings'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Settings
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50/50">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="p-6 max-w-5xl mx-auto space-y-6">
                            {/* KPI Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <MousePointer2 className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Total Clicks</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{link.clicks.toLocaleString()}</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <div className="w-4 h-4 flex items-center justify-center font-bold font-serif italic">L</div>
                                        <span className="text-xs font-semibold uppercase tracking-wider">Leads</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">0</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <DollarSign className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Sales</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">0</p>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Revenue</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">$0.00</p>
                                </div>
                            </div>

                            {/* Chart Section */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                                <h3 className="text-base font-semibold text-gray-900 mb-6">Click Performance (Last 30 Days)</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={mockData}>
                                            <defs>
                                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="clicks"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorClicks)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Footer for Overview */}
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Link Configuration
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB (The Edit Form) */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[500px] bg-white">
                            {/* LEFT COLUMN: Inputs (Editable) */}
                            <div className="md:col-span-2 p-8 space-y-8">
                                {/* URL Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        Destination URL
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Short Link Input */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700">Short Link</label>
                                    <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-r border-gray-200 text-gray-500 font-medium select-none flex items-center gap-2">
                                            <Globe className="w-4 h-4" />
                                            trac.to
                                            <span className="text-gray-300">/</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-white text-gray-900 focus:outline-none"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="px-4 border-l border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                                            title="Copy Short Link"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Tags & Comments */}
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-gray-700">Tags</label>
                                        <input
                                            type="text"
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            placeholder="Add tags..."
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-gray-700">Comments</label>
                                        <textarea
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Add comments..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="text-red-500 hover:text-red-600 font-medium text-sm flex items-center gap-2 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Delete Link
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="py-2.5 px-6 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors shadow-lg shadow-gray-900/10 flex items-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Previews */}
                            <div className="md:border-l border-gray-100 bg-gray-50/50 p-8 space-y-8 h-full">
                                {/* QR Code */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-gray-700">QR Code</h3>
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
                                        <div className="bg-white p-2">
                                            <QRCodeWithLogo
                                                value={shortUrl}
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
                                    <h3 className="text-sm font-semibold text-gray-700">Social Preview</h3>
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100 relative overflow-hidden">
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                            {url && tryParseUrl(url) && (
                                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-[10px] text-white backdrop-blur-sm">
                                                    {tryParseUrl(url)?.hostname}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <div className="font-semibold text-gray-900 truncate">
                                                {url && tryParseUrl(url) ? (
                                                    tryParseUrl(url)?.pathname.split('/').filter(p => p).pop()?.replace(/-/g, ' ') || 'Home'
                                                ) : 'Page Title'}
                                            </div>
                                            <div className="text-sm text-gray-500 line-clamp-2">
                                                Link to {url}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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
