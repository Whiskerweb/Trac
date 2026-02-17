'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { createMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign } from '@/app/actions/marketing-campaigns'
import { TAG_COLORS } from '@/lib/marketing/tags'

interface CampaignData {
    id: string
    name: string
    color: string | null
    status: string
    linkCount: number
}

interface CampaignManagerProps {
    campaigns: CampaignData[]
    onRefresh: () => void
    activeCampaignId: string | null
    onSelectCampaign: (id: string | null) => void
}

export function CampaignManager({ campaigns, onRefresh, activeCampaignId, onSelectCampaign }: CampaignManagerProps) {
    const t = useTranslations('dashboard.marketing')
    const [open, setOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [newName, setNewName] = useState('')
    const [newColor, setNewColor] = useState(TAG_COLORS[4].hex) // blue default
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setEditingId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleCreate = async () => {
        if (!newName.trim()) return
        await createMarketingCampaign({ name: newName.trim(), color: newColor })
        setNewName('')
        setNewColor(TAG_COLORS[4].hex)
        onRefresh()
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return
        await updateMarketingCampaign(id, { name: editName.trim(), color: editColor || undefined })
        setEditingId(null)
        onRefresh()
    }

    const handleDelete = async (id: string) => {
        await deleteMarketingCampaign(id)
        if (activeCampaignId === id) onSelectCampaign(null)
        onRefresh()
    }

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        await updateMarketingCampaign(id, { status: newStatus as 'ACTIVE' | 'PAUSED' })
        onRefresh()
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
            >
                <Plus className="w-3 h-3" />
                {t('campaigns.manage')}
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 p-3">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">{t('campaigns.title')}</h4>

                    {campaigns.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">{t('campaigns.noCampaigns')}</p>
                    ) : (
                        <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                            {campaigns.map(c => {
                                if (editingId === c.id) {
                                    return (
                                        <div key={c.id} className="flex items-center gap-2 py-1">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(c.id) }}
                                                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                                autoFocus
                                            />
                                            <div className="flex items-center gap-0.5">
                                                {TAG_COLORS.map(tc => (
                                                    <button
                                                        key={tc.id}
                                                        onClick={() => setEditColor(tc.hex)}
                                                        className={`w-4 h-4 rounded-full ${tc.dot} transition-all ${
                                                            editColor === tc.hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={() => handleUpdate(c.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={c.id} className="flex items-center justify-between py-1 group/camp">
                                        <button
                                            onClick={() => onSelectCampaign(activeCampaignId === c.id ? null : c.id)}
                                            className="flex items-center gap-2 min-w-0"
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: c.color || '#6B7280' }}
                                            />
                                            <span className="text-xs text-gray-700 font-medium truncate">{c.name}</span>
                                            <span className="text-[10px] text-gray-400">{c.linkCount}</span>
                                        </button>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover/camp:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleStatus(c.id, c.status)}
                                                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full transition-all ${
                                                    c.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {c.status === 'ACTIVE' ? t('campaigns.active') : t('campaigns.paused')}
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(c.id); setEditName(c.name); setEditColor(c.color || TAG_COLORS[4].hex) }}
                                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
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

                    {/* Create new campaign */}
                    <div className="border-t border-gray-100 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                placeholder={t('campaigns.namePlaceholder')}
                                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                            />
                            <div className="flex items-center gap-0.5">
                                {TAG_COLORS.map(tc => (
                                    <button
                                        key={tc.id}
                                        onClick={() => setNewColor(tc.hex)}
                                        className={`w-4 h-4 rounded-full ${tc.dot} transition-all ${
                                            newColor === tc.hex ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
                                        }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim()}
                                className="px-2 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 transition-all"
                            >
                                {t('campaigns.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
