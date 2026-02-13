'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getGroupMissionDetail } from '@/app/actions/group-actions'
import type { GroupMissionDetail } from '@/app/actions/group-actions'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { useTranslations } from 'next-intl'

const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(cents / 100) + ' \u20AC'

export default function GroupMissionDetailPage() {
    const params = useParams()
    const router = useRouter()
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
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <Link href="/seller/groups" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    {t('backToGroups')}
                </Link>
                <p className="text-sm text-neutral-500">{error || t('notFound')}</p>
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto py-8"
        >
            {/* Back link */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
            >
                <Link href="/seller/groups" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" />
                    {t('backToGroups')}
                </Link>
            </motion.div>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-8"
            >
                <div className="flex items-center gap-4 mb-3">
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
                        <h1 className="text-xl font-extralight tracking-tight text-neutral-900 truncate">{mission.title}</h1>
                        <p className="text-sm text-neutral-400">{mission.companyName}</p>
                    </div>
                </div>

                {/* Commission badges */}
                {badges.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {badges.map((badge, i) => (
                            <span key={i} className="px-2.5 py-1 text-[11px] font-medium text-neutral-600 bg-neutral-100 rounded-lg">
                                {badge}
                            </span>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Analytics Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-10"
            >
                <AnalyticsChart
                    clicks={stats.clicks}
                    leads={stats.leads}
                    sales={stats.sales}
                    revenue={stats.revenue}
                    timeseries={timeseries}
                    activeEventTypes={activeEventTypes}
                    onEventTypeToggle={handleEventTypeToggle}
                />
            </motion.div>

            {/* By Seller */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-5">{t('stats.bySeller')}</h2>

                {memberBreakdown.length > 0 ? (
                    <div className="space-y-1">
                        {memberBreakdown.map((member, index) => (
                            <motion.div
                                key={member.sellerId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.04 * index }}
                                className="flex items-center justify-between py-3.5 px-4 -mx-4 rounded-xl hover:bg-neutral-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {member.avatarUrl ? (
                                        <img src={member.avatarUrl} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[10px] font-medium text-neutral-500">
                                                {member.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-sm text-neutral-700 truncate">{member.name}</span>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                                    <span className="text-xs text-neutral-400 tabular-nums">
                                        {member.clicks} {t('stats.clicks')} · {member.salesCount} {t('stats.sales')}
                                    </span>
                                    <span className="text-sm font-medium text-neutral-900 tabular-nums">
                                        {formatCurrency(member.revenue)}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-sm text-neutral-400">{t('stats.noStats')}</p>
                        <p className="text-xs text-neutral-300 mt-1">{t('stats.noStatsDesc')}</p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}
