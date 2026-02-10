'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Loader2, ArrowLeft, Users, Crown, Target, Check, Ban, RotateCcw,
    ExternalLink, Globe, Lock, KeyRound, Calendar, CreditCard, Wallet,
    Zap, MessageSquare, Copy, Mail, MapPin, User, Link2, Clock
} from 'lucide-react'
import { getOrgAdminDetail, approveOrg, suspendOrg, reactivateOrg, rejectOrg } from '@/app/actions/admin-org-actions'

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-amber-500/20 text-amber-400',
        ACTIVE: 'bg-emerald-500/20 text-emerald-400',
        SUSPENDED: 'bg-red-500/20 text-red-400',
        REMOVED: 'bg-neutral-500/20 text-neutral-500',
        PROPOSED: 'bg-blue-500/20 text-blue-400',
        ACCEPTED: 'bg-emerald-500/20 text-emerald-400',
        REJECTED: 'bg-red-500/20 text-red-400',
        APPROVED: 'bg-emerald-500/20 text-emerald-400',
        BANNED: 'bg-red-500/20 text-red-400',
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${styles[status] || 'bg-neutral-500/20 text-neutral-400'} ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
            {status}
        </span>
    )
}

function VisibilityBadge({ visibility }: { visibility: string }) {
    const config: Record<string, { icon: typeof Globe; label: string; color: string }> = {
        PUBLIC: { icon: Globe, label: 'Public', color: 'text-emerald-400 bg-emerald-500/20' },
        PRIVATE: { icon: Lock, label: 'Private', color: 'text-amber-400 bg-amber-500/20' },
        INVITE_ONLY: { icon: KeyRound, label: 'Invite Only', color: 'text-purple-400 bg-purple-500/20' },
    }
    const c = config[visibility] || config.PUBLIC
    const Icon = c.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
            <Icon className="w-3 h-3" /> {c.label}
        </span>
    )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className="text-xl font-light text-white">{value}</p>
            {sub && <p className="text-[11px] text-neutral-500 mt-0.5">{sub}</p>}
        </div>
    )
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
}

function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric'
    })
}

function formatDateTime(date: string | Date) {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
}

function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u202F\u20AC'
}

export default function AdminOrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'members' | 'missions'>('members')

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getOrgAdminDetail(orgId)
        if (result.success) {
            setOrg(result.organization)
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    const handleAction = async (action: 'approve' | 'suspend' | 'reactivate' | 'reject') => {
        if (action === 'reject' && !confirm('Reject and delete this organization? The leader will be notified.')) return
        if (action === 'suspend' && !confirm('Suspend this organization?')) return

        if (action === 'approve') await approveOrg(orgId)
        else if (action === 'suspend') await suspendOrg(orgId)
        else if (action === 'reactivate') await reactivateOrg(orgId)
        else {
            await rejectOrg(orgId)
            router.push('/admin/organizations')
            return
        }
        loadData()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="text-center py-20">
                <p className="text-neutral-400">Organization not found</p>
                <button onClick={() => router.back()} className="mt-4 text-sm text-blue-400 hover:underline">Go back</button>
            </div>
        )
    }

    const leader = org.Leader
    const activeMembers = org.Members?.filter((m: any) => m.status === 'ACTIVE') || []
    const pendingMembers = org.Members?.filter((m: any) => m.status === 'PENDING') || []
    const acceptedMissions = org.Missions?.filter((m: any) => m.status === 'ACCEPTED') || []
    const proposedMissions = org.Missions?.filter((m: any) => m.status === 'PROPOSED') || []

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
            {/* Back */}
            <Link
                href="/admin/organizations"
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to organizations
            </Link>

            {/* ========== HEADER ========== */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-neutral-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-semibold text-neutral-300">
                            {org.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-semibold text-white">{org.name}</h1>
                            <StatusBadge status={org.status} size="md" />
                            <VisibilityBadge visibility={org.visibility} />
                        </div>
                        {org.description && (
                            <p className="text-neutral-400 text-sm mt-1.5 max-w-xl">{org.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Created {formatDate(org.created_at)}
                            </span>
                            {org.slug && (
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/org/${org.slug}`)}
                                    className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
                                >
                                    <Link2 className="w-3 h-3" /> /org/{org.slug}
                                    <Copy className="w-2.5 h-2.5" />
                                </button>
                            )}
                            {org.invite_code && (
                                <button
                                    onClick={() => copyToClipboard(org.invite_code)}
                                    className="flex items-center gap-1 hover:text-neutral-300 transition-colors"
                                >
                                    <KeyRound className="w-3 h-3" /> {org.invite_code}
                                    <Copy className="w-2.5 h-2.5" />
                                </button>
                            )}
                            <span className="font-mono text-neutral-600">{org.id.slice(0, 12)}...</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {org.status === 'PENDING' && (
                        <>
                            <button
                                onClick={() => handleAction('approve')}
                                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                            >
                                <Check className="w-4 h-4" /> Approve
                            </button>
                            <button
                                onClick={() => handleAction('reject')}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                            >
                                <Ban className="w-4 h-4" /> Reject
                            </button>
                        </>
                    )}
                    {org.status === 'ACTIVE' && (
                        <button
                            onClick={() => handleAction('suspend')}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                        >
                            <Ban className="w-4 h-4" /> Suspend
                        </button>
                    )}
                    {org.status === 'SUSPENDED' && (
                        <button
                            onClick={() => handleAction('reactivate')}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-4 h-4" /> Reactivate
                        </button>
                    )}
                </div>
            </div>

            {/* ========== STATS GRID ========== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Active Members" value={activeMembers.length} sub={pendingMembers.length > 0 ? `+ ${pendingMembers.length} pending` : undefined} />
                <StatCard label="Active Missions" value={acceptedMissions.length} sub={proposedMissions.length > 0 ? `+ ${proposedMissions.length} proposed` : undefined} />
                <StatCard label="Visibility" value={org.visibility} />
                <StatCard label="Audience" value={org.estimated_audience || '—'} />
            </div>

            {/* ========== MOTIVATION (PENDING) ========== */}
            {org.motivation && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Motivation
                    </h3>
                    <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{org.motivation}</p>
                </div>
            )}

            {/* ========== LEADER CARD ========== */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Leader</h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-5">
                        {/* Avatar + Name */}
                        <div className="flex items-center gap-4 flex-1">
                            {leader?.Profile?.avatar_url ? (
                                <img src={leader.Profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                                <div className="w-14 h-14 bg-neutral-800 rounded-full flex items-center justify-center">
                                    <span className="text-lg font-light text-neutral-400">
                                        {(leader?.name || leader?.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-lg font-medium text-white">{leader?.name || 'Unnamed'}</p>
                                    <StatusBadge status={leader?.status || 'UNKNOWN'} />
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-neutral-400 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> {leader?.email}
                                    </span>
                                    {leader?.Profile?.country && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {leader.Profile.country}
                                        </span>
                                    )}
                                </div>
                                {leader?.Profile?.bio && (
                                    <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{leader.Profile.bio}</p>
                                )}
                            </div>
                        </div>

                        {/* Leader stats */}
                        <div className="flex gap-6 flex-shrink-0 text-center">
                            <div>
                                <p className="text-lg font-light text-white">{leader?._count?.Commissions || 0}</p>
                                <p className="text-[11px] text-neutral-500">Commissions</p>
                            </div>
                            <div>
                                <p className="text-lg font-light text-white">{leader?._count?.Requests || 0}</p>
                                <p className="text-[11px] text-neutral-500">Programs</p>
                            </div>
                            <div>
                                <p className="text-lg font-light text-white">
                                    {org.leaderBalance ? formatCurrency(org.leaderBalance.balance || 0) : '—'}
                                </p>
                                <p className="text-[11px] text-neutral-500">Balance</p>
                            </div>
                        </div>
                    </div>

                    {/* Leader details row */}
                    <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center gap-4 flex-wrap text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                            {leader?.stripe_connect_id ? (
                                <><Zap className="w-3 h-3 text-emerald-400" /> Stripe Connected</>
                            ) : (
                                <><Wallet className="w-3 h-3 text-violet-400" /> {leader?.payout_method || 'PLATFORM'}</>
                            )}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Joined {leader?.created_at ? formatDate(leader.created_at) : '—'}
                        </span>
                        <span>Onboarding step {leader?.onboarding_step ?? '?'}/4</span>

                        {/* Social links */}
                        {leader?.Profile?.tiktok_url && <a href={leader.Profile.tiktok_url} target="_blank" rel="noopener" className="hover:text-white">TikTok</a>}
                        {leader?.Profile?.instagram_url && <a href={leader.Profile.instagram_url} target="_blank" rel="noopener" className="hover:text-white">Instagram</a>}
                        {leader?.Profile?.youtube_url && <a href={leader.Profile.youtube_url} target="_blank" rel="noopener" className="hover:text-white">YouTube</a>}
                        {leader?.Profile?.twitter_url && <a href={leader.Profile.twitter_url} target="_blank" rel="noopener" className="hover:text-white">Twitter</a>}
                        {leader?.Profile?.website_url && <a href={leader.Profile.website_url} target="_blank" rel="noopener" className="hover:text-white">Website</a>}

                        <div className="flex-1" />
                        <Link
                            href={`/admin/sellers/${leader?.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 hover:text-white transition-colors"
                        >
                            View full profile <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ========== TABS: MEMBERS / MISSIONS ========== */}
            <div>
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                            activeTab === 'members'
                                ? 'bg-white text-black'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                        }`}
                    >
                        <Users className="w-4 h-4" /> Members ({org.Members?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('missions')}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                            activeTab === 'missions'
                                ? 'bg-white text-black'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                        }`}
                    >
                        <Target className="w-4 h-4" /> Missions ({org.Missions?.length || 0})
                    </button>
                </div>

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="space-y-2">
                        {(!org.Members || org.Members.length === 0) ? (
                            <div className="text-center py-12 text-neutral-500">
                                <Users className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                                <p>No members yet</p>
                            </div>
                        ) : (
                            org.Members.map((m: any) => (
                                <div key={m.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
                                    {m.Seller?.Profile?.avatar_url ? (
                                        <img src={m.Seller.Profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-neutral-500" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white truncate">{m.Seller?.name || m.Seller?.email || 'Unknown'}</p>
                                            <StatusBadge status={m.status} />
                                            {m.Seller?.status === 'BANNED' && <StatusBadge status="BANNED" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                                            {m.Seller?.email && <span>{m.Seller.email}</span>}
                                            {m.Seller?.Profile?.country && <span>{m.Seller.Profile.country}</span>}
                                            <span>Joined {formatDate(m.created_at)}</span>
                                            {m.Seller?._count?.Commissions > 0 && (
                                                <span>{m.Seller._count.Commission} commissions</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {m.Seller?.stripe_connect_id ? (
                                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> Stripe</span>
                                        ) : (
                                            <span className="text-[10px] text-neutral-500 flex items-center gap-0.5"><Wallet className="w-2.5 h-2.5" /> Wallet</span>
                                        )}
                                        <Link
                                            href={`/admin/sellers/${m.Seller?.id}`}
                                            className="p-1.5 text-neutral-500 hover:text-white transition-colors"
                                            title="View seller profile"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Missions Tab */}
                {activeTab === 'missions' && (
                    <div className="space-y-2">
                        {(!org.Missions || org.Missions.length === 0) ? (
                            <div className="text-center py-12 text-neutral-500">
                                <Target className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                                <p>No missions yet</p>
                            </div>
                        ) : (
                            org.Missions.map((m: any) => (
                                <div key={m.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white">{m.Mission?.title || m.mission_id}</p>
                                            <StatusBadge status={m.status} />
                                            {m.Mission?.status && m.Mission.status !== 'ACTIVE' && (
                                                <span className="text-[10px] text-neutral-500">(Mission: {m.Mission.status})</span>
                                            )}
                                        </div>
                                        {m.accepted_at && (
                                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Accepted {formatDate(m.accepted_at)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-[11px] text-neutral-500">Total Reward</p>
                                            <p className="text-white font-medium">{m.total_reward}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-neutral-500">Leader Cut</p>
                                            <p className="text-amber-400">{m.leader_reward}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-neutral-500">Member Cut</p>
                                            <p className="text-violet-400">{m.member_reward}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
