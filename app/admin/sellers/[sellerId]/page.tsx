'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    ArrowLeft,
    User,
    Wallet,
    Zap,
    Building2,
    Gift,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    ExternalLink,
    Copy
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem, springGentle } from '@/lib/animations'

interface SellerDetail {
    id: string
    email: string
    name: string | null
    status: string
    payoutMethod: string
    hasStripeConnect: boolean
    stripeConnectId: string | null
    payoutsEnabled: boolean
    payoutsEnabledAt: string | null
    onboardingStep: number
    createdAt: string
    profile: {
        bio: string | null
        tiktok: string | null
        instagram: string | null
        twitter: string | null
        youtube: string | null
        website: string | null
        profileScore: number
    } | null
    balance: {
        stored: number
        ledger: number
        hasDiscrepancy: boolean
        pending: number
        due: number
        paidTotal: number
    }
}

interface Commission {
    id: string
    saleId: string
    grossAmount: number
    netAmount: number
    commissionAmount: number
    platformFee: number
    status: string
    startupPaymentStatus: string
    holdDays: number
    createdAt: string
    maturedAt: string | null
    paidAt: string | null
    startup: {
        id: string
        name: string
        slug: string | null
    } | null
    subscriptionId: string | null
    recurringMonth: number | null
}

interface LedgerEntry {
    id: string
    type: string
    amount: number
    balanceAfter: number
    referenceType: string
    referenceId: string
    description: string
    createdAt: string
}

interface GiftCard {
    id: string
    cardType: string
    amount: number
    status: string
    createdAt: string
    fulfilledAt: string | null
}

interface StartupStats {
    id: string
    name: string
    commissions: number
    earned: number
}

interface Stats {
    totalCommissions: number
    pendingCommissions: number
    proceedCommissions: number
    completeCommissions: number
    totalEarned: number
    totalPlatformFees: number
    uniqueStartups: number
}

export default function AdminSellerDetailPage() {
    const params = useParams()
    const sellerId = params.sellerId as string

    const [seller, setSeller] = useState<SellerDetail | null>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [startups, setStartups] = useState<StartupStats[]>([])
    const [commissions, setCommissions] = useState<Commission[]>([])
    const [ledger, setLedger] = useState<LedgerEntry[]>([])
    const [giftCards, setGiftCards] = useState<GiftCard[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'commissions' | 'ledger' | 'giftcards'>('commissions')

    useEffect(() => {
        loadSellerDetail()
    }, [sellerId])

    async function loadSellerDetail() {
        try {
            const res = await fetch(`/api/admin/sellers/${sellerId}`)
            const data = await res.json()
            if (data.success) {
                setSeller(data.seller)
                setStats(data.stats)
                setStartups(data.startups)
                setCommissions(data.commissions)
                setLedger(data.ledger)
                setGiftCards(data.giftCards)
            }
        } catch (error) {
            console.error('Failed to load seller:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (cents: number) => {
        return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€'
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-500/20 text-amber-400'
            case 'PROCEED': return 'bg-blue-500/20 text-blue-400'
            case 'COMPLETE': return 'bg-emerald-500/20 text-emerald-400'
            case 'DELIVERED': return 'bg-emerald-500/20 text-emerald-400'
            case 'FAILED': return 'bg-red-500/20 text-red-400'
            default: return 'bg-neutral-500/20 text-neutral-400'
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="h-4 w-32 bg-neutral-800 rounded skeleton-shimmer mb-6" />
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full skeleton-shimmer" />
                    <div>
                        <div className="h-7 w-48 bg-neutral-800 rounded skeleton-shimmer mb-2" />
                        <div className="h-4 w-64 bg-neutral-800/50 rounded skeleton-shimmer mb-2" />
                        <div className="flex gap-2">
                            <div className="h-6 w-24 bg-neutral-800 rounded-full skeleton-shimmer" />
                            <div className="h-6 w-20 bg-neutral-800 rounded-full skeleton-shimmer" />
                        </div>
                    </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 skeleton-shimmer">
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i}>
                                <div className="h-3 w-20 bg-neutral-800 rounded mb-2" />
                                <div className="h-6 w-24 bg-neutral-800 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 mb-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-10 w-32 bg-neutral-800 rounded-lg skeleton-shimmer" />
                    ))}
                </div>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 skeleton-shimmer">
                            <div className="h-4 w-full bg-neutral-800 rounded mb-3" />
                            <div className="grid grid-cols-4 gap-4">
                                {[...Array(4)].map((_, j) => (
                                    <div key={j} className="h-10 bg-neutral-800/50 rounded" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="p-8 text-center text-neutral-500">
                Seller not found
            </div>
        )
    }

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="p-8"
        >
            {/* Back link */}
            <motion.div variants={fadeInUp} transition={springGentle}>
                <Link
                    href="/admin/sellers"
                    className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 btn-press"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sellers
                </Link>
            </motion.div>

            {/* Header */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-light text-neutral-400">
                            {(seller.name || seller.email).charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-light text-white">
                            {seller.name || seller.email}
                        </h1>
                        <p className="text-neutral-500">{seller.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            {seller.payoutMethod === 'STRIPE_CONNECT' ? (
                                <span className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1 badge-pop">
                                    <Zap className="w-3 h-3" />
                                    Stripe Connect
                                </span>
                            ) : (
                                <span className="px-2 py-1 text-xs bg-violet-500/20 text-violet-400 rounded-full flex items-center gap-1 badge-pop">
                                    <Wallet className="w-3 h-3" />
                                    Platform Wallet
                                </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full badge-pop ${
                                seller.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                seller.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {seller.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="flex gap-6 text-right">
                    <div>
                        <p className="text-2xl font-light text-white">{formatCurrency(stats?.totalEarned || 0)}</p>
                        <p className="text-xs text-neutral-500">Total earned</p>
                    </div>
                    <div>
                        <p className="text-2xl font-light text-white">{stats?.totalCommissions || 0}</p>
                        <p className="text-xs text-neutral-500">Commissions</p>
                    </div>
                </div>
            </motion.div>

            {/* Balance Card (for PLATFORM sellers) */}
            {seller.payoutMethod === 'PLATFORM' && (
                <motion.div
                    variants={fadeInUp}
                    transition={springGentle}
                    className={`p-6 rounded-xl mb-8 card-hover ${
                        seller.balance.hasDiscrepancy
                            ? 'bg-red-500/10 border border-red-500/30'
                            : 'bg-neutral-900 border border-neutral-800'
                    }`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-white flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-violet-400" />
                            Wallet Balance
                        </h2>
                        {seller.balance.hasDiscrepancy && (
                            <span className="flex items-center gap-1 text-sm text-red-400 badge-pop">
                                <AlertTriangle className="w-4 h-4" />
                                Discrepancy detected
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-neutral-500 mb-1">Stored balance</p>
                            <p className="text-xl font-light text-white">{formatCurrency(seller.balance.stored)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 mb-1">Balance ledger</p>
                            <p className={`text-xl font-light ${seller.balance.hasDiscrepancy ? 'text-red-400' : 'text-white'}`}>
                                {formatCurrency(seller.balance.ledger)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 mb-1">En attente</p>
                            <p className="text-xl font-light text-amber-400">{formatCurrency(seller.balance.pending)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 mb-1">Disponible</p>
                            <p className="text-xl font-light text-emerald-400">{formatCurrency(seller.balance.due)}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Startups worked with */}
            {startups.length > 0 && (
                <motion.div variants={fadeInUp} transition={springGentle} className="mb-8">
                    <h2 className="text-sm font-medium text-neutral-400 mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Startups ({startups.length})
                    </h2>
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                        {startups.map(startup => (
                            <motion.div
                                key={startup.id}
                                variants={staggerItem}
                                transition={springGentle}
                                className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl card-hover"
                            >
                                <p className="font-medium text-white mb-1">{startup.name}</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">{startup.commissions} commissions</span>
                                    <span className="text-emerald-400">{formatCurrency(startup.earned)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )}

            {/* Tabs */}
            <motion.div variants={fadeInUp} transition={springGentle} className="flex gap-2 mb-6">
                {(['commissions', 'ledger', 'giftcards'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors btn-press ${
                            activeTab === tab
                                ? 'bg-violet-500 text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                    >
                        {tab === 'commissions' ? `Commissions (${commissions.length})` :
                         tab === 'ledger' ? `Ledger (${ledger.length})` :
                         `Gift Cards (${giftCards.length})`}
                    </button>
                ))}
            </motion.div>

            {/* Content */}
            {activeTab === 'commissions' && (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                >
                    {commissions.length === 0 ? (
                        <p className="text-neutral-500 text-center py-8">Aucune commission</p>
                    ) : (
                        commissions.map(commission => (
                            <motion.div
                                key={commission.id}
                                variants={staggerItem}
                                transition={springGentle}
                                className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl row-hover"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs rounded-full badge-pop ${getStatusColor(commission.status)}`}>
                                            {commission.status}
                                        </span>
                                        {commission.startup && (
                                            <span className="text-sm text-neutral-400">
                                                via <span className="text-white">{commission.startup.name}</span>
                                            </span>
                                        )}
                                        {commission.recurringMonth && (
                                            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded badge-pop">
                                                Recurring #{commission.recurringMonth}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-lg font-medium text-emerald-400">
                                        +{formatCurrency(commission.commissionAmount)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-neutral-500">Vente brute</p>
                                        <p className="text-white">{formatCurrency(commission.grossAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Net</p>
                                        <p className="text-white">{formatCurrency(commission.netAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Fee plateforme</p>
                                        <p className="text-white">{formatCurrency(commission.platformFee)}</p>
                                    </div>
                                    <div>
                                        <p className="text-neutral-500">Date</p>
                                        <p className="text-white">{formatDate(commission.createdAt)}</p>
                                    </div>
                                </div>

                                {commission.startupPaymentStatus === 'UNPAID' && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                                        <Clock className="w-3 h-3" />
                                        Startup payment pending
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </motion.div>
            )}

            {activeTab === 'ledger' && (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                >
                    {ledger.length === 0 ? (
                        <p className="text-neutral-500 text-center py-8">No ledger entries</p>
                    ) : (
                        ledger.map(entry => (
                            <motion.div
                                key={entry.id}
                                variants={staggerItem}
                                transition={springGentle}
                                className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between row-hover"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                        entry.type === 'CREDIT' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                    }`}>
                                        {entry.type === 'CREDIT' ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Gift className="w-4 h-4 text-red-400" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-white">{entry.description}</p>
                                        <p className="text-xs text-neutral-500">
                                            {entry.referenceType} • {formatDate(entry.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-medium ${entry.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        Solde: {formatCurrency(entry.balanceAfter)}
                                    </p>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            )}

            {activeTab === 'giftcards' && (
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                >
                    {giftCards.length === 0 ? (
                        <p className="text-neutral-500 text-center py-8">Aucune demande de gift card</p>
                    ) : (
                        giftCards.map(gc => (
                            <motion.div
                                key={gc.id}
                                variants={staggerItem}
                                transition={springGentle}
                                className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between row-hover"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                                        <Gift className="w-5 h-5 text-neutral-400" />
                                    </div>
                                    <div>
                                        <p className="text-white capitalize">{gc.cardType}</p>
                                        <p className="text-xs text-neutral-500">{formatDate(gc.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 text-xs rounded-full badge-pop ${getStatusColor(gc.status)}`}>
                                        {gc.status}
                                    </span>
                                    <span className="text-lg font-medium text-white">
                                        {formatCurrency(gc.amount)}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            )}
        </motion.div>
    )
}
