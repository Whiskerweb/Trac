'use client'

import { useTranslations } from 'next-intl'
import { Clock, Wallet, TrendingUp } from 'lucide-react'

interface PortalKPIRowProps {
    pending: number
    available: number
    paid: number
    primaryColor: string
}

export default function PortalKPIRow({ pending, available, paid, primaryColor }: PortalKPIRowProps) {
    const t = useTranslations('portal.home')

    const cards = [
        {
            label: t('due'),
            sublabel: t('dueSub'),
            value: pending,
            icon: Clock,
            iconColor: '#f59e0b',
        },
        {
            label: t('unpaid'),
            sublabel: t('unpaidSub'),
            value: available,
            icon: Wallet,
            iconColor: primaryColor,
        },
        {
            label: t('totalPaid'),
            sublabel: t('totalPaidSub'),
            value: paid,
            icon: TrendingUp,
            iconColor: '#10b981',
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {cards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 card-hover">
                    <div className="flex items-center gap-2 mb-2">
                        <card.icon className="w-4 h-4" style={{ color: card.iconColor }} />
                        <span className="text-[11px] sm:text-xs font-medium text-gray-500">{card.label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        {(card.value / 100).toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-0.5">&euro;</span>
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{card.sublabel}</p>
                </div>
            ))}
        </div>
    )
}
