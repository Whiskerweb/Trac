'use client'

import { useState, useEffect } from 'react'
import {
    DollarSign, Users, Clock, CheckCircle,
    Loader2, TrendingUp, Receipt, Gift,
    ChevronRight, AlertCircle
} from 'lucide-react'
import {
    getWorkspaceCommissionStats,
    getPendingGiftCardRequests,
    fulfillGiftCard,
    type CommissionStats
} from '@/app/actions/commissions'

// =============================================
// FORMAT HELPERS
// =============================================

function formatCurrency(cents: number): string {
    return (cents / 100).toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    })
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

// =============================================
// STATS CARD
// =============================================

function StatsCard({
    title,
    value,
    icon: Icon,
    color = 'blue',
    description
}: {
    title: string
    value: string
    icon: React.ElementType
    color?: 'blue' | 'green' | 'orange' | 'purple'
    description?: string
}) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">{title}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            {description && (
                <p className="text-sm text-gray-500">{description}</p>
            )}
        </div>
    )
}

// =============================================
// STATUS BADGE
// =============================================

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-100 text-orange-700',
        PROCEED: 'bg-blue-100 text-blue-700',
        COMPLETE: 'bg-green-100 text-green-700',
        PROCESSING: 'bg-blue-100 text-blue-700',
        DELIVERED: 'bg-green-100 text-green-700',
    }
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function CommissionsPage() {
    const [stats, setStats] = useState<CommissionStats | null>(null)
    const [giftCardRequests, setGiftCardRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'giftcards'>('overview')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [statsResult, giftCardsResult] = await Promise.all([
            getWorkspaceCommissionStats(),
            getPendingGiftCardRequests()
        ])

        if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats)
        }
        if (giftCardsResult.success && giftCardsResult.requests) {
            setGiftCardRequests(giftCardsResult.requests)
        }
        setLoading(false)
    }

    async function handleFulfillGiftCard(requestId: string) {
        const code = prompt('Enter gift card code:')
        if (!code) return

        const result = await fulfillGiftCard(requestId, code)
        if (result.success) {
            alert('Gift card fulfilled!')
            loadData()
        } else {
            alert(result.error || 'Failed to fulfill')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Commissions</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Track partner payouts and platform fees
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Commissions Paid"
                    value={formatCurrency(stats?.totalCommissionsPaid || 0)}
                    icon={CheckCircle}
                    color="green"
                    description="Paid to partners"
                />
                <StatsCard
                    title="Platform Fees"
                    value={formatCurrency(stats?.totalPlatformFees || 0)}
                    icon={Receipt}
                    color="purple"
                    description="15% per sale"
                />
                <StatsCard
                    title="Pending"
                    value={formatCurrency(stats?.pendingCommissions || 0)}
                    icon={Clock}
                    color="orange"
                    description="Maturing"
                />
                <StatsCard
                    title="Due"
                    value={formatCurrency(stats?.dueCommissions || 0)}
                    icon={TrendingUp}
                    color="blue"
                    description="Ready to pay"
                />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-6">
                    {(['overview', 'partners', 'giftcards'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-black text-black'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'overview' && 'Recent Activity'}
                            {tab === 'partners' && `Partners (${stats?.partnerBreakdown.length || 0})`}
                            {tab === 'giftcards' && `Gift Cards (${giftCardRequests.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl border border-gray-200">
                {/* Recent Activity */}
                {activeTab === 'overview' && (
                    <div className="divide-y divide-gray-100">
                        {(stats?.recentCommissions || []).length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <DollarSign className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-base font-medium text-gray-900 mb-2">
                                    No commissions yet
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Commissions will appear here when partners generate sales.
                                </p>
                            </div>
                        ) : (
                            stats?.recentCommissions.map(c => (
                                <div key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Users className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{c.partnerEmail}</p>
                                            <p className="text-xs text-gray-500">{formatDate(c.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(c.amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Fee: {formatCurrency(c.platformFee)}
                                            </p>
                                        </div>
                                        <StatusBadge status={c.status} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Partners Breakdown */}
                {activeTab === 'partners' && (
                    <div className="divide-y divide-gray-100">
                        {(stats?.partnerBreakdown || []).length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-base font-medium text-gray-900 mb-2">
                                    No partners yet
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Partner earnings will appear here.
                                </p>
                            </div>
                        ) : (
                            stats?.partnerBreakdown.map(p => (
                                <div key={p.partnerId} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                                            {(p.partnerName || p.partnerEmail)[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {p.partnerName || p.partnerEmail}
                                            </p>
                                            <p className="text-xs text-gray-500">{p.partnerEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(p.totalEarned)}
                                            </p>
                                            <p className="text-xs text-gray-500">Total earned</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Gift Card Requests */}
                {activeTab === 'giftcards' && (
                    <div className="divide-y divide-gray-100">
                        {giftCardRequests.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Gift className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-base font-medium text-gray-900 mb-2">
                                    No pending requests
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Gift card redemption requests will appear here.
                                </p>
                            </div>
                        ) : (
                            giftCardRequests.map(r => (
                                <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center text-white">
                                            <Gift className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {r.cardType.toUpperCase()} Gift Card
                                            </p>
                                            <p className="text-xs text-gray-500">{r.partnerEmail}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(r.amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                                        </div>
                                        <StatusBadge status={r.status} />
                                        {r.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleFulfillGiftCard(r.id)}
                                                className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-800"
                                            >
                                                Fulfill
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
