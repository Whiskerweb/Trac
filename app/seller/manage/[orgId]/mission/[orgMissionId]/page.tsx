'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Crown } from 'lucide-react'
import { getOrgMissionDetail } from '@/app/actions/organization-actions'
import type { OrgMissionDetail } from '@/app/actions/organization-actions'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'

function OrgCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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

function DealBreakdown({ orgDeal }: { orgDeal: OrgMissionDetail['orgDeal'] }) {
    const isPercentage = orgDeal.totalReward.includes('%')
    const dealValue = isPercentage
        ? parseFloat(orgDeal.totalReward.replace('%', ''))
        : parseFloat(orgDeal.totalReward.replace(/[€$]/g, ''))
    const platformFee = isPercentage ? 15 : dealValue * 0.15
    const orgShare = isPercentage ? dealValue - 15 : dealValue - platformFee

    return (
        <div className="bg-neutral-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
                <span className="text-neutral-500">Total deal</span>
                <span className="font-semibold text-neutral-900">{orgDeal.totalReward}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
                <span className="text-neutral-400">Platform (15%)</span>
                <span className="text-neutral-400">&minus;{isPercentage ? '15%' : `${platformFee.toFixed(2)}\u20AC`}</span>
            </div>
            <div className="flex items-center justify-between text-[13px] pt-1.5 border-t border-neutral-200">
                <span className="text-neutral-600 font-medium">Org share</span>
                <span className="font-semibold text-neutral-700">{isPercentage ? `${orgShare}%` : `${orgShare.toFixed(2)}\u20AC`}</span>
            </div>
            {orgDeal.leaderReward && (
                <div className="flex items-center justify-between text-[13px]">
                    <span className="text-amber-600 flex items-center gap-1"><Crown className="w-3 h-3" /> Leader</span>
                    <span className="font-medium text-amber-600">{orgDeal.leaderReward}</span>
                </div>
            )}
            {orgDeal.memberReward && (
                <div className="flex items-center justify-between text-[13px]">
                    <span className="text-emerald-600">Members</span>
                    <span className="font-semibold text-emerald-600">{orgDeal.memberReward}</span>
                </div>
            )}
        </div>
    )
}

export default function OrgMissionDetailPage() {
    const params = useParams()
    const orgId = params.orgId as string
    const orgMissionId = params.orgMissionId as string

    const [loading, setLoading] = useState(true)
    const [detail, setDetail] = useState<OrgMissionDetail | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [activeEventTypes, setActiveEventTypes] = useState<Set<string>>(new Set(['clicks', 'leads', 'sales']))

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await getOrgMissionDetail(orgMissionId)
            if (result.success && result.detail) {
                setDetail(result.detail)
            } else {
                setError(result.error || 'Failed to load')
            }
            setLoading(false)
        }
        load()
    }, [orgMissionId])

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
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div>
                <Link
                    href={`/seller/manage/${orgId}/missions`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Missions
                </Link>
                <p className="text-[14px] text-neutral-500">{error || 'Mission not found'}</p>
            </div>
        )
    }

    const { mission, orgDeal, stats, timeseries, memberBreakdown } = detail

    // Build commission badges (member reward)
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
        <div>
            {/* Back link to missions tab */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Link
                    href={`/seller/manage/${orgId}/missions`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Missions
                </Link>
            </motion.div>

            <div className="space-y-6">
                {/* Mission Header Card */}
                <OrgCard>
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
                                <h2 className="text-[20px] font-semibold tracking-tight text-neutral-900 truncate">{mission.title}</h2>
                                <p className="text-[14px] text-neutral-500">{mission.companyName}</p>
                            </div>
                        </div>

                        {/* Member reward badge */}
                        {orgDeal.memberReward && (
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 text-[13px] font-semibold text-emerald-600 bg-emerald-50 rounded-full">
                                    Your reward: {orgDeal.memberReward}
                                </span>
                            </div>
                        )}

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
                </OrgCard>

                {/* Deal Breakdown Card */}
                <OrgCard>
                    <div className="p-6">
                        <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Deal Breakdown</h3>
                        <DealBreakdown orgDeal={orgDeal} />
                    </div>
                </OrgCard>

                {/* Analytics Chart Card */}
                <OrgCard>
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
                </OrgCard>

                {/* Member Breakdown Card */}
                <OrgCard>
                    <div className="p-6">
                        <h3 className="text-[15px] font-semibold text-neutral-900 mb-5">Member Performance</h3>

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
                                                {member.clicks} clicks &middot; {member.salesCount} sales
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
                                <p className="text-[14px] text-neutral-400">No activity yet</p>
                                <p className="text-[13px] text-neutral-300 mt-1">Stats will appear once members start generating traffic</p>
                            </div>
                        )}
                    </div>
                </OrgCard>
            </div>
        </div>
    )
}
