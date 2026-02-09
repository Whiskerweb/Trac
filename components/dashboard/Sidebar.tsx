'use client'

import {
    Home, MessageSquare, CreditCard, Users, UserPlus,
    Contact, Coins, Shield, Globe, Settings,
    Puzzle, User, ExternalLink, Target,
    ChevronLeft, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// =============================================
// NAVIGATION STRUCTURE (Traaaction style)
// =============================================

interface NavItem {
    nameKey: string
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    external?: boolean
}

interface NavSection {
    titleKey: string
    items: NavItem[]
}

const navigationConfig: NavSection[] = [
    {
        titleKey: 'sellerProgram',
        items: [
            { nameKey: 'overview', href: '/dashboard', icon: Home },
            { nameKey: 'payouts', href: '/dashboard/payouts', icon: CreditCard },
            { nameKey: 'messages', href: '/dashboard/messages', icon: MessageSquare },
        ]
    },
    {
        titleKey: 'sellers',
        items: [
            { nameKey: 'allSellers', href: '/dashboard/sellers', icon: Users },
            { nameKey: 'organizations', href: '/dashboard/sellers/groups', icon: Users },
            { nameKey: 'mySellers', href: '/dashboard/sellers/applications', icon: UserPlus },
        ]
    },
    {
        titleKey: 'insights',
        items: [
            { nameKey: 'missions', href: '/dashboard/missions', icon: Target },
            { nameKey: 'customers', href: '/dashboard/customers', icon: Contact },
            { nameKey: 'commissions', href: '/dashboard/commissions', icon: Coins },
            { nameKey: 'fraudDetection', href: '/dashboard/fraud', icon: Shield },
        ]
    },
    {
        titleKey: 'configuration',
        items: [
            { nameKey: 'integration', href: '/dashboard/integration', icon: Puzzle, external: true },
            { nameKey: 'domains', href: '/dashboard/domains', icon: Globe },
            { nameKey: 'settings', href: '/dashboard/settings', icon: Settings },
        ]
    },
]

// =============================================
// SIDEBAR COMPONENT
// =============================================

interface SidebarProps {
    collapsed?: boolean
    onToggleCollapse?: () => void
    isMobile?: boolean
}

export function Sidebar({ collapsed = false, onToggleCollapse, isMobile = false }: SidebarProps) {
    const pathname = usePathname()
    const t = useTranslations('dashboard.sidebarNav')
    const [userEmail, setUserEmail] = useState<string>('')
    const [startupName, setStartupName] = useState<string>(t('sellerProgram'))


    useEffect(() => {
        fetch('/api/auth/user-roles')
            .then(res => res.json())
            .then(data => {
                setUserEmail(data.email || 'User')
                if (data.workspaces && data.workspaces.length > 0) {
                    setStartupName(data.workspaces[0].name)
                }
            })
            .catch(() => { })
    }, [])

    // Don't show collapse button on mobile drawer
    const showCollapseButton = !isMobile && onToggleCollapse

    return (
        <aside className={`
            fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-50
            transition-all duration-300 ease-in-out
            ${collapsed ? 'w-[68px]' : 'w-64'}
        `}>
            {/* Logo/Workspace Switcher */}
            <div className={`h-16 flex items-center border-b border-gray-100 ${collapsed ? 'px-2 justify-center' : 'px-4'}`}>
                <div className={`flex items-center gap-2 p-2 rounded-lg text-left ${collapsed ? 'justify-center' : 'w-full'}`}>
                    <img
                        src="/Logotrac/logo1.png"
                        alt="Logo"
                        className={`rounded-lg object-contain transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`}
                    />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{startupName}</p>
                            <p className="text-xs text-gray-500 truncate">{t('startupProgram')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
                {navigationConfig.map((section, idx) => (
                    <div key={section.titleKey} className={idx > 0 ? 'mt-6' : ''}>
                        {/* Section Title - hidden when collapsed */}
                        {!collapsed && (
                            <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                {t(section.titleKey)}
                            </p>
                        )}
                        {/* Separator line when collapsed */}
                        {collapsed && idx > 0 && (
                            <div className="w-8 h-px bg-gray-200 mx-auto mb-3" />
                        )}

                        {/* Section Items */}
                        <ul className="space-y-0.5">
                            {section.items.map((item) => {
                                // Routes that need exact matching (have sub-routes that should NOT trigger parent active state)
                                const exactMatchRoutes = ['/dashboard/sellers']
                                const needsExactMatch = exactMatchRoutes.includes(item.href)

                                const isActive = needsExactMatch
                                    ? pathname === item.href
                                    : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                                const Icon = item.icon

                                return (
                                    <li key={item.nameKey}>
                                        <Link
                                            href={item.href}
                                            title={collapsed ? t(item.nameKey) : undefined}
                                            className={`
                                                flex items-center gap-3 rounded-lg transition-all duration-150 text-sm
                                                ${collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'}
                                                ${isActive
                                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                                                <Icon
                                                    className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
                                                    strokeWidth={2}
                                                />
                                                {!collapsed && <span>{t(item.nameKey)}</span>}
                                            </div>
                                            {!collapsed && item.external && (
                                                <ExternalLink className="w-3 h-3 text-gray-400" />
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Collapse Toggle Button */}
            {showCollapseButton && (
                <div className={`px-3 py-2 border-t border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
                    <button
                        onClick={onToggleCollapse}
                        className={`
                            flex items-center gap-2 text-gray-500 hover:text-gray-700
                            hover:bg-gray-100 rounded-lg transition-colors
                            ${collapsed ? 'p-2' : 'px-3 py-2 w-full'}
                        `}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-xs font-medium">Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Profile Section */}
            <div className={`p-3 border-t border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
                <Link
                    href="/dashboard/profile"
                    title={collapsed ? userEmail : undefined}
                    className={`flex items-center gap-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        collapsed ? 'p-2' : 'px-3 py-2'
                    } ${pathname === '/dashboard/profile' ? 'bg-purple-50' : ''}`}
                >
                    <div className={`rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center ${
                        collapsed ? 'w-9 h-9' : 'w-8 h-8'
                    } ${pathname === '/dashboard/profile' ? 'border-purple-300' : 'text-gray-500'}`}>
                        <User className={`w-4 h-4 ${pathname === '/dashboard/profile' ? 'text-purple-600' : ''}`} />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                                pathname === '/dashboard/profile' ? 'text-purple-700' : 'text-gray-900'
                            }`}>{userEmail || 'Loading...'}</p>
                        </div>
                    )}
                </Link>
            </div>
        </aside>
    )
}
