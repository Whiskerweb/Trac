'use client'

import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Send, CheckCircle, Loader2, DollarSign } from 'lucide-react'
import { getPartnerDashboard, getPartnerCommissions } from '@/app/actions/partners'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: string
    created_at: Date
    matured_at: Date | null
}

interface Stats {
    pendingAmount: number
    dueAmount: number
    paidAmount: number
    totalEarned: number
}

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-100 text-orange-700',
        PROCEED: 'bg-blue-100 text-blue-700',
        COMPLETE: 'bg-green-100 text-green-700'
    }
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    )
}

export default function PayoutsPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats>({ pendingAmount: 0, dueAmount: 0, paidAmount: 0, totalEarned: 0 })
    const [commissions, setCommissions] = useState<Commission[]>([])

    useEffect(() => {
        async function fetchData() {
            try {
                const [dashboardResult, commissionsResult] = await Promise.all([
                    getPartnerDashboard(),
                    getPartnerCommissions()
                ])

                if ('stats' in dashboardResult && dashboardResult.stats) {
                    // Map stats to expected format
                    setStats({
                        pendingAmount: 0,
                        dueAmount: 0,
                        paidAmount: 0,
                        totalEarned: dashboardResult.stats.totalEarnings
                    })
                }
                if ('commissions' in commissionsResult && commissionsResult.commissions) {
                    setCommissions(commissionsResult.commissions as Commission[])
                }
            } catch (error) {
                console.error('Failed to fetch payouts data:', error)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const STATUS_CARDS = [
        { icon: Clock, label: 'Pending', amount: stats.pendingAmount, color: 'text-orange-600 bg-orange-50' },
        { icon: TrendingUp, label: 'Due', amount: stats.dueAmount, color: 'text-blue-600 bg-blue-50' },
        { icon: CheckCircle, label: 'Paid', amount: stats.paidAmount, color: 'text-green-600 bg-green-50' },
        { icon: DollarSign, label: 'Total Earned', amount: stats.totalEarned, color: 'text-purple-600 bg-purple-50' },
    ]

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Payouts
                    </h1>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {STATUS_CARDS.map((card) => (
                        <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                                    <card.icon className="w-4 h-4" strokeWidth={2} />
                                </div>
                                <span className="text-xs font-medium text-gray-600">
                                    {card.label}
                                </span>
                            </div>
                            <div className="text-xl font-semibold text-gray-900">
                                {formatCurrency(card.amount)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Commission History */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h2 className="font-medium text-gray-900">Commission History</h2>
                    </div>

                    {commissions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <DollarSign className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-2">
                                No commissions yet
                            </h3>
                            <p className="text-sm text-gray-600">
                                Commissions will appear here when sales are attributed to your links.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {commissions.map((commission) => (
                                <div key={commission.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Sale: {commission.sale_id.slice(0, 20)}...
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(commission.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <StatusBadge status={commission.status} />
                                        <span className="text-sm font-semibold text-gray-900">
                                            {formatCurrency(commission.commission_amount)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
