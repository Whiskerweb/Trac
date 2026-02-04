'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Users, Info, UserPlus, Calendar, Activity, Clock } from 'lucide-react'
import { getWorkspaceCustomers, CustomerWithDetails } from '@/app/actions/customers'

function Avatar({ name, avatar, size = 'md' }: { name: string | null; avatar: string | null; size?: 'sm' | 'md' }) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-xs'

    if (avatar) {
        return (
            <img
                src={avatar}
                alt={name || 'Customer'}
                className={`${sizeClasses} rounded-full object-cover`}
            />
        )
    }

    return (
        <div className={`${sizeClasses} rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600`}>
            {initials}
        </div>
    )
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

function formatRelativeDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return formatDate(date)
}

function getLastActivity(customer: CustomerWithDetails): { date: Date; type: 'lead' | 'signup' } {
    // Get the most recent lead event if any
    const lastLeadDate = customer.leadEvents[0]?.createdAt

    if (lastLeadDate && new Date(lastLeadDate) > new Date(customer.createdAt)) {
        return { date: new Date(lastLeadDate), type: 'lead' }
    }

    return { date: new Date(customer.createdAt), type: 'signup' }
}

export default function CustomersPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<CustomerWithDetails[]>([])
    const [stats, setStats] = useState({ total: 0, withReferrer: 0, totalLeads: 0 })
    const [searchQuery, setSearchQuery] = useState('')
    const [filterReferrer, setFilterReferrer] = useState<'all' | 'with' | 'without'>('all')

    useEffect(() => {
        async function loadCustomers() {
            const result = await getWorkspaceCustomers()
            if (result.success) {
                setCustomers(result.customers)
                setStats(result.stats)
            }
            setLoading(false)
        }
        loadCustomers()
    }, [])

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                (c.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (c.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                c.externalId.toLowerCase().includes(searchQuery.toLowerCase())

            // Referrer filter
            const matchesReferrer =
                filterReferrer === 'all' ||
                (filterReferrer === 'with' && c.affiliateId) ||
                (filterReferrer === 'without' && !c.affiliateId)

            return matchesSearch && matchesReferrer
        })
    }, [customers, searchQuery, filterReferrer])

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
                    <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-0 top-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-2 w-64 z-10">
                            Customers are leads tracked through your links. Each signup via an affiliate link creates a customer.
                        </div>
                    </div>
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
                    <p className="text-sm text-gray-500">With referrer</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.withReferrer}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Total leads</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalLeads}</p>
                </div>
                <div className="w-px bg-gray-200" />
                <div className="flex-1">
                    <p className="text-sm text-gray-500">Attribution rate</p>
                    <p className="text-2xl font-semibold text-gray-900">
                        {stats.total > 0 ? Math.round((stats.withReferrer / stats.total) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    {(['all', 'with', 'without'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setFilterReferrer(filter)}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${
                                filterReferrer === filter
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {filter === 'all' ? 'All' : filter === 'with' ? 'With referrer' : 'Without referrer'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">Customer</div>
                    <div className="col-span-2">Referrer</div>
                    <div className="col-span-2">Leads</div>
                    <div className="col-span-2">Last Activity</div>
                    <div className="col-span-2 text-right">Signed up</div>
                </div>

                {filteredCustomers.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-900 font-medium">
                            {customers.length === 0 ? 'No customers' : 'No results'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            {customers.length === 0
                                ? 'Customers will appear when leads are tracked through your links'
                                : 'Try modifying your search criteria'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredCustomers.map((customer) => {
                            const lastActivity = getLastActivity(customer)
                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                    {/* Customer info */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <Avatar name={customer.name} avatar={customer.avatar} />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {customer.name || customer.email || customer.externalId}
                                                </p>
                                            </div>
                                            {customer.email && customer.name && (
                                                <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                                            )}
                                            {!customer.name && !customer.email && (
                                                <p className="text-xs text-gray-400">ID: {customer.externalId}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Referrer */}
                                    <div className="col-span-2">
                                        {customer.referrerName ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar name={customer.referrerName} avatar={customer.referrerAvatar} size="sm" />
                                                <span className="text-sm text-gray-700 truncate">{customer.referrerName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Lead count */}
                                    <div className="col-span-2">
                                        {customer.leadCount > 0 ? (
                                            <div className="flex items-center gap-1.5">
                                                <UserPlus className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900">{customer.leadCount}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">—</span>
                                        )}
                                    </div>

                                    {/* Last Activity */}
                                    <div className="col-span-2">
                                        <div className="flex items-center gap-1.5">
                                            {lastActivity.type === 'lead' ? (
                                                <Activity className="w-3.5 h-3.5 text-green-500" />
                                            ) : (
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                            )}
                                            <span className={`text-sm ${lastActivity.type === 'lead' ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {formatRelativeDate(lastActivity.date)}
                                            </span>
                                        </div>
                                        {lastActivity.type === 'lead' && customer.leadEvents[0] && (
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {customer.leadEvents[0].eventName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Created at */}
                                    <div className="col-span-2 text-right">
                                        <div className="flex items-center justify-end gap-1.5 text-sm text-gray-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatRelativeDate(customer.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer info */}
            {filteredCustomers.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                    {filteredCustomers.length} customer{filteredCustomers.length > 1 ? 's' : ''} displayed
                </p>
            )}
        </div>
    )
}
