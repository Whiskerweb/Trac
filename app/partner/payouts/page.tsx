'use client'

import { Clock, TrendingUp, Send, CheckCircle } from 'lucide-react'

const STATUS_CARDS = [
    { icon: Clock, label: 'Pending', amount: 0, color: 'text-orange-600 bg-orange-50' },
    { icon: TrendingUp, label: 'Processing', amount: 0, color: 'text-blue-600 bg-blue-50' },
    { icon: TrendingUp, label: 'Processed', amount: 0, color: 'text-purple-600 bg-purple-50' },
    { icon: Send, label: 'Sent', amount: 0, color: 'text-indigo-600 bg-indigo-50' },
    { icon: CheckCircle, label: 'Completed', amount: 0, color: 'text-green-600 bg-green-50' },
]

export default function PayoutsPage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Payouts
                    </h1>
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Payout settings
                    </button>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-5 gap-4 mb-8">
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
                                {card.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="mb-6">
                    <button className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <span>Filter</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* Empty State */}
                <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </div>
                        <h3 className="text-base font-medium text-gray-900 mb-2">
                            No payouts found
                        </h3>
                        <p className="text-sm text-gray-600">
                            No payouts have been initiated for this program yet.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
