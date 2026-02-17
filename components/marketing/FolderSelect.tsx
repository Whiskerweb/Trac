'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Folder, Check } from 'lucide-react'
import { getMarketingFolderTree } from '@/app/actions/marketing-folders'

interface FolderNode {
    id: string
    name: string
    color: string | null
    parent_id: string | null
    children: FolderNode[]
}

interface FolderSelectProps {
    value: string | null
    onChange: (folderId: string | null) => void
    folders?: FolderNode[]
    className?: string
}

export function FolderSelect({ value, onChange, folders: propFolders, className = '' }: FolderSelectProps) {
    const t = useTranslations('dashboard.marketing')
    const [open, setOpen] = useState(false)
    const [folders, setFolders] = useState<FolderNode[]>(propFolders || [])
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!propFolders) {
            getMarketingFolderTree().then(res => {
                if (res.success && res.data) {
                    setFolders(res.data as unknown as FolderNode[])
                }
            })
        }
    }, [propFolders])

    useEffect(() => {
        if (propFolders) setFolders(propFolders)
    }, [propFolders])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Find selected folder name (flat search)
    const findFolder = (nodes: FolderNode[], id: string): FolderNode | null => {
        for (const n of nodes) {
            if (n.id === id) return n
            const found = findFolder(n.children, id)
            if (found) return found
        }
        return null
    }
    const selected = value ? findFolder(folders, value) : null

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-left hover:border-gray-300 transition-all"
            >
                {selected ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate text-gray-900">{selected.name}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 flex-1">{t('folders.none')}</span>
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
                        <span className="text-gray-400">{t('folders.none')}</span>
                        {!value && <Check className="w-3.5 h-3.5 text-purple-600 ml-auto" />}
                    </button>

                    {folders.map(f => (
                        <div key={f.id}>
                            <button
                                onClick={() => { onChange(f.id); setOpen(false) }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                    value === f.id ? 'font-medium text-gray-900' : 'text-gray-600'
                                }`}
                            >
                                <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate flex-1">{f.name}</span>
                                {value === f.id && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                            </button>
                            {f.children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => { onChange(child.id); setOpen(false) }}
                                    className={`w-full flex items-center gap-2 pl-8 pr-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                                        value === child.id ? 'font-medium text-gray-900' : 'text-gray-600'
                                    }`}
                                >
                                    <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="truncate flex-1">{child.name}</span>
                                    {value === child.id && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
