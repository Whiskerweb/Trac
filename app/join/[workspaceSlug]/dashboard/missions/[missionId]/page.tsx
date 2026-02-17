'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
    ArrowLeft, Loader2, Copy, Check,
    MousePointerClick, Users, DollarSign, RefreshCw,
    FileText, Youtube, Link2, ExternalLink
} from 'lucide-react'
import { getPortalMissionStats } from '@/app/actions/portal'
import { usePortalData } from '../../layout'
import PortalReferralLink from '@/components/portal/PortalReferralLink'
import PortalRewardsSection from '@/components/portal/PortalRewardsSection'
import { portalPath } from '@/components/portal/portal-utils'

export default function PortalMissionDetailPage() {
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string
    const missionId = params.missionId as string
    const ctx = usePortalData()
    const t = useTranslations('portal.missionDetail')

    const [loading, setLoading] = useState(true)
    const [missionData, setMissionData] = useState<{
        mission: {
            id: string; title: string; description: string;
            sale_enabled: boolean; sale_reward_amount: number | null; sale_reward_structure: string | null;
            lead_enabled: boolean; lead_reward_amount: number | null;
            recurring_enabled: boolean; recurring_reward_amount: number | null; recurring_reward_structure: string | null;
            recurring_duration_months: number | null;
            company_name: string | null; logo_url: string | null;
        }
        linkUrl: string | null
        linkSlug: string | null
        stats: { clicks: number; leads: number; sales: number; revenue: number }
        contents: { id: string; type: string; url: string | null; title: string; description: string | null }[]
    } | null>(null)

    const primaryColor = ctx?.data.workspace.portal_primary_color || '#7C3AED'

    const loadData = useCallback(async () => {
        const result = await getPortalMissionStats(workspaceSlug, missionId)
        if (result.success && result.data) {
            setMissionData(result.data)
        }
        setLoading(false)
    }, [workspaceSlug, missionId])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!missionData) {
        return (
            <div className="text-center py-16">
                <p className="text-sm text-gray-500">{t('notFound')}</p>
                <Link
                    href={portalPath(workspaceSlug, '/dashboard/programs')}
                    className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium"
                    style={{ color: primaryColor }}
                >
                    <ArrowLeft className="w-3 h-3" />
                    {t('backToPrograms')}
                </Link>
            </div>
        )
    }

    const { mission, linkUrl, stats, contents } = missionData

    return (
        <div className="space-y-5">
            {/* Back link */}
            <Link
                href={portalPath(workspaceSlug, '/dashboard/programs')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('backToPrograms')}
            </Link>

            {/* Mission Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{mission.title}</h1>
                <p className="text-sm text-gray-500 leading-relaxed">{mission.description}</p>
            </motion.div>

            {/* Referral Link */}
            {linkUrl && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <PortalReferralLink
                        linkUrl={linkUrl}
                        primaryColor={primaryColor}
                    />
                </motion.div>
            )}

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('performance')}</p>
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                        <MousePointerClick className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{stats.clicks}</p>
                        <p className="text-[11px] text-gray-500">Clicks</p>
                    </div>
                    <div className="text-center">
                        <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{stats.leads}</p>
                        <p className="text-[11px] text-gray-500">Leads</p>
                    </div>
                    <div className="text-center">
                        <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{stats.sales}</p>
                        <p className="text-[11px] text-gray-500">Sales</p>
                    </div>
                    <div className="text-center">
                        <RefreshCw className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{(stats.revenue / 100).toFixed(0)}&euro;</p>
                        <p className="text-[11px] text-gray-500">Revenue</p>
                    </div>
                </div>
            </motion.div>

            {/* Rewards */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <PortalRewardsSection
                    mission={mission}
                    primaryColor={primaryColor}
                />
            </motion.div>

            {/* Resources */}
            {contents.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                >
                    <p className="text-sm font-semibold text-gray-900 mb-3">{t('resources')}</p>
                    <div className="space-y-2">
                        {contents.map(c => (
                            <a
                                key={c.id}
                                href={c.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                {c.type === 'YOUTUBE' && <Youtube className="w-4 h-4 text-red-500" />}
                                {c.type === 'PDF' && <FileText className="w-4 h-4 text-blue-500" />}
                                {(c.type === 'LINK' || c.type === 'TEXT') && <Link2 className="w-4 h-4 text-gray-500" />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                                    {c.description && <p className="text-[11px] text-gray-500 truncate">{c.description}</p>}
                                </div>
                                <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
