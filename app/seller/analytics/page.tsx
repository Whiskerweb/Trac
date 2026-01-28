'use client'

import { useState } from 'react'
import { MousePointer, ShoppingCart, DollarSign, Wallet, Filter, RefreshCw, TrendingUp, Loader2 } from 'lucide-react'
import { useSellerAnalytics as usePartnerAnalytics } from '@/lib/hooks/useSellerAnalytics'

// Use explicit locale to avoid hydration mismatch
function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num)
}

function formatCurrency(amount: number, isCents: boolean = false): string {
    const value = isCents ? amount / 100 : amount
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const STAT_CARDS = [
    { key: 'clicks', label: 'Total Clicks', icon: MousePointer, color: 'text-blue-600 bg-blue-50' },
    { key: 'sales', label: 'Total Sales', icon: ShoppingCart, color: 'text-green-600 bg-green-50' },
    { key: 'revenue', label: 'Revenue Generated', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { key: 'commission', label: 'Commission Earned', icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
    { key: 'payout', label: 'Pending Payout', icon: Wallet, color: 'text-gray-600 bg-gray-100' },
]

export default function AnalyticsPage() {
    const { stats, events, loading, error, refresh } = usePartnerAnalytics()
    const [selectedEventType, setSelectedEventType] = useState<'all' | 'click' | 'sale' | 'payout'>('all')
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refresh()
        setIsRefreshing(false)
    }

    const filteredEvents = events.filter(event => {
        if (selectedEventType !== 'all' && event.type !== selectedEventType) {
            return false
        }
        return true
    })

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Analytics
                    </h1>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    {STAT_CARDS.map((card) => {
                        let value: string | number = 0
                        switch (card.key) {
                            case 'clicks': value = formatNumber(stats.totalClicks); break
                            case 'sales': value = stats.totalSales; break
                            case 'revenue': value = formatCurrency(stats.totalRevenue, true); break
                            case 'commission': value = formatCurrency(stats.totalCommission, true); break
                            case 'payout': value = formatCurrency(stats.pendingPayout, true); break
                        }
                        return (
                            <div key={card.key} className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                                        <card.icon className="w-4 h-4" strokeWidth={2} />
                                    </div>
                                    <span className="text-xs font-medium text-gray-600">
                                        {card.label}
                                    </span>
                                </div>
                                <div className="text-xl font-semibold text-gray-900">
                                    {value}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6">
                    {/* Event Type Filter */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'click', label: 'Clicks' },
                            { value: 'sale', label: 'Sales' },
                            { value: 'payout', label: 'Payouts' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSelectedEventType(option.value as any)}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${selectedEventType === option.value
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Events Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Program
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Commission
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                    Time
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="text-gray-400 mb-2">
                                            <MousePointer className="w-8 h-8 mx-auto" />
                                        </div>
                                        <p className="text-sm text-gray-600">No events found</p>
                                        <p className="text-xs text-gray-400 mt-1">Events will appear here as they happen</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredEvents.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.type === 'click' ? 'bg-blue-100 text-blue-600' :
                                                    event.type === 'sale' ? 'bg-green-100 text-green-600' :
                                                        'bg-purple-100 text-purple-600'
                                                    }`}>
                                                    {event.type === 'click' && <MousePointer className="w-4 h-4" />}
                                                    {event.type === 'sale' && <ShoppingCart className="w-4 h-4" />}
                                                    {event.type === 'payout' && <Wallet className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 capitalize">
                                                        {event.type}
                                                    </div>
                                                    {event.customer && (
                                                        <div className="text-xs text-gray-500">
                                                            {event.customer}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900">
                                                {event.program || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-900">
                                                {event.amount ? formatCurrency(event.amount, true) : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm ${event.commission ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                                {event.commission ? `+${formatCurrency(event.commission, true)}` : '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500">
                                                {event.timestamp}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {filteredEvents.length > 0 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {filteredEvents.length} events
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-400 cursor-not-allowed">
                                    Previous
                                </button>
                                <button className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-400 cursor-not-allowed">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
