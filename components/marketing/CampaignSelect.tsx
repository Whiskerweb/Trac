'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { getMarketingCampaignList, createMarketingCampaign } from '@/app/actions/marketing-campaigns'
import { getTagColor } from '@/lib/marketing/tags'

interface CampaignOption {
    id: string
    name: string
    color: string | null
    status: string
}

interface CampaignSelectProps {
    value: string | null
    onChange: (campaignId: string | null) => void
    className?: string
}

export function CampaignSelect({ value, onChange, className = '' }: CampaignSelectProps) {
    const t = useTranslations('dashboard.marketing')
    const [open, setOpen] = useState(false)
    const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
    const [creating, setCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getMarketingCampaignList().then(res => {
            if (res.success && res.data) {
                setCampaigns(res.data as unknown as CampaignOption[])
            }
        })
    }, [])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
                setCreating(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selected = campaigns.find(c => c.id === value)

    const handleCreate = async () => {
        if (!newName.trim()) return
        const res = await createMarketingCampaign({ name: newName.trim() })
        if (res.success && res.data) {
            const camp = res.data as unknown as CampaignOption
            setCampaigns(prev => [camp, ...prev])
            onChange(camp.id)
            setNewName('')
            setCreating(false)
            setOpen(false)
        }
    }

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left hover:border-gray-300 transition-all"
            >
                {selected ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selected.color || '#6B7280' }}
                        />
                        <span className="truncate text-gray-900">{selected.name}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 flex-1">{t('campaigns.none')}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 max-h-60 overflow-y-auto">
                    <button
                        onClick={() => { onChange(null); setOpen(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                            !value ? 'font-medium text-gray-900' : 'text-gray-600'
                        }`}
                    >
                        <span className="text-gray-400">{t('campaigns.none')}</span>
                        {!value && <Check className="w-3.5 h-3.5 text-purple-600 ml-auto" />}
                    </button>

                    {campaigns.map(c => (
                        <button
                            key={c.id}
                            onClick={() => { onChange(c.id); setOpen(false) }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                value === c.id ? 'font-medium text-gray-900' : 'text-gray-600'
                            }`}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.color || '#6B7280' }}
                            />
                            <span className="truncate flex-1">{c.name}</span>
                            {value === c.id && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                        </button>
                    ))}

                    <div className="border-t border-gray-100 mt-1 pt-1">
                        {creating ? (
                            <div className="px-3 py-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                                    placeholder={t('campaigns.namePlaceholder')}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="px-2 py-1 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40"
                                >
                                    {t('campaigns.create')}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setCreating(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {t('campaigns.createNew')}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
