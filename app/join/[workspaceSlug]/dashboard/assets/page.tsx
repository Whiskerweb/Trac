'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Loader2, Youtube, FileText, Link2, ExternalLink, FolderOpen } from 'lucide-react'
import { getPortalAssets } from '@/app/actions/portal'

export default function PortalAssetsPage() {
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string
    const t = useTranslations('portal.assets')

    const [loading, setLoading] = useState(true)
    const [contents, setContents] = useState<{ id: string; type: string; url: string | null; title: string; description: string | null }[]>([])
    const [pitchDeckUrl, setPitchDeckUrl] = useState<string | null>(null)
    const [docUrl, setDocUrl] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            const result = await getPortalAssets(workspaceSlug)
            if (result.success && result.data) {
                setContents(result.data.contents)
                setPitchDeckUrl(result.data.pitchDeckUrl)
                setDocUrl(result.data.docUrl)
            }
            setLoading(false)
        }
        load()
    }, [workspaceSlug])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    const hasContents = contents.length > 0
    const hasCompanyDocs = pitchDeckUrl || docUrl

    if (!hasContents && !hasCompanyDocs) {
        return (
            <div className="text-center py-20">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="w-7 h-7 text-gray-300" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">{t('emptyTitle')}</h2>
                <p className="text-sm text-gray-500">{t('emptyDesc')}</p>
            </div>
        )
    }

    const getIcon = (type: string) => {
        if (type === 'YOUTUBE') return <Youtube className="w-5 h-5 text-red-500" />
        if (type === 'PDF') return <FileText className="w-5 h-5 text-blue-500" />
        return <Link2 className="w-5 h-5 text-gray-500" />
    }

    return (
        <div className="space-y-6">
            {/* Marketing Materials */}
            {hasContents && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('marketingMaterials')}</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {contents.map(c => (
                            <a
                                key={c.id}
                                href={c.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
                            >
                                {getIcon(c.type)}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                                    {c.description && <p className="text-xs text-gray-500 truncate mt-0.5">{c.description}</p>}
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Company Documents */}
            {hasCompanyDocs && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('companyDocuments')}</h2>
                    <div className="space-y-2">
                        {pitchDeckUrl && (
                            <a
                                href={pitchDeckUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
                            >
                                <FileText className="w-5 h-5 text-purple-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900">{t('pitchDeck')}</p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </a>
                        )}
                        {docUrl && (
                            <a
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
                            >
                                <FileText className="w-5 h-5 text-blue-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900">{t('documentation')}</p>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </a>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
