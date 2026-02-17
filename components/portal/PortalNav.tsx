'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { portalPath } from './portal-utils'

interface PortalNavProps {
    workspaceSlug: string
    workspaceName: string
    logoUrl?: string | null
    primaryColor: string
    userName: string
}

export default function PortalNav({ workspaceSlug, workspaceName, logoUrl, primaryColor, userName }: PortalNavProps) {
    const t = useTranslations('portal.nav')
    const pathname = usePathname()
    const [showDropdown, setShowDropdown] = useState(false)

    const basePath = portalPath(workspaceSlug, '/dashboard')

    const tabs = [
        { href: basePath, label: t('home'), exact: true },
        { href: portalPath(workspaceSlug, '/dashboard/commissions'), label: t('commissions'), exact: false },
        { href: portalPath(workspaceSlug, '/dashboard/payouts'), label: t('payouts'), exact: false },
        { href: portalPath(workspaceSlug, '/dashboard/assets'), label: t('assets'), exact: false },
    ]

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href
        return pathname.startsWith(href)
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = portalPath(workspaceSlug)
    }

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-14">
                    {/* Logo + Name */}
                    <Link href={basePath} className="flex items-center gap-2.5 min-w-0">
                        {logoUrl ? (
                            <img src={logoUrl} alt={workspaceName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {workspaceName.charAt(0)}
                            </div>
                        )}
                        <span className="text-sm font-semibold text-gray-900 truncate hidden sm:block">{workspaceName}</span>
                    </Link>

                    {/* Tabs */}
                    <nav className="flex items-center gap-1">
                        {tabs.map(tab => {
                            const active = isActive(tab.href, tab.exact)
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className="relative px-3 py-1.5 text-xs font-medium transition-colors rounded-md"
                                    style={{
                                        color: active ? primaryColor : '#6b7280',
                                        backgroundColor: active ? `${primaryColor}0a` : 'transparent',
                                    }}
                                >
                                    {tab.label}
                                    {active && (
                                        <span
                                            className="absolute -bottom-[13px] left-3 right-3 h-[2px] rounded-full"
                                            style={{ backgroundColor: primaryColor }}
                                        />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            <span className="hidden sm:block max-w-[100px] truncate">{userName}</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showDropdown && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                                    <div className="px-3 py-2 border-b border-gray-100">
                                        <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-red-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        {t('logout')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
