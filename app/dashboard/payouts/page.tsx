'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { Info, Filter, Loader2, Check, Clock, Settings } from 'lucide-react'
import { getPayoutHistory, getUnpaidCommissions, createPaymentSession, checkPaymentStatus, PayoutItem } from '@/app/actions/payouts'
import { useSearchParams } from 'next/navigation'

// Avatar component
function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
    return (
        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 ${className}`}>
            {initials}
        </div>
    )
}

// Status badge component
function StatusBadge({ status }: { status: 'pending' | 'completed' }) {
    if (status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                <Clock className="w-3 h-3" />
                Pending
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
            <Check className="w-3 h-3" />
            Completed
        </span>
    )
}

function PayoutsContent() {
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Data state
    const [payouts, setPayouts] = useState<PayoutItem[]>([])
    const [totals, setTotals] = useState({ pendingTotal: 0, paidTotal: 0, pendingCount: 0, paidCount: 0 })
    const [pagination, setPagination] = useState({ total: 0, page: 1, perPage: 10, totalPages: 1 })
    const [unpaidCommissionIds, setUnpaidCommissionIds] = useState<string[]>([])

    const searchParams = useSearchParams()

    const loadData = useCallback(async (page: number, silent: boolean = false) => {
        if (!silent) {
            setLoading(true)
            setError(null)
        }

        const [historyResult, unpaidResult] = await Promise.all([
            getPayoutHistory(page, 10),
            getUnpaidCommissions()
        ])

        if (historyResult.success && historyResult.payouts) {
            setPayouts(historyResult.payouts)
            setTotals(historyResult.totals || { pendingTotal: 0, paidTotal: 0, pendingCount: 0, paidCount: 0 })
            setPagination(historyResult.pagination || { total: 0, page: 1, perPage: 10, totalPages: 1 })
        } else if (!silent) {
            setError(historyResult.error || 'Failed to load payouts')
        }

        if (unpaidResult.success && unpaidResult.commissions) {
            setUnpaidCommissionIds(unpaidResult.commissions.map(c => c.id))
        }

        if (!silent) {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData(currentPage)
    }, [currentPage, loadData])

    // Auto-refresh data every 30 seconds (silent polling)
    useEffect(() => {
        const interval = setInterval(() => {
            loadData(currentPage, true) // Silent refresh (no loading spinner)
        }, 30000) // 30 seconds

        return () => clearInterval(interval)
    }, [currentPage, loadData])

    // Poll payment status after Stripe redirect
    useEffect(() => {
        const paymentId = searchParams.get('payment_id')
        const wasRedirected = searchParams.get('success') === 'true'

        if (paymentId && wasRedirected) {
            let attempts = 0
            const maxAttempts = 15 // 30 seconds max (15 * 2s)
            let cancelled = false

            const pollStatus = async () => {
                if (cancelled) return

                attempts++
                const status = await checkPaymentStatus(paymentId)

                if (status === 'PAID') {
                    setSuccess(true)
                    loadData(1) // Refresh data
                } else if (attempts < maxAttempts && !cancelled) {
                    // Continue polling
                    setTimeout(pollStatus, 2000)
                }
                // After max attempts, we stop polling silently
                // The webhook will eventually process it
            }

            // Start polling immediately
            pollStatus()

            return () => {
                cancelled = true
            }
        }
    }, [searchParams, loadData])

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage)
    }

    async function handleConfirmPayouts() {
        if (unpaidCommissionIds.length === 0) return

        setPaying(true)
        setError(null)

        const result = await createPaymentSession(unpaidCommissionIds)
        if (result.success && result.checkoutUrl) {
            // Redirect to Stripe Checkout
            window.location.href = result.checkoutUrl
        } else {
            setError(result.error || 'Payment failed')
            setPaying(false)
        }
    }

    const formatAmount = (amount: number) => `$${amount.toFixed(2)}`

    const startItem = (pagination.page - 1) * pagination.perPage + 1
    const endItem = Math.min(pagination.page * pagination.perPage, pagination.total)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">Payouts</h1>
                    <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/dashboard/commissions"
                        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Voir l'historique →
                    </a>
                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <Settings className="w-4 h-4" />
                        Payout settings
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="flex items-start gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                {/* Pending Payouts */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Pending payouts</span>
                        <button
                            onClick={handleConfirmPayouts}
                            disabled={paying || totals.pendingCount === 0}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {paying ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Confirm payouts'
                            )}
                        </button>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{formatAmount(totals.pendingTotal)}</p>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-200" />

                {/* Total Paid */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">Total paid</span>
                        <button className="text-xs font-medium text-gray-500 hover:text-gray-700">
                            View invoices
                        </button>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{formatAmount(totals.paidTotal)}</p>
                </div>
            </div>

            {/* Filter */}
            <div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div>Period</div>
                    <div>Partner</div>
                    <div>Status</div>
                    <div>Paid</div>
                    <div className="text-right">Amount</div>
                </div>

                {/* Table Body */}
                {payouts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No payouts yet</h3>
                        <p className="text-gray-500 mt-1">Payouts will appear here when partners earn commissions.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {payouts.map((payout) => (
                            <div
                                key={payout.id}
                                className="grid grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-sm text-gray-600">{payout.period}</div>
                                <div className="flex items-center gap-2">
                                    <Avatar initials={payout.partnerAvatar} />
                                    <span className="text-sm font-medium text-gray-900">{payout.partnerName}</span>
                                </div>
                                <div>
                                    <StatusBadge status={payout.status} />
                                </div>
                                <div className="text-sm text-gray-600">
                                    {payout.paidDate ? (
                                        <span className="flex items-center gap-1">
                                            <span className="text-green-500">●</span>
                                            {payout.paidDate}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">–</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-medium ${payout.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {formatAmount(payout.amount)}
                                    </span>
                                    {payout.platformFee > 0 && (
                                        <span className="block text-xs text-gray-400">
                                            +{formatAmount(payout.platformFee)} fee
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Viewing {startItem}-{endItem} of {pagination.total} payouts
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Success Message */}
            {success && (
                <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-4">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">Payouts confirmed!</p>
                        <p className="text-sm text-green-600">Transfers are being processed.</p>
                    </div>
                    <button
                        onClick={() => setSuccess(false)}
                        className="ml-2 text-green-600 hover:text-green-800"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    )
}

// Wrapper with Suspense for useSearchParams
export default function PayoutsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        }>
            <PayoutsContent />
        </Suspense>
    )
}
