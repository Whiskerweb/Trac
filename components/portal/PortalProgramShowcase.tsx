'use client'

import { useTranslations } from 'next-intl'
import { DollarSign, Users, RefreshCw } from 'lucide-react'

interface PortalProgramShowcaseProps {
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
    recurring_duration_months: number | null
    primaryColor: string
}

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

export default function PortalProgramShowcase({
    title, description,
    sale_enabled, sale_reward_amount, sale_reward_structure,
    lead_enabled, lead_reward_amount,
    recurring_enabled, recurring_reward_amount, recurring_reward_structure,
    recurring_duration_months,
    primaryColor,
}: PortalProgramShowcaseProps) {
    const t = useTranslations('portal')

    const rewards: { icon: React.ElementType; label: string; value: string }[] = []
    if (sale_enabled && sale_reward_amount) {
        rewards.push({ icon: DollarSign, label: t('perSale'), value: formatReward(sale_reward_amount, sale_reward_structure) || '' })
    }
    if (lead_enabled && lead_reward_amount) {
        rewards.push({ icon: Users, label: t('perLead'), value: formatReward(lead_reward_amount, null) || '' })
    }
    if (recurring_enabled && recurring_reward_amount) {
        const val = formatReward(recurring_reward_amount, recurring_reward_structure) || ''
        const suffix = recurring_duration_months ? ` / ${recurring_duration_months}mo` : ''
        rewards.push({ icon: RefreshCw, label: t('recurringCommission'), value: val + suffix })
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 hover:shadow-sm transition-shadow">
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            {description && (
                <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{description}</p>
            )}
            {rewards.length > 0 && (
                <div className="space-y-1.5">
                    {rewards.map((r) => (
                        <div key={r.label} className="flex items-center gap-2.5">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${primaryColor}12` }}
                            >
                                <r.icon className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-xs text-gray-600 flex-1">{r.label}</span>
                            <span className="text-sm font-bold text-gray-900">{r.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
