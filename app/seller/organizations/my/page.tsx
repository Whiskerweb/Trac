'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Crown, Users, ChevronRight, FolderOpen } from 'lucide-react'
import { getMyOrganizations } from '@/app/actions/organization-actions'

function OrgStatusBadge({ status }: { status: string }) {
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

export default function MyOrganizationsPage() {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">My Organizations</h1>
                <p className="text-gray-500 text-sm mt-1">Organizations you lead or belong to</p>
            </div>

            {!hasOrgs ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <FolderOpen className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No organizations yet</p>
                    <p className="text-gray-500 text-sm mb-6">Browse organizations to find a team and start earning together.</p>
                    <Link href="/seller/organizations" className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
                        Browse organizations
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Led by me */}
                    {ledOrgs.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Crown className="w-4 h-4 text-amber-500" /> Led by me
                            </h2>
                            <div className="space-y-2">
                                {ledOrgs.map(org => (
                                    <Link
                                        key={org.id}
                                        href={org.status === 'ACTIVE' ? `/seller/manage/${org.id}` : '#'}
                                        className={org.status !== 'ACTIVE' ? 'pointer-events-none' : ''}
                                    >
                                        <div className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                                    <Crown className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{org.name}</p>
                                                    <p className="text-xs text-gray-500">{org._count?.Members || 0} members · {org._count?.Missions || 0} missions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <OrgStatusBadge status={org.status} />
                                                {org.status === 'ACTIVE' && <ChevronRight className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Member of */}
                    {memberOrgs.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" /> Member of
                            </h2>
                            <div className="space-y-2">
                                {memberOrgs.map((org: any) => (
                                    <Link key={org.id} href={`/seller/manage/${org.id}`}>
                                        <div className="group flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                                    <span className="text-sm font-semibold text-white">{org.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{org.name}</p>
                                                    <p className="text-xs text-gray-500">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Discreet create link */}
            <div className="text-center mt-16 pb-4">
                <p className="text-xs text-gray-400">
                    Want to lead your own team?{' '}
                    <Link href="/seller/organizations/apply" className="text-gray-500 hover:text-gray-700 underline underline-offset-2">
                        Apply to create an organization
                    </Link>
                </p>
            </div>
        </div>
    )
}
