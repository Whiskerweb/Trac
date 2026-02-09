'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Users, Crown, ChevronRight, Building2 } from 'lucide-react'
import { getMyOrganizations } from '@/app/actions/organization-actions'

function OrgStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDING: 'bg-orange-50 text-orange-700',
        ACTIVE: 'bg-green-50 text-green-700',
        SUSPENDED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export default function SellerOrganizationsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [ledOrgs, setLedOrgs] = useState<any[]>([])
    const [memberOrgs, setMemberOrgs] = useState<any[]>([])

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getMyOrganizations()
        if (result.success) {
            setLedOrgs(result.led || [])
            setMemberOrgs(result.memberOf || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    const hasOrgs = ledOrgs.length > 0 || memberOrgs.length > 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-gray-500 mt-1">Manage your organizations and memberships</p>
                </div>
                <button
                    onClick={() => router.push('/seller/organizations/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Create Organization
                </button>
            </div>

            {!hasOrgs ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Building2 className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No organizations yet</p>
                    <p className="text-gray-500 text-sm mb-4">Create an organization to start managing a team of sellers, or browse and apply to join one.</p>
                    <button
                        onClick={() => router.push('/seller/organizations/create')}
                        className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800"
                    >
                        Create Organization
                    </button>
                </div>
            ) : (
                <>
                    {/* Organizations I lead */}
                    {ledOrgs.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-500" /> My Organizations
                            </h2>
                            <div className="space-y-2">
                                {ledOrgs.map(org => (
                                    <div
                                        key={org.id}
                                        onClick={() => router.push(`/seller/organizations/${org.id}`)}
                                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{org.name}</p>
                                                    <p className="text-xs text-gray-500">{org._count?.Members || 0} members · {org._count?.Missions || 0} missions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <OrgStatusBadge status={org.status} />
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Organizations I'm a member of */}
                    {memberOrgs.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-500" /> Memberships
                            </h2>
                            <div className="space-y-2">
                                {memberOrgs.map(org => (
                                    <div
                                        key={org.id}
                                        onClick={() => router.push(`/seller/organizations/${org.id}`)}
                                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{org.name}</p>
                                                    <p className="text-xs text-gray-500">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
