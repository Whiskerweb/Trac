'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Globe, Loader2, ExternalLink, MapPin, Briefcase, TrendingUp, Target, BarChart3, MessageSquare } from 'lucide-react'
import { getSellerProfile } from '@/app/actions/sellers'
import { initializeConversation } from '@/app/actions/messaging'

interface SellerProfile {
    id: string
    name: string
    email: string
    avatar: string
    status: 'active' | 'pending' | 'inactive'
    sellerSince: Date
    bio: string | null
    country: string | null
    profileType: 'INDIVIDUAL' | 'COMPANY' | null
    socials: {
        website?: string | null
        youtube?: string | null
        twitter?: string | null
        instagram?: string | null
        tiktok?: string | null
        linkedin?: string | null
    }
    avatarUrl?: string | null
    portfolioUrl?: string | null
    cvUrl?: string | null
    industryInterests: string[]
    monthlyTraffic: string | null
    earningPreferences: Record<string, boolean>
    salesChannels: Record<string, boolean>
    globalStats: {
        totalClicks: number
        totalSales: number
        totalEarnings: number
        conversionRate: number
        activeMissions: number
    }
}

function Avatar({ initials, imageUrl, size = 'md' }: { initials: string; imageUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-14 h-14 text-base',
        lg: 'w-24 h-24 text-2xl'
    }

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={initials}
                className={`${sizeClasses[size]} rounded-2xl object-cover border-2 border-slate-200`}
            />
        )
    }

    return (
        <div className={`${sizeClasses[size]} rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-900 tracking-tighter`}>
            {initials}
        </div>
    )
}

function StatusBadge({ status }: { status: SellerProfile['status'] }) {
    const config = {
        active: {
            bg: 'bg-slate-900',
            text: 'text-white',
            label: 'Active'
        },
        pending: {
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            label: 'Pending'
        },
        inactive: {
            bg: 'bg-slate-50',
            text: 'text-slate-400',
            label: 'Inactive'
        }
    }

    const { bg, text, label } = config[status]

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${bg} ${text}`}>
            {label}
        </span>
    )
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
    'FR': 'France',
    'US': 'États-Unis',
    'GB': 'Royaume-Uni',
    'DE': 'Allemagne',
    'ES': 'Espagne',
    'IT': 'Italie',
    'CA': 'Canada',
    'NL': 'Pays-Bas',
    'BE': 'Belgique',
    'CH': 'Suisse',
    'PT': 'Portugal',
    'AT': 'Autriche',
    'PL': 'Pologne',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Danemark',
    'FI': 'Finlande',
    'IE': 'Irlande',
    'AU': 'Australie',
    'JP': 'Japon',
    'BR': 'Brazil',
    'MX': 'Mexique',
    'IN': 'Inde',
    'SG': 'Singapour',
}

function formatPreferenceKey(key: string): string {
    const labels: Record<string, string> = {
        revShare: 'Rev-share',
        cpc: 'CPC',
        cpl: 'CPL',
        oneTime: 'One-time',
        blogs: 'Blogs',
        newsletters: 'Newsletters',
        socialMedia: 'Social',
        events: 'Events',
        companyReferrals: 'Referrals'
    }
    return labels[key] || key
}

export default function SellerProfilePage() {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [seller, setSeller] = useState<SellerProfile | null>(null)
    const [messagingLoading, setMessagingLoading] = useState(false)

    useEffect(() => {
        async function loadSeller() {
            if (!params.sellerId || typeof params.sellerId !== 'string') {
                setLoading(false)
                return
            }

            try {
                const result = await getSellerProfile(params.sellerId)
                if (result.success && result.seller) {
                    setSeller(result.seller as SellerProfile)
                } else {
                    console.error('Failed to load seller:', result.error)
                    setSeller(null)
                }
            } catch (error) {
                console.error('Error loading seller:', error)
                setSeller(null)
            } finally {
                setLoading(false)
            }
        }
        loadSeller()
    }, [params.sellerId])

    async function handleMessage() {
        if (!params.sellerId || typeof params.sellerId !== 'string') return
        setMessagingLoading(true)
        try {
            const result = await initializeConversation(params.sellerId)
            if (result.success && result.conversationId) {
                router.push(`/dashboard/messages?conversation=${result.conversationId}`)
            }
        } catch (error) {
            console.error('Error initializing conversation:', error)
        } finally {
            setMessagingLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="text-center py-32">
                <p className="text-slate-400 font-medium">Seller not found</p>
            </div>
        )
    }

    const hasEarningPrefs = Object.values(seller.earningPreferences).some(v => v)
    const hasSalesChannels = Object.values(seller.salesChannels).some(v => v)

    return (
        <div className="relative min-h-screen">
            {/* Subtle grid background */}
            <div className="fixed inset-0 bg-grid-small-black opacity-[0.015] pointer-events-none" />

            <div className="relative space-y-8 pb-20">
                {/* Back button - Editorial style */}
                <button
                    onClick={() => router.push('/dashboard/sellers')}
                    className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-all duration-300"
                >
                    <div className="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-900 transition-all duration-300">
                        <ChevronLeft className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                    </div>
                    <span className="tracking-tight">All Sellers</span>
                </button>

                {/* Hero Header - Editorial Layout */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent rounded-3xl" />
                    <div className="relative border border-slate-200/60 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
                        {/* Accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-900 to-transparent" />

                        <div className="p-6 sm:p-10">
                            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
                                {/* Avatar - Minimalist */}
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-b from-slate-200 to-slate-300 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
                                    <div className="relative">
                                        <Avatar initials={seller.avatar} imageUrl={seller.avatarUrl} size="lg" />
                                        {seller.status === 'active' && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-900 border-2 border-white rounded-full">
                                                <div className="absolute inset-0.5 bg-slate-300 rounded-full animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter text-slate-900">
                                                {seller.name}
                                            </h1>
                                            <StatusBadge status={seller.status} />
                                        </div>
                                        <button
                                            onClick={handleMessage}
                                            disabled={messagingLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
                                        >
                                            {messagingLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <MessageSquare className="w-4 h-4" />
                                            )}
                                            Message
                                        </button>
                                    </div>

                                    <p className="text-slate-500 font-mono text-sm tracking-tight mb-6">
                                        {seller.email}
                                    </p>

                                    {/* Meta - Minimalist pills */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                            <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                {formatDate(seller.sellerSince)}
                                            </span>
                                        </div>

                                        {seller.country && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                    {COUNTRY_NAMES[seller.country] || seller.country}
                                                </span>
                                            </div>
                                        )}

                                        {seller.profileType && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                                <Briefcase className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs font-medium text-slate-600 tracking-tight">
                                                    {seller.profileType === 'INDIVIDUAL' ? 'Individual' : 'Company'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Data Luxury */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Clicks"
                        value={formatNumber(seller.globalStats.totalClicks)}
                        delay="0ms"
                    />
                    <StatCard
                        label="Sales"
                        value={formatNumber(seller.globalStats.totalSales)}
                        delay="50ms"
                    />
                    <StatCard
                        label="Revenue"
                        value={formatCurrency(seller.globalStats.totalEarnings / 100)}
                        highlight
                        delay="100ms"
                    />
                    <StatCard
                        label="CVR"
                        value={`${seller.globalStats.conversionRate}%`}
                        delay="150ms"
                    />
                </div>

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* About */}
                        {seller.bio && (
                            <ContentCard title="About" icon={<Target className="w-4 h-4" />}>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-light">
                                    {seller.bio}
                                </p>
                            </ContentCard>
                        )}

                        {/* Industry Interests */}
                        {seller.industryInterests && seller.industryInterests.length > 0 && (
                            <ContentCard title="Industries" icon={<TrendingUp className="w-4 h-4" />}>
                                <div className="flex flex-wrap gap-2">
                                    {seller.industryInterests.map((interest, i) => (
                                        <span
                                            key={interest}
                                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 cursor-default"
                                            style={{ animationDelay: `${i * 30}ms` }}
                                        >
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </ContentCard>
                        )}

                        {/* Work Preferences */}
                        {(hasEarningPrefs || hasSalesChannels || seller.monthlyTraffic) && (
                            <ContentCard title="How They Work" icon={<BarChart3 className="w-4 h-4" />}>
                                <div className="space-y-5">
                                    {seller.monthlyTraffic && (
                                        <div className="pb-5 border-b border-slate-100">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                Monthly Traffic
                                            </div>
                                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                                                {seller.monthlyTraffic} <span className="text-sm font-medium text-slate-400">visitors</span>
                                            </div>
                                        </div>
                                    )}

                                    {hasEarningPrefs && (
                                        <div className="pb-5 border-b border-slate-100">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                Earning Structure
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(seller.earningPreferences)
                                                    .filter(([_, value]) => value)
                                                    .map(([key]) => (
                                                        <span
                                                            key={key}
                                                            className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium tracking-tight"
                                                        >
                                                            {formatPreferenceKey(key)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {hasSalesChannels && (
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                Sales Channels
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(seller.salesChannels)
                                                    .filter(([_, value]) => value)
                                                    .map(([key]) => (
                                                        <span
                                                            key={key}
                                                            className="px-2.5 py-1 border border-slate-200 bg-white rounded text-xs font-medium text-slate-600"
                                                        >
                                                            {formatPreferenceKey(key)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ContentCard>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-80 lg:shrink-0 space-y-6">
                        {/* Links */}
                        {Object.values(seller.socials).some(v => v) && (
                            <ContentCard title="Connect" icon={<Globe className="w-4 h-4" />}>
                                <div className="space-y-1.5">
                                    {seller.socials.website && (
                                        <SocialLink href={seller.socials.website} label="Website" />
                                    )}
                                    {seller.socials.linkedin && (
                                        <SocialLink href={seller.socials.linkedin.startsWith('http') ? seller.socials.linkedin : `https://linkedin.com/in/${seller.socials.linkedin}`} label="LinkedIn" />
                                    )}
                                    {seller.socials.twitter && (
                                        <SocialLink href={seller.socials.twitter.startsWith('http') ? seller.socials.twitter : `https://twitter.com/${seller.socials.twitter.replace('@', '')}`} label="Twitter" />
                                    )}
                                    {seller.socials.youtube && (
                                        <SocialLink href={seller.socials.youtube} label="YouTube" />
                                    )}
                                    {seller.socials.instagram && (
                                        <SocialLink href={seller.socials.instagram.startsWith('http') ? seller.socials.instagram : `https://instagram.com/${seller.socials.instagram.replace('@', '')}`} label="Instagram" />
                                    )}
                                    {seller.socials.tiktok && (
                                        <SocialLink href={seller.socials.tiktok} label="TikTok" />
                                    )}
                                </div>
                            </ContentCard>
                        )}

                        {/* Portfolio & CV */}
                        {(seller.portfolioUrl || seller.cvUrl) && (
                            <ContentCard title="Resources" icon={<ExternalLink className="w-4 h-4" />}>
                                <div className="space-y-2">
                                    {seller.portfolioUrl && (
                                        <a
                                            href={seller.portfolioUrl.startsWith('http') ? seller.portfolioUrl : `https://${seller.portfolioUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-xl transition-all duration-300"
                                        >
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-white">
                                                Portfolio
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                        </a>
                                    )}
                                    {seller.cvUrl && (
                                        <a
                                            href={seller.cvUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-xl transition-all duration-300"
                                        >
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-white">
                                                Resume / CV
                                            </span>
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                                        </a>
                                    )}
                                </div>
                            </ContentCard>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helper Components

function StatCard({ label, value, highlight = false, delay = '0ms' }: { label: string; value: string; highlight?: boolean; delay?: string }) {
    return (
        <div
            className="group relative overflow-hidden"
            style={{ animationDelay: delay }}
        >
            <div className={`relative border ${highlight ? 'border-slate-900 bg-slate-900' : 'border-slate-200 bg-white'} rounded-2xl p-6 transition-all duration-500 hover:shadow-lg ${!highlight && 'hover:border-slate-900'}`}>
                {/* Hover effect line */}
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${highlight ? 'bg-white/20' : 'bg-slate-900'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

                <div className="relative z-10">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>
                        {label}
                    </div>
                    <div className={`text-3xl font-black tracking-tighter ${highlight ? 'text-white' : 'text-slate-900'}`}>
                        {value}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ContentCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="border border-slate-200 bg-white rounded-2xl p-6 hover:border-slate-300 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            {children}
        </div>
    )
}

function SocialLink({ href, label }: { href: string; label: string }) {
    const fullHref = href.startsWith('http') ? href : `https://${href}`

    return (
        <a
            href={fullHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg transition-all duration-200"
        >
            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">
                {label}
            </span>
            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-slate-600 transition-colors" />
        </a>
    )
}
