'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, Users, Building2, ChevronRight } from 'lucide-react'
import { getActiveOrganizationsForStartup } from '@/app/actions/organization-actions'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PROPOSED: 'bg-blue-50 text-blue-700',
        ACCEPTED: 'bg-green-50 text-green-700',
        REJECTED: 'bg-red-50 text-red-700',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    )
}

export function OrganizationsTab() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    const loadData = useCallback(async () => {
        setLoading(true)
        const result = await getActiveOrganizationsForStartup()
        if (result.success && result.organizations) {
            setOrganizations(result.organizations)
        }
        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = organizations.filter(org =>
        !searchQuery || org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.Leader?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <TraaactionLoader size={24} className="text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Building2 className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">No organizations yet</p>
                    <p className="text-gray-500 text-sm">Organizations will appear here once sellers create them and they are approved.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(org => (
                        <div
                            key={org.id}
                            onClick={() => router.push(`/dashboard/sellers/groups/${org.id}`)}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
                        >
                            <div className="flex items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        {org.logo_url ? (
                                            <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-xl object-cover" />
                                        ) : (
                                            <Users className="w-5 h-5 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{org.name}</p>
                                        <p className="text-xs text-gray-500">Led by {org.Leader?.name || org.Leader?.email} · {org._count?.Members || 0} members · {org._count?.Missions || 0} missions</p>
                                        {org.Missions?.length > 0 && (
                                            <div className="flex gap-1 flex-wrap mt-1.5 sm:hidden">
                                                {org.Missions.map((m: any) => (
                                                    <StatusBadge key={m.id} status={m.status} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {org.Missions?.length > 0 && (
                                        <div className="hidden sm:flex gap-1">
                                            {org.Missions.map((m: any) => (
                                                <StatusBadge key={m.id} status={m.status} />
                                            ))}
                                        </div>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>
                            {org.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{org.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
