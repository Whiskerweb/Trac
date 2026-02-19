'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'
import Link from 'next/link'
import {
    Users,
    Building2,
    UserCheck,
    Search,
    Loader2,
    UserX,
    Layers,
    ChevronRight
} from 'lucide-react'

interface UserEntry {
    userId: string
    email: string
    name: string | null
    role: 'SELLER' | 'STARTUP' | 'BOTH' | 'NO_ROLE'
    sellerStatus: string | null
    sellerPayoutMethod: string | null
    workspaceName: string | null
    workspaceSlug: string | null
    createdAt: string
}

interface Summary {
    total: number
    sellers: number
    startups: number
    both: number
    noRole: number
}

type RoleFilter = 'all' | 'SELLER' | 'STARTUP' | 'BOTH' | 'NO_ROLE'

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserEntry[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<RoleFilter>('all')

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            if (data.success) {
                setUsers(data.users)
                setSummary(data.summary)
            }
        } catch (error) {
            console.error('Failed to load users:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = search === '' ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.workspaceName?.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || u.role === filter
        return matchesSearch && matchesFilter
    })

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="space-y-3 w-full max-w-2xl px-8">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="p-8">
            {/* Header */}
            <motion.div variants={fadeInUp} transition={springGentle} className="mb-8">
                <h1 className="text-2xl font-light text-white mb-2">Users</h1>
                <p className="text-sm text-neutral-500">
                    Tous les utilisateurs — Sellers, Startups, ou les deux
                </p>
            </motion.div>

            {/* Summary Stats */}
            {summary && (
                <motion.div variants={fadeInUp} transition={springGentle} className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <StatCard
                        label="Total Users"
                        value={summary.total}
                        icon={Users}
                    />
                    <StatCard
                        label="Sellers"
                        value={summary.sellers}
                        icon={UserCheck}
                        color="emerald"
                    />
                    <StatCard
                        label="Startups"
                        value={summary.startups}
                        icon={Building2}
                        color="violet"
                    />
                    <StatCard
                        label="Both"
                        value={summary.both}
                        icon={Layers}
                        color="blue"
                    />
                    <StatCard
                        label="No Role"
                        value={summary.noRole}
                        icon={UserX}
                        color="orange"
                    />
                </motion.div>
            )}

            {/* Filters */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        placeholder="Rechercher par email, nom ou workspace..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {([
                        { key: 'all', label: 'Tous' },
                        { key: 'SELLER', label: 'Sellers' },
                        { key: 'STARTUP', label: 'Startups' },
                        { key: 'BOTH', label: 'Both' },
                        { key: 'NO_ROLE', label: 'No Role' },
                    ] as { key: RoleFilter; label: string }[]).map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`btn-press px-4 py-2.5 text-sm rounded-lg transition-colors ${
                                filter === f.key
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Count */}
            <motion.p variants={fadeInUp} transition={springGentle} className="text-xs text-neutral-500 mb-4">{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</motion.p>

            {/* Users List */}
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                {filteredUsers.length === 0 ? (
                    <motion.div variants={fadeInUp} transition={springGentle} className="text-center py-12 text-neutral-500">
                        <motion.div variants={floatVariants} animate="float">
                            <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        </motion.div>
                        <p>Aucun utilisateur trouvé</p>
                    </motion.div>
                ) : (
                    filteredUsers.map((user) => (
                        <motion.div
                            key={user.userId}
                            variants={staggerItem}
                            transition={springGentle}
                        >
                            <Link
                                href={`/admin/users/${user.userId}`}
                                className="row-hover flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-neutral-400">
                                            {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-white">
                                                {user.name || user.email || user.userId.slice(0, 8)}
                                            </span>
                                            <RoleBadge role={user.role} />
                                            {user.sellerStatus && user.sellerStatus !== 'APPROVED' && (
                                                <span className="badge-pop px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                                                    {user.sellerStatus}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-500">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Workspace */}
                                    {user.workspaceName && (
                                        <div className="text-right hidden md:block">
                                            <p className="text-sm text-white">{user.workspaceName}</p>
                                            <p className="text-xs text-neutral-500">workspace</p>
                                        </div>
                                    )}

                                    {/* Date */}
                                    <div className="text-right">
                                        <p className="text-sm text-neutral-400">{formatDate(user.createdAt)}</p>
                                    </div>

                                    <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                                </div>
                            </Link>
                        </motion.div>
                    ))
                )}
            </motion.div>
        </motion.div>
    )
}

function RoleBadge({ role }: { role: string }) {
    switch (role) {
        case 'SELLER':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Seller
                </span>
            )
        case 'STARTUP':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Startup
                </span>
            )
        case 'BOTH':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Both
                </span>
            )
        default:
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-neutral-700 text-neutral-400 rounded-full">
                    No role
                </span>
            )
    }
}

function StatCard({
    label,
    value,
    icon: Icon,
    color = 'neutral'
}: {
    label: string
    value: number
    icon: React.ComponentType<{ className?: string }>
    color?: 'neutral' | 'violet' | 'emerald' | 'blue' | 'orange'
}) {
    const colors = {
        neutral: 'bg-neutral-800 text-neutral-400',
        violet: 'bg-violet-500/20 text-violet-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        blue: 'bg-blue-500/20 text-blue-400',
        orange: 'bg-orange-500/20 text-orange-400',
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-neutral-500">{label}</span>
            </div>
            <p className="text-2xl font-light text-white">{value}</p>
        </div>
    )
}
