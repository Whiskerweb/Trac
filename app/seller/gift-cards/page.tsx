'use client'

import { useState, useEffect } from 'react'
import {
    Gift, Loader2, AlertCircle, CheckCircle2, X, ShoppingBag, Music, Gamepad2,
    CreditCard, Tv, Headphones, PlayCircle, ShoppingCart, Clock, ArrowLeft, Wallet
} from 'lucide-react'
import Link from 'next/link'

interface GiftCard {
    type: 'amazon' | 'itunes' | 'steam' | 'paypal_gift' | 'fnac' | 'google_play' | 'netflix' | 'spotify'
    name: string
    icon: React.ReactNode
    minAmount: number
    description: string
    color: string
}

interface Redemption {
    id: string
    cardType: string
    amount: number
    status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED'
    createdAt: string
    deliveredAt: string | null
    code: string | null
}

const GIFT_CARDS: GiftCard[] = [
    {
        type: 'amazon',
        name: 'Amazon',
        icon: <ShoppingBag className="w-7 h-7" />,
        minAmount: 1000, // 10EUR
        description: 'Carte cadeau Amazon France',
        color: 'from-orange-500 to-orange-600'
    },
    {
        type: 'fnac',
        name: 'Fnac / Darty',
        icon: <ShoppingCart className="w-7 h-7" />,
        minAmount: 1500, // 15EUR
        description: 'Carte cadeau Fnac et Darty',
        color: 'from-yellow-500 to-amber-600'
    },
    {
        type: 'itunes',
        name: 'iTunes / App Store',
        icon: <Music className="w-7 h-7" />,
        minAmount: 1500, // 15EUR
        description: 'Carte cadeau Apple',
        color: 'from-pink-500 to-rose-600'
    },
    {
        type: 'google_play',
        name: 'Google Play',
        icon: <PlayCircle className="w-7 h-7" />,
        minAmount: 1500, // 15EUR
        description: 'Carte cadeau Google Play Store',
        color: 'from-green-500 to-emerald-600'
    },
    {
        type: 'netflix',
        name: 'Netflix',
        icon: <Tv className="w-7 h-7" />,
        minAmount: 1500, // 15EUR
        description: 'Carte cadeau Netflix',
        color: 'from-red-600 to-red-700'
    },
    {
        type: 'spotify',
        name: 'Spotify',
        icon: <Headphones className="w-7 h-7" />,
        minAmount: 1000, // 10EUR
        description: 'Carte cadeau Spotify Premium',
        color: 'from-green-400 to-green-600'
    },
    {
        type: 'steam',
        name: 'Steam',
        icon: <Gamepad2 className="w-7 h-7" />,
        minAmount: 2000, // 20EUR
        description: 'Carte cadeau Steam',
        color: 'from-blue-600 to-indigo-600'
    },
    {
        type: 'paypal_gift',
        name: 'PayPal Gift',
        icon: <CreditCard className="w-7 h-7" />,
        minAmount: 1000, // 10EUR
        description: 'Carte cadeau PayPal',
        color: 'from-blue-500 to-cyan-500'
    }
]

const CARD_NAME_MAP: Record<string, string> = {
    amazon: 'Amazon',
    fnac: 'Fnac / Darty',
    itunes: 'iTunes / App Store',
    google_play: 'Google Play',
    netflix: 'Netflix',
    spotify: 'Spotify',
    steam: 'Steam',
    paypal_gift: 'PayPal Gift'
}

export default function GiftCardsPage() {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [balance, setBalance] = useState(0)
    const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)
    const [amount, setAmount] = useState('')
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [redemptions, setRedemptions] = useState<Redemption[]>([])
    const [loadingHistory, setLoadingHistory] = useState(true)

    useEffect(() => {
        loadWalletData()
        loadRedemptionHistory()
    }, [])

    async function loadWalletData() {
        try {
            setLoading(true)
            const response = await fetch('/api/seller/wallet')
            const data = await response.json()

            if (data.success && data.wallet) {
                setBalance(data.wallet.balance || 0)
            }
        } catch (err) {
            console.error('Failed to load wallet:', err)
        } finally {
            setLoading(false)
        }
    }

    async function loadRedemptionHistory() {
        try {
            setLoadingHistory(true)
            const response = await fetch('/api/seller/gift-card-history')
            const data = await response.json()

            if (data.success && data.redemptions) {
                setRedemptions(data.redemptions)
            }
        } catch (err) {
            console.error('Failed to load redemptions:', err)
        } finally {
            setLoadingHistory(false)
        }
    }

    async function handleRedeem() {
        if (!selectedCard || !amount) return

        const amountCents = Math.round(parseFloat(amount) * 100)

        if (amountCents < selectedCard.minAmount) {
            setNotification({
                type: 'error',
                message: `Montant minimum : ${selectedCard.minAmount / 100}EUR`
            })
            return
        }

        if (amountCents > balance) {
            setNotification({
                type: 'error',
                message: `Solde insuffisant. Disponible : ${balance / 100}EUR`
            })
            return
        }

        try {
            setSubmitting(true)
            const response = await fetch('/api/seller/redeem-gift-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardType: selectedCard.type,
                    amount: amountCents
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la demande')
            }

            if (data.success) {
                setNotification({
                    type: 'success',
                    message: `Demande de carte ${selectedCard.name} envoyee ! Vous recevrez un email sous 24-48h.`
                })
                setSelectedCard(null)
                setAmount('')
                await loadWalletData()
                await loadRedemptionHistory()
            }
        } catch (err) {
            setNotification({
                type: 'error',
                message: err instanceof Error ? err.message : 'Erreur reseau'
            })
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cents / 100)
    }

    const getStatusBadge = (status: Redemption['status']) => {
        const badges = {
            PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
            PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
            DELIVERED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Livree' },
            FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Echouee' }
        }
        const badge = badges[status]
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-5xl mx-auto">
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Gift className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Cartes Cadeaux</h1>
                        </div>
                        <p className="text-gray-600">Echangez votre solde contre des cartes cadeaux</p>
                    </div>
                    <Link
                        href="/seller/wallet"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <Wallet className="w-4 h-4" />
                        Voir le Wallet
                    </Link>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
                    <p className="text-violet-200 text-sm mb-1">Solde disponible</p>
                    <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
                    {balance < 1000 && (
                        <p className="text-violet-200 text-sm mt-2">
                            Minimum 10EUR requis pour echanger
                        </p>
                    )}
                </div>

                {/* Gift Cards Grid */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Choisissez une carte</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {GIFT_CARDS.map((card) => {
                            const isSelected = selectedCard?.type === card.type
                            const canAfford = balance >= card.minAmount

                            return (
                                <button
                                    key={card.type}
                                    onClick={() => canAfford && setSelectedCard(card)}
                                    disabled={!canAfford}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                                        isSelected
                                            ? 'border-violet-500 bg-violet-50'
                                            : canAfford
                                            ? 'border-gray-200 hover:border-violet-300 bg-white'
                                            : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white flex-shrink-0`}>
                                            {card.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 text-sm truncate">{card.name}</h3>
                                            <p className="text-xs text-gray-500">Min. {formatCurrency(card.minAmount)}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{card.description}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Amount Input */}
                {selectedCard && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                        <h3 className="font-semibold text-gray-900 mb-4">
                            Montant de la carte {selectedCard.name}
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder={`Min. ${selectedCard.minAmount / 100}EUR`}
                                        min={selectedCard.minAmount / 100}
                                        max={balance / 100}
                                        step="5"
                                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">EUR</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Max disponible: {formatCurrency(balance)}
                                </p>
                            </div>
                            <button
                                onClick={handleRedeem}
                                disabled={submitting || !amount || parseFloat(amount) < selectedCard.minAmount / 100}
                                className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <Gift className="w-5 h-5" />
                                        Demander
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Redemption History */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des demandes</h2>

                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : redemptions.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-600 mb-1">Aucune demande</p>
                            <p className="text-sm text-gray-500">
                                Vos demandes de cartes cadeaux apparaitront ici
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {redemptions.map((redemption) => (
                                <div
                                    key={redemption.id}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <Gift className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {CARD_NAME_MAP[redemption.cardType] || redemption.cardType}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(redemption.createdAt).toLocaleDateString('fr-FR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-gray-900">
                                            {formatCurrency(redemption.amount)}
                                        </span>
                                        {getStatusBadge(redemption.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">Comment ca marche ?</h3>
                    <div className="space-y-2 text-sm text-blue-700">
                        <p>1. Selectionnez le type de carte cadeau que vous souhaitez</p>
                        <p>2. Choisissez le montant (minimum selon le type de carte)</p>
                        <p>3. Votre demande est envoyee a notre equipe</p>
                        <p>4. Vous recevrez votre carte par email sous 24-48h</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-blue-800">
                            Vous pouvez aussi connecter Stripe pour retirer en cash !{' '}
                            <Link href="/seller/settings" className="underline font-medium">
                                Configurer Stripe
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
