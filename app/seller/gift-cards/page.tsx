'use client'

import { useState, useEffect } from 'react'
import {
    Gift, Loader2, AlertCircle, CheckCircle2, X, ShoppingBag, Music, Gamepad2, CreditCard
} from 'lucide-react'
import Link from 'next/link'

interface GiftCard {
    type: 'amazon' | 'itunes' | 'steam' | 'paypal_gift'
    name: string
    icon: React.ReactNode
    minAmount: number
    description: string
    color: string
}

const GIFT_CARDS: GiftCard[] = [
    {
        type: 'amazon',
        name: 'Amazon',
        icon: <ShoppingBag className="w-8 h-8" />,
        minAmount: 1000, // 10€
        description: 'Carte cadeau Amazon France',
        color: 'from-orange-500 to-orange-600'
    },
    {
        type: 'itunes',
        name: 'iTunes / App Store',
        icon: <Music className="w-8 h-8" />,
        minAmount: 1500, // 15€
        description: 'Carte cadeau Apple',
        color: 'from-purple-500 to-pink-500'
    },
    {
        type: 'steam',
        name: 'Steam',
        icon: <Gamepad2 className="w-8 h-8" />,
        minAmount: 2000, // 20€
        description: 'Carte cadeau Steam',
        color: 'from-blue-600 to-indigo-600'
    },
    {
        type: 'paypal_gift',
        name: 'PayPal Gift',
        icon: <CreditCard className="w-8 h-8" />,
        minAmount: 1000, // 10€
        description: 'Carte cadeau PayPal',
        color: 'from-blue-500 to-cyan-500'
    }
]

export default function GiftCardsPage() {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [balance, setBalance] = useState(0)
    const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)
    const [amount, setAmount] = useState('')
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [pendingRedemptions, setPendingRedemptions] = useState<any[]>([])

    useEffect(() => {
        loadWalletData()
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

    async function handleRedeem() {
        if (!selectedCard || !amount) return

        const amountCents = Math.round(parseFloat(amount) * 100)

        if (amountCents < selectedCard.minAmount) {
            setNotification({
                type: 'error',
                message: `Montant minimum : ${selectedCard.minAmount / 100}€`
            })
            return
        }

        if (amountCents > balance) {
            setNotification({
                type: 'error',
                message: `Solde insuffisant. Disponible : ${balance / 100}€`
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
                    message: `Demande de carte ${selectedCard.name} envoyée ! Vous recevrez un email sous 24-48h.`
                })
                setSelectedCard(null)
                setAmount('')
                await loadWalletData()
            }
        } catch (err) {
            setNotification({
                type: 'error',
                message: err instanceof Error ? err.message : 'Erreur réseau'
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-6">
            <div className="max-w-4xl mx-auto">
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
                            <Gift className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Cartes Cadeaux</h1>
                    </div>
                    <p className="text-slate-600">Échangez votre solde contre des cartes cadeaux</p>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white mb-8">
                    <p className="text-purple-200 text-sm mb-1">Solde disponible</p>
                    <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
                </div>

                {/* Gift Cards Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {GIFT_CARDS.map((card) => {
                        const isSelected = selectedCard?.type === card.type
                        const canAfford = balance >= card.minAmount

                        return (
                            <button
                                key={card.type}
                                onClick={() => canAfford && setSelectedCard(card)}
                                disabled={!canAfford}
                                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                                    isSelected
                                        ? 'border-purple-500 bg-purple-50'
                                        : canAfford
                                        ? 'border-slate-200 hover:border-purple-300 bg-white'
                                        : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white flex-shrink-0`}>
                                        {card.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 mb-1">{card.name}</h3>
                                        <p className="text-sm text-slate-600 mb-2">{card.description}</p>
                                        <p className="text-xs text-slate-500">
                                            Minimum : {formatCurrency(card.minAmount)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Amount Input */}
                {selectedCard && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
                        <h3 className="font-semibold text-slate-900 mb-4">
                            Montant de la carte {selectedCard.name}
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder={`Min. ${selectedCard.minAmount / 100}€`}
                                    min={selectedCard.minAmount / 100}
                                    max={balance / 100}
                                    step="1"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleRedeem}
                                disabled={submitting || !amount || parseFloat(amount) < selectedCard.minAmount / 100}
                                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Comment ça marche ?</h3>
                    <div className="space-y-2 text-sm text-blue-700">
                        <p>1. Sélectionnez le type de carte cadeau que vous souhaitez</p>
                        <p>2. Choisissez le montant (minimum selon le type de carte)</p>
                        <p>3. Votre demande est envoyée à notre équipe</p>
                        <p>4. Vous recevrez votre carte par email sous 24-48h</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-blue-800">
                            💡 Vous pouvez aussi connecter Stripe pour retirer en cash !{' '}
                            <Link href="/seller/account?tab=payout" className="underline font-medium">
                                Configurer Stripe
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
