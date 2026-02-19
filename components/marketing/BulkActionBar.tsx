'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Folder, Target, Tag, Trash2, X, Check, Loader2 } from 'lucide-react'
import { bulkDeleteLinks, bulkMoveToFolder, bulkSetCampaign, bulkAddTags } from '@/app/actions/marketing-links'

interface FolderNode {
    id: string
    name: string
    color: string | null
    children: FolderNode[]
}

interface CampaignOption {
    id: string
    name: string
    color: string | null
}

interface TagOption {
    id: string
    name: string
    color: string
}

interface BulkActionBarProps {
    selectedIds: Set<string>
    onClearSelection: () => void
    onRefresh: () => void
    folders: FolderNode[]
    campaigns: CampaignOption[]
    tags: TagOption[]
}

export function BulkActionBar({
    selectedIds, onClearSelection, onRefresh,
    folders, campaigns, tags,
}: BulkActionBarProps) {
    const t = useTranslations('dashboard.marketing')
    const [loading, setLoading] = useState(false)
    const [activeDropdown, setActiveDropdown] = useState<'folder' | 'campaign' | 'tags' | 'delete' | null>(null)
    const barRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (selectedIds.size === 0) return null

    const linkIds = Array.from(selectedIds)

    const handleMoveToFolder = async (folderId: string | null) => {
        setLoading(true)
        await bulkMoveToFolder(linkIds, folderId)
        setActiveDropdown(null)
        setLoading(false)
        onRefresh()
    }

    const handleSetCampaign = async (campaignId: string | null) => {
        setLoading(true)
        await bulkSetCampaign(linkIds, campaignId)
        setActiveDropdown(null)
        setLoading(false)
        onRefresh()
    }

    const handleAddTags = async (tagId: string) => {
        setLoading(true)
        await bulkAddTags(linkIds, [tagId])
        setLoading(false)
        onRefresh()
    }

    const handleDelete = async () => {
        setLoading(true)
        await bulkDeleteLinks(linkIds)
        setActiveDropdown(null)
        setLoading(false)
        onClearSelection()
        onRefresh()
    }

    return (
        <div
            ref={barRef}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4"
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

            <span className="text-sm font-medium whitespace-nowrap">
                {selectedIds.size} {t('bulk.selected')}
            </span>

            <div className="w-px h-5 bg-gray-700" />

            {/* Move to folder */}
            <div className="relative">
                <button
                    onClick={() => setActiveDropdown(activeDropdown === 'folder' ? null : 'folder')}
                    className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <Folder className="w-3.5 h-3.5" /> {t('bulk.moveToFolder')}
                </button>
                {activeDropdown === 'folder' && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                        <button
                            onClick={() => handleMoveToFolder(null)}
                            className="w-full px-3 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                        >
                            {t('folders.none')}
                        </button>
                        {folders.map(f => (
                            <div key={f.id}>
                                <button
                                    onClick={() => handleMoveToFolder(f.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                                >
                                    <Folder className="w-3 h-3 text-gray-400" /> {f.name}
                                </button>
                                {f.children.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleMoveToFolder(c.id)}
                                        className="w-full flex items-center gap-2 pl-7 pr-3 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                                    >
                                        <Folder className="w-3 h-3 text-gray-400" /> {c.name}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Set campaign */}
            <div className="relative">
                <button
                    onClick={() => setActiveDropdown(activeDropdown === 'campaign' ? null : 'campaign')}
                    className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <Target className="w-3.5 h-3.5" /> {t('bulk.setCampaign')}
                </button>
                {activeDropdown === 'campaign' && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                        <button
                            onClick={() => handleSetCampaign(null)}
                            className="w-full px-3 py-2 text-sm text-left text-gray-600 hover:bg-gray-50"
                        >
                            {t('campaigns.none')}
                        </button>
                        {campaigns.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleSetCampaign(c.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: c.color || '#6B7280' }}
                                />
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Add tags */}
            {tags.length > 0 && (
                <div className="relative">
                    <button
                        onClick={() => setActiveDropdown(activeDropdown === 'tags' ? null : 'tags')}
                        className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <Tag className="w-3.5 h-3.5" /> {t('bulk.addTags')}
                    </button>
                    {activeDropdown === 'tags' && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 max-h-48 overflow-y-auto">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => handleAddTags(tag.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50"
                                >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Delete */}
            <div className="relative">
                <button
                    onClick={() => setActiveDropdown(activeDropdown === 'delete' ? null : 'delete')}
                    className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" /> {t('bulk.delete')}
                </button>
                {activeDropdown === 'delete' && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-4">
                        <p className="text-sm text-gray-900 font-medium mb-1">{t('bulk.confirmDelete')}</p>
                        <p className="text-xs text-gray-500 mb-3">{t('bulk.confirmDeleteDesc', { count: selectedIds.size })}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveDropdown(null)}
                                className="btn-press flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                {t('bulk.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn-press flex-1 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-500"
                            >
                                {t('bulk.confirmDeleteBtn')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-gray-700" />

            <button
                onClick={onClearSelection}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
                title={t('bulk.deselectAll')}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
