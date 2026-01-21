'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Users, Info } from 'lucide-react'

interface Customer {
    id: string
    name: string
    email: string
    avatar: string
    status: 'active' | 'churned'
    totalPurchases: number
    lifetimeValue: number
    firstSeen: Date
    lastPurchase: Date
    referrer: string | null
}

// Mock data - Leads/Customers tracked via SDK
const MOCK_CUSTOMERS: Customer[] = [
    {
        id: 'c1',
        name: 'Marvin Ta',
        email: 'marvin@email.com',
        avatar: 'MT',
        status: 'active',
        totalPurchases: 8,
        lifetimeValue: 16000,
        firstSeen: new Date('2024-10-02'),
        lastPurchase: new Date('2025-04-02'),
        referrer: 'Sophie Anderson'
    },
    {
        id: 'c2',
        name: 'Sarah Chen',
        email: 'sarah@company.com',
        avatar: 'SC',
        status: 'active',
        totalPurchases: 5,
        lifetimeValue: 10000,
        firstSeen: new Date('2024-11-15'),
        lastPurchase: new Date('2025-03-15'),
        referrer: 'Luca Romano'
    },
    {
        id: 'c3',
        name: 'James Wilson',
        email: 'james@startup.io',
        avatar: 'JW',
        status: 'active',
        totalPurchases: 3,
        lifetimeValue: 6000,
        firstSeen: new Date('2024-12-01'),
        lastPurchase: new Date('2025-02-28'),
        referrer: null
    },
    {
        id: 'c4',
        name: 'Emma Rodriguez',
        email: 'emma@design.co',
        avatar: 'ER',
        status: 'churned',
        totalPurchases: 2,
        lifetimeValue: 4000,
        firstSeen: new Date('2024-09-20'),
        lastPurchase: new Date('2024-12-15'),
        referrer: null
    },
    {
        id: 'c5',
        name: 'Alex Kim',
        email: 'alex@tech.dev',
        avatar: 'AK',
        status: 'active',
        totalPurchases: 10,
        lifetimeValue: 20000,
        firstSeen: new Date('2024-08-10'),
        lastPurchase: new Date('2025-04-01'),
        referrer: 'Mia Thompson'
    },
]

function Avatar({ initials }: { initials: string }) {
    return (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {initials}
        </div>
    )
}

function formatCurrency(cents: number): string {
    return `$${(cents / 100).toLocaleString()}`
}

export default function CustomersPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'churned'>('all')

    useEffect(() => {
        setTimeout(() => {
            setCustomers(MOCK_CUSTOMERS)
            setLoading(false)
        }, 300)
    }, [])

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = searchQuery === '' ||
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || c.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [customers, searchQuery, statusFilter])

    const stats = useMemo(() => ({
        total: customers.length,
        active: customers.filter(c => c.status === 'active').length,
        totalPurchases: customers.reduce((sum, c) => sum + c.totalPurchases, 0),
        totalRevenue: customers.reduce((sum, c) => sum + c.lifetimeValue, 0)
    }), [customers])

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
                    <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
                    <Info className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total customers</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Active</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total purchases</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalPurchases}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {(['all', 'active', 'churned'] as const).map((status) => (
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
                <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">Customer</div>
                    <div>Purchases</div>
                    <div className="text-right">LTV</div>
                </div>

                {filteredCustomers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-900 font-medium">No customers yet</p>
                        <p className="text-gray-500 text-sm mt-1">Customers will appear when leads are tracked via your links</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                                className="grid grid-cols-4 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                                <div className="col-span-2 flex items-center gap-3">
                                    <Avatar initials={customer.avatar} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                                            <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-gray-500">{customer.email}</p>
                                            {customer.referrer && (
                                                <span className="text-xs text-gray-400">• via {customer.referrer}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {customer.totalPurchases}
                                </div>
                                <div className="text-right text-sm font-medium text-green-600">
                                    {formatCurrency(customer.lifetimeValue)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
