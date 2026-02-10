'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, LayoutDashboard, Users, Briefcase, DollarSign, Settings, ArrowLeft, Crown } from 'lucide-react'
import { getOrganizationDetail } from '@/app/actions/organization-actions'

interface OrgContextType {
    org: any
    isLeader: boolean
    reload: () => Promise<void>
}

const OrgContext = createContext<OrgContextType>({ org: null, isLeader: false, reload: async () => {} })
export const useOrg = () => useContext(OrgContext)

const LEADER_TABS = [
    { href: '', label: 'Overview', icon: LayoutDashboard },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/missions', label: 'Missions', icon: Briefcase },
    { href: '/commissions', label: 'Commissions', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
]

const MEMBER_TABS = [
    { href: '', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/missions', label: 'Missions', icon: Briefcase },
    { href: '/members', label: 'Members', icon: Users },
]

export default function ManageOrgLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const pathname = usePathname()
    const router = useRouter()
    const orgId = params.orgId as string

    const [org, setOrg] = useState<any>(null)
    const [isLeader, setIsLeader] = useState(false)
    const [loading, setLoading] = useState(true)

    const loadOrg = async () => {
        const result = await getOrganizationDetail(orgId)
        if (result.success) {
            setOrg(result.organization)
            setIsLeader(result.isLeader || false)
        } else {
            router.push('/seller/organizations')
            return
        }
        setLoading(false)
    }

    useEffect(() => { loadOrg() }, [orgId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!org) return null

    const tabs = isLeader ? LEADER_TABS : MEMBER_TABS
    const basePath = `/seller/manage/${orgId}`

    // For members, redirect leader-only pages to overview
    const leaderOnlyPaths = ['/commissions', '/settings']
    if (!isLeader && leaderOnlyPaths.some(p => pathname.endsWith(p))) {
        router.push(basePath)
        return null
    }

    return (
        <OrgContext.Provider value={{ org, isLeader, reload: loadOrg }}>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/seller/organizations/my" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
                        <ArrowLeft className="w-4 h-4" /> My Organizations
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isLeader
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                                : 'bg-gradient-to-br from-violet-500 to-purple-600'
                        }`}>
                            {isLeader
                                ? <Crown className="w-5 h-5 text-white" />
                                : <span className="text-lg font-bold text-white">{org.name.charAt(0)}</span>
                            }
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
                            <p className="text-xs text-gray-500">
                                {isLeader ? 'Organization Management' : 'Member Dashboard'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-8 overflow-x-auto pb-1 border-b border-gray-100">
                    {tabs.map(tab => {
                        const href = `${basePath}${tab.href}`
                        const isActive = tab.href === ''
                            ? pathname === basePath
                            : pathname.startsWith(href)
                        const Icon = tab.icon
                        return (
                            <Link
                                key={tab.href}
                                href={href}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                                    isActive
                                        ? 'text-violet-700 bg-violet-50 border-b-2 border-violet-600'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </Link>
                        )
                    })}
                </div>

                {children}
            </div>
        </OrgContext.Provider>
    )
}
