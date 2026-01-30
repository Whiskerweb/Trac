'use client'

import { useState, useEffect } from 'react'
import {
    Wallet, TrendingUp, Clock, CheckCircle2,
    ArrowDownToLine, DollarSign, Loader2,
    AlertCircle, ExternalLink, X, Gift, Zap, CreditCard
} from 'lucide-react'
import Link from 'next/link'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: 'PENDING' | 'PROCEED' | 'COMPLETE'
    created_at: string
    matured_at?: string | null
    hold_days?: number
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

export default function SellerWalletPage() {
    const [loading, setLoading] = useState(true)
    const [withdrawing, setWithdrawing] = useState(false)
    const [error, setError] = useState<string | null>(null)
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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load wallet')
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

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cents / 100)
    }

    const getStatusBadge = (status: Commission['status']) => {
        const badges = {
            PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
            PROCEED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Disponible' },
            COMPLETE: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Versé' }
        }
        const badge = badges[status]
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        )
    }

    const getMaturationInfo = (commission: Commission) => {
        if (commission.status !== 'PENDING') return null

        const holdDays = commission.hold_days || 30
        const createdAt = new Date(commission.created_at)
        const maturesAt = new Date(createdAt.getTime() + holdDays * 24 * 60 * 60 * 1000)
        const now = new Date()
        const daysLeft = Math.ceil((maturesAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        if (daysLeft > 0) {
            return (
                <span className="text-xs text-orange-600">
                    Mature dans {daysLeft}j
                </span>
            )
        }
        return (
            <span className="text-xs text-green-600">
                Prêt pour payout
            </span>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link
                        href="/seller"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Retour au dashboard
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Notification */}
                {notification && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
                        notification.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                        <div className="flex items-center gap-3">
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="w-5 h-5" />
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
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Le Wallet</h1>
                    </div>
                    <p className="text-slate-600">Gérez vos gains et vos versements</p>
                </div>

                {/* Main Balance Card */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
                    {wallet.method === 'STRIPE_CONNECT' ? (
                        // STRIPE CONNECT MODE: Automatic payouts
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-5 h-5 text-yellow-300" />
                                <span className="text-purple-100 text-sm font-medium">Paiements automatiques activés</span>
                            </div>
                            <p className="text-purple-200 text-sm mb-1">Prochain versement</p>
                            <p className="text-4xl font-bold mb-2">{formatCurrency(wallet.due || 0)}</p>
                            <p className="text-purple-200 text-sm">
                                +{formatCurrency(wallet.pending || 0)} en maturation (30j)
                            </p>

                            {/* 10€ Minimum Threshold Message */}
                            {wallet.due > 0 && wallet.due < 1000 && (
                                <div className="mt-6 bg-amber-400/20 backdrop-blur-sm rounded-xl p-4 border border-amber-400/30">
                                    <div className="flex items-center gap-3 mb-2">
                                        <AlertCircle className="w-5 h-5 text-amber-300" />
                                        <div>
                                            <p className="font-medium text-white">
                                                Retirable à partir de 10€
                                            </p>
                                            <p className="text-sm text-purple-100">
                                                Vous avez {formatCurrency(wallet.due)} - Il vous manque {formatCurrency(1000 - wallet.due)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500"
                                            style={{ width: `${Math.min((wallet.due / 1000) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-purple-200 mt-2 text-right">
                                        {((wallet.due / 1000) * 100).toFixed(0)}% du minimum
                                    </p>
                                </div>
                            )}

                            {wallet.due === 0 && wallet.pending > 0 && (
                                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <p className="text-sm text-purple-100 mb-2">
                                        ⏳ Vos commissions sont en maturation. Elles seront disponibles après 30 jours.
                                    </p>
                                </div>
                            )}

                            {wallet.due >= 1000 && (
                                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <p className="text-sm text-purple-100 mb-2">
                                        💳 Vos gains sont automatiquement transférés sur votre compte bancaire quand les startups paient.
                                    </p>
                                    <p className="text-xs text-purple-200">
                                        Délai de réception : 2-3 jours après paiement startup
                                    </p>
                                </div>
                            )}

                            {wallet.due === 0 && wallet.pending === 0 && (
                                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <p className="text-sm text-purple-100 mb-2">
                                        💳 Vos gains sont automatiquement transférés sur votre compte bancaire quand les startups paient.
                                    </p>
                                    <p className="text-xs text-purple-200">
                                        Délai de réception : 2-3 jours après paiement startup
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // PLATFORM WALLET MODE: Manual withdraw or gift cards
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-200 text-sm mb-1">Solde wallet Traaaction</p>
                                <p className="text-4xl font-bold">{formatCurrency(wallet.balance || 0)}</p>
                                <p className="text-purple-200 text-sm mt-2">
                                    +{formatCurrency(wallet.pending || 0)} en maturation (30j)
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/seller/gift-cards"
                                    className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Gift className="w-5 h-5" />
                                    Cartes cadeaux
                                </Link>
                                <Link
                                    href="/seller/account?tab=payout"
                                    className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2 whitespace-nowrap text-sm"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Connecter Stripe
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">Total gagné</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(wallet.pending + (wallet.balance || 0) + (wallet.due || 0) + wallet.paid_total)}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">{wallet.commissions.length} commissions</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">En maturation</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.pending || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">Disponible dans 30 jours</div>
                    </div>

                    {wallet.method === 'STRIPE_CONNECT' ? (
                        <div className={`bg-white border rounded-2xl p-6 ${
                            wallet.due > 0 && wallet.due < 1000
                                ? 'border-amber-300 bg-amber-50/50'
                                : 'border-slate-200'
                        }`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${
                                    wallet.due > 0 && wallet.due < 1000
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {wallet.due > 0 && wallet.due < 1000 ? (
                                        <AlertCircle className="w-5 h-5" />
                                    ) : (
                                        <Zap className="w-5 h-5" />
                                    )}
                                </div>
                                <span className="text-slate-600 text-sm">Prochain versement</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.due || 0)}</div>
                            {wallet.due > 0 && wallet.due < 1000 ? (
                                <div className="text-sm text-amber-600 mt-1">
                                    Min. 10€ • -{formatCurrency(1000 - wallet.due)}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 mt-1">Transfert auto 2-3j</div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <span className="text-slate-600 text-sm">Wallet actuel</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.balance || 0)}</div>
                            <div className="text-sm text-slate-500 mt-1">Disponible maintenant</div>
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                                <ArrowDownToLine className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">Versé</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(wallet.paid_total || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">Total historique</div>
                    </div>
                </div>

                {/* Commission History */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Historique des commissions</h2>

                    {wallet.commissions.length === 0 ? (
                        <div className="text-center py-12">
                            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 mb-2">Aucune commission pour le moment</p>
                            <p className="text-sm text-slate-500">
                                Partagez votre lien pour commencer à gagner
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {wallet.commissions.map((commission) => (
                                <div
                                    key={commission.id}
                                    className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-slate-900">
                                                {formatCurrency(commission.commission_amount)}
                                            </span>
                                            {getStatusBadge(commission.status)}
                                            {getMaturationInfo(commission)}
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Vente: {formatCurrency(commission.gross_amount)} • {new Date(commission.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">💡 Comment ça fonctionne</h3>
                    {wallet.method === 'STRIPE_CONNECT' ? (
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">1. Maturation (30j)</p>
                                <p className="text-blue-700 text-sm">
                                    Les commissions restent en attente 30 jours pour éviter les fraudes/refunds
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">2. Startup paie</p>
                                <p className="text-blue-700 text-sm">
                                    Après 30j, la startup paie votre commission + 15% frais plateforme
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">3. Transfert auto</p>
                                <p className="text-blue-700 text-sm">
                                    Votre argent est automatiquement transféré sur votre compte bancaire (2-3j)
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">1. Maturation (30j)</p>
                                <p className="text-blue-700 text-sm">
                                    Les commissions restent en attente 30 jours pour éviter les fraudes/refunds
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">2. Wallet Traaaction</p>
                                <p className="text-blue-700 text-sm">
                                    Après paiement startup, votre argent arrive sur votre wallet Traaaction
                                </p>
                            </div>
                            <div>
                                <p className="font-medium text-blue-900 text-sm mb-1">3. Utilisation</p>
                                <p className="text-blue-700 text-sm">
                                    Échangez contre cartes cadeaux ou connectez Stripe pour retirer en cash
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
