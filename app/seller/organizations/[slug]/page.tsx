'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Crown, ArrowLeft, Globe, Lock, KeyRound, Share2, Check, ExternalLink } from 'lucide-react'
import { getOrganizationBySlug, applyToJoinOrg } from '@/app/actions/organization-actions'

function VisibilityBadge({ visibility }: { visibility: string }) {
    const config: Record<string, { icon: any; label: string; style: string }> = {
        PUBLIC: { icon: Globe, label: 'Public', style: 'bg-green-50 text-green-700 border-green-200' },
        PRIVATE: { icon: Lock, label: 'Private', style: 'bg-amber-50 text-amber-700 border-amber-200' },
        INVITE_ONLY: { icon: KeyRound, label: 'Invite Only', style: 'bg-purple-50 text-purple-700 border-purple-200' },
    }
    const c = config[visibility] || config.PUBLIC
    const Icon = c.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.style}`}>
            <Icon className="w-3 h-3" /> {c.label}
        </span>
    )
}

export default function OrganizationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [isLeader, setIsLeader] = useState(false)
    const [membershipStatus, setMembershipStatus] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)
    const [copied, setCopied] = useState(false)

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getOrganizationBySlug(slug)
        if (result.success) {
            setOrg(result.organization)
            setIsLeader(result.isLeader || false)
            setMembershipStatus(result.membershipStatus || null)
        }
        setLoading(false)
    }, [slug])

    useEffect(() => { loadData() }, [loadData])

    const handleJoin = async () => {
        if (!org) return
        setJoining(true)
        const result = await applyToJoinOrg(org.id)
        if (result.success) {
            loadData()
        }
        setJoining(false)
    }

    const handleShare = () => {
        const url = `${window.location.origin}/org/${org.slug}`
        navigator.clipboard.writeText(url)
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

    if (!org) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-4">Organization not found</p>
                <Link href="/seller/organizations" className="text-violet-600 text-sm font-medium hover:underline">
                    Back to browse
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Back */}
            <Link href="/seller/organizations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
                <ArrowLeft className="w-4 h-4" /> Back to browse
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl font-bold text-white">{org.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                                    <VisibilityBadge visibility={org.visibility} />
                                </div>
                                <p className="text-sm text-gray-500">
                                    Led by <span className="font-medium text-gray-700">{org.Leader?.name || org.Leader?.email}</span>
                                </p>
                            </div>
                        </div>
                        {org.description && (
                            <p className="text-gray-600 text-[15px] leading-relaxed">{org.description}</p>
                        )}
                    </div>

                    {/* Missions */}
                    {org.Missions && org.Missions.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Missions</h2>
                            <div className="space-y-2">
                                {org.Missions.map((om: any) => (
                                    <div key={om.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{om.Mission.title}</p>
                                            <p className="text-xs text-gray-400">{om.Mission.reward}</p>
                                        </div>
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Active</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Members preview */}
                    {org.Members && org.Members.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Members ({org._count?.Members || org.Members.length})</h2>
                            <div className="flex flex-wrap gap-2">
                                {org.Members.slice(0, 12).map((m: any) => (
                                    <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <span className="text-[10px] font-medium text-gray-600">{(m.Seller?.name || m.Seller?.email || '?').charAt(0).toUpperCase()}</span>
                                        </div>
                                        <span className="text-xs text-gray-700">{m.Seller?.name || m.Seller?.email}</span>
                                    </div>
                                ))}
                                {(org._count?.Members || 0) > 12 && (
                                    <div className="flex items-center px-3 py-1.5 text-xs text-gray-400">
                                        +{(org._count?.Members || 0) - 12} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right column — sticky CTA */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{org._count?.Members || 0}</p>
                                <p className="text-xs text-gray-400">Members</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{org._count?.Missions || 0}</p>
                                <p className="text-xs text-gray-400">Missions</p>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        {/* CTA */}
                        {isLeader ? (
                            <Link
                                href={`/seller/manage/${org.id}`}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                <Crown className="w-4 h-4" /> Manage Organization
                            </Link>
                        ) : membershipStatus === 'ACTIVE' ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                                    <Check className="w-4 h-4" /> You are a member
                                </div>
                            </div>
                        ) : membershipStatus === 'PENDING' ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium">
                                    <Loader2 className="w-4 h-4" /> Request pending
                                </div>
                            </div>
                        ) : org.visibility === 'INVITE_ONLY' ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm font-medium">
                                    <KeyRound className="w-4 h-4" /> Invite only
                                </div>
                                <p className="text-xs text-gray-400 mt-2">You need an invite link to join</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleJoin}
                                disabled={joining}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                                {org.visibility === 'PRIVATE' ? 'Request to join' : 'Join organization'}
                            </button>
                        )}

                        {/* Share */}
                        {org.slug && (
                            <button
                                onClick={handleShare}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                                {copied ? 'Copied!' : 'Share link'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
