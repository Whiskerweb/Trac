'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { portalPath } from './portal-utils'

interface PortalHeaderProps {
    workspaceSlug: string
    workspaceName: string
    logoUrl: string | null
    portalLogoUrl: string | null
    primaryColor: string
    userName: string
    referralEnabled?: boolean
}

const TABS = [
    { key: 'home', path: '' },
    { key: 'referrals', path: '/referrals' },
    { key: 'network', path: '/network' },
    { key: 'commissions', path: '/commissions' },
    { key: 'payouts', path: '/payouts' },
    { key: 'assets', path: '/assets' },
    { key: 'reports', path: '/reports' },
] as const

export default function PortalHeader({
    workspaceSlug, workspaceName, logoUrl, portalLogoUrl, primaryColor, userName,
    referralEnabled = false,
}: PortalHeaderProps) {
    const t = useTranslations('portal.nav')
    const [menuOpen, setMenuOpen] = useState(false)
    const pathname = usePathname()

    // Filter tabs: hide referrals + network if portal referral is disabled
    const visibleTabs = TABS.filter(tab => {
        if (tab.key === 'referrals' || tab.key === 'network') return referralEnabled
        return true
    })

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = portalPath(workspaceSlug)
    }

    const displayLogo = portalLogoUrl || logoUrl

    // Determine active tab
    const dashboardBase = portalPath(workspaceSlug, '/dashboard')
    const getTabHref = (tabPath: string) => portalPath(workspaceSlug, `/dashboard${tabPath}`)

    const isActiveTab = (tabPath: string) => {
        const full = getTabHref(tabPath)
        if (tabPath === '') {
            return pathname === dashboardBase || pathname === dashboardBase + '/'
        }
        return pathname.startsWith(full)
    }

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* Top row: logo + user */}
                <div className="h-14 flex items-center justify-between">
                    <Link href={getTabHref('')} className="flex items-center gap-2.5">
                        {displayLogo ? (
                            <img src={displayLogo} alt={workspaceName} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {workspaceName.charAt(0)}
                            </div>
                        )}
                        <span className="text-sm font-semibold text-gray-900">{workspaceName}</span>
                    </Link>

                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <span className="max-w-[120px] truncate">{userName}</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[140px]">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        {t('logout')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tab navigation */}
                <div className="-mb-px overflow-x-auto scrollbar-hide">
                    <nav className="flex gap-1 min-w-max">
                        {visibleTabs.map((tab) => {
                            const active = isActiveTab(tab.path)
                            return (
                                <Link
                                    key={tab.key}
                                    href={getTabHref(tab.path)}
                                    className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                                        active
                                            ? 'text-gray-900 border-current'
                                            : 'text-gray-400 border-transparent hover:text-gray-600'
                                    }`}
                                    style={active ? { borderColor: primaryColor, color: primaryColor } : undefined}
                                >
                                    {t(tab.key)}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </header>
    )
}
