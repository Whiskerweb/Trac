'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText, Youtube, Link2, ExternalLink } from 'lucide-react'
import { usePortalData } from './layout'
import PortalKPIRow from '@/components/portal/PortalKPIRow'
import PortalProgramCard from '@/components/portal/PortalProgramCard'
import PortalReferralLink from '@/components/portal/PortalReferralLink'
import PortalRewardsSection from '@/components/portal/PortalRewardsSection'

export default function PortalDashboardHome() {
    const data = usePortalData()
    const t = useTranslations('portal.home')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    if (!data) return null

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    // Get first 3 resources for preview
    const contents = (data.mission as unknown as { Contents?: { id: string; type: string; url: string | null; title: string; description: string | null }[] }).Contents || []
    const previewContents = contents.slice(0, 3)

    return (
        <div className="space-y-5">
            {/* KPI Row */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <PortalKPIRow
                    pending={data.balance.pending}
                    available={data.balance.available}
                    paid={data.balance.paid}
                    primaryColor={primaryColor}
                />
            </motion.div>

            {/* Program Card */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <PortalProgramCard
                    workspaceName={data.workspace.name}
                    logoUrl={data.profile?.logo_url}
                    missionTitle={data.mission.title}
                    primaryColor={primaryColor}
                    stats={data.stats}
                />
            </motion.div>

            {/* Referral Link */}
            {data.linkUrl && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <PortalReferralLink
                        linkUrl={data.linkUrl}
                        primaryColor={primaryColor}
                    />
                </motion.div>
            )}

            {/* Rewards Section */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <PortalRewardsSection
                    mission={data.mission}
                    primaryColor={primaryColor}
                />
            </motion.div>

            {/* Resources Preview */}
            {previewContents.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-900">{t('resources')}</p>
                        <Link
                            href={`/join/${workspaceSlug}/dashboard/assets`}
                            className="flex items-center gap-1 text-xs font-medium transition-colors"
                            style={{ color: primaryColor }}
                        >
                            {t('viewAll')}
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {previewContents.map(c => (
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
