'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, Youtube, Link2, Type, ExternalLink, FolderOpen } from 'lucide-react'
import { usePortalData } from '../layout'
import { getPortalAssets } from '@/app/actions/portal'

interface MissionAsset {
    missionId: string
    missionTitle: string
    contents: {
        id: string
        type: string
        url: string | null
        title: string
        description: string | null
    }[]
}

const typeIcons: Record<string, React.ElementType> = {
    YOUTUBE: Youtube,
    PDF: FileText,
    LINK: Link2,
    TEXT: Type,
}

export default function PortalAssetsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.assets')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [missions, setMissions] = useState<MissionAsset[]>([])
    const [loading, setLoading] = useState(true)

    if (!ctx) return null
    const { data } = ctx
    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const loadAssets = useCallback(async () => {
        const result = await getPortalAssets(workspaceSlug)
        if (result.success && result.data) {
            setMissions(result.data.missions)
        }
        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadAssets() }, [loadAssets])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h1>
            </motion.div>

            {missions.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
                >
                    <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">{t('empty')}</p>
                </motion.div>
            ) : (
                missions.map((mission, mi) => (
                    <motion.div
                        key={mission.missionId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * (mi + 1) }}
                        className="bg-white rounded-2xl border border-gray-100 p-5"
                    >
                        <p className="text-sm font-semibold text-gray-900 mb-3">{mission.missionTitle}</p>
                        <div className="space-y-1.5">
                            {mission.contents.map((c) => {
                                const Icon = typeIcons[c.type] || FileText
                                return (
                                    <a
                                        key={c.id}
                                        href={c.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${primaryColor}12` }}
                                        >
                                            <Icon className="w-4 h-4" style={{ color: primaryColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                                            {c.description && (
                                                <p className="text-[11px] text-gray-400 truncate">{c.description}</p>
                                            )}
                                        </div>
                                        {c.url && (
                                            <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                                        )}
                                    </a>
                                )
                            })}
                        </div>
                    </motion.div>
                ))
            )}
        </div>
    )
}
