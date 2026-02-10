'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, Users, Check, Ban, ChevronRight, RotateCcw, Globe, Lock, KeyRound, MessageSquare } from 'lucide-react'
import { getAllOrgs, approveOrg, suspendOrg, reactivateOrg, rejectOrg } from '@/app/actions/admin-org-actions'

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700 border-orange-200',
        ACTIVE: 'bg-green-50 text-green-700 border-green-200',
        SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
    }
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {status}
        </span>
    )
}

export default function AdminOrganizationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [filter, setFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'>('all')

    const loadData = useCallback(async () => {
        setLoading(true)
        const f = filter === 'all' ? undefined : filter
        const result = await getAllOrgs(f as any)
        if (result.success) {
            setOrganizations(result.organizations || [])
        }
        setLoading(false)
    }, [filter])

    useEffect(() => { loadData() }, [loadData])

    const handleApprove = async (orgId: string) => {
        await approveOrg(orgId)
        loadData()
    }

    const handleSuspend = async (orgId: string) => {
        await suspendOrg(orgId)
        loadData()
    }

    const handleReactivate = async (orgId: string) => {
        await reactivateOrg(orgId)
        loadData()
    }

    const handleReject = async (orgId: string) => {
        await rejectOrg(orgId)
        loadData()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Organizations</h1>
                <p className="text-gray-400 mt-1">Review and manage seller organizations</p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {(['all', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            filter === f ? 'bg-white text-black' : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                    >
                        {f === 'all' ? 'All' : f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                </div>
            ) : organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <Building2 className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-gray-400">No organizations found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {organizations.map(org => (
                        <div key={org.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">{org.name}</p>
                                            {org.visibility && (
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                    org.visibility === 'PUBLIC' ? 'bg-green-500/20 text-green-400' :
                                                    org.visibility === 'PRIVATE' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                    {org.visibility}
                                                </span>
                                            )}
                                            {org.slug && (
                                                <span className="text-[10px] text-gray-500">/org/{org.slug}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Leader: {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members · {org._count?.Missions || 0} missions
                                            {org.estimated_audience && <> · Audience: {org.estimated_audience}</>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={org.status} />

                                    {org.status === 'PENDING' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(org.id)}
                                                className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(org.id)}
                                                className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                                title="Reject"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {org.status === 'ACTIVE' && (
                                        <button
                                            onClick={() => handleSuspend(org.id)}
                                            className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                            title="Suspend"
                                        >
                                            <Ban className="w-4 h-4" />
                                        </button>
                                    )}
                                    {org.status === 'SUSPENDED' && (
                                        <button
                                            onClick={() => handleReactivate(org.id)}
                                            className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                                            title="Reactivate"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                                        className="p-1.5 text-gray-400 hover:text-white"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {org.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-1">{org.description}</p>
                            )}
                            {/* Questionnaire fields (shown for PENDING) */}
                            {org.status === 'PENDING' && org.motivation && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Motivation</p>
                                            <p className="text-xs text-gray-300 line-clamp-3">{org.motivation}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
