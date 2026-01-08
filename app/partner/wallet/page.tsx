'use client'

import { useState, useEffect } from 'react'
import {
    Wallet, TrendingUp, Clock, CheckCircle2,
    ArrowDownToLine, DollarSign, Loader2,
    AlertCircle, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { getPartnerDashboard } from '@/app/actions/partners'

interface Commission {
    id: string
    sale_id: string
    gross_amount: number
    commission_amount: number
    status: 'PENDING' | 'DUE' | 'PROCESSING' | 'PAID' | 'CLAWBACK'
    created_at: string
    matured_at?: string | null
}

export default function PartnerWalletPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState({
        totalEarned: 0,
        pendingAmount: 0,
        dueAmount: 0,
        paidAmount: 0,
        conversionCount: 0
    })
    const [balance, setBalance] = useState({
        balance: 0,
        pending: 0,
        due: 0,
        paid_total: 0
    })
    const [commissions, setCommissions] = useState<Commission[]>([])

    useEffect(() => {
        async function loadWallet() {
            try {
                const result = await getPartnerDashboard()

                if (!result.success) {
                    setError(result.error || 'Failed to load wallet')
                } else {
                    setStats(result.stats || stats)
                    setBalance(result.balance || balance)
                    // TODO: Load commission history
                }
            } catch (err) {
                setError('Failed to load wallet')
            } finally {
                setLoading(false)
            }
        }

        loadWallet()
    }, [])

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cents / 100)
    }

    const getStatusBadge = (status: Commission['status']) => {
        const badges = {
            PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
            DUE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Disponible' },
            PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
            PAID: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Versé' },
            CLAWBACK: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulé' }
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
                        href="/partner"
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
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-200 text-sm mb-1">Solde disponible</p>
                            <p className="text-4xl font-bold">{formatCurrency(balance.due || 0)}</p>
                            <p className="text-purple-200 text-sm mt-2">
                                +{formatCurrency(balance.pending || 0)} en maturation (30j)
                            </p>
                        </div>
                        <button
                            disabled={!balance.due || balance.due <= 0}
                            className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 transition-colors flex items-center gap-2"
                        >
                            <ArrowDownToLine className="w-5 h-5" />
                            Demander un versement
                        </button>
                    </div>
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
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalEarned || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">{stats.conversionCount || 0} conversions</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">En attente</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pendingAmount || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">Maturation 30 jours</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">Disponible</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.dueAmount || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">Prêt pour le retrait</div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                                <ArrowDownToLine className="w-5 h-5" />
                            </div>
                            <span className="text-slate-600 text-sm">Versé</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.paidAmount || 0)}</div>
                        <div className="text-sm text-slate-500 mt-1">Total des versements</div>
                    </div>
                </div>

                {/* Commission History */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Historique des commissions</h2>

                    {commissions.length === 0 ? (
                        <div className="text-center py-12">
                            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 mb-2">Aucune commission pour le moment</p>
                            <p className="text-sm text-slate-500">
                                Partagez votre lien pour commencer à gagner
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {commissions.map((commission) => (
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
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <p className="font-medium text-blue-900 text-sm mb-1">1. Période de sécurité</p>
                            <p className="text-blue-700 text-sm">
                                Les commissions restent en PENDING pendant 30 jours pour éviter les fraudes
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-blue-900 text-sm mb-1">2. Disponibilité</p>
                            <p className="text-blue-700 text-sm">
                                Après 30 jours, elles passent en DUE et vous pouvez demander un versement
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-blue-900 text-sm mb-1">3. Versement</p>
                            <p className="text-blue-700 text-sm">
                                Le montant est transféré sur votre compte Stripe sous 2-3 jours
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
