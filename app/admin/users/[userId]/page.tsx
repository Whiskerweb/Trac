'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer, staggerItem, springGentle, floatVariants } from '@/lib/animations'
import Link from 'next/link'
import {
    ArrowLeft,
    Building2,
    UserCheck,
    Layers,
    Loader2,
    Mail,
    Calendar,
    Globe,
    MapPin,
    Wallet,
    Zap,
    ExternalLink,
    Users,
    Target,
    Clock,
    CheckCircle2,
    Shield
} from 'lucide-react'

interface UserProfile {
    userId: string
    email: string | null
    name: string | null
    avatarUrl: string | null
    provider: string
    createdAt: string | null
    lastSignIn: string | null
    emailConfirmed: string | null
    role: 'SELLER' | 'STARTUP' | 'BOTH' | 'NO_ROLE'
    seller: {
        id: string
        status: string
        payoutMethod: string
        stripeConnectId: string | null
        onboardingStep: number
        totalCommissions: number
        balance: {
            balance: number
            pending: number
            due: number
            paidTotal: number
        } | null
        profile: {
            bio: string | null
            country: string | null
            profileType: string | null
            website: string | null
            twitter: string | null
            instagram: string | null
            tiktok: string | null
            youtube: string | null
            linkedin: string | null
            avatarUrl: string | null
        } | null
    } | null
    workspaces: Array<{
        id: string
        name: string
        slug: string
        role: string
        joinedAt: string
        missionsCount: number
        sellersCount: number
        profile: {
            description: string | null
            logoUrl: string | null
            website: string | null
            industry: string | null
            companySize: string | null
            foundedYear: string | null
            headquarters: string | null
        } | null
    }>
    missions: Array<{
        id: string
        title: string
        status: string
        reward: string
        visibility: string
        createdAt: string
        enrollments: number
    }>
}

export default function AdminUserDetailPage() {
    const params = useParams()
    const userId = params.userId as string
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`/api/admin/users/${userId}`)
                const data = await res.json()
                if (data.success) {
                    setProfile(data.profile)
                }
            } catch (error) {
                console.error('Failed to load user:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [userId])

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatCurrency = (cents: number) => {
        return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€'
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="space-y-4 w-full max-w-3xl px-8">
                    <div className="skeleton-shimmer h-24 rounded-xl" />
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
                        ))}
                    </div>
                    <div className="skeleton-shimmer h-48 rounded-xl" />
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="p-8 text-center text-neutral-500">
                Utilisateur introuvable
            </div>
        )
    }

    const avatar = profile.seller?.profile?.avatarUrl || profile.avatarUrl
    const displayName = profile.name || profile.email || profile.userId.slice(0, 8)

    return (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="p-8">
            {/* Back */}
            <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to users
            </Link>

            {/* Header */}
            <motion.div
                variants={fadeInUp}
                transition={springGentle}
                className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8"
            >
                <div className="flex items-center gap-4">
                    {avatar ? (
                        <img src={avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-light text-neutral-400">
                                {displayName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-light text-white">{displayName}</h1>
                        {profile.email && (
                            <p className="text-neutral-500 flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5" />
                                {profile.email}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <RoleBadge role={profile.role} />
                            <span className="badge-pop px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded-full">
                                {profile.provider}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Auth info */}
            <motion.div
                variants={fadeInUp}
                transition={springGentle}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
                <InfoCard icon={Calendar} label="Inscription" value={formatDate(profile.createdAt)} />
                <InfoCard icon={Clock} label="Derniere connexion" value={formatDate(profile.lastSignIn)} />
                <InfoCard
                    icon={profile.emailConfirmed ? CheckCircle2 : Shield}
                    label="Email confirme"
                    value={profile.emailConfirmed ? formatDate(profile.emailConfirmed) : 'Non'}
                    color={profile.emailConfirmed ? 'emerald' : 'orange'}
                />
            </motion.div>

            {/* Seller section */}
            {profile.seller && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className="mb-8"
                >
                    <h2 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Profil Seller
                    </h2>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Status</p>
                                <span className={`badge-pop px-2 py-1 text-xs rounded-full ${
                                    profile.seller.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                    profile.seller.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-red-500/20 text-red-400'
                                }`}>
                                    {profile.seller.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Payout</p>
                                <div className="flex items-center gap-1">
                                    {profile.seller.payoutMethod === 'STRIPE_CONNECT' ? (
                                        <span className="text-sm text-emerald-400 flex items-center gap-1">
                                            <Zap className="w-3 h-3" /> Stripe
                                        </span>
                                    ) : (
                                        <span className="text-sm text-violet-400 flex items-center gap-1">
                                            <Wallet className="w-3 h-3" /> Wallet
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Commissions</p>
                                <p className="text-sm text-white">{profile.seller.totalCommissions}</p>
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500 mb-1">Onboarding</p>
                                <p className="text-sm text-white">Etape {profile.seller.onboardingStep}/4</p>
                            </div>
                        </div>

                        {/* Balance */}
                        {profile.seller.balance && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-800">
                                <div>
                                    <p className="text-xs text-neutral-500 mb-1">Solde</p>
                                    <p className="text-lg font-light text-white">{formatCurrency(profile.seller.balance.balance)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 mb-1">En attente</p>
                                    <p className="text-lg font-light text-amber-400">{formatCurrency(profile.seller.balance.pending)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 mb-1">Disponible</p>
                                    <p className="text-lg font-light text-emerald-400">{formatCurrency(profile.seller.balance.due)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-500 mb-1">Total paye</p>
                                    <p className="text-lg font-light text-white">{formatCurrency(profile.seller.balance.paidTotal)}</p>
                                </div>
                            </div>
                        )}

                        {/* Seller profile details */}
                        {profile.seller.profile && (
                            <div className="pt-4 mt-4 border-t border-neutral-800">
                                {profile.seller.profile.bio && (
                                    <p className="text-sm text-neutral-400 mb-3">{profile.seller.profile.bio}</p>
                                )}
                                <div className="flex flex-wrap gap-3">
                                    {profile.seller.profile.country && (
                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {profile.seller.profile.country}
                                        </span>
                                    )}
                                    {profile.seller.profile.website && (
                                        <a href={profile.seller.profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> Website
                                        </a>
                                    )}
                                    {profile.seller.profile.linkedin && (
                                        <a href={profile.seller.profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">LinkedIn</a>
                                    )}
                                    {profile.seller.profile.twitter && (
                                        <a href={profile.seller.profile.twitter} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">Twitter</a>
                                    )}
                                    {profile.seller.profile.instagram && (
                                        <a href={profile.seller.profile.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">Instagram</a>
                                    )}
                                    {profile.seller.profile.tiktok && (
                                        <a href={profile.seller.profile.tiktok} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">TikTok</a>
                                    )}
                                    {profile.seller.profile.youtube && (
                                        <a href={profile.seller.profile.youtube} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">YouTube</a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Link to full seller admin page */}
                        <div className="pt-4 mt-4 border-t border-neutral-800">
                            <Link
                                href={`/admin/sellers/${profile.seller.id}`}
                                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                            >
                                Voir detail seller (commissions, ledger, gift cards)
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Startup section */}
            {profile.workspaces.length > 0 && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className="mb-8"
                >
                    <h2 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Workspace{profile.workspaces.length > 1 ? 's' : ''} Startup
                    </h2>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                        {profile.workspaces.map(ws => (
                            <motion.div key={ws.id} variants={staggerItem} transition={springGentle} className="row-hover bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                                <div className="flex items-start gap-4 mb-4">
                                    {ws.profile?.logoUrl ? (
                                        <img src={ws.profile.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-neutral-500" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-medium text-white">{ws.name}</h3>
                                        <p className="text-xs text-neutral-500">/{ws.slug}</p>
                                    </div>
                                    <span className="badge-pop px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full">
                                        {ws.role}
                                    </span>
                                </div>

                                {ws.profile?.description && (
                                    <p className="text-sm text-neutral-400 mb-4">{ws.profile.description}</p>
                                )}

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-xs text-neutral-500 mb-1">Missions</p>
                                        <p className="text-sm text-white">{ws.missionsCount}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-500 mb-1">Sellers</p>
                                        <p className="text-sm text-white">{ws.sellersCount}</p>
                                    </div>
                                    {ws.profile?.industry && (
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Industrie</p>
                                            <p className="text-sm text-white">{ws.profile.industry}</p>
                                        </div>
                                    )}
                                    {ws.profile?.companySize && (
                                        <div>
                                            <p className="text-xs text-neutral-500 mb-1">Taille</p>
                                            <p className="text-sm text-white">{ws.profile.companySize}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-neutral-800">
                                    {ws.profile?.website && (
                                        <a href={ws.profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> Website
                                        </a>
                                    )}
                                    {ws.profile?.headquarters && (
                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {ws.profile.headquarters}
                                        </span>
                                    )}
                                    {ws.profile?.foundedYear && (
                                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {ws.profile.foundedYear}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )}

            {/* Missions */}
            {profile.missions.length > 0 && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                >
                    <h2 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Missions ({profile.missions.length})
                    </h2>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                        {profile.missions.map(m => (
                            <motion.div
                                key={m.id}
                                variants={staggerItem}
                                transition={springGentle}
                                className="row-hover flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${
                                        m.status === 'ACTIVE' ? 'bg-emerald-500' :
                                        m.status === 'DRAFT' ? 'bg-amber-500' :
                                        'bg-neutral-500'
                                    }`} />
                                    <div>
                                        <p className="text-sm text-white">{m.title}</p>
                                        <p className="text-xs text-neutral-500">
                                            {m.reward} · {m.enrollments} seller{m.enrollments > 1 ? 's' : ''} · {m.visibility}
                                        </p>
                                    </div>
                                </div>
                                <span className={`badge-pop px-2 py-0.5 text-xs rounded-full ${
                                    m.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                                    m.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-neutral-700 text-neutral-400'
                                }`}>
                                    {m.status}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )}

            {/* No role */}
            {profile.role === 'NO_ROLE' && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className="text-center py-12 text-neutral-500"
                >
                    <motion.div variants={floatVariants} animate="float">
                        <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    </motion.div>
                    <p>Cet utilisateur n'a pas encore de role (ni seller, ni startup)</p>
                    <p className="text-xs text-neutral-600 mt-1">Compte cree mais onboarding non termine</p>
                </motion.div>
            )}
        </motion.div>
    )
}

function RoleBadge({ role }: { role: string }) {
    switch (role) {
        case 'SELLER':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Seller
                </span>
            )
        case 'STARTUP':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-violet-500/20 text-violet-400 rounded-full flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Startup
                </span>
            )
        case 'BOTH':
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Both
                </span>
            )
        default:
            return (
                <span className="badge-pop px-2 py-0.5 text-xs bg-neutral-700 text-neutral-400 rounded-full">No role</span>
            )
    }
}

function InfoCard({
    icon: Icon,
    label,
    value,
    color = 'neutral'
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
    color?: 'neutral' | 'emerald' | 'orange'
}) {
    const colors = {
        neutral: 'bg-neutral-800 text-neutral-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
        orange: 'bg-orange-500/20 text-orange-400',
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-neutral-500">{label}</span>
            </div>
            <p className="text-sm text-white">{value}</p>
        </div>
    )
}
