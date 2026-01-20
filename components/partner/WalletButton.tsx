'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Wallet, X, CreditCard, Building2, Gift, Check, Loader2, ExternalLink } from 'lucide-react'

interface WalletData {
    payoutMethod: string
    stripeStatus: string
    stripeConnectId: string | null
    paypalEmail: string | null
    balance: {
        pending: number
        due: number
        total: number
    }
}

export function WalletButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [data, setData] = useState<WalletData | null>(null)
    const [selectedMethod, setSelectedMethod] = useState<string>('PLATFORM')
    const [mounted, setMounted] = useState(false)

    // Mount check for portal
    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    async function loadData() {
        setLoading(true)
        try {
            const res = await fetch('/api/partner/payout-method')
            const json = await res.json()
            if (json.success) {
                setData(json)
                setSelectedMethod(json.payoutMethod)
            }
        } catch (err) {
            console.error('Failed to load wallet data:', err)
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        try {
            const res = await fetch('/api/partner/payout-method', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payoutMethod: selectedMethod })
            })
            const json = await res.json()
            if (json.success) {
                await loadData()
            }
        } catch (err) {
            console.error('Failed to save:', err)
        }
        setSaving(false)
    }

    async function handleConnectStripe() {
        setConnecting(true)
        try {
            const res = await fetch('/api/partner/connect', { method: 'POST' })
            const json = await res.json()
            if (json.url) {
                window.location.href = json.url
            }
        } catch (err) {
            console.error('Failed to connect Stripe:', err)
        }
        setConnecting(false)
    }

    const formatAmount = (cents: number) => `${(cents / 100).toFixed(2)}€`

    return (
        <>
            {/* Wallet Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
                <Wallet className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-medium">
                    {data?.balance.due ? formatAmount(data.balance.due) : 'Wallet'}
                </span>
            </button>

            {/* Modal - rendered via Portal to bypass backdrop-filter containment */}
            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 z-[9999]">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[9999]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Centering Container */}
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
                        {/* Modal Content */}
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">Configuration des paiements</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {loading ? (
                                <div className="p-12 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : (
                                <>
                                    {/* Balance Summary */}
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">En attente</p>
                                                <p className="font-semibold text-gray-900">{formatAmount(data?.balance.pending || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Disponible</p>
                                                <p className="font-semibold text-green-600">{formatAmount(data?.balance.due || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Total reçu</p>
                                                <p className="font-semibold text-gray-900">{formatAmount(data?.balance.total || 0)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payout Method Selection */}
                                    <div className="p-6 space-y-4">
                                        <p className="text-sm font-medium text-gray-700">Méthode de paiement</p>

                                        {/* Stripe Connect Option */}
                                        <label
                                            className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${selectedMethod === 'STRIPE_CONNECT'
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="payoutMethod"
                                                value="STRIPE_CONNECT"
                                                checked={selectedMethod === 'STRIPE_CONNECT'}
                                                onChange={(e) => setSelectedMethod(e.target.value)}
                                                disabled={data?.stripeStatus === 'not_connected'}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4 text-gray-600" />
                                                    <span className="font-medium text-gray-900">Paiement direct (Stripe)</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Recevez vos gains directement sur votre compte bancaire
                                                </p>

                                                {/* Stripe Status */}
                                                {data?.stripeStatus === 'not_connected' && (
                                                    <button
                                                        onClick={handleConnectStripe}
                                                        disabled={connecting}
                                                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                                                    >
                                                        {connecting ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <ExternalLink className="w-3 h-3" />
                                                        )}
                                                        Connecter Stripe
                                                    </button>
                                                )}
                                                {data?.stripeStatus === 'pending' && (
                                                    <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                                                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                                                        Vérification en cours
                                                    </span>
                                                )}
                                                {data?.stripeStatus === 'active' && (
                                                    <span className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                                                        <Check className="w-3 h-3" />
                                                        Compte vérifié
                                                    </span>
                                                )}
                                            </div>
                                        </label>

                                        {/* Platform Balance Option */}
                                        <label
                                            className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${selectedMethod === 'PLATFORM'
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="payoutMethod"
                                                value="PLATFORM"
                                                checked={selectedMethod === 'PLATFORM'}
                                                onChange={(e) => setSelectedMethod(e.target.value)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-gray-600" />
                                                    <span className="font-medium text-gray-900">Solde Traaaction</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Gardez vos gains sur la plateforme
                                                </p>
                                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Gift className="w-3 h-3" />
                                                        Cartes cadeaux
                                                    </span>
                                                    <span>•</span>
                                                    <span>Connectez Stripe plus tard</span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || (selectedMethod === 'STRIPE_CONNECT' && data?.stripeStatus === 'not_connected')}
                                            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Enregistrer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
