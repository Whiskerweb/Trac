'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Users, Crown, Target, Check, Ban, RotateCcw } from 'lucide-react'
import { getOrgAdminDetail, approveOrg, suspendOrg, reactivateOrg } from '@/app/actions/admin-org-actions'

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        ACTIVE: 'bg-green-50 text-green-700',
        SUSPENDED: 'bg-red-50 text-red-700',
        REMOVED: 'bg-gray-100 text-gray-500',
        PROPOSED: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-green-50 text-green-700',
        REJECTED: 'bg-red-50 text-red-700',
        APPROVED: 'bg-green-50 text-green-700',
        BANNED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default function AdminOrgDetailPage() {
    const { orgId } = useParams<{ orgId: string }>()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<any>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getOrgAdminDetail(orgId)
        if (result.success) {
            setOrg(result.organization)
        }
        setLoading(false)
    }, [orgId])

    useEffect(() => { loadData() }, [loadData])

    const handleAction = async (action: 'approve' | 'suspend' | 'reactivate') => {
        if (action === 'approve') await approveOrg(orgId)
        else if (action === 'suspend') await suspendOrg(orgId)
        else await reactivateOrg(orgId)
        loadData()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-400">Organization not found</p>
                <button onClick={() => router.back()} className="mt-4 text-sm text-blue-400 hover:underline">Go back</button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                        <p className="text-sm text-gray-400">ID: {org.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={org.status} />
                    {org.status === 'PENDING' && (
                        <button onClick={() => handleAction('approve')} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                    )}
                    {org.status === 'ACTIVE' && (
                        <button onClick={() => handleAction('suspend')} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 flex items-center gap-1">
                            <Ban className="w-3.5 h-3.5" /> Suspend
                        </button>
                    )}
                    {org.status === 'SUSPENDED' && (
                        <button onClick={() => handleAction('reactivate')} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Reactivate
                        </button>
                    )}
                </div>
            </div>

            {org.description && <p className="text-gray-400">{org.description}</p>}

            {/* Leader info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Crown className="w-4 h-4 text-amber-500" /> Leader
                </h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white font-medium">{org.Leader?.name || 'Unnamed'}</p>
                        <p className="text-sm text-gray-400">{org.Leader?.email}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                        <p>Status: <StatusBadge status={org.Leader?.status || 'UNKNOWN'} /></p>
                        <p>Stripe: {org.Leader?.stripe_connect_id ? 'Connected' : 'Not connected'}</p>
                    </div>
                </div>
            </div>

            {/* Members */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-3">Members ({org.Members?.length || 0})</h2>
                {org.Members?.length > 0 ? (
                    <div className="space-y-2">
                        {org.Members.map((m: any) => (
                            <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-white text-sm font-medium">{m.Seller?.name || m.Seller?.email}</p>
                                    {m.Seller?.name && <p className="text-xs text-gray-500">{m.Seller?.email}</p>}
                                </div>
                                <StatusBadge status={m.status} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No members</p>
                )}
            </div>

            {/* Missions */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5" /> Missions ({org.Missions?.length || 0})
                </h2>
                {org.Missions?.length > 0 ? (
                    <div className="space-y-2">
                        {org.Missions.map((m: any) => (
                            <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-white text-sm font-medium">{m.Mission?.title || m.mission_id}</p>
                                    <p className="text-xs text-gray-500">
                                        Total: {m.total_reward} · Leader: {m.leader_reward} · Members: {m.member_reward}
                                    </p>
                                </div>
                                <StatusBadge status={m.status} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No missions</p>
                )}
            </div>
        </div>
    )
}
