'use client'

import { useState, useEffect } from 'react'
import {
    Wallet, TrendingUp, Clock, CheckCircle2,
    ArrowDownToLine, DollarSign, Loader2,
    ExternalLink, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { getPartnerDashboard } from '@/app/actions/partners'

// Types
interface PartnerStats {
    totalEarned: number
    pendingAmount: number
    dueAmount: number
    paidAmount: number
    conversionCount: number
}

interface Balance {
    balance: number
    pending: number
    due: number
    paid_total: number
}

interface Partner {
    id: string
    email: string
    name: string | null
    status: 'PENDING' | 'APPROVED' | 'BANNED'
    Program?: {
        name: string
        slug: string
    } | null
}

// Simple stat card component
function StatCard({
    icon: Icon,
    label,
    value,
    sublabel,
    color = 'slate'
}: {
    icon: React.ElementType
    label: string
    value: string
    sublabel?: string
    color?: 'slate' | 'green' | 'amber' | 'purple'
}) {
    const colors = {
        slate: 'bg-slate-100 text-slate-700',
        green: 'bg-green-100 text-green-700',
        amber: 'bg-amber-100 text-amber-700',
        purple: 'bg-purple-100 text-purple-700'
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-slate-600 text-sm">{label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            {sublabel && (
                <div className="text-sm text-slate-500 mt-1">{sublabel}</div>
            )}
        </div>
    )
}

export default function PartnerDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [partner, setPartner] = useState<Partner | null>(null)
    const [stats, setStats] = useState<PartnerStats | null>(null)
    const [balance, setBalance] = useState<Balance | null>(null)

    useEffect(() => {
        async function loadDashboard() {
            try {
                const result = await getPartnerDashboard('current-user-id') // TODO: Get from auth

                if (!result.success) {
                    setError(result.error || 'Failed to load dashboard')
                } else {
                    setPartner(result.partner as unknown as Partner)
                    setStats(result.stats as unknown as PartnerStats)
                    setBalance(result.balance as unknown as Balance)
                }
            } catch (err) {
                setError('Failed to load partner dashboard')
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [])

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="max-w-md mx-auto text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        Erreur
                    </h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link
                        href="/dashboard/marketplace"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Rejoindre un programme
                    </Link>
                </div>
            </div>
        )
    }

    // Format currency
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(cents / 100)
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
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Mes Gains
                            </h1>
                            <p className="text-slate-500 text-sm">
                                {partner?.Program?.name || 'Programme affilié'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                {partner?.status === 'PENDING' && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-800">
                                En attente d&apos;approbation
                            </p>
                            <p className="text-sm text-amber-700">
                                Votre demande est en cours de traitement. Vous pourrez gagner des commissions une fois approuvé.
                            </p>
                        </div>
                    </div>
                )}

                {partner?.status === 'BANNED' && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-800">
                                Compte suspendu
                            </p>
                            <p className="text-sm text-red-700">
                                Votre compte partenaire a été suspendu. Contactez le support pour plus d&apos;informations.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        icon={DollarSign}
                        label="Total gagné"
                        value={formatCurrency(stats?.totalEarned || 0)}
                        sublabel={`${stats?.conversionCount || 0} conversions`}
                        color="purple"
                    />
                    <StatCard
                        icon={Clock}
                        label="En attente"
                        value={formatCurrency(stats?.pendingAmount || 0)}
                        sublabel="Maturation 30 jours"
                        color="amber"
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Disponible"
                        value={formatCurrency(stats?.dueAmount || 0)}
                        sublabel="Prêt pour le retrait"
                        color="green"
                    />
                    <StatCard
                        icon={ArrowDownToLine}
                        label="Versé"
                        value={formatCurrency(stats?.paidAmount || 0)}
                        sublabel="Total des versements"
                        color="slate"
                    />
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-200 text-sm mb-1">
                                Solde disponible
                            </p>
                            <p className="text-4xl font-bold">
                                {formatCurrency(balance?.due || 0)}
                            </p>
                        </div>
                        <button
                            disabled={!balance?.due || balance.due <= 0}
                            className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-50 transition-colors flex items-center gap-2"
                        >
                            <ArrowDownToLine className="w-5 h-5" />
                            Demander un versement
                        </button>
                    </div>
                </div>

                {/* Info Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Comment ça fonctionne
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm">
                                1
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Partagez votre lien</p>
                                <p className="text-sm text-slate-500">
                                    Chaque clic est suivi automatiquement
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Maturation 30 jours</p>
                                <p className="text-sm text-slate-500">
                                    Les commissions sont en attente pendant 30 jours
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold text-sm">
                                3
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">Recevez vos gains</p>
                                <p className="text-sm text-slate-500">
                                    Demandez un versement quand vous le souhaitez
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
