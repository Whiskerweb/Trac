'use client'

import { useState, useEffect } from 'react'
import {
    Search, Filter, Loader2, Target, Gift, Users,
    Lock, Globe, Eye, Building, TrendingUp,
    ChevronRight, Rocket, Clock, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { getMarketplaceMissions, applyToMission } from '@/app/actions/marketplace-actions'
import { joinMission } from '@/app/actions/marketplace'

interface Mission {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
    industry: string | null
    gain_type: string | null
    workspace_name: string
    has_resources: boolean
    partners_count: number
    enrollment: { status: string; linkSlug?: string } | null
    request: { status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null
}

// =============================================
// FILTER BADGES
// =============================================

const INDUSTRIES = ['SaaS', 'E-commerce', 'Finance', 'Health', 'Education']
const GAIN_TYPES = ['Net Revenue', 'ROI', 'Fixed']

// =============================================
// VISIBILITY BADGE
// =============================================

function VisibilityBadge({ visibility }: { visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' }) {
    const configs = {
        PUBLIC: { icon: Globe, label: 'Public', color: 'bg-green-50 text-green-700 border-green-200' },
        PRIVATE: { icon: Lock, label: 'Private', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        INVITE_ONLY: { icon: Eye, label: 'Invitation Only', color: 'bg-purple-50 text-purple-700 border-purple-200' }
    }
    const config = configs[visibility]

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
            <config.icon className="w-3 h-3" />
            {config.label}
        </div>
    )
}

// =============================================
// MISSION CARD
// =============================================

function MissionCard({
    mission,
    onRefresh
}: {
    mission: Mission
    onRefresh: () => void
}) {
    const [loading, setLoading] = useState(false)

    const isEnrolled = mission.enrollment?.status === 'APPROVED'
    const hasPendingRequest = mission.request?.status === 'PENDING'
    const isRequestApproved = mission.request?.status === 'APPROVED'
    const isRequestRejected = mission.request?.status === 'REJECTED'

    async function handleAction() {
        setLoading(true)

        if (mission.visibility === 'PUBLIC') {
            // Direct join for PUBLIC missions
            await joinMission(mission.id)
        } else if (mission.visibility === 'PRIVATE') {
            // Apply for PRIVATE missions
            await applyToMission(mission.id)
        }

        onRefresh()
        setLoading(false)
    }

    // Determine button state
    let buttonContent = null
    if (isEnrolled) {
        buttonContent = (
            <Link
                href={`/seller/marketplace/${mission.id}`}
                className="w-full px-4 py-2.5 bg-black text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
                View Resources
                <ChevronRight className="w-4 h-4" />
            </Link>
        )
    } else if (hasPendingRequest) {
        buttonContent = (
            <div className="w-full px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Application Pending
            </div>
        )
    } else if (isRequestRejected) {
        buttonContent = (
            <div className="w-full px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                Application Rejected
            </div>
        )
    } else if (mission.visibility === 'PUBLIC') {
        buttonContent = (
            <button
                onClick={handleAction}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-black text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Join Program
            </button>
        )
    } else if (mission.visibility === 'PRIVATE') {
        buttonContent = (
            <button
                onClick={handleAction}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Apply to Join
            </button>
        )
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Building className="w-3.5 h-3.5" />
                        {mission.workspace_name}
                    </div>
                    <VisibilityBadge visibility={mission.visibility} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">
                    {mission.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2">
                    {mission.description || 'Join this program and earn commissions on every sale you generate.'}
                </p>
            </div>

            {/* Stats Row */}
            <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                    <Gift className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900">{mission.reward}</span>
                </div>
                <div className="flex items-center gap-4">
                    {mission.industry && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {mission.industry}
                        </span>
                    )}
                    <div className="flex items-center gap-1 text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{mission.partners_count}</span>
                    </div>
                </div>
            </div>

            {/* Action */}
            <div className="p-4">
                {buttonContent}
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function PartnerMarketplacePage() {
    const [missions, setMissions] = useState<Mission[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [industryFilter, setIndustryFilter] = useState<string | null>(null)
    const [gainTypeFilter, setGainTypeFilter] = useState<string | null>(null)

    async function loadMissions() {
        setLoading(true)
        const result = await getMarketplaceMissions({
            search: search || undefined,
            industry: industryFilter || undefined,
            gainType: gainTypeFilter || undefined
        })

        if (result.success && result.missions) {
            setMissions(result.missions as Mission[])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadMissions()
    }, [industryFilter, gainTypeFilter])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadMissions()
        }, 300)
        return () => clearTimeout(timer)
    }, [search])

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
                        Marketplace
                    </h1>
                    <p className="text-gray-600">
                        Discover affiliate programs and start earning commissions.
                    </p>
                </div>

                {/* Search & Filters */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search programs..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                            />
                        </div>

                        {/* Industry Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={industryFilter || ''}
                                onChange={(e) => setIndustryFilter(e.target.value || null)}
                                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                            >
                                <option value="">All Industries</option>
                                {INDUSTRIES.map(i => (
                                    <option key={i} value={i}>{i}</option>
                                ))}
                            </select>
                        </div>

                        {/* Gain Type Filter */}
                        <select
                            value={gainTypeFilter || ''}
                            onChange={(e) => setGainTypeFilter(e.target.value || null)}
                            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        >
                            <option value="">All Reward Types</option>
                            {GAIN_TYPES.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Target className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No programs available
                        </h3>
                        <p className="text-gray-500">
                            New affiliate programs will appear here soon.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                onRefresh={loadMissions}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
