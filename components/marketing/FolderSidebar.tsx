'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
    Folder, FolderPlus, ChevronRight, MoreHorizontal,
    Pencil, Trash2, Plus, Check, X, Link2
} from 'lucide-react'

interface FolderNode {
    id: string
    name: string
    color: string | null
    parent_id: string | null
    linkCount: number
    children: FolderNode[]
}

interface FolderSidebarProps {
    folders: FolderNode[]
    activeFolderId: string | null
    onSelectFolder: (folderId: string | null) => void
    onCreateFolder: (name: string, parentId?: string) => Promise<void>
    onRenameFolder: (id: string, name: string) => Promise<void>
    onDeleteFolder: (id: string) => Promise<void>
    totalLinkCount: number
}

export function FolderSidebar({
    folders, activeFolderId, onSelectFolder,
    onCreateFolder, onRenameFolder, onDeleteFolder,
    totalLinkCount,
}: FolderSidebarProps) {
    const t = useTranslations('dashboard.marketing')
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [creatingIn, setCreatingIn] = useState<string | null | false>(false) // null = root, string = parent id
    const [newFolderName, setNewFolderName] = useState('')
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleCreate = async () => {
        if (!newFolderName.trim()) return
        const parentId = creatingIn === null ? undefined : (creatingIn as string)
        await onCreateFolder(newFolderName.trim(), parentId)
        setNewFolderName('')
        setCreatingIn(false)
        if (parentId) setExpandedIds(prev => new Set(prev).add(parentId))
    }

    const handleRename = async (id: string) => {
        if (!renameValue.trim()) return
        await onRenameFolder(id, renameValue.trim())
        setRenamingId(null)
    }

    const renderFolder = (folder: FolderNode, depth: number = 0) => {
        const isActive = activeFolderId === folder.id
        const isExpanded = expandedIds.has(folder.id)
        const hasChildren = folder.children.length > 0
        const isRenaming = renamingId === folder.id
        const isMenuOpen = menuOpenId === folder.id
        const isRoot = depth === 0

        return (
            <div key={folder.id}>
                <div
                    className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all text-sm ${
                        isActive
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                >
                    {/* Expand toggle */}
                    {hasChildren ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id) }}
                            className="p-0.5 -ml-1"
                        >
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}

                    {isRenaming ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(folder.id); if (e.key === 'Escape') setRenamingId(null) }}
                                className="flex-1 px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                                autoFocus
                            />
                            <button onClick={() => handleRename(folder.id)} className="p-0.5 text-green-600">
                                <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setRenamingId(null)} className="p-0.5 text-gray-400">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div
                                className="flex items-center gap-1.5 flex-1 min-w-0"
                                onClick={() => onSelectFolder(folder.id)}
                            >
                                <Folder className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                                <span className="truncate text-xs">{folder.name}</span>
                                <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{folder.linkCount}</span>
                            </div>

                            {/* Context menu */}
                            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity" ref={isMenuOpen ? menuRef : undefined}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : folder.id) }}
                                    className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                                >
                                    <MoreHorizontal className="w-3 h-3" />
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                                        <button
                                            onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); setMenuOpenId(null) }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                        >
                                            <Pencil className="w-3 h-3" /> {t('folders.rename')}
                                        </button>
                                        {isRoot && (
                                            <button
                                                onClick={() => { setCreatingIn(folder.id); setMenuOpenId(null) }}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                            >
                                                <FolderPlus className="w-3 h-3" /> {t('folders.addSubfolder')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { onDeleteFolder(folder.id); setMenuOpenId(null) }}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3 h-3" /> {t('folders.delete')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Children */}
                {isExpanded && folder.children.map(child => renderFolder(child, depth + 1))}

                {/* Inline create for subfolder */}
                {creatingIn === folder.id && (
                    <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${24 + depth * 16}px` }}>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingIn(false) }}
                            placeholder={t('folders.namePlaceholder')}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                            autoFocus
                        />
                        <button onClick={handleCreate} className="p-0.5 text-green-600"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setCreatingIn(false)} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-[220px] flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto">
            <div className="p-3 space-y-1">
                <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('folders.title')}</p>

                {/* All Links */}
                <button
                    onClick={() => onSelectFolder(null)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all ${
                        activeFolderId === null
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                    <Link2 className={`w-3.5 h-3.5 ${activeFolderId === null ? 'text-purple-500' : 'text-gray-400'}`} />
                    <span className="text-xs flex-1 text-left">{t('folders.allLinks')}</span>
                    <span className="text-[10px] text-gray-400">{totalLinkCount}</span>
                </button>

                {/* Folders tree */}
                {folders.map(f => renderFolder(f))}

                {/* Create new root folder */}
                {creatingIn === null ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingIn(false) }}
                            placeholder={t('folders.namePlaceholder')}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                            autoFocus
                        />
                        <button onClick={handleCreate} className="p-0.5 text-green-600"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setCreatingIn(false)} className="p-0.5 text-gray-400"><X className="w-3 h-3" /></button>
                    </div>
                ) : creatingIn === false ? (
                    <button
                        onClick={() => setCreatingIn(null)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
                    >
                        <Plus className="w-3 h-3" />
                        {t('folders.create')}
                    </button>
                ) : null}
            </div>
        </div>
    )
}
