'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, MapPin, Globe, Calendar, Copy, Check, Loader2, Award, Target, TrendingUp, Youtube, ExternalLink } from 'lucide-react'
import { getSellerProfile } from '@/app/actions/sellers'

interface SellerProfile {
    id: string
    name: string
    email: string
    avatar: string
    status: 'active' | 'pending' | 'inactive'
    sellerSince: Date
    // Bio & socials from SellerProfile table
    bio: string | null
    socials: {
        website?: string | null
        youtube?: string | null
        twitter?: string | null
        instagram?: string | null
        tiktok?: string | null
    }
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

function StatusBadge({ status }: { status: SellerProfile['status'] }) {
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

export default function SellerProfilePage() {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [seller, setSeller] = useState<SellerProfile | null>(null)
    const [copied, setCopied] = useState(false)

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

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!seller) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <h3 className="font-medium text-gray-900 mb-2">Seller not found</h3>
                    <p className="text-gray-500 text-sm mb-4">This seller does not exist or you don't have access.</p>
                    <button
                        onClick={() => router.push('/dashboard/sellers?view=my')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
                    >
                        Back to sellers
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/sellers?view=my')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Sellers
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Avatar initials={seller.avatar} size="lg" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-gray-900">{seller.name}</h1>
                            <StatusBadge status={seller.status} />
                        </div>
                        <p className="text-gray-500">{seller.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Seller since {formatDate(seller.sellerSince)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                        Message
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Global Performance */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-500">Global Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(seller.globalStats.totalClicks)}</p>
                            <p className="text-xs text-gray-500">Clicks</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(seller.globalStats.totalSales)}</p>
                            <p className="text-xs text-gray-500">Sales</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-green-600">{formatCurrency(seller.globalStats.totalEarnings)}</p>
                            <p className="text-xs text-gray-500">Earned</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{seller.globalStats.conversionRate}%</p>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{formatNumber(seller.ourStats.totalClicks)}</p>
                            <p className="text-xs text-gray-500">Clicks</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{seller.ourStats.totalSales}</p>
                            <p className="text-xs text-gray-500">Sales</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-green-600">{formatCurrency(seller.ourStats.totalEarnings)}</p>
                            <p className="text-xs text-gray-500">Earned</p>
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-gray-900">{seller.ourStats.conversionRate}%</p>
                            <p className="text-xs text-gray-500">CVR</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column - Missions */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-900">Missions ({seller.missions?.length || 0})</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {(seller.missions || []).map((mission) => (
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
                <div className="lg:w-80 lg:shrink-0 space-y-4">
                    {/* About */}
                    {seller.bio && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">About</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{seller.bio}</p>
                        </div>
                    )}

                    {/* Socials */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Links</h3>
                        <div className="space-y-2">
                            {seller.socials.website && (
                                <a
                                    href={`https://${seller.socials.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    {seller.socials.website}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {seller.socials.youtube && (
                                <a
                                    href={`https://youtube.com/${seller.socials.youtube}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <Youtube className="w-4 h-4 text-red-500" />
                                    {seller.socials.youtube}
                                </a>
                            )}
                            {seller.socials.twitter && (
                                <a
                                    href={`https://twitter.com/${seller.socials.twitter.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    {seller.socials.twitter}
                                </a>
                            )}
                            {seller.socials.instagram && (
                                <a
                                    href={`https://instagram.com/${seller.socials.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    {seller.socials.instagram}
                                </a>
                            )}
                            {seller.socials.tiktok && (
                                <a
                                    href={`https://tiktok.com/${seller.socials.tiktok}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                                >
                                    <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                    {seller.socials.tiktok}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Seller ID */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Seller ID</p>
                                <code className="text-sm text-gray-900 font-mono">{seller.id}</code>
                            </div>
                            <button
                                onClick={() => handleCopy(seller.id)}
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
