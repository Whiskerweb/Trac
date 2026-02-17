'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { usePortalData } from './layout'
import PortalKPIRow from '@/components/portal/PortalKPIRow'
import PortalProgramCard from '@/components/portal/PortalProgramCard'

const statusDot: Record<string, string> = {
    PENDING: '#f59e0b',
    PROCEED: '#7C3AED',
    COMPLETE: '#10b981',
}

export default function PortalDashboardPage() {
    const ctx = usePortalData()
    const t = useTranslations('portal.dashboard')
    const tComm = useTranslations('portal.commissions')

    const [expandedId, setExpandedId] = useState<string | null>(null)

    if (!ctx) return null
    const { data } = ctx

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    const getDaysLeft = (createdAt: string, holdDays: number) => {
        const created = new Date(createdAt)
        const maturesAt = new Date(created.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        return Math.max(0, Math.ceil((maturesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
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
                        <p className="text-sm text-gray-500">{t('noStats')}</p>
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

            {/* Recent Earnings (inline, last 5) */}
            {data.recentCommissions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5"
                >
                    <p className="text-sm font-semibold text-gray-900 mb-3">{t('earnings')}</p>
                    <div className="space-y-1">
                        {data.recentCommissions.slice(0, 5).map((c) => {
                            const dotColor = c.status === 'PROCEED' ? primaryColor : (statusDot[c.status] || '#9ca3af')
                            const daysLeft = c.status === 'PENDING' ? getDaysLeft(c.createdAt, c.holdDays) : 0
                            let typeLabel = c.source
                            if (c.source === 'RECURRING' && c.recurringMonth) {
                                typeLabel = `REC #${c.recurringMonth}`
                            }

                            return (
                                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50/50 transition-colors">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-gray-700">
                                            {(c.amount / 100).toFixed(2)}&euro;
                                        </span>
                                        <span className="text-[11px] text-gray-400 ml-2">{typeLabel}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {c.status === 'PENDING' && daysLeft > 0 ? (
                                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                {tComm('availableIn', { days: daysLeft })}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-gray-400">
                                                {new Date(c.createdAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
