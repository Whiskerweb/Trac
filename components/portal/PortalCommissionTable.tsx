'use client'

import { useTranslations } from 'next-intl'

interface Commission {
    id: string
    amount: number
    status: string
    source: string
    createdAt: string
    maturedAt: string | null
    holdDays: number
    recurringMonth: number | null
    rate: string | null
}

interface PortalCommissionTableProps {
    commissions: Commission[]
    primaryColor: string
}

const statusDot: Record<string, string> = {
    PENDING: '#f59e0b',
    PROCEED: '#7C3AED',
    COMPLETE: '#10b981',
}

export default function PortalCommissionTable({ commissions, primaryColor }: PortalCommissionTableProps) {
    const t = useTranslations('portal.commissions')

    if (commissions.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-sm text-gray-500">{t('empty')}</p>
            </div>
        )
    }

    const getDaysLeft = (createdAt: string, holdDays: number) => {
        const created = new Date(createdAt)
        const maturesAt = new Date(created.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        const daysLeft = Math.ceil((maturesAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(0, daysLeft)
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-1">{t('status')}</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-1">{t('amount')}</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-1">{t('type')}</th>
                        <th className="text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-1">{t('date')}</th>
                        <th className="text-right text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-3 px-1">{t('info')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {commissions.map(c => {
                        const dotColor = statusDot[c.status] || '#9ca3af'
                        const daysLeft = c.status === 'PENDING' ? getDaysLeft(c.createdAt, c.holdDays) : 0

                        let typeLabel = c.source
                        if (c.source === 'RECURRING' && c.recurringMonth) {
                            typeLabel = `RECURRING #${c.recurringMonth}`
                        }

                        return (
                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.status === 'PROCEED' ? primaryColor : dotColor }} />
                                        <span className="text-xs font-medium text-gray-700">
                                            {c.status === 'PENDING' ? t('maturing') : c.status === 'PROCEED' ? t('available') : t('paid')}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-1">
                                    <span className="text-sm font-semibold text-gray-900">{(c.amount / 100).toFixed(2)}&euro;</span>
                                </td>
                                <td className="py-3 px-1">
                                    <span className="text-xs text-gray-500">{typeLabel}</span>
                                </td>
                                <td className="py-3 px-1">
                                    <span className="text-xs text-gray-500">
                                        {new Date(c.createdAt).toLocaleDateString()}
                                    </span>
                                </td>
                                <td className="py-3 px-1 text-right">
                                    {c.status === 'PENDING' && daysLeft > 0 && (
                                        <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            {t('availableIn', { days: daysLeft })}
                                        </span>
                                    )}
                                    {c.status === 'COMPLETE' && c.maturedAt && (
                                        <span className="text-[11px] text-emerald-600">
                                            {new Date(c.maturedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
