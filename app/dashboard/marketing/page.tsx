'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Plus, Search, Copy, QrCode, Trash2,
    ExternalLink, Link2, Check, MousePointerClick,
    Download, ChevronDown, Tag, X, Pencil, Folder, Menu
} from 'lucide-react'
import { getMarketingLinks, getMarketingOverview, deleteMarketingLink, getMarketingTags, createMarketingTag, updateMarketingTag, deleteMarketingTag, setLinkTags } from '@/app/actions/marketing-links'
import { getMarketingCampaignList } from '@/app/actions/marketing-campaigns'
import { getMarketingFolderTree, createMarketingFolder, updateMarketingFolder, deleteMarketingFolder } from '@/app/actions/marketing-folders'
import { getStartupProfile } from '@/app/actions/startup-profile'
import { PREDEFINED_CHANNELS, getChannelConfig } from '@/lib/marketing/channels'
import { TAG_COLORS, getTagColor } from '@/lib/marketing/tags'
import { CreateLinkModal } from '@/components/marketing/CreateLinkModal'
import { FolderSidebar } from '@/components/marketing/FolderSidebar'
import { CampaignManager } from '@/components/marketing/CampaignManager'
import { BulkActionBar } from '@/components/marketing/BulkActionBar'
import QRCodeWithLogo from '@/components/QRCodeWithLogo'

interface MarketingTagData {
    id: string
    name: string
    color: string
    linkCount: number
}

interface MarketingLink {
    id: string
    slug: string
    original_url: string
    short_url: string
    clicks: number
    channel: string | null
    campaign: string | null
    campaign_id: string | null
    folder_id: string | null
    created_at: Date
    tags: { id: string; name: string; color: string }[]
    Campaign: { id: string; name: string; color: string | null; status: string } | null
    Folder: { id: string; name: string; color: string | null } | null
}

interface CampaignData {
    id: string
    name: string
    color: string | null
    status: string
    linkCount: number
    totalClicks: number
}

interface FolderNode {
    id: string
    name: string
    color: string | null
    parent_id: string | null
    linkCount: number
    children: FolderNode[]
}

export default function MarketingLinksPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const searchParams = useSearchParams()
    const [links, setLinks] = useState<MarketingLink[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeChannel, setActiveChannel] = useState<string | null>(null)
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(searchParams.get('campaign_id'))
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [activeTagIds, setActiveTagIds] = useState<string[]>([])
    const [campaigns, setCampaigns] = useState<CampaignData[]>([])
    const [folders, setFolders] = useState<FolderNode[]>([])
    const [tags, setTags] = useState<MarketingTagData[]>([])
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [totalClicks, setTotalClicks] = useState(0)
    const [totalLinks, setTotalLinks] = useState(0)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // QR popover state
    const [qrOpenId, setQrOpenId] = useState<string | null>(null)
    const [startupLogo, setStartupLogo] = useState<string | null>(null)
    const qrRef = useRef<HTMLDivElement>(null)

    // Tag manager popover state
    const [tagManagerOpen, setTagManagerOpen] = useState(false)
    const tagManagerRef = useRef<HTMLDivElement>(null)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0].hex)
    const [editingTagId, setEditingTagId] = useState<string | null>(null)
    const [editingTagName, setEditingTagName] = useState('')
    const [editingTagColor, setEditingTagColor] = useState('')

    // Tag assignment popover state
    const [tagAssignOpenId, setTagAssignOpenId] = useState<string | null>(null)
    const tagAssignRef = useRef<HTMLDivElement>(null)

    // Load startup logo once
    useEffect(() => {
        getStartupProfile().then(res => {
            if (res.success && res.profile?.logoUrl) {
                setStartupLogo(res.profile.logoUrl)
            }
        })
    }, [])

    // Load overview stats
    useEffect(() => {
        getMarketingOverview().then(res => {
            if (res.success && res.data) {
                const d = res.data as { totalClicks: number; totalLinks: number }
                setTotalClicks(d.totalClicks)
                setTotalLinks(d.totalLinks)
            }
        })
    }, [])

    // Load campaigns
    const loadCampaigns = useCallback(async () => {
        const res = await getMarketingCampaignList()
        if (res.success && res.data) {
            setCampaigns(res.data as unknown as CampaignData[])
        }
    }, [])
    useEffect(() => { loadCampaigns() }, [loadCampaigns])

    // Load folders
    const loadFolders = useCallback(async () => {
        const res = await getMarketingFolderTree()
        if (res.success && res.data) {
            setFolders(res.data as unknown as FolderNode[])
        }
    }, [])
    useEffect(() => { loadFolders() }, [loadFolders])

    // Load tags
    const loadTags = useCallback(async () => {
        const res = await getMarketingTags()
        if (res.success && res.data) {
            setTags(res.data as MarketingTagData[])
        }
    }, [])
    useEffect(() => { loadTags() }, [loadTags])

    const loadLinks = useCallback(async () => {
        const res = await getMarketingLinks({
            search: search || undefined,
            channel: activeChannel || undefined,
            campaign_id: activeCampaignId || undefined,
            folder_id: activeFolderId !== null ? activeFolderId : undefined,
            tagIds: activeTagIds.length ? activeTagIds : undefined,
        })
        if (res.success) {
            setLinks(res.data as unknown as MarketingLink[])
        }
        setLoading(false)
    }, [search, activeChannel, activeCampaignId, activeFolderId, activeTagIds])

    useEffect(() => {
        setLoading(true)
        const timeout = setTimeout(loadLinks, 300)
        return () => clearTimeout(timeout)
    }, [loadLinks])

    // Close QR popover on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (qrRef.current && !qrRef.current.contains(e.target as Node)) setQrOpenId(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close tag manager on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (tagManagerRef.current && !tagManagerRef.current.contains(e.target as Node)) {
                setTagManagerOpen(false)
                setEditingTagId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close tag assignment popover on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (tagAssignRef.current && !tagAssignRef.current.contains(e.target as Node)) setTagAssignOpenId(null)
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
            setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
        }
        setDeletingId(null)
    }

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return
        const res = await createMarketingTag(newTagName, newTagColor)
        if (res.success) {
            setNewTagName('')
            setNewTagColor(TAG_COLORS[0].hex)
            loadTags()
        }
    }

    const handleUpdateTag = async (id: string) => {
        if (!editingTagName.trim()) return
        await updateMarketingTag(id, { name: editingTagName, color: editingTagColor })
        setEditingTagId(null)
        loadTags()
        loadLinks()
    }

    const handleDeleteTag = async (id: string) => {
        await deleteMarketingTag(id)
        setActiveTagIds(prev => prev.filter(t => t !== id))
        loadTags()
        loadLinks()
    }

    const handleToggleTagFilter = (tagId: string) => {
        setActiveTagIds(prev =>
            prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
        )
    }

    const handleToggleLinkTag = async (linkId: string, tagId: string) => {
        const link = links.find(l => l.id === linkId)
        if (!link) return
        const currentTagIds = link.tags.map(t => t.id)
        const newTagIds = currentTagIds.includes(tagId)
            ? currentTagIds.filter(id => id !== tagId)
            : [...currentTagIds, tagId]
        await setLinkTags(linkId, newTagIds)
        setLinks(prev => prev.map(l => {
            if (l.id !== linkId) return l
            const newTags = newTagIds.map(id => {
                const existing = l.tags.find(t => t.id === id)
                if (existing) return existing
                const fromAll = tags.find(t => t.id === id)
                return fromAll ? { id: fromAll.id, name: fromAll.name, color: fromAll.color } : { id, name: '', color: '' }
            })
            return { ...l, tags: newTags }
        }))
    }

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleSelectAll = () => {
        if (selectedIds.size === links.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(links.map(l => l.id)))
        }
    }

    const downloadQR = useCallback(async (linkSlug: string, linkId: string, format: 'png' | 'svg') => {
        const svgEl = document.getElementById(`qr-popover-${linkId}`)
        if (!svgEl) return
        const svg = svgEl.querySelector('svg')
        if (!svg) return

        const svgData = new XMLSerializer().serializeToString(svg)

        if (format === 'svg') {
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `qr-${linkSlug}.svg`
            a.click()
            URL.revokeObjectURL(url)
        } else {
            const canvasSize = 400
            const canvas = document.createElement('canvas')
            canvas.width = canvasSize
            canvas.height = canvasSize
            const ctx = canvas.getContext('2d')!
            const img = new Image()
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvasSize, canvasSize)
                const pngUrl = canvas.toDataURL('image/png')
                const a = document.createElement('a')
                a.href = pngUrl
                a.download = `qr-${linkSlug}.png`
                a.click()
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
        }
    }, [])

    const refreshData = () => {
        setIsCreateModalOpen(false)
        loadLinks()
        loadTags()
        loadCampaigns()
        loadFolders()
        getMarketingOverview().then(res => {
            if (res.success && res.data) {
                const d = res.data as { totalClicks: number; totalLinks: number }
                setTotalClicks(d.totalClicks)
                setTotalLinks(d.totalLinks)
            }
        })
    }

    const handleCreateFolder = async (name: string, parentId?: string) => {
        await createMarketingFolder({ name, parent_id: parentId })
        loadFolders()
    }

    const handleRenameFolder = async (id: string, name: string) => {
        await updateMarketingFolder(id, { name })
        loadFolders()
    }

    const handleDeleteFolder = async (id: string) => {
        await deleteMarketingFolder(id)
        if (activeFolderId === id) setActiveFolderId(null)
        loadFolders()
        loadLinks()
    }

    const allSelected = links.length > 0 && selectedIds.size === links.length
    const hasSelection = selectedIds.size > 0

    return (
        <div className="flex h-full">
            {/* Mobile sidebar toggle */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden fixed top-20 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
                <Menu className="w-4 h-4 text-gray-600" />
            </button>

            {/* Folder Sidebar */}
            <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative z-30 md:z-0 h-full bg-white`}>
                <FolderSidebar
                    folders={folders}
                    activeFolderId={activeFolderId}
                    onSelectFolder={(id) => { setActiveFolderId(id); setSidebarOpen(false); setSelectedIds(new Set()) }}
                    onCreateFolder={handleCreateFolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    totalLinkCount={totalLinks}
                />
            </div>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 bg-black/30 z-20" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0 space-y-6 p-0 md:pl-6">
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

                {/* Search + Filters */}
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
                    </div>

                    {/* Campaign pills */}
                    {campaigns.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setActiveCampaignId(null)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    !activeCampaignId
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {t('campaigns.allCampaigns')}
                            </button>
                            {campaigns.filter(c => c.status === 'ACTIVE').map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCampaignId(activeCampaignId === c.id ? null : c.id)}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        activeCampaignId === c.id
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: c.color || '#6B7280' }}
                                    />
                                    {c.name}
                                </button>
                            ))}

                            <CampaignManager
                                campaigns={campaigns as unknown as { id: string; name: string; color: string | null; status: string; linkCount: number }[]}
                                onRefresh={() => { loadCampaigns(); loadLinks() }}
                                activeCampaignId={activeCampaignId}
                                onSelectCampaign={setActiveCampaignId}
                            />
                        </div>
                    )}

                    {/* Tag filter pills */}
                    {tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setActiveTagIds([])}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    activeTagIds.length === 0
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {t('tags.allTags')}
                            </button>
                            {tags.map(tag => {
                                const tc = getTagColor(tag.color)
                                const isActive = activeTagIds.includes(tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleToggleTagFilter(tag.id)}
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                            isActive
                                                ? `${tc.bg} ${tc.text}`
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${tc.dot}`} />
                                        {tag.name}
                                    </button>
                                )
                            })}

                            {/* Manage tags button + popover */}
                            <div className="relative" ref={tagManagerRef}>
                                <button
                                    onClick={() => setTagManagerOpen(!tagManagerOpen)}
                                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                                >
                                    <Plus className="w-3 h-3" />
                                    {t('tags.manage')}
                                </button>

                                {tagManagerOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-3">
                                        <h4 className="text-xs font-semibold text-gray-900 mb-2">{t('tags.title')}</h4>

                                        {tags.length === 0 ? (
                                            <p className="text-xs text-gray-400 py-2">{t('tags.noTags')}</p>
                                        ) : (
                                            <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                                                {tags.map(tag => {
                                                    const tc = getTagColor(tag.color)
                                                    const isEditing = editingTagId === tag.id

                                                    if (isEditing) {
                                                        return (
                                                            <div key={tag.id} className="flex items-center gap-2 py-1">
                                                                <input
                                                                    type="text"
                                                                    value={editingTagName}
                                                                    onChange={(e) => setEditingTagName(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTag(tag.id) }}
                                                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                                                    autoFocus
                                                                />
                                                                <div className="flex items-center gap-0.5">
                                                                    {TAG_COLORS.map(c => (
                                                                        <button
                                                                            key={c.id}
                                                                            onClick={() => setEditingTagColor(c.hex)}
                                                                            className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                                                                                editingTagColor === c.hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                                                                            }`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <button onClick={() => handleUpdateTag(tag.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                                <button onClick={() => setEditingTagId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )
                                                    }

                                                    return (
                                                        <div key={tag.id} className="flex items-center justify-between py-1 group/tag">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${tc.dot}`} />
                                                                <span className="text-xs text-gray-700 font-medium">{tag.name}</span>
                                                                <span className="text-[10px] text-gray-400">{tag.linkCount}</span>
                                                            </div>
                                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); setEditingTagColor(tag.color) }}
                                                                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTag(tag.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Create new tag */}
                                        <div className="border-t border-gray-100 pt-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newTagName}
                                                    onChange={(e) => setNewTagName(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag() }}
                                                    placeholder={t('tags.namePlaceholder')}
                                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                                />
                                                <div className="flex items-center gap-0.5">
                                                    {TAG_COLORS.map(c => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => setNewTagColor(c.hex)}
                                                            className={`w-4 h-4 rounded-full ${c.dot} transition-all ${
                                                                newTagColor === c.hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={handleCreateTag}
                                                    disabled={!newTagName.trim()}
                                                    className="px-2 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 transition-all"
                                                >
                                                    {t('tags.create')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
                        {/* Select all header */}
                        <div className="flex items-center gap-3 px-5 py-2 bg-gray-50/50 border-b border-gray-100">
                            <button
                                onClick={handleSelectAll}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    allSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-400'
                                }`}
                            >
                                {allSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                                {hasSelection ? `${selectedIds.size} ${t('bulk.selected')}` : t('bulk.selectAll')}
                            </span>
                        </div>

                        {links.map((link) => {
                            const channelCfg = getChannelConfig(link.channel)
                            const isCopied = copiedId === link.id
                            const isDeleting = deletingId === link.id
                            const isQrOpen = qrOpenId === link.id
                            const isTagAssignOpen = tagAssignOpenId === link.id
                            const isSelected = selectedIds.has(link.id)

                            return (
                                <div
                                    key={link.id}
                                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group ${
                                        isSelected ? 'bg-purple-50/40' : ''
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleToggleSelect(link.id)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                            isSelected
                                                ? 'bg-gray-900 border-gray-900'
                                                : 'border-gray-300 opacity-0 group-hover:opacity-100'
                                        } ${hasSelection ? '!opacity-100' : ''}`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </button>

                                    {/* Channel icon */}
                                    <div className={`w-10 h-10 rounded-xl ${channelCfg.color} flex items-center justify-center flex-shrink-0`}>
                                        <ExternalLink className={`w-4.5 h-4.5 ${channelCfg.textColor}`} />
                                    </div>

                                    {/* Link info */}
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => router.push(`/dashboard/marketing/links/${link.id}`)}
                                    >
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                /{link.slug}
                                            </p>
                                            {link.Campaign && (
                                                <span
                                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-flex items-center gap-1"
                                                    style={{
                                                        backgroundColor: link.Campaign.color ? `${link.Campaign.color}20` : '#f3f4f6',
                                                        color: link.Campaign.color || '#6B7280',
                                                    }}
                                                >
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: link.Campaign.color || '#6B7280' }}
                                                    />
                                                    {link.Campaign.name}
                                                </span>
                                            )}
                                            {link.Folder && (
                                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium hidden sm:inline-flex items-center gap-1">
                                                    <Folder className="w-2.5 h-2.5" />
                                                    {link.Folder.name}
                                                </span>
                                            )}
                                            {link.tags?.map(tag => {
                                                const tc = getTagColor(tag.color)
                                                return (
                                                    <span
                                                        key={tag.id}
                                                        className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${tc.bg} ${tc.text}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                                                        {tag.name}
                                                    </span>
                                                )
                                            })}
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
                                                    <div id={`qr-popover-${link.id}`} className="flex justify-center mb-3">
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
                                                            <Download className="w-3 h-3" /> PNG
                                                        </button>
                                                        <button
                                                            onClick={() => downloadQR(link.slug, link.id, 'svg')}
                                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                        >
                                                            <Download className="w-3 h-3" /> SVG
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tag assignment */}
                                        {tags.length > 0 && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setTagAssignOpenId(isTagAssignOpen ? null : link.id)}
                                                    className={`p-1.5 rounded-lg transition-colors ${
                                                        isTagAssignOpen
                                                            ? 'text-purple-600 bg-purple-50'
                                                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                    title={t('tags.addToLink')}
                                                >
                                                    <Tag className="w-3.5 h-3.5" />
                                                </button>

                                                {isTagAssignOpen && (
                                                    <div
                                                        ref={tagAssignRef}
                                                        className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 w-48 py-1"
                                                    >
                                                        <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{t('tags.addToLink')}</p>
                                                        {tags.map(tag => {
                                                            const tc = getTagColor(tag.color)
                                                            const isAssigned = link.tags?.some(lt => lt.id === tag.id) ?? false
                                                            return (
                                                                <button
                                                                    key={tag.id}
                                                                    onClick={() => handleToggleLinkTag(link.id, tag.id)}
                                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                                        isAssigned ? `${tc.bg} border-transparent` : 'border-gray-300'
                                                                    }`}>
                                                                        {isAssigned && <Check className={`w-3 h-3 ${tc.text}`} />}
                                                                    </div>
                                                                    <span className={`w-2 h-2 rounded-full ${tc.dot}`} />
                                                                    <span className="text-xs text-gray-700">{tag.name}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds(new Set())}
                onRefresh={refreshData}
                folders={folders}
                campaigns={campaigns as unknown as { id: string; name: string; color: string | null; children: FolderNode[] }[]}
                tags={tags}
            />

            <CreateLinkModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={refreshData}
            />
        </div>
    )
}
