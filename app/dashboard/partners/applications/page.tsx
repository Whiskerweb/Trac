'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, ChevronRight, Users, MousePointer, DollarSign, TrendingUp, Info } from 'lucide-react'

interface Partner {
    id: string
    name: string
    email: string
    avatar: string
    status: 'active' | 'pending' | 'inactive'
    missionsCount: number
    totalClicks: number
    totalSales: number
    commissionEarned: number
    joinedAt: Date
    lastActivity: Date
}

// Mock data - Partners who have joined missions
const MOCK_PARTNERS: Partner[] = [
    {
        id: 'p1',
        name: 'Sophie Anderson',
        email: 'sophie@creator.io',
        avatar: 'SA',
        status: 'active',
        missionsCount: 5,
        totalClicks: 2840,
        totalSales: 47,
        commissionEarned: 94000,
        joinedAt: new Date('2024-06-15'),
        lastActivity: new Date('2025-01-18'),
    },
    {
        id: 'p2',
        name: 'Luca Romano',
        email: 'luca@influencer.com',
        avatar: 'LR',
        status: 'active',
        missionsCount: 3,
        totalClicks: 1920,
        totalSales: 32,
        commissionEarned: 64000,
        joinedAt: new Date('2024-08-22'),
        lastActivity: new Date('2025-01-17'),
    },
    {
        id: 'p3',
        name: 'Emma Stevenson',
        email: 'emma@content.co',
        avatar: 'ES',
        status: 'pending',
        missionsCount: 1,
        totalClicks: 450,
        totalSales: 8,
        commissionEarned: 16000,
        joinedAt: new Date('2025-01-10'),
        lastActivity: new Date('2025-01-19'),
    },
    {
        id: 'p4',
        name: 'Logan Rivers',
        email: 'logan@affiliate.net',
        avatar: 'LR',
        status: 'inactive',
        missionsCount: 2,
        totalClicks: 890,
        totalSales: 15,
        commissionEarned: 30000,
        joinedAt: new Date('2024-09-05'),
        lastActivity: new Date('2024-12-20'),
    },
    {
        id: 'p5',
        name: 'Mia Thompson',
        email: 'mia@social.media',
        avatar: 'MT',
        status: 'active',
        missionsCount: 6,
        totalClicks: 3200,
        totalSales: 54,
        commissionEarned: 108000,
        joinedAt: new Date('2024-05-20'),
        lastActivity: new Date('2025-01-20'),
    },
]

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {initials}
        </div>
    )
}

function StatusBadge({ status }: { status: Partner['status'] }) {
    const styles = {
        active: 'bg-green-50 text-green-700',
        pending: 'bg-orange-50 text-orange-700',
        inactive: 'bg-gray-100 text-gray-500'
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
            {status}
        </span>
    )
}

function formatCurrency(cents: number): string {
    return `$${(cents / 100).toLocaleString()}`
}

function formatNumber(num: number): string {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

export default function ApplicationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [partners, setPartners] = useState<Partner[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

    useEffect(() => {
        async function loadPartners() {
            try {
                // TODO: Uncomment when API is ready
                // const result = await getMyPartners()
                // if (result.success && result.partners) {
                //     setPartners(result.partners)
                // } else {
                //     setPartners(MOCK_PARTNERS) // Fallback
                // }

                // For now, use mock data
                setPartners(MOCK_PARTNERS)
            } catch (error) {
                console.error('Error loading partners:', error)
                setPartners(MOCK_PARTNERS)
            } finally {
                setLoading(false)
            }
        }
        loadPartners()
    }, [])

    const filteredPartners = useMemo(() => {
        return partners.filter(p => {
            const matchesSearch = searchQuery === '' ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.email.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [partners, searchQuery, statusFilter])

    const stats = useMemo(() => ({
        total: partners.length,
        active: partners.filter(p => p.status === 'active').length,
        totalClicks: partners.reduce((sum, p) => sum + p.totalClicks, 0),
        totalCommissions: partners.reduce((sum, p) => sum + p.commissionEarned, 0)
    }), [partners])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">Partners</h1>
                    <Info className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total partners</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total clicks</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatNumber(stats.totalClicks)}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Commissions paid</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalCommissions)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search partners..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {(['all', 'active', 'pending', 'inactive'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${statusFilter === status
                                ? 'bg-gray-900 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Partner</div>
                    <div>Status</div>
                    <div>Missions</div>
                    <div>Clicks</div>
                    <div className="text-right">Earned</div>
                    <div></div>
                </div>

                {filteredPartners.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No partners found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredPartners.map((partner) => (
                            <div
                                key={partner.id}
                                onClick={() => router.push(`/dashboard/partners/applications/${partner.id}`)}
                                className="grid grid-cols-7 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="col-span-2 flex items-center gap-3">
                                    <Avatar initials={partner.avatar} />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{partner.name}</p>
                                        <p className="text-xs text-gray-500">{partner.email}</p>
                                    </div>
                                </div>
                                <div>
                                    <StatusBadge status={partner.status} />
                                </div>
                                <div className="text-sm text-gray-600">
                                    {partner.missionsCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {formatNumber(partner.totalClicks)}
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium text-green-600">
                                        {formatCurrency(partner.commissionEarned)}
                                    </span>
                                </div>
                                <div className="flex justify-end">
                                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
