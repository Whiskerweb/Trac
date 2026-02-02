'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Gift,
    Users,
    CreditCard,
    TrendingUp,
    ArrowRight,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

interface AdminStats {
    pendingGiftCards: number
    pendingGiftCardsAmount: number
    totalSellers: number
    platformSellers: number
    totalCommissions: number
    pendingCommissions: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        try {
            const res = await fetch('/api/admin/stats')
            const data = await res.json()
            if (data.success) {
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Failed to load stats:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-light text-white mb-2">
                    Dashboard Admin
                </h1>
                <p className="text-sm text-neutral-500">
                    Vue d'ensemble de la plateforme Traaaction
                </p>
            </div>

            {/* Quick Actions */}
            {stats && stats.pendingGiftCards > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <Link
                        href="/admin/gift-cards"
                        className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="font-medium text-amber-400">
                                    {stats.pendingGiftCards} demande{stats.pendingGiftCards > 1 ? 's' : ''} de gift card en attente
                                </p>
                                <p className="text-sm text-amber-500/70">
                                    Total: {(stats.pendingGiftCardsAmount / 100).toFixed(0)}€ to process
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-amber-500" />
                    </Link>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={Gift}
                    label="Gift Cards Pending"
                    value={stats?.pendingGiftCards || 0}
                    subValue={stats ? `${(stats.pendingGiftCardsAmount / 100).toFixed(0)}€` : '0€'}
                    color="violet"
                    loading={loading}
                />
                <StatCard
                    icon={Users}
                    label="Sellers Platform"
                    value={stats?.platformSellers || 0}
                    subValue={`sur ${stats?.totalSellers || 0} total`}
                    color="blue"
                    loading={loading}
                />
                <StatCard
                    icon={CreditCard}
                    label="Commissions Pending"
                    value={stats?.pendingCommissions || 0}
                    subValue="en maturation"
                    color="emerald"
                    loading={loading}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Total Commissions"
                    value={stats?.totalCommissions || 0}
                    subValue="toutes confondues"
                    color="orange"
                    loading={loading}
                />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickLink
                    href="/admin/gift-cards"
                    icon={Gift}
                    title="Gift Cards"
                    description="Manage gift card requests"
                />
                <QuickLink
                    href="/admin/sellers"
                    icon={Users}
                    title="Sellers"
                    description="Voir tous les sellers de la plateforme"
                />
                <QuickLink
                    href="/admin/payouts"
                    icon={CreditCard}
                    title="Payouts"
                    description="Historique des paiements"
                />
            </div>
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    color,
    loading
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    subValue: string
    color: 'violet' | 'blue' | 'emerald' | 'orange'
    loading: boolean
}) {
    const colors = {
        violet: 'bg-violet-500/10 text-violet-400',
        blue: 'bg-blue-500/10 text-blue-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        orange: 'bg-orange-500/10 text-orange-400',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5"
        >
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-neutral-400">{label}</span>
            </div>
            {loading ? (
                <div className="h-8 bg-neutral-800 rounded animate-pulse" />
            ) : (
                <>
                    <p className="text-3xl font-light text-white mb-1">{value}</p>
                    <p className="text-xs text-neutral-500">{subValue}</p>
                </>
            )}
        </motion.div>
    )
}

function QuickLink({
    href,
    icon: Icon,
    title,
    description
}: {
    href: string
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors"
        >
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                <Icon className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="flex-1">
                <p className="font-medium text-white">{title}</p>
                <p className="text-xs text-neutral-500">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
        </Link>
    )
}
