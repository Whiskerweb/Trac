'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, MapPin, Globe, Calendar, Copy, Check, Loader2, Award, Target, TrendingUp, Youtube, ExternalLink } from 'lucide-react'

interface PartnerProfile {
    id: string
    name: string
    email: string
    avatar: string
    status: 'active' | 'pending' | 'inactive'
    country: string
    profileType: 'individual' | 'company'
    partnerSince: Date
    // Bio & interests
    bio: string
    industryInterests: string[]
    monthlyTraffic: string
    // Socials
    socials: {
        website?: string
        youtube?: string
        twitter?: string
        linkedin?: string
        instagram?: string
        tiktok?: string
    }
    // Earning preferences
    earningPreferences: string[]
    salesChannels: string[]
    // Global stats (across all startups)
    globalStats: {
        totalClicks: number
        totalSales: number
        totalEarnings: number
        conversionRate: number
        activeMissions: number
    }
    // Stats specific to our startup
    ourStats: {
        missionsJoined: number
        totalClicks: number
        totalSales: number
        totalEarnings: number
        conversionRate: number
    }
    // Missions they've joined with us
    missions: {
        id: string
        name: string
        clicks: number
        sales: number
        earnings: number
        status: 'active' | 'paused' | 'completed'
    }[]
}

// Mock data aligned with partner profile page
const MOCK_PARTNER: PartnerProfile = {
    id: 'p1',
    name: 'Sophie Anderson',
    email: 'sophie@creator.io',
    avatar: 'SA',
    status: 'active',
    country: '🇺🇸 United States',
    profileType: 'individual',
    partnerSince: new Date('2024-06-15'),
    bio: 'Digital marketing specialist with 5+ years of experience in SaaS and e-commerce. Passionate about helping brands grow through authentic content creation and strategic partnerships.',
    industryInterests: ['AI', 'SaaS', 'E-commerce', 'Marketing'],
    monthlyTraffic: '50,000 - 100,000',
    socials: {
        website: 'sophieanderson.com',
        youtube: '@sophieanderson',
        twitter: '@sophie_creates',
        instagram: '@sophie.anderson',
        tiktok: '@sophieand'
    },
    earningPreferences: ['Rev-share', 'Per lead'],
    salesChannels: ['Blogs', 'Newsletters', 'Social media'],
    globalStats: {
        totalClicks: 45000,
        totalSales: 820,
        totalEarnings: 1640000,
        conversionRate: 1.82,
        activeMissions: 12
    },
    ourStats: {
        missionsJoined: 5,
        totalClicks: 2840,
        totalSales: 47,
        totalEarnings: 94000,
        conversionRate: 1.65
    },
    missions: [
        { id: 'm1', name: 'Summer Launch Campaign', clicks: 1200, sales: 22, earnings: 44000, status: 'active' },
        { id: 'm2', name: 'Black Friday 2024', clicks: 890, sales: 15, earnings: 30000, status: 'completed' },
        { id: 'm3', name: 'New Year Promo', clicks: 450, sales: 7, earnings: 14000, status: 'active' },
        { id: 'm4', name: 'Product Launch Q4', clicks: 200, sales: 2, earnings: 4000, status: 'paused' },
        { id: 'm5', name: 'Referral Program', clicks: 100, sales: 1, earnings: 2000, status: 'active' },
    ]
}

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600`}>
            {initials}
        </div>
    )
}

function StatusBadge({ status }: { status: PartnerProfile['status'] }) {
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

function MissionStatusBadge({ status }: { status: 'active' | 'paused' | 'completed' }) {
    const styles = {
        active: 'bg-green-50 text-green-700',
        paused: 'bg-orange-50 text-orange-700',
        completed: 'bg-gray-100 text-gray-500'
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
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PartnerProfilePage() {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [partner, setPartner] = useState<PartnerProfile | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        setTimeout(() => {
            setPartner(MOCK_PARTNER)
            setLoading(false)
        }, 300)
    }, [params.partnerId])

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading || !partner) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/partners/applications')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Partners
            </button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Avatar initials={partner.avatar} size="lg" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">{partner.name}</h1>
                            <StatusBadge status={partner.status} />
                        </div>
                        <p className="text-gray-500">{partner.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{partner.country}</span>
                            <span>•</span>
                            <span className="capitalize">{partner.profileType}</span>
                            <span>•</span>
                            <span>Partner since {formatDate(partner.partnerSince)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                        Message
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                {/* Global Performance */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-500">Global Performance</h3>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(partner.globalStats.totalClicks)}</p>
                            <p className="text-xs text-gray-500">Clicks</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(partner.globalStats.totalSales)}</p>
                            <p className="text-xs text-gray-500">Sales</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-green-600">{formatCurrency(partner.globalStats.totalEarnings)}</p>
                            <p className="text-xs text-gray-500">Earned</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{partner.globalStats.conversionRate}%</p>
                            <p className="text-xs text-gray-500">CVR</p>
                        </div>
                    </div>
                </div>

                {/* With Your Startup */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-medium text-gray-500">With Your Startup</h3>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(partner.ourStats.totalClicks)}</p>
                            <p className="text-xs text-gray-500">Clicks</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{partner.ourStats.totalSales}</p>
                            <p className="text-xs text-gray-500">Sales</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-green-600">{formatCurrency(partner.ourStats.totalEarnings)}</p>
                            <p className="text-xs text-gray-500">Earned</p>
                        </div>
                        <div className="w-px bg-gray-200" />
                        <div className="flex-1">
                            <p className="text-2xl font-semibold text-gray-900">{partner.ourStats.conversionRate}%</p>
                            <p className="text-xs text-gray-500">CVR</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6">
                {/* Left Column - Missions */}
                <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">Missions ({partner.missions?.length || 0})</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {(partner.missions || []).map((mission) => (
                                <div key={mission.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm text-gray-900">{mission.name}</p>
                                            <p className="text-xs text-gray-500">{formatNumber(mission.clicks)} clicks • {mission.sales} sales</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-green-600">{formatCurrency(mission.earnings)}</span>
                                        <MissionStatusBadge status={mission.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Profile Info */}
                <div className="w-80 shrink-0 space-y-4">
                    {/* About */}
                    {partner.bio && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">About</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{partner.bio}</p>
                        </div>
                    )}

                    {/* Details */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Monthly traffic</p>
                                <p className="text-sm text-gray-900">{partner.monthlyTraffic}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Industries</p>
                                <div className="flex flex-wrap gap-1">
                                    {(partner.industryInterests || []).map((interest) => (
                                        <span key={interest} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Earning preferences</p>
                                <div className="flex flex-wrap gap-1">
                                    {(partner.earningPreferences || []).map((pref) => (
                                        <span key={pref} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                            {pref}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Sales channels</p>
                                <div className="flex flex-wrap gap-1">
                                    {(partner.salesChannels || []).map((channel) => (
                                        <span key={channel} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                            {channel}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Links</h3>
                        <div className="space-y-2">
                            {partner.socials.website && (
                                <a
                                    href={`https://${partner.socials.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    {partner.socials.website}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {partner.socials.youtube && (
                                <a
                                    href={`https://youtube.com/${partner.socials.youtube}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <Youtube className="w-4 h-4 text-red-500" />
                                    {partner.socials.youtube}
                                </a>
                            )}
                            {partner.socials.twitter && (
                                <a
                                    href={`https://twitter.com/${partner.socials.twitter.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    {partner.socials.twitter}
                                </a>
                            )}
                            {partner.socials.instagram && (
                                <a
                                    href={`https://instagram.com/${partner.socials.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    {partner.socials.instagram}
                                </a>
                            )}
                            {partner.socials.tiktok && (
                                <a
                                    href={`https://tiktok.com/${partner.socials.tiktok}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                    {partner.socials.tiktok}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Partner ID */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Partner ID</p>
                                <code className="text-sm text-gray-900 font-mono">{partner.id}</code>
                            </div>
                            <button
                                onClick={() => handleCopy(partner.id)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
