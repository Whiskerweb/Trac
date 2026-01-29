'use client'

import { useState, useEffect } from 'react'
import { Clock, TrendingUp, Send, CheckCircle, Loader2, DollarSign, AlertCircle, X, ArrowDownToLine } from 'lucide-react'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: string
    created_at: string
    matured_at: string | null
}

interface WalletData {
    balance: number
    pending: number
    due: number
    paid_total: number
    canWithdraw: boolean
    method: string | null
    commissions: Commission[]
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
    const [withdrawing, setWithdrawing] = useState(false)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [wallet, setWallet] = useState<WalletData>({
        balance: 0,
        pending: 0,
        due: 0,
        paid_total: 0,
        canWithdraw: false,
        method: null,
        commissions: []
    })

    useEffect(() => {
        loadWallet()
    }, [])

    async function loadWallet() {
        try {
            setLoading(true)
            const response = await fetch('/api/seller/wallet')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load wallet')
            }

            if (data.success && data.wallet) {
                setWallet(data.wallet)
            }
        } catch (error) {
            console.error('Failed to fetch payouts data:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleWithdraw() {
        try {
            setWithdrawing(true)
            setNotification(null)

            const response = await fetch('/api/seller/withdraw', {
                method: 'POST'
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Withdraw failed')
            }

            if (data.success) {
                setNotification({
                    type: 'success',
                    message: `Paiement de ${data.amountFormatted} envoyé avec succès !`
                })
                // Reload wallet data
                await loadWallet()
            }
        } catch (err) {
            setNotification({
                type: 'error',
                message: err instanceof Error ? err.message : 'Erreur lors du retrait'
            })
        } finally {
            setWithdrawing(false)
        }
    }

    const STATUS_CARDS = [
        { icon: Clock, label: 'Pending', amount: wallet.pending, color: 'text-orange-600 bg-orange-50' },
        { icon: TrendingUp, label: 'Due', amount: wallet.due, color: 'text-blue-600 bg-blue-50' },
        { icon: CheckCircle, label: 'Paid', amount: wallet.paid_total, color: 'text-green-600 bg-green-50' },
        { icon: DollarSign, label: 'Total Earned', amount: wallet.pending + wallet.due + wallet.paid_total, color: 'text-purple-600 bg-purple-50' },
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

                {/* Notification */}
                {notification && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
                        notification.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center gap-3">
                            {notification.type === 'success' ? (
                                <CheckCircle className="w-5 h-5" />
                            ) : (
                                <AlertCircle className="w-5 h-5" />
                            )}
                            <span className="font-medium">{notification.message}</span>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="text-current opacity-60 hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Payouts
                        </h1>
                        {wallet.method === 'STRIPE_CONNECT' && (
                            <p className="text-sm text-gray-600 mt-1">
                                💳 Transferts automatiques activés
                            </p>
                        )}
                    </div>
                    {wallet.method !== 'STRIPE_CONNECT' && (
                        <button
                            onClick={handleWithdraw}
                            disabled={!wallet.canWithdraw || withdrawing}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            {withdrawing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Traitement...
                                </>
                            ) : (
                                <>
                                    <ArrowDownToLine className="w-4 h-4" />
                                    Demander un versement
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Info Banner for Stripe Connect */}
                {wallet.method === 'STRIPE_CONNECT' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Paiements automatiques</h3>
                        <p className="text-sm text-blue-700">
                            Vos gains sont automatiquement transférés sur votre compte bancaire quand les startups effectuent le paiement. Vous recevrez l'argent 2-3 jours après leur paiement.
                        </p>
                    </div>
                )}

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

                    {wallet.commissions.length === 0 ? (
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
                            {wallet.commissions.map((commission) => (
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
