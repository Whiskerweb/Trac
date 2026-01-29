'use client'

import { useState, useEffect } from 'react'
import { Loader2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface PendingCommission {
    id: string
    seller: string
    amount: number
    grossAmount: number
    createdAt: string
    daysOld: number
}

export default function AdminDebugPage() {
    const [commissions, setCommissions] = useState<PendingCommission[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Vérifier qu'on est en dev (utilise NEXT_PUBLIC_ car côté client)
    const isDev = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true'

    useEffect(() => {
        loadPendingCommissions()
    }, [])

    async function loadPendingCommissions() {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/force-mature')
            const data = await response.json()

            if (data.success) {
                setCommissions(data.commissions || [])
            }
        } catch (error) {
            console.error('Erreur chargement commissions:', error)
        } finally {
            setLoading(false)
        }
    }

    async function forceMature(commissionId: string) {
        setProcessing(commissionId)
        setMessage(null)

        try {
            const response = await fetch('/api/admin/force-mature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commissionId })
            })

            const data = await response.json()

            if (data.success) {
                setMessage({ type: 'success', text: 'Commission passée en PROCEED !' })
                // Recharger la liste
                await loadPendingCommissions()
            } else {
                setMessage({ type: 'error', text: data.error || 'Erreur inconnue' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erreur réseau' })
        } finally {
            setProcessing(null)
        }
    }

    if (!isDev) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900">Accès refusé</h1>
                    <p className="text-gray-500 mt-2">Cette page est uniquement disponible en développement</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    <h1 className="text-2xl font-bold text-gray-900">Admin Debug - Force Maturation</h1>
                </div>
                <p className="text-gray-500 text-sm">
                    Bypass le délai de 30 jours pour tester le flow de paiement immédiatement
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-yellow-700 font-medium">
                            ⚠️ Outil de développement uniquement
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Cet endpoint force les commissions PENDING à passer en PROCEED pour tester le système de paiement.
                            Désactivé automatiquement en production.
                        </p>
                    </div>
                </div>
            </div>

            {/* Message feedback */}
            {message && (
                <div className={`p-4 rounded-lg mb-6 ${
                    message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                        <p className={`text-sm font-medium ${
                            message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                            {message.text}
                        </p>
                    </div>
                </div>
            )}

            {/* Commissions PENDING */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Commissions en attente ({commissions.length})
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Cliquez sur "Forcer PROCEED" pour bypasser le délai de 30 jours
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : commissions.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="text-gray-500">Aucune commission PENDING</p>
                        <p className="text-sm text-gray-400 mt-2">
                            Faites un paiement test pour voir les commissions apparaître ici
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {commissions.map((commission) => (
                            <div
                                key={commission.id}
                                className="px-6 py-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-sm font-medium text-gray-900">
                                                {commission.seller}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                                                {commission.daysOld}j
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>
                                                Vente: {(commission.grossAmount / 100).toFixed(2)}€
                                            </span>
                                            <span>
                                                Commission: {(commission.amount / 100).toFixed(2)}€
                                            </span>
                                            <span>
                                                Créée: {new Date(commission.createdAt).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 font-mono">
                                            ID: {commission.id}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => forceMature(commission.id)}
                                        disabled={processing === commission.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        {processing === commission.id ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Traitement...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-4 h-4" />
                                                Forcer PROCEED
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">📖 Comment tester le flow complet ?</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Faites un paiement test (via lien d'affiliation)</li>
                    <li>La commission apparaît ici en statut PENDING</li>
                    <li>Cliquez sur "Forcer PROCEED" pour bypasser les 30 jours</li>
                    <li>Allez sur <a href="/dashboard/payouts" className="underline font-medium">/dashboard/payouts</a> pour payer le seller</li>
                    <li>Testez le système de paiement startup → seller complet</li>
                </ol>
            </div>
        </div>
    )
}
