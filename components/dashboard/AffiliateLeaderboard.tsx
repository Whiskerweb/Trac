'use client'

import { Trophy } from 'lucide-react'

interface AffiliateData {
    affiliate_id: string
    total_clicks: number
    total_sales: number
    total_revenue: number
}

interface AffiliateLeaderboardProps {
    data: AffiliateData[]
    isLoading?: boolean
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(cents / 100)
}

function getTrophyColor(rank: number): string {
    switch (rank) {
        case 1:
            return 'text-yellow-500' // Gold
        case 2:
            return 'text-gray-400' // Silver
        case 3:
            return 'text-amber-600' // Bronze
        default:
            return 'text-transparent'
    }
}

function EmptyState() {
    return (
        <div className="py-12 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-40" />
            <p className="text-gray-500 font-medium mb-1">No active partners yet</p>
            <p className="text-sm text-gray-400">Start sharing your affiliate links to see your top partners here</p>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-20" />
                </div>
            ))}
        </div>
    )
}

export function AffiliateLeaderboard({ data, isLoading = false }: AffiliateLeaderboardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Top Partners</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">Your best performing affiliates</p>
            </div>

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : data.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-2">
                        {data.map((affiliate, index) => {
                            const rank = index + 1
                            const trophyColor = getTrophyColor(rank)
                            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(affiliate.affiliate_id)}&background=random&color=fff&size=128`

                            return (
                                <div
                                    key={affiliate.affiliate_id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {/* Rank Badge */}
                                    <div className="relative">
                                        <span className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center z-10">
                                            {rank}
                                        </span>
                                        <img
                                            src={avatarUrl}
                                            alt={affiliate.affiliate_id}
                                            className="w-10 h-10 rounded-full border-2 border-gray-200"
                                        />
                                        {rank <= 3 && (
                                            <Trophy className={`w-4 h-4 ${trophyColor} absolute -bottom-1 -right-1`} />
                                        )}
                                    </div>

                                    {/* Affiliate Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {affiliate.affiliate_id}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {affiliate.total_sales} sale{affiliate.total_sales !== 1 ? 's' : ''} • {affiliate.total_clicks} click{affiliate.total_clicks !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    {/* Revenue */}
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">
                                            {formatCurrency(affiliate.total_revenue)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
