'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { Info, Loader2, Check, Clock, AlertTriangle, User, ChevronRight } from 'lucide-react'
import { getPayoutHistory, getUnpaidCommissions, createPaymentSession, checkPaymentStatus, PayoutItem, SellerPayoutSummary } from '@/app/actions/payouts'
import { useSearchParams } from 'next/navigation'
import { CommissionDetailModal } from '@/components/dashboard/CommissionDetailModal'

// Format currency in EUR
const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(cents / 100)
}

// Avatar component
function Avatar({ name, avatar, size = 'sm' }: { name: string; avatar?: string; size?: 'sm' | 'md' }) {
    const sizeClasses = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'

    if (avatar) {
        return (
            <img
                src={avatar}
                alt={name}
                className={`${sizeClasses} rounded-full object-cover`}
            />
        )
    }

    return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-medium text-white`}>
            {name.charAt(0).toUpperCase()}
        </div>
    )
}

// Seller Row Component
function SellerPayoutRow({
    seller,
    isSelected,
    onToggleSelection,
    onClick
}: {
    seller: SellerPayoutSummary
    isSelected: boolean
    onToggleSelection: () => void
    onClick: () => void
}) {
    return (
        <div
            className={`flex items-center gap-4 px-6 py-4 transition-colors cursor-pointer ${
                seller.meetsMinimum
                    ? 'hover:bg-gray-50'
                    : 'bg-amber-50/50'
            }`}
            onClick={onClick}
        >
            {/* Checkbox (only for eligible sellers) */}
            <div className="flex-shrink-0">
                {seller.meetsMinimum ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleSelection()
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'border-gray-300 hover:border-violet-400'
                        }`}
                    >
                        {isSelected && <Check className="w-3 h-3" />}
                    </button>
                ) : (
                    <div className="w-5 h-5 rounded border-2 border-amber-300 bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                    </div>
                )}
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar name={seller.sellerName} avatar={seller.sellerAvatar} />
                <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{seller.sellerName}</p>
                    <p className="text-xs text-gray-500 truncate">{seller.sellerEmail}</p>
                </div>
            </div>

            {/* Commission Count */}
            <div className="text-center w-20">
                <p className="text-sm font-medium text-gray-900">{seller.commissionCount}</p>
                <p className="text-xs text-gray-500">{seller.commissionCount === 1 ? 'vente' : 'ventes'}</p>
            </div>

            {/* Commission Amount */}
            <div className="text-right w-28">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(seller.totalCommission)}</p>
                {!seller.meetsMinimum && (
                    <p className="text-xs text-amber-600">Min. 10€</p>
                )}
            </div>

            {/* Platform Fee */}
            <div className="text-right w-24">
                <p className="text-sm text-gray-500">+{formatCurrency(seller.totalPlatformFee)}</p>
                <p className="text-xs text-gray-400">frais</p>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
        </div>
    )
}

function PayoutsContent() {
    const [loading, setLoading] = useState(true)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Seller data
    const [eligibleSellers, setEligibleSellers] = useState<SellerPayoutSummary[]>([])
    const [ineligibleSellers, setIneligibleSellers] = useState<SellerPayoutSummary[]>([])
    const [totals, setTotals] = useState({
        sellerTotal: 0,
        platformTotal: 0,
        grandTotal: 0,
        eligibleCount: 0,
        ineligibleCount: 0,
        totalCommissions: 0
    })

    // Selection state
    const [selectedSellerIds, setSelectedSellerIds] = useState<Set<string>>(new Set())

    // Modal state
    const [modalSeller, setModalSeller] = useState<SellerPayoutSummary | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // History data (for paid total)
    const [paidTotal, setPaidTotal] = useState(0)

    const searchParams = useSearchParams()

    const loadData = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true)
            setError(null)
        }

        const [unpaidResult, historyResult] = await Promise.all([
            getUnpaidCommissions(),
            getPayoutHistory(1, 1) // Just to get totals
        ])

        if (unpaidResult.success) {
            setEligibleSellers(unpaidResult.eligibleSellers)
            setIneligibleSellers(unpaidResult.ineligibleSellers)
            setTotals(unpaidResult.totals)

            // Auto-select all eligible sellers
            setSelectedSellerIds(new Set(unpaidResult.eligibleSellers.map(s => s.sellerId)))
        } else if (!silent) {
            setError(unpaidResult.error || 'Failed to load')
        }

        if (historyResult.success && historyResult.totals) {
            setPaidTotal(historyResult.totals.paidTotal)
        }

        if (!silent) {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadData(true)
        }, 30000)
        return () => clearInterval(interval)
    }, [loadData])

    // Poll payment status after Stripe redirect
    useEffect(() => {
        const paymentId = searchParams.get('payment_id')
        const wasRedirected = searchParams.get('success') === 'true'

        if (paymentId && wasRedirected) {
            let attempts = 0
            const maxAttempts = 15
            let cancelled = false

            const pollStatus = async () => {
                if (cancelled) return

                attempts++
                const status = await checkPaymentStatus(paymentId)

                if (status === 'PAID') {
                    setSuccess(true)
                    loadData()
                } else if (attempts < maxAttempts && !cancelled) {
                    setTimeout(pollStatus, 2000)
                } else if (!cancelled) {
                    // Fallback: manual confirmation
                    try {
                        const response = await fetch('/api/startup-payments/confirm-manual', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId })
                        })
                        const result = await response.json()

                        if (result.success) {
                            setSuccess(true)
                            loadData()
                        } else {
                            setError(`Payment completed but confirmation failed: ${result.error}`)
                        }
                    } catch (err) {
                        setError('Payment completed but confirmation failed. Please refresh the page.')
                    }
                }
            }

            pollStatus()
            return () => { cancelled = true }
        }
    }, [searchParams, loadData])

    const toggleSellerSelection = (sellerId: string) => {
        setSelectedSellerIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(sellerId)) {
                newSet.delete(sellerId)
            } else {
                newSet.add(sellerId)
            }
            return newSet
        })
    }

    const selectAllEligible = () => {
        setSelectedSellerIds(new Set(eligibleSellers.map(s => s.sellerId)))
    }

    const deselectAll = () => {
        setSelectedSellerIds(new Set())
    }

    // Calculate selected totals
    const selectedSellers = eligibleSellers.filter(s => selectedSellerIds.has(s.sellerId))
    const selectedTotal = selectedSellers.reduce((sum, s) => sum + s.totalCommission, 0)
    const selectedPlatformFee = selectedSellers.reduce((sum, s) => sum + s.totalPlatformFee, 0)
    const selectedCommissionIds = selectedSellers.flatMap(s => s.commissions.map(c => c.id))

    async function handleConfirmPayouts() {
        if (selectedCommissionIds.length === 0) return

        setPaying(true)
        setError(null)

        const result = await createPaymentSession(selectedCommissionIds)
        if (result.success && result.checkoutUrl) {
            window.location.href = result.checkoutUrl
        } else {
            setError(result.error || 'Payment failed')
            setPaying(false)
        }
    }

    const openModal = (seller: SellerPayoutSummary) => {
        setModalSeller(seller)
        setIsModalOpen(true)
    }

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
                <a
                    href="/dashboard/commissions"
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                    Voir l'historique →
                </a>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* À payer */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-500">À payer</span>
                        <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                            {totals.eligibleCount} sellers
                        </span>
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totals.sellerTotal)}</p>
                    <p className="text-xs text-gray-400 mt-1">+{formatCurrency(totals.platformTotal)} frais plateforme</p>
                </div>

                {/* En attente < 10€ */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-amber-700">En attente (&lt;10€)</span>
                        <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            {totals.ineligibleCount} sellers
                        </span>
                    </div>
                    <p className="text-2xl font-semibold text-amber-900">
                        {formatCurrency(ineligibleSellers.reduce((sum, s) => sum + s.totalCommission, 0))}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Will be paid once threshold is reached</p>
                </div>

                {/* Total paid */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-green-700">Total paid</span>
                        <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-semibold text-green-900">{formatCurrency(paidTotal * 100)}</p>
                    <p className="text-xs text-green-600 mt-1">Historique complet</p>
                </div>
            </div>

            {/* Sellers List */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* List Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <h2 className="font-medium text-gray-900">Sellers to pay</h2>
                        {eligibleSellers.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={selectAllEligible}
                                    className="text-xs text-violet-600 hover:text-violet-800"
                                >
                                    Select all
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={deselectAll}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Deselect
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-gray-500">
                        {selectedSellerIds.size} of {eligibleSellers.length} selected
                    </div>
                </div>

                {/* Eligible Sellers */}
                {eligibleSellers.length === 0 && ineligibleSellers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">Aucun paiement en attente</h3>
                        <p className="text-gray-500 mt-1">Seller commissions will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {/* Eligible sellers (can be paid) */}
                        {eligibleSellers.map((seller) => (
                            <SellerPayoutRow
                                key={seller.sellerId}
                                seller={seller}
                                isSelected={selectedSellerIds.has(seller.sellerId)}
                                onToggleSelection={() => toggleSellerSelection(seller.sellerId)}
                                onClick={() => openModal(seller)}
                            />
                        ))}

                        {/* Separator if both sections have items */}
                        {eligibleSellers.length > 0 && ineligibleSellers.length > 0 && (
                            <div className="px-6 py-3 bg-amber-50 border-y border-amber-200">
                                <div className="flex items-center gap-2 text-sm text-amber-700">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">En dessous du seuil minimum (10€)</span>
                                </div>
                            </div>
                        )}

                        {/* Ineligible sellers (below threshold) */}
                        {ineligibleSellers.map((seller) => (
                            <SellerPayoutRow
                                key={seller.sellerId}
                                seller={seller}
                                isSelected={false}
                                onToggleSelection={() => {}}
                                onClick={() => openModal(seller)}
                            />
                        ))}
                    </div>
                )}

                {/* Payment Action Bar */}
                {selectedSellerIds.size > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-900">{selectedSellerIds.size}</span> sellers selected
                                ({selectedSellers.reduce((sum, s) => sum + s.commissionCount, 0)} commissions)
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {formatCurrency(selectedTotal)} commissions + {formatCurrency(selectedPlatformFee)} frais = <span className="font-semibold">{formatCurrency(selectedTotal + selectedPlatformFee)}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleConfirmPayouts}
                            disabled={paying || selectedCommissionIds.length === 0}
                            className="px-6 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {paying ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Traitement...
                                </>
                            ) : (
                                <>
                                    Payer {formatCurrency(selectedTotal + selectedPlatformFee)}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Commission Detail Modal */}
            <CommissionDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                seller={modalSeller}
                isSelected={modalSeller ? selectedSellerIds.has(modalSeller.sellerId) : false}
                onToggleSelection={() => {
                    if (modalSeller && modalSeller.meetsMinimum) {
                        toggleSellerSelection(modalSeller.sellerId)
                    }
                }}
            />

            {/* Success Message */}
            {success && (
                <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-4">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">Payments confirmed!</p>
                        <p className="text-sm text-green-600">Les transferts sont en cours de traitement.</p>
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
