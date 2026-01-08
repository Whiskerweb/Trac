'use client'

import { useState, useEffect } from 'react'
import { Users, CheckCircle, Ban, Clock, TrendingUp, Loader2, Search } from 'lucide-react'
import { approvePartner, banPartner } from '@/app/actions/partners'

interface Partner {
    id: string
    email: string
    name: string | null
    status: 'PENDING' | 'APPROVED' | 'BANNED'
    created_at: string
    totalEarnings: number
    conversions: number
}

export default function StartupPartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'BANNED'>('all')
    const [actioningId, setActioningId] = useState<string | null>(null)

    useEffect(() => {
        async function loadPartners() {
            try {
                // TODO: Implement actual API call
                const mockPartners: Partner[] = [
                    {
                        id: '1',
                        email: 'alex@example.com',
                        name: 'Alex Martin',
                        status: 'PENDING',
                        created_at: new Date().toISOString(),
                        totalEarnings: 0,
                        conversions: 0
                    }
                ]
                setPartners(mockPartners)
            } catch (error) {
                console.error('Failed to load partners:', error)
            } finally {
                setLoading(false)
            }
        }

        loadPartners()
    }, [])

    const handleApprove = async (partnerId: string) => {
        setActioningId(partnerId)
        const result = await approvePartner(partnerId)

        if (result.success) {
            setPartners(partners.map(p =>
                p.id === partnerId ? { ...p, status: 'APPROVED' as const } : p
            ))
        }
        setActioningId(null)
    }

    const handleBan = async (partnerId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir bannir ce partenaire ? Cette action est irréversible.')) {
            return
        }

        setActioningId(partnerId)
        const result = await banPartner(partnerId)

        if (result.success) {
            setPartners(partners.map(p =>
                p.id === partnerId ? { ...p, status: 'BANNED' as const } : p
            ))
        }
        setActioningId(null)
    }

    const filteredPartners = partners.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesFilter = filter === 'all' || p.status === filter
        return matchesSearch && matchesFilter
    })

    const stats = {
        total: partners.length,
        pending: partners.filter(p => p.status === 'PENDING').length,
        approved: partners.filter(p => p.status === 'APPROVED').length,
        banned: partners.filter(p => p.status === 'BANNED').length
    }

    const getStatusBadge = (status: Partner['status']) => {
        const badges = {
            PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'En attente' },
            APPROVED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle, label: 'Approuvé' },
            BANNED: { bg: 'bg-red-100', text: 'text-red-700', icon: Ban, label: 'Banni' }
        }
        const badge = badges[status]
        const Icon = badge.icon
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
            </span>
        )
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
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestion des Partenaires</h1>
                    </div>
                    <p className="text-slate-600">Approuvez, gérez et suivez vos affiliés</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm">Total</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            </div>
                            <Users className="w-8 h-8 text-slate-300" />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm">En attente</p>
                                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                            </div>
                            <Clock className="w-8 h-8 text-amber-200" />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm">Approuvés</p>
                                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-200" />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm">Bannis</p>
                                <p className="text-2xl font-bold text-red-600">{stats.banned}</p>
                            </div>
                            <Ban className="w-8 h-8 text-red-200" />
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Rechercher par nom ou email..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {['all', 'PENDING', 'APPROVED', 'BANNED'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f as any)}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === f
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                >
                                    {f === 'all' ? 'Tous' : f === 'PENDING' ? 'En attente' : f === 'APPROVED' ? 'Approuvés' : 'Bannis'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Partners Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Partenaire
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Gains totaux
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Conversions
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPartners.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-600">Aucun partenaire trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPartners.map((partner) => (
                                        <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{partner.name || 'Sans nom'}</p>
                                                    <p className="text-sm text-slate-500">{partner.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(partner.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-slate-900">
                                                    {formatCurrency(partner.totalEarnings)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-700">{partner.conversions}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {partner.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleApprove(partner.id)}
                                                            disabled={actioningId === partner.id}
                                                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                                                        >
                                                            {actioningId === partner.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Approuver
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {partner.status !== 'BANNED' && (
                                                        <button
                                                            onClick={() => handleBan(partner.id)}
                                                            disabled={actioningId === partner.id}
                                                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                                                        >
                                                            {actioningId === partner.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Ban className="w-4 h-4" />
                                                                    Bannir
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
