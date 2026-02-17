'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DollarSign, Users, RefreshCw, Loader2, Lock, ExternalLink } from 'lucide-react'
import { usePortalData } from '../layout'
import { portalJoinMission } from '@/app/actions/portal'
import { portalPath } from '@/components/portal/portal-utils'

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

export default function PortalProgramsPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.programs')
    const params = useParams()
    const workspaceSlug = params.workspaceSlug as string
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [joinedIds, setJoinedIds] = useState<string[]>([])

    if (!ctx) return null
    const { data, refresh } = ctx

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const handleJoin = async (missionId: string) => {
        setJoiningId(missionId)
        const result = await portalJoinMission(missionId)
        if (result.success) {
            setJoinedIds(prev => [...prev, missionId])
            await refresh()
        }
        setJoiningId(null)
    }

    return (
        <div className="space-y-8">
            {/* Enrolled Programs */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('enrolled')}</h2>
                {data.enrollments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                        <p className="text-sm text-gray-500">{t('noEnrolled')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.enrollments.map(enrollment => (
                            <Link
                                key={enrollment.id}
                                href={portalPath(workspaceSlug, `/dashboard/missions/${enrollment.missionId}`)}
                                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{enrollment.missionTitle}</h3>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-2 transition-colors" />
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{enrollment.missionDescription}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {enrollment.sale_enabled && enrollment.sale_reward_amount && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                                            <DollarSign className="w-3 h-3" />
                                            {formatReward(enrollment.sale_reward_amount, enrollment.sale_reward_structure)}
                                        </span>
                                    )}
                                    {enrollment.lead_enabled && enrollment.lead_reward_amount && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                                            <Users className="w-3 h-3" />
                                            {formatReward(enrollment.lead_reward_amount, null)}
                                        </span>
                                    )}
                                    {enrollment.recurring_enabled && enrollment.recurring_reward_amount && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                                            <RefreshCw className="w-3 h-3" />
                                            {formatReward(enrollment.recurring_reward_amount, enrollment.recurring_reward_structure)}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Available Programs */}
            {data.availableMissions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{t('available')}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.availableMissions.map(mission => {
                            const justJoined = joinedIds.includes(mission.id)
                            const isPrivate = mission.visibility === 'PRIVATE'

                            return (
                                <div
                                    key={mission.id}
                                    className="bg-white rounded-xl border border-gray-100 p-4"
                                >
                                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{mission.title}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{mission.description}</p>

                                    {/* Reward badges */}
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        {mission.sale_enabled && mission.sale_reward_amount && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                                                <DollarSign className="w-3 h-3" />
                                                {formatReward(mission.sale_reward_amount, mission.sale_reward_structure)}
                                            </span>
                                        )}
                                        {mission.lead_enabled && mission.lead_reward_amount && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                                                <Users className="w-3 h-3" />
                                                {formatReward(mission.lead_reward_amount, null)}
                                            </span>
                                        )}
                                        {mission.recurring_enabled && mission.recurring_reward_amount && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                                                <RefreshCw className="w-3 h-3" />
                                                {formatReward(mission.recurring_reward_amount, mission.recurring_reward_structure)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Join button */}
                                    {justJoined ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                                            {t('joined')}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleJoin(mission.id)}
                                            disabled={joiningId === mission.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {joiningId === mission.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : isPrivate ? (
                                                <Lock className="w-3 h-3" />
                                            ) : null}
                                            {isPrivate ? t('requestJoin') : t('joinNow')}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            {/* Empty state */}
            {data.enrollments.length === 0 && data.availableMissions.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <p className="text-sm text-gray-500">{t('noAvailable')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('noAvailableDesc')}</p>
                </div>
            )}
        </div>
    )
}
