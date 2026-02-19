'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle } from '@/lib/animations'
import {
    Plus, Megaphone, MousePointerClick, Link2,
    Pencil, Trash2, Archive, Calendar,
    X, Check
} from 'lucide-react'
import { getMarketingCampaignList, createMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign } from '@/app/actions/marketing-campaigns'
import { TAG_COLORS } from '@/lib/marketing/tags'
import { CampaignStatus } from '@/lib/generated/prisma/client'

interface CampaignData {
    id: string
    name: string
    description: string | null
    color: string | null
    status: CampaignStatus
    start_date: string | null
    end_date: string | null
    created_at: string
    linkCount: number
    totalClicks: number
}

export default function CampaignsPage() {
    const t = useTranslations('dashboard.marketing')
    const router = useRouter()
    const [campaigns, setCampaigns] = useState<CampaignData[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)

    // Create form
    const [newName, setNewName] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newColor, setNewColor] = useState(TAG_COLORS[4].hex)

    const loadCampaigns = useCallback(async () => {
        const res = await getMarketingCampaignList()
        if (res.success && res.data) {
            setCampaigns(res.data as unknown as CampaignData[])
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadCampaigns() }, [loadCampaigns])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setCreating(true)
        await createMarketingCampaign({
            name: newName.trim(),
            description: newDesc.trim() || undefined,
            color: newColor,
        })
        setNewName('')
        setNewDesc('')
        setNewColor(TAG_COLORS[4].hex)
        setShowCreate(false)
        setCreating(false)
        loadCampaigns()
    }

    const handleArchive = async (id: string) => {
        await updateMarketingCampaign(id, { status: 'ARCHIVED' })
        loadCampaigns()
    }

    const handleDelete = async (id: string) => {
        await deleteMarketingCampaign(id)
        loadCampaigns()
    }

    const statusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700'
            case 'PAUSED': return 'bg-yellow-100 text-yellow-700'
            case 'COMPLETED': return 'bg-blue-100 text-blue-700'
            case 'ARCHIVED': return 'bg-gray-100 text-gray-500'
            default: return 'bg-gray-100 text-gray-500'
        }
    }

    return (
        <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
        >
            {/* Header */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('campaigns.pageTitle')}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {campaigns.length} {t('campaigns.campaignCount')}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="btn-press flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('campaigns.createNew')}
                </button>
            </motion.div>

            {/* Create Modal */}
            {showCreate && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}
                >
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                            <h2 className="text-sm font-medium text-gray-900">{t('campaigns.createNew')}</h2>
                            <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('campaigns.nameLabel')}</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder={t('campaigns.namePlaceholder')}
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('campaigns.descriptionLabel')}</label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder={t('campaigns.descriptionPlaceholder')}
                                    rows={2}
                                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('campaigns.colorLabel')}</label>
                                <div className="flex items-center gap-1.5">
                                    {TAG_COLORS.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setNewColor(c.hex)}
                                            className={`w-6 h-6 rounded-full ${c.dot} transition-all ${
                                                newColor === c.hex ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="btn-press px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {t('bulk.cancel')}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newName.trim() || creating}
                                className="btn-press px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating && <span className="w-3.5 h-3.5 rounded-full skeleton-shimmer inline-block" />}
                                {t('campaigns.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaigns Grid */}
            {loading ? (
                <motion.div variants={fadeInUp} transition={springGentle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-gray-200 p-5">
                            <div className="h-5 w-32 rounded mb-2 skeleton-shimmer" />
                            <div className="h-3 w-48 rounded mb-4 skeleton-shimmer" />
                            <div className="flex gap-4">
                                <div className="h-4 w-16 rounded skeleton-shimmer" />
                                <div className="h-4 w-16 rounded skeleton-shimmer" />
                            </div>
                        </div>
                    ))}
                </motion.div>
            ) : campaigns.length === 0 ? (
                <motion.div variants={fadeInUp} transition={springGentle} className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Megaphone className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">{t('campaigns.empty')}</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{t('campaigns.emptyDesc')}</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn-press inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {t('campaigns.createFirst')}
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {campaigns.map(c => (
                        <motion.div
                            key={c.id}
                            variants={staggerItem}
                            transition={springGentle}
                            className="card-hover bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer"
                            onClick={() => router.push(`/dashboard/marketing?campaign_id=${c.id}`)}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: c.color || '#6B7280' }}
                                        />
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                                    </div>
                                    <span className={`badge-pop text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(c.status)}`}>
                                        {c.status}
                                    </span>
                                </div>

                                {c.description && (
                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Link2 className="w-3 h-3" /> {c.linkCount} {t('campaigns.links')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MousePointerClick className="w-3 h-3" /> {c.totalClicks.toLocaleString()} {t('clicks')}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-gray-100 px-5 py-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleArchive(c.id) }}
                                    className="btn-press p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title={t('campaigns.archive')}
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                                    className="btn-press p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title={t('campaigns.deleteConfirm')}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </motion.div>
    )
}
