'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { usePortalData } from './layout'
import PortalKPIRow from '@/components/portal/PortalKPIRow'
import PortalProgramCard from '@/components/portal/PortalProgramCard'
import PortalEarningsSection from '@/components/portal/PortalEarningsSection'
import { portalJoinMission } from '@/app/actions/portal'

export default function PortalDashboardPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.dashboard')
    const tPrograms = useTranslations('portal.programs')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string

    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [joiningId, setJoiningId] = useState<string | null>(null)

    if (!ctx) return null
    const { data, refresh } = ctx

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const handleJoin = async (missionId: string) => {
        setJoiningId(missionId)
        await portalJoinMission(missionId)
        await refresh()
        setJoiningId(null)
    }

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

            {/* My Programs — Accordion */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <p className="text-sm font-semibold text-gray-900 mb-3">{t('myPrograms')}</p>

                {data.enrollments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                        <p className="text-sm text-gray-500">{tPrograms('noEnrolled')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {data.enrollments.map((enrollment) => (
                            <PortalProgramCard
                                key={enrollment.id}
                                missionTitle={enrollment.missionTitle}
                                missionDescription={enrollment.missionDescription}
                                linkUrl={enrollment.linkUrl}
                                stats={enrollment.stats}
                                sale_enabled={enrollment.sale_enabled}
                                sale_reward_amount={enrollment.sale_reward_amount}
                                sale_reward_structure={enrollment.sale_reward_structure}
                                lead_enabled={enrollment.lead_enabled}
                                lead_reward_amount={enrollment.lead_reward_amount}
                                recurring_enabled={enrollment.recurring_enabled}
                                recurring_reward_amount={enrollment.recurring_reward_amount}
                                recurring_reward_structure={enrollment.recurring_reward_structure}
                                recurring_duration_months={enrollment.recurring_duration_months}
                                contents={enrollment.contents}
                                primaryColor={primaryColor}
                                expanded={expandedId === enrollment.id}
                                onToggle={() => setExpandedId(expandedId === enrollment.id ? null : enrollment.id)}
                            />
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Available Programs */}
            {data.availableMissions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                >
                    <p className="text-sm font-semibold text-gray-900 mb-3">{tPrograms('available')}</p>
                    <div className="space-y-2">
                        {data.availableMissions.map((mission) => (
                            <div
                                key={mission.id}
                                className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{mission.title}</p>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{mission.description}</p>
                                </div>
                                <button
                                    onClick={() => handleJoin(mission.id)}
                                    disabled={joiningId === mission.id}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {joiningId === mission.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            {mission.visibility === 'PRIVATE' ? tPrograms('requestJoin') : tPrograms('joinNow')}
                                            <ArrowRight className="w-3 h-3" />
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recent Earnings + Payout */}
            <PortalEarningsSection
                workspaceSlug={workspaceSlug}
                recentCommissions={data.recentCommissions}
                payout={data.payout}
                primaryColor={primaryColor}
            />
        </div>
    )
}
