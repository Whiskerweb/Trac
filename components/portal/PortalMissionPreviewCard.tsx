'use client'

import { DollarSign, Users, RefreshCw } from 'lucide-react'

interface PortalMissionPreviewCardProps {
    title: string
    description: string
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
    primaryColor: string
}

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

export default function PortalMissionPreviewCard({
    title,
    description,
    sale_enabled,
    sale_reward_amount,
    sale_reward_structure,
    lead_enabled,
    lead_reward_amount,
    recurring_enabled,
    recurring_reward_amount,
    recurring_reward_structure,
    primaryColor,
}: PortalMissionPreviewCardProps) {
    const rewards: { icon: React.ElementType; value: string }[] = []

    if (sale_enabled && sale_reward_amount) {
        rewards.push({ icon: DollarSign, value: formatReward(sale_reward_amount, sale_reward_structure) || '' })
    }
    if (lead_enabled && lead_reward_amount) {
        rewards.push({ icon: Users, value: formatReward(lead_reward_amount, null) || '' })
    }
    if (recurring_enabled && recurring_reward_amount) {
        rewards.push({ icon: RefreshCw, value: formatReward(recurring_reward_amount, recurring_reward_structure) || '' })
    }

    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h3>
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{description}</p>
            {rewards.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    {rewards.map((r, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
                        >
                            <r.icon className="w-3 h-3" />
                            {r.value}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
