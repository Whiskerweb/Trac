'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

type CardType = 'amazon' | 'itunes' | 'steam' | 'paypal_gift' | 'fnac' | 'google_play' | 'netflix' | 'spotify'

interface GiftCard {
    type: CardType
    name: string
    minAmount: number
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
    { type: 'amazon', name: 'Amazon', minAmount: 1000 },
    { type: 'fnac', name: 'Fnac', minAmount: 1500 },
    { type: 'itunes', name: 'Apple', minAmount: 1500 },
    { type: 'google_play', name: 'Google Play', minAmount: 1500 },
    { type: 'netflix', name: 'Netflix', minAmount: 1500 },
    { type: 'spotify', name: 'Spotify', minAmount: 1000 },
    { type: 'steam', name: 'Steam', minAmount: 2000 },
    { type: 'paypal_gift', name: 'PayPal', minAmount: 1000 },
]

const CARD_NAME_MAP: Record<string, string> = {
    amazon: 'Amazon',
    fnac: 'Fnac',
    itunes: 'Apple',
    google_play: 'Google Play',
    netflix: 'Netflix',
    spotify: 'Spotify',
    steam: 'Steam',
    paypal_gift: 'PayPal'
}

export default function GiftCardsPage() {
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [balance, setBalance] = useState(0)
    const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null)
    const [amount, setAmount] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [redemptions, setRedemptions] = useState<Redemption[]>([])
    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            setLoading(true)
            const [walletRes, historyRes] = await Promise.all([
                fetch('/api/seller/wallet'),
                fetch('/api/seller/gift-card-history')
            ])
            const walletData = await walletRes.json()
            const historyData = await historyRes.json()

            if (walletData.success && walletData.wallet) {
                setBalance(walletData.wallet.balance || 0)
            }
            if (historyData.success && historyData.redemptions) {
                setRedemptions(historyData.redemptions)
            }
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleRedeem() {
        if (!selectedCard || !amount) return

        const amountCents = Math.round(parseFloat(amount) * 100)

        if (amountCents < selectedCard.minAmount) {
            setError(`Minimum ${selectedCard.minAmount / 100} EUR`)
            return
        }

        if (amountCents > balance) {
            setError('Insufficient balance')
            return
        }

        try {
            setSubmitting(true)
            setError(null)
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
                throw new Error(data.error || 'Error')
            }

            if (data.success) {
                setSuccess(true)
                setTimeout(() => {
                    setSuccess(false)
                    setSelectedCard(null)
                    setAmount('')
                    loadData()
                }, 2000)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error')
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(cents / 100)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        })
    }

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                    <span className="text-xs text-neutral-400 tracking-wide">Loading</span>
                </motion.div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-xl mx-auto py-8"
        >
            {/* Back link */}
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8"
            >
                <Link
                    href="/seller/wallet"
                    className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Back to wallet
                </Link>
            </motion.div>

            {/* Balance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-12"
            >
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    Available balance
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extralight tracking-tight text-neutral-900">
                        {formatCurrency(balance)}
                    </span>
                    <span className="text-lg font-light text-neutral-300">EUR</span>
                </div>
            </motion.div>

            {/* Card Selection */}
            <AnimatePresence mode="wait">
                {!selectedCard ? (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <p className="text-xs uppercase tracking-[0.15em] text-neutral-400 mb-6">
                            Choose a card
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {GIFT_CARDS.map((card, index) => {
                                const canAfford = balance >= card.minAmount
                                return (
                                    <motion.button
                                        key={card.type}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        onClick={() => canAfford && setSelectedCard(card)}
                                        disabled={!canAfford}
                                        className={`group relative p-5 rounded-2xl text-left transition-all duration-300 ${
                                            canAfford
                                                ? 'bg-white hover:shadow-lg hover:shadow-neutral-200/60 cursor-pointer'
                                                : 'bg-neutral-50 opacity-40 cursor-not-allowed'
                                        }`}
                                    >
                                        <p className="font-medium text-neutral-900 mb-1">{card.name}</p>
                                        <p className="text-xs text-neutral-400">
                                            Min. {formatCurrency(card.minAmount)} EUR
                                        </p>
                                        {canAfford && (
                                            <div className="absolute top-4 right-4 w-5 h-5 rounded-full border border-neutral-200 group-hover:border-neutral-900 group-hover:bg-neutral-900 transition-all flex items-center justify-center">
                                                <Check className="w-3 h-3 text-transparent group-hover:text-white transition-colors" />
                                            </div>
                                        )}
                                    </motion.button>
                                )
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="amount"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl p-8"
                    >
                        {/* Success state */}
                        <AnimatePresence>
                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                        className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4"
                                    >
                                        <Check className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <p className="text-neutral-900 font-medium">Request sent</p>
                                    <p className="text-sm text-neutral-400 mt-1">Email within 24-48h</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="font-medium text-neutral-900">{selectedCard.name}</p>
                                <p className="text-xs text-neutral-400">Min. {formatCurrency(selectedCard.minAmount)} EUR</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedCard(null)
                                    setAmount('')
                                    setError(null)
                                }}
                                className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                Change
                            </button>
                        </div>

                        {/* Amount input */}
                        <div className="mb-6">
                            <div className="relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value)
                                        setError(null)
                                    }}
                                    placeholder="0"
                                    min={selectedCard.minAmount / 100}
                                    max={balance / 100}
                                    step="5"
                                    className="w-full text-center text-4xl font-light text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-200"
                                    autoFocus
                                />
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg text-neutral-300">EUR</span>
                            </div>
                            <div className="h-px bg-neutral-100 mt-2" />
                            <div className="flex justify-between mt-3 text-xs text-neutral-400">
                                <span>Min. {formatCurrency(selectedCard.minAmount)}</span>
                                <span>Max. {formatCurrency(balance)}</span>
                            </div>
                        </div>

                        {/* Quick amounts */}
                        <div className="flex gap-2 mb-6">
                            {[10, 25, 50, 100].map((val) => {
                                const cents = val * 100
                                const canSelect = balance >= cents && cents >= selectedCard.minAmount
                                return (
                                    <button
                                        key={val}
                                        onClick={() => canSelect && setAmount(val.toString())}
                                        disabled={!canSelect}
                                        className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                                            canSelect
                                                ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                                : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                                        } ${amount === val.toString() ? 'ring-2 ring-neutral-900' : ''}`}
                                    >
                                        {val}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-sm text-red-500 text-center mb-4"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <button
                            onClick={handleRedeem}
                            disabled={submitting || !amount || parseFloat(amount) < selectedCard.minAmount / 100}
                            className="w-full py-4 bg-neutral-900 text-white rounded-xl font-medium transition-all hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'Confirm'
                            )}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* History toggle */}
            {redemptions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-12"
                >
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full text-left text-xs uppercase tracking-[0.15em] text-neutral-400 hover:text-neutral-600 transition-colors flex items-center gap-2"
                    >
                        <span className={`w-4 h-px bg-neutral-300 transition-transform ${showHistory ? 'rotate-0' : '-rotate-45'}`} />
                        History ({redemptions.length})
                    </button>

                    <AnimatePresence>
                        {showHistory && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-6 space-y-2">
                                    {redemptions.map((r, index) => (
                                        <motion.div
                                            key={r.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.03 * index }}
                                            className={`py-3 ${r.status === 'DELIVERED' && r.code ? 'bg-neutral-50 rounded-xl px-4 -mx-4' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        r.status === 'DELIVERED' ? 'bg-green-500' :
                                                        r.status === 'FAILED' ? 'bg-red-400' :
                                                        'bg-amber-400'
                                                    }`} />
                                                    <div>
                                                        <p className="text-sm text-neutral-700">{CARD_NAME_MAP[r.cardType]}</p>
                                                        <p className="text-xs text-neutral-400">{formatDate(r.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <p className="font-medium text-neutral-900 tabular-nums text-sm">
                                                    {formatCurrency(r.amount)} EUR
                                                </p>
                                            </div>
                                            {/* Show code if delivered */}
                                            {r.status === 'DELIVERED' && r.code && (
                                                <div className="mt-3 pt-3 border-t border-neutral-200">
                                                    <p className="text-xs text-neutral-400 mb-1">Code</p>
                                                    <p className="font-mono text-sm font-medium text-neutral-900 select-all">{r.code}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Info footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 text-center text-xs text-neutral-400"
            >
                Card sent by email within 24-48h
            </motion.p>
        </motion.div>
    )
}
