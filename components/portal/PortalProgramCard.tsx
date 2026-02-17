'use client'

import { useTranslations } from 'next-intl'
import { MousePointerClick, Users, ShoppingCart, DollarSign } from 'lucide-react'

interface PortalProgramCardProps {
    workspaceName: string
    logoUrl?: string | null
    missionTitle: string
    primaryColor: string
    stats: {
        clicks: number
        leads: number
        sales: number
        revenue: number
    }
}

export default function PortalProgramCard({ workspaceName, logoUrl, missionTitle, primaryColor, stats }: PortalProgramCardProps) {
    const t = useTranslations('portal.home')

    const statItems = [
        { label: t('clicks'), value: stats.clicks.toLocaleString(), icon: MousePointerClick },
        { label: t('leads'), value: stats.leads.toLocaleString(), icon: Users },
        { label: t('sales'), value: stats.sales.toLocaleString(), icon: ShoppingCart },
        { label: t('revenue'), value: `${(stats.revenue / 100).toFixed(0)}\u20AC`, icon: DollarSign },
    ]

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                    <img src={logoUrl} alt={workspaceName} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {workspaceName.charAt(0)}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{workspaceName} {t('affiliateProgram')}</p>
                    <p className="text-xs text-gray-500 truncate">{missionTitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
                {statItems.map(stat => (
                    <div key={stat.label} className="text-center">
                        <div className="flex items-center justify-center mb-1">
                            <stat.icon className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
