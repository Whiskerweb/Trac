'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getGroupMissionDetail } from '@/app/actions/group-actions'
import type { GroupMissionDetail } from '@/app/actions/group-actions'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { useTranslations } from 'next-intl'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

function GroupCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm ${className}`}
        >
            {children}
        </motion.div>
    )
}

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(cents / 100) + ' \u20AC'

export default function GroupMissionDetailPage() {
    const params = useParams()
    const t = useTranslations('seller.groups')
    const missionId = params.missionId as string

    const [loading, setLoading] = useState(true)
    const [detail, setDetail] = useState<GroupMissionDetail | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [activeEventTypes, setActiveEventTypes] = useState<Set<string>>(new Set(['clicks', 'leads', 'sales']))

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await getGroupMissionDetail(missionId)
            if (result.success && result.detail) {
                setDetail(result.detail)
            } else {
                setError(result.error || 'Failed to load')
            }
            setLoading(false)
        }
        load()
    }, [missionId])

    const handleEventTypeToggle = (type: 'clicks' | 'leads' | 'sales') => {
        setActiveEventTypes(prev => {
            const next = new Set(prev)
            if (next.has(type)) {
                if (next.size > 1) next.delete(type)
            } else {
                next.add(type)
            }
            return next
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <TraaactionLoader size={32} className="text-gray-400" />
                    <span className="text-sm text-neutral-500">Loading...</span>
                </motion.div>
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <Link href="/seller/groups" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-8">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {t('backToGroups')}
                    </Link>
                    <p className="text-[14px] text-neutral-500">{error || t('notFound')}</p>
                </div>
            </div>
        )
    }

    const { mission, stats, timeseries, memberBreakdown } = detail

    // Build commission badges
    const badges: string[] = []
    if (mission.lead_enabled && mission.lead_reward_amount) {
        badges.push(`Lead: ${mission.lead_reward_amount}`)
    }
    if (mission.sale_enabled && mission.sale_reward_amount) {
        const suffix = mission.sale_reward_structure === 'PERCENTAGE' ? '%' : '\u20AC'
        badges.push(`Sale: ${mission.sale_reward_amount}${suffix}`)
    }
    if (mission.recurring_enabled && mission.recurring_reward_amount) {
        const suffix = mission.recurring_reward_structure === 'PERCENTAGE' ? '%' : '\u20AC'
        badges.push(`Recurring: ${mission.recurring_reward_amount}${suffix}`)
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Back link */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Link href="/seller/groups" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-8">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        {t('backToGroups')}
                    </Link>
                </motion.div>

                <div className="space-y-6">
                    {/* Mission Header Card */}
                    <GroupCard>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                {mission.logoUrl ? (
                                    <img src={mission.logoUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                                ) : (
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-neutral-400">
                                            {mission.companyName?.charAt(0) || 'M'}
                                        </span>
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 truncate">{mission.title}</h1>
                                    <p className="text-[14px] text-neutral-500">{mission.companyName}</p>
                                </div>
                            </div>

                            {badges.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {badges.map((badge, i) => (
                                        <span key={i} className="px-2.5 py-1 text-[12px] font-medium text-neutral-600 bg-neutral-100 rounded-xl">
                                            {badge}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </GroupCard>

                    {/* Analytics Chart Card */}
                    <GroupCard>
                        <div className="p-6">
                            <AnalyticsChart
                                clicks={stats.clicks}
                                leads={stats.leads}
                                sales={stats.sales}
                                revenue={stats.revenue}
                                timeseries={timeseries}
                                activeEventTypes={activeEventTypes}
                                onEventTypeToggle={handleEventTypeToggle}
                            />
                        </div>
                    </GroupCard>

                    {/* Member Breakdown Card */}
                    <GroupCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-5">{t('stats.bySeller')}</h2>

                            {memberBreakdown.length > 0 ? (
                                <div className="space-y-1">
                                    {memberBreakdown.map((member, index) => (
                                        <motion.div
                                            key={member.sellerId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.04 * index }}
                                            className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-neutral-50/80 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {member.avatarUrl ? (
                                                    <img src={member.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[11px] font-medium text-neutral-500">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-[14px] text-neutral-700 truncate">{member.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                                                <span className="text-[13px] text-neutral-400 tabular-nums">
                                                    {member.clicks} {t('stats.clicks')} · {member.salesCount} {t('stats.sales')}
                                                </span>
                                                <span className="text-[14px] font-medium text-neutral-900 tabular-nums">
                                                    {formatCurrency(member.revenue)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-[14px] text-neutral-400">{t('stats.noStats')}</p>
                                    <p className="text-[13px] text-neutral-300 mt-1">{t('stats.noStatsDesc')}</p>
                                </div>
                            )}
                        </div>
                    </GroupCard>
                </div>
            </div>
        </div>
    )
}
