'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, Loader2, ArrowRight, Users, Plus, Lock, Globe } from 'lucide-react'
import { getActiveOrganizations } from '@/app/actions/organization-actions'

function VisibilityBadge({ visibility }: { visibility: string }) {
    if (visibility === 'PRIVATE') {
        return (
            <span className="text-[10px] text-amber-600 uppercase tracking-wider px-2 py-0.5 bg-amber-50 rounded-full font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Private
            </span>
        )
    }
    return null
}

function MembershipBadge({ status }: { status: string | null }) {
    if (!status) return null
    const styles: Record<string, string> = {
        LEADER: 'bg-amber-50 text-amber-700',
        ACTIVE: 'bg-green-50 text-green-700',
        PENDING: 'bg-orange-50 text-orange-700',
    }
    const labels: Record<string, string> = {
        LEADER: 'Leader',
        ACTIVE: 'Member',
        PENDING: 'Pending',
    }
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
            {labels[status] || status}
        </span>
    )
}

function OrgRow({ org, index }: { org: any; index: number }) {
    return (
        <Link href={`/seller/organizations/${org.slug || org.id}`}>
            <div
                className="group flex items-center gap-5 px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                style={{
                    animationDelay: `${index * 30}ms`,
                    opacity: 0,
                    animation: 'fadeSlideIn 0.4s ease-out forwards'
                }}
            >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-white">
                        {org.name.charAt(0).toUpperCase()}
                    </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                            {org.name}
                        </h3>
                        <VisibilityBadge visibility={org.visibility} />
                        <MembershipBadge status={org.userMembershipStatus} />
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        Led by {org.Leader?.name || org.Leader?.email || 'Unknown'}
                    </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">{org._count?.Members || 0}</p>
                        <p className="text-[10px] text-gray-400">members</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">{org._count?.Missions || 0}</p>
                        <p className="text-[10px] text-gray-400">missions</p>
                    </div>
                </div>

                {/* Mobile stats */}
                <div className="sm:hidden text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{org._count?.Members || 0} members</p>
                </div>

                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>
        </Link>
    )
}

export default function BrowseOrganizationsPage() {
    const [organizations, setOrganizations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const searchRef = useRef<HTMLInputElement>(null)

    async function loadOrgs() {
        setLoading(true)
        const result = await getActiveOrganizations({ search: search || undefined })
        if (result.success && result.organizations) {
            setOrganizations(result.organizations)
        }
        setLoading(false)
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => { loadOrgs() }, 300)
        return () => clearTimeout(timer)
    }, [search])

    // Keyboard shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.key === 'Escape') {
                searchRef.current?.blur()
                setSearch('')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <style jsx global>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
                        Organizations
                    </h1>
                    <p className="text-gray-500 text-[15px] mb-6">
                        Join a team and earn together
                    </p>
                    <Link
                        href="/seller/organizations/apply"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Apply to create
                    </Link>
                </header>

                {/* Search */}
                <div className="max-w-xl mx-auto mb-12">
                    <div className={`relative transition-all duration-300 ${searchFocused ? 'transform scale-[1.02]' : ''}`}>
                        <div className={`
                            relative bg-white rounded-2xl transition-all duration-300
                            ${searchFocused
                                ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.15),0_8px_40px_-12px_rgba(0,0,0,0.1)]'
                                : 'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.03)]'
                            }
                        `}>
                            <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${searchFocused ? 'text-violet-500' : 'text-gray-300'}`} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder="Search organizations..."
                                className="w-full pl-14 pr-20 py-4 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none rounded-2xl"
                            />
                            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 bg-gray-50 rounded-lg font-medium">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                ) : organizations.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-400 text-[15px] mb-2">No organizations found</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="text-[13px] text-violet-500 hover:text-violet-600 font-medium"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-6 text-center">
                            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2">
                            {organizations.map((org, index) => (
                                <OrgRow key={org.id} org={org} index={index} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
