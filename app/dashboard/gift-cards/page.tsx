'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Gift,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Copy,
    ExternalLink,
    ChevronDown,
    Search
} from 'lucide-react'

interface GiftCardRedemption {
    id: string
    seller_id: string
    seller_email: string
    seller_name: string | null
    card_type: string
    amount: number
    status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED'
    gift_card_code: string | null
    created_at: string
    delivered_at: string | null
}

const STATUS_CONFIG = {
    PENDING: {
        label: 'En attente',
        color: 'bg-amber-100 text-amber-700',
        icon: Clock
    },
    PROCESSING: {
        label: 'En cours',
        color: 'bg-blue-100 text-blue-700',
        icon: Loader2
    },
    DELIVERED: {
        label: 'Livré',
        color: 'bg-emerald-100 text-emerald-700',
        icon: CheckCircle2
    },
    FAILED: {
        label: 'Échoué',
        color: 'bg-red-100 text-red-700',
        icon: XCircle
    },
}

const CARD_TYPE_INFO: Record<string, { name: string; buyUrl: string }> = {
    amazon: { name: 'Amazon', buyUrl: 'https://www.amazon.fr/dp/B07PDHSPYD' },
    itunes: { name: 'iTunes / App Store', buyUrl: 'https://www.apple.com/fr/shop/gift-cards' },
    steam: { name: 'Steam', buyUrl: 'https://store.steampowered.com/digitalgiftcards/' },
    paypal_gift: { name: 'PayPal', buyUrl: 'https://www.paypal.com/fr/gifts' },
    fnac: { name: 'Fnac', buyUrl: 'https://www.fnac.com/carte-cadeau' },
    google_play: { name: 'Google Play', buyUrl: 'https://play.google.com/intl/fr_fr/about/giftcards/' },
    netflix: { name: 'Netflix', buyUrl: 'https://www.netflix.com/fr/gift-cards' },
    spotify: { name: 'Spotify', buyUrl: 'https://www.spotify.com/fr/gift-cards/' },
}

export default function GiftCardsAdminPage() {
    const [redemptions, setRedemptions] = useState<GiftCardRedemption[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'DELIVERED'>('all')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [codeInput, setCodeInput] = useState<Record<string, string>>({})
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        loadRedemptions()
    }, [])

    async function loadRedemptions() {
        try {
            const res = await fetch('/api/admin/gift-cards')
            const data = await res.json()
            if (data.success) {
                setRedemptions(data.redemptions)
            }
        } catch (error) {
            console.error('Failed to load redemptions:', error)
        } finally {
            setLoading(false)
        }
    }

    async function markAsDelivered(redemptionId: string) {
        const code = codeInput[redemptionId]
        if (!code?.trim()) {
            alert('Veuillez entrer le code de la carte cadeau')
            return
        }

        setProcessingId(redemptionId)
        try {
            const res = await fetch('/api/admin/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    redemptionId,
                    action: 'deliver',
                    code: code.trim()
                })
            })
            const data = await res.json()
            if (data.success) {
                await loadRedemptions()
                setCodeInput(prev => ({ ...prev, [redemptionId]: '' }))
                setExpandedId(null)
            } else {
                alert(data.error || 'Erreur lors de la livraison')
            }
        } catch (error) {
            console.error('Failed to deliver:', error)
            alert('Erreur lors de la livraison')
        } finally {
            setProcessingId(null)
        }
    }

    async function markAsFailed(redemptionId: string) {
        if (!confirm('Marquer comme échoué ? Le solde sera recrédité au seller.')) return

        setProcessingId(redemptionId)
        try {
            const res = await fetch('/api/admin/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ redemptionId, action: 'fail' })
            })
            const data = await res.json()
            if (data.success) {
                await loadRedemptions()
            } else {
                alert(data.error || 'Erreur')
            }
        } catch (error) {
            console.error('Failed:', error)
        } finally {
            setProcessingId(null)
        }
    }

    const filteredRedemptions = redemptions.filter(r => {
        if (filter === 'all') return true
        return r.status === filter
    })

    const pendingCount = redemptions.filter(r => r.status === 'PENDING').length
    const totalPendingAmount = redemptions
        .filter(r => r.status === 'PENDING')
        .reduce((sum, r) => sum + r.amount, 0)

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-light text-neutral-900 mb-2">
                    Gift Cards
                </h1>
                <p className="text-sm text-neutral-500">
                    Gérer les demandes de cartes cadeaux des sellers
                </p>
            </div>

            {/* Stats */}
            {pendingCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                <Gift className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-medium text-amber-900">
                                    {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
                                </p>
                                <p className="text-sm text-amber-700">
                                    Total: {(totalPendingAmount / 100).toFixed(0)}€ à traiter
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {(['all', 'PENDING', 'DELIVERED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                            filter === f
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                    >
                        {f === 'all' ? 'Toutes' : f === 'PENDING' ? 'En attente' : 'Livrées'}
                    </button>
                ))}
            </div>

            {/* List */}
            {filteredRedemptions.length === 0 ? (
                <div className="text-center py-16 text-neutral-400">
                    <Gift className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredRedemptions.map((redemption) => {
                            const status = STATUS_CONFIG[redemption.status]
                            const StatusIcon = status.icon
                            const cardInfo = CARD_TYPE_INFO[redemption.card_type]
                            const isExpanded = expandedId === redemption.id

                            return (
                                <motion.div
                                    key={redemption.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
                                >
                                    {/* Main row */}
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
                                        onClick={() => setExpandedId(isExpanded ? null : redemption.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                                                <Gift className="w-5 h-5 text-neutral-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-neutral-900">
                                                        {cardInfo?.name || redemption.card_type}
                                                    </span>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-neutral-500">
                                                    {redemption.seller_name || redemption.seller_email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-medium text-neutral-900">
                                                {(redemption.amount / 100).toFixed(0)}€
                                            </span>
                                            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-neutral-100"
                                            >
                                                <div className="p-4 bg-neutral-50 space-y-4">
                                                    {/* Details */}
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-neutral-500">Seller</p>
                                                            <p className="text-neutral-900">{redemption.seller_email}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-neutral-500">Date demande</p>
                                                            <p className="text-neutral-900">
                                                                {new Date(redemption.created_at).toLocaleDateString('fr-FR', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {redemption.status === 'PENDING' && (
                                                        <>
                                                            {/* Buy link */}
                                                            {cardInfo && (
                                                                <a
                                                                    href={cardInfo.buyUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                    Acheter une carte {cardInfo.name}
                                                                </a>
                                                            )}

                                                            {/* Code input */}
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Entrer le code de la carte..."
                                                                    value={codeInput[redemption.id] || ''}
                                                                    onChange={(e) => setCodeInput(prev => ({
                                                                        ...prev,
                                                                        [redemption.id]: e.target.value
                                                                    }))}
                                                                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                                                />
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => markAsDelivered(redemption.id)}
                                                                    disabled={processingId === redemption.id}
                                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {processingId === redemption.id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                    )}
                                                                    Marquer comme livré
                                                                </button>
                                                                <button
                                                                    onClick={() => markAsFailed(redemption.id)}
                                                                    disabled={processingId === redemption.id}
                                                                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                                                >
                                                                    Échoué
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}

                                                    {redemption.status === 'DELIVERED' && redemption.gift_card_code && (
                                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                            <span className="text-sm text-emerald-700">Code livré:</span>
                                                            <code className="px-2 py-1 bg-white rounded text-sm font-mono">
                                                                {redemption.gift_card_code}
                                                            </code>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(redemption.gift_card_code!)}
                                                                className="p-1 hover:bg-emerald-100 rounded"
                                                            >
                                                                <Copy className="w-4 h-4 text-emerald-600" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Automation note */}
            <div className="mt-12 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-2">
                    💡 Automatisation disponible
                </h3>
                <p className="text-sm text-neutral-500">
                    Intégrez Tremendous, Tango Card ou Runa pour automatiser l'achat et la livraison des cartes cadeaux.
                    L'infrastructure est prête pour l'intégration API.
                </p>
            </div>
        </div>
    )
}
