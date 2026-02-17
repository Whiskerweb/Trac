'use client'

import { useTranslations } from 'next-intl'
import { DollarSign, Users, RefreshCw } from 'lucide-react'

interface Mission {
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
    recurring_duration_months: number | null
}

interface PortalRewardsSectionProps {
    mission: Mission
    primaryColor: string
}

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

export default function PortalRewardsSection({ mission, primaryColor }: PortalRewardsSectionProps) {
    const t = useTranslations('portal.home')

    const rewards: { icon: React.ElementType; label: string; value: string; detail?: string }[] = []

    if (mission.sale_enabled && mission.sale_reward_amount) {
        rewards.push({
            icon: DollarSign,
            label: t('perSale'),
            value: formatReward(mission.sale_reward_amount, mission.sale_reward_structure) || '',
            detail: t('perSaleDetail'),
        })
    }

    if (mission.lead_enabled && mission.lead_reward_amount) {
        rewards.push({
            icon: Users,
            label: t('perLead'),
            value: formatReward(mission.lead_reward_amount, null) || '',
            detail: t('perLeadDetail'),
        })
    }

    if (mission.recurring_enabled && mission.recurring_reward_amount) {
        const duration = mission.recurring_duration_months
            ? t('recurringFor', { months: mission.recurring_duration_months })
            : t('recurringLifetime')
        rewards.push({
            icon: RefreshCw,
            label: t('recurring'),
            value: formatReward(mission.recurring_reward_amount, mission.recurring_reward_structure) || '',
            detail: duration,
        })
    }

    if (rewards.length === 0) return null

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <p className="text-sm font-semibold text-gray-900 mb-4">{t('whatYouEarn')}</p>
            <div className="grid sm:grid-cols-3 gap-3">
                {rewards.map((reward) => (
                    <div
                        key={reward.label}
                        className="rounded-xl p-4 border border-gray-100"
                        style={{ backgroundColor: `${primaryColor}06` }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${primaryColor}15` }}
                            >
                                <reward.icon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">{reward.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{reward.value}</p>
                        {reward.detail && <p className="text-[11px] text-gray-400 mt-1">{reward.detail}</p>}
                    </div>
                ))}
            </div>
        </div>
    )
}
