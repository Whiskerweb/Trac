'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Search, Users, Info, UserPlus, Calendar, Activity, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
    fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants
} from '@/lib/animations'
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

function formatRelativeDate(date: Date, t: (key: string, values?: any) => string): string {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return t('today')
    if (days === 1) return t('yesterday')
    if (days < 7) return t('daysAgo', { count: days })
    if (days < 30) return t('weeksAgo', { count: Math.floor(days / 7) })
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
    const t = useTranslations('dashboard.customers')
    const tCommon = useTranslations('common')
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
            <div className="space-y-4 sm:space-y-6 animate-pulse">
                <div className="flex items-center justify-between px-4 sm:px-0">
                    <div className="h-7 w-40 rounded-lg skeleton-shimmer" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 bg-white border border-gray-200 rounded-xl">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i}>
                            <div className="h-4 w-24 rounded skeleton-shimmer mb-2" />
                            <div className="h-8 w-16 rounded skeleton-shimmer" />
                        </div>
                    ))}
                </div>
                <div className="h-10 w-full max-w-sm rounded-lg skeleton-shimmer" />
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 border-b border-gray-50 skeleton-shimmer" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-4 sm:space-y-6"
        >
            {/* Header */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex items-center justify-between px-4 sm:px-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{t('title')}</h1>
                    <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-0 top-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-2 w-64 z-10">
                            {t('info')}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeInUp} transition={springGentle} className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-5 bg-white border border-gray-200 rounded-xl">
                <div>
                    <p className="text-xs sm:text-sm text-gray-500">{t('totalCustomers')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-500">{t('withReferrer')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.withReferrer}</p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-500">{t('totalLeads')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.totalLeads}</p>
                </div>
                <div>
                    <p className="text-xs sm:text-sm text-gray-500">{t('attributionRate')}</p>
                    <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {stats.total > 0 ? Math.round((stats.withReferrer / stats.total) * 100) : 0}%
                    </p>
                </div>
            </motion.div>

            {/* Search and Filters */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-0">
                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
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
                            className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium transition-colors btn-press ${
                                filterReferrer === filter
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {filter === 'all' ? t('all') : filter === 'with' ? t('withReferrerFilter') : t('withoutReferrer')}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Table/Cards */}
            <motion.div variants={fadeInUp} transition={springGentle} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">{t('customer')}</div>
                    <div className="col-span-2">{t('referrer')}</div>
                    <div className="col-span-2">{t('leads')}</div>
                    <div className="col-span-2">{t('lastActivity')}</div>
                    <div className="col-span-2 text-right">{t('signedUp')}</div>
                </div>

                {filteredCustomers.length === 0 ? (
                    <div className="px-4 sm:px-6 py-12 text-center">
                        <motion.div variants={floatVariants} animate="float" className="inline-block">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-gray-900 font-medium">
                            {customers.length === 0 ? t('noCustomers') : t('noResults')}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            {customers.length === 0
                                ? t('noCustomersDesc')
                                : t('tryModifying')
                            }
                        </p>
                    </div>
                ) : (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="divide-y divide-gray-50">
                        {filteredCustomers.map((customer) => {
                            const lastActivity = getLastActivity(customer)
                            return (
                                <motion.div
                                    key={customer.id}
                                    variants={staggerItem}
                                    transition={springGentle}
                                    onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors group row-hover"
                                >
                                    {/* Desktop Table Row */}
                                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
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
                                                    {formatRelativeDate(lastActivity.date, t)}
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
                                                <span>{formatRelativeDate(customer.createdAt, t)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Card */}
                                    <div className="md:hidden p-4 space-y-3">
                                        {/* Customer header */}
                                        <div className="flex items-center gap-3">
                                            <Avatar name={customer.name} avatar={customer.avatar} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {customer.name || customer.email || customer.externalId}
                                                </p>
                                                {customer.email && customer.name && (
                                                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                                                )}
                                                {!customer.name && !customer.email && (
                                                    <p className="text-xs text-gray-400">ID: {customer.externalId}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Mobile info grid */}
                                        <div className="space-y-2">
                                            {/* Referrer */}
                                            {customer.referrerName && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 min-w-[70px]">{t('referrer')}:</span>
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Avatar name={customer.referrerName} avatar={customer.referrerAvatar} size="sm" />
                                                        <span className="text-sm text-gray-700 truncate">{customer.referrerName}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Lead count */}
                                            {customer.leadCount > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 min-w-[70px]">{t('leads')}:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                                                        <span className="text-sm font-medium text-gray-900">{customer.leadCount}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Last Activity */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 min-w-[70px]">{t('lastActivity')}:</span>
                                                <div className="flex items-center gap-1.5">
                                                    {lastActivity.type === 'lead' ? (
                                                        <Activity className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                    )}
                                                    <span className={`text-sm ${lastActivity.type === 'lead' ? 'text-gray-900' : 'text-gray-500'}`}>
                                                        {formatRelativeDate(lastActivity.date, t)}
                                                    </span>
                                                </div>
                                            </div>
                                            {lastActivity.type === 'lead' && customer.leadEvents[0] && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 min-w-[70px]"></span>
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {customer.leadEvents[0].eventName}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Signed up */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 min-w-[70px]">{t('signedUp')}:</span>
                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatRelativeDate(customer.createdAt, t)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </motion.div>

            {/* Footer info */}
            {filteredCustomers.length > 0 && (
                <p className="text-xs text-gray-500 text-center px-4 sm:px-0">
                    {filteredCustomers.length === 1 ? t('displayed', { count: filteredCustomers.length }) : t('displayedPlural', { count: filteredCustomers.length })}
                </p>
            )}
        </motion.div>
    )
}
