'use client'

import {
    LayoutDashboard, MessageSquare, Users,
    Contact, Coins, Settings,
    User, Target,
    ChevronLeft,
    Link2, BarChart3, Megaphone, Globe
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, LayoutGroup } from 'framer-motion'
import { getUnreadCount } from '@/app/actions/messaging'
import { springSnappy } from '@/lib/animations'

// =============================================
// NAVIGATION STRUCTURE
// =============================================

interface NavItem {
    nameKey: string
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface NavSection {
    titleKey: string
    items: NavItem[]
}

const navigationConfig: NavSection[] = [
    {
        titleKey: '',
        items: [
            { nameKey: 'home', href: '/dashboard', icon: LayoutDashboard },
            { nameKey: 'missions', href: '/dashboard/missions', icon: Target },
            { nameKey: 'sellers', href: '/dashboard/sellers', icon: Users },
            { nameKey: 'customers', href: '/dashboard/customers', icon: Contact },
            { nameKey: 'pipeline', href: '/dashboard/pipeline', icon: Coins },
            { nameKey: 'messages', href: '/dashboard/messages', icon: MessageSquare },
        ]
    },
    {
        titleKey: 'portal',
        items: [
            { nameKey: 'portal', href: '/dashboard/portal', icon: Globe },
        ]
    },
    {
        titleKey: 'marketing',
        items: [
            { nameKey: 'links', href: '/dashboard/marketing', icon: Link2 },
            { nameKey: 'campaigns', href: '/dashboard/marketing/campaigns', icon: Megaphone },
            { nameKey: 'analytics', href: '/dashboard/marketing/analytics', icon: BarChart3 },
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
    const [startupName, setStartupName] = useState<string>('')
    const [unreadMessages, setUnreadMessages] = useState(0)

    const loadUnread = useCallback(async () => {
        try {
            const count = await getUnreadCount('startup')
            setUnreadMessages(count)
        } catch {}
    }, [])

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
        loadUnread()
        const interval = setInterval(loadUnread, 30000)
        return () => clearInterval(interval)
    }, [loadUnread])

    // Don't show collapse button on mobile drawer
    const showCollapseButton = !isMobile && onToggleCollapse

    return (
        <aside className={`
            fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-50
            transition-all duration-300 ease-in-out
            ${collapsed ? 'w-[68px]' : 'w-64'}
        `}>
            {/* Logo/Header */}
            <div className={`h-16 flex items-center border-b border-gray-100 ${collapsed ? 'px-2 justify-center' : 'px-4'}`}>
                <div className={`flex items-center gap-2 p-2 rounded-lg text-left ${collapsed ? 'justify-center' : 'w-full'}`}>
                    <img
                        src="/Logotrac/logo1.png"
                        alt="Logo"
                        className={`rounded-lg object-contain transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`}
                    />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{startupName || 'Traaaction'}</p>
                            <p className="text-xs text-gray-400 truncate">Dashboard</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
                <LayoutGroup id="startup-sidebar">
                {navigationConfig.map((section, idx) => (
                    <div key={section.titleKey || 'main'} className={idx > 0 ? 'mt-8' : ''}>
                        {/* Section Title */}
                        {!collapsed && section.titleKey && (
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
                                const exactMatchRoutes = ['/dashboard/sellers', '/dashboard/marketing']
                                const needsExactMatch = exactMatchRoutes.includes(item.href)

                                const isActive = needsExactMatch
                                    ? pathname === item.href
                                    : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                                const Icon = item.icon
                                const badge = item.nameKey === 'messages' ? unreadMessages : 0

                                return (
                                    <li key={item.nameKey}>
                                        <Link
                                            href={item.href}
                                            title={collapsed ? t(item.nameKey) : undefined}
                                            className={`
                                                group flex items-center gap-3 rounded-lg transition-colors duration-150 text-sm relative
                                                ${collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'}
                                                ${isActive
                                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            {/* Animated active indicator bar */}
                                            {isActive && !collapsed && (
                                                <motion.div
                                                    layoutId="sidebar-indicator"
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-purple-500 rounded-r-full"
                                                    transition={springSnappy}
                                                />
                                            )}
                                            <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                                                <div className="relative">
                                                    <Icon
                                                        className={`w-4 h-4 transition-transform duration-150 group-hover:scale-[1.12] ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
                                                        strokeWidth={2}
                                                    />
                                                    {collapsed && badge > 0 && (
                                                        <motion.span
                                                            key={badge}
                                                            initial={{ scale: 0.6, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={springSnappy}
                                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                                                        >
                                                            {badge > 9 ? '9+' : badge}
                                                        </motion.span>
                                                    )}
                                                </div>
                                                {!collapsed && <span>{t(item.nameKey)}</span>}
                                            </div>
                                            {!collapsed && badge > 0 && (
                                                <motion.span
                                                    key={badge}
                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={springSnappy}
                                                    className="min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5"
                                                >
                                                    {badge > 99 ? '99+' : badge}
                                                </motion.span>
                                            )}
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                ))}
                </LayoutGroup>
            </nav>

            {/* Settings - Bottom Rail */}
            <div className={`border-t border-gray-100 ${collapsed ? 'px-2' : 'px-3'} py-2`}>
                <Link
                    href="/dashboard/settings"
                    title={collapsed ? t('settings') : undefined}
                    className={`
                        group flex items-center gap-3 rounded-lg transition-all duration-150 text-sm
                        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}
                        ${pathname.startsWith('/dashboard/settings')
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                    `}
                >
                    <Settings
                        className={`w-4 h-4 transition-transform duration-150 group-hover:scale-[1.12] ${pathname.startsWith('/dashboard/settings') ? 'text-purple-600' : 'text-gray-400'}`}
                        strokeWidth={2}
                    />
                    {!collapsed && <span>{t('settings')}</span>}
                </Link>
            </div>

            {/* Collapse Toggle Button */}
            {showCollapseButton && (
                <div className={`px-3 py-2 border-t border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
                    <button
                        onClick={onToggleCollapse}
                        className={`
                            group flex items-center gap-2 text-gray-500 hover:text-gray-700
                            hover:bg-gray-100 rounded-lg transition-colors
                            ${collapsed ? 'p-2' : 'px-3 py-2 w-full'}
                        `}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <motion.div
                            animate={{ rotate: collapsed ? 180 : 0 }}
                            transition={springSnappy}
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform duration-150 group-hover:scale-[1.12]" />
                        </motion.div>
                        {!collapsed && <span className="text-xs font-medium">Collapse</span>}
                    </button>
                </div>
            )}

            {/* Profile Section */}
            <div className={`p-3 border-t border-gray-100 ${collapsed ? 'flex justify-center' : ''}`}>
                <Link
                    href="/dashboard/profile"
                    title={collapsed ? userEmail : undefined}
                    className={`group flex items-center gap-3 rounded-lg hover:bg-gray-50 transition-colors ${
                        collapsed ? 'p-2' : 'px-3 py-2'
                    } ${pathname === '/dashboard/profile' ? 'bg-purple-50' : ''}`}
                >
                    <div className={`rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center transition-transform duration-150 group-hover:scale-[1.08] ${
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
