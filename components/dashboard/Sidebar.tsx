'use client'

import {
    Home, MessageSquare, CreditCard, Users, UserPlus,
    Contact, Coins, Shield, Globe, Settings,
    Puzzle, User, ExternalLink, Target,
    ChevronLeft, ChevronRight, ChevronDown, Check,
    Link2, BarChart3, Tag, QrCode, Megaphone,
    LayoutGrid
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { getUnreadCount } from '@/app/actions/messaging'

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

const sellerNavigationConfig: NavSection[] = [
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

const marketingNavigationConfig: NavSection[] = [
    {
        titleKey: 'marketingLinks',
        items: [
            { nameKey: 'marketingOverview', href: '/dashboard/marketing', icon: Home },
            { nameKey: 'marketingAllLinks', href: '/dashboard/marketing/links', icon: Link2 },
        ]
    },
    {
        titleKey: 'marketingOrganize',
        items: [
            { nameKey: 'marketingChannels', href: '/dashboard/marketing/channels', icon: LayoutGrid },
            { nameKey: 'marketingCampaigns', href: '/dashboard/marketing/campaigns', icon: Tag },
        ]
    },
    {
        titleKey: 'marketingAnalytics',
        items: [
            { nameKey: 'marketingAnalyticsPage', href: '/dashboard/marketing/analytics', icon: BarChart3 },
            { nameKey: 'marketingQrCodes', href: '/dashboard/marketing/qr', icon: QrCode },
        ]
    },
    {
        titleKey: 'configuration',
        items: [
            { nameKey: 'domains', href: '/dashboard/domains', icon: Globe },
            { nameKey: 'settings', href: '/dashboard/settings', icon: Settings },
        ]
    },
]

// =============================================
// SIDEBAR COMPONENT
// =============================================

export type DashboardMode = 'seller' | 'marketing'

interface SidebarProps {
    collapsed?: boolean
    onToggleCollapse?: () => void
    isMobile?: boolean
    dashboardMode?: DashboardMode
    onSwitchMode?: (mode: DashboardMode) => void
}

export function Sidebar({ collapsed = false, onToggleCollapse, isMobile = false, dashboardMode = 'seller', onSwitchMode }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const t = useTranslations('dashboard.sidebarNav')
    const [userEmail, setUserEmail] = useState<string>('')
    const [startupName, setStartupName] = useState<string>(t('sellerProgram'))
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [switcherOpen, setSwitcherOpen] = useState(false)
    const switcherRef = useRef<HTMLDivElement>(null)

    // Auto-detect mode from pathname
    const effectiveMode = pathname.startsWith('/dashboard/marketing') ? 'marketing' : dashboardMode

    const navigationConfig = effectiveMode === 'marketing' ? marketingNavigationConfig : sellerNavigationConfig

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

    // Close switcher on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
                setSwitcherOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSwitchMode = (mode: DashboardMode) => {
        setSwitcherOpen(false)
        onSwitchMode?.(mode)
        if (mode === 'marketing') {
            router.push('/dashboard/marketing')
        } else {
            router.push('/dashboard')
        }
    }

    // Don't show collapse button on mobile drawer
    const showCollapseButton = !isMobile && onToggleCollapse

    const subtitleLabel = effectiveMode === 'marketing' ? t('marketingMode') : t('startupProgram')

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
                        <div className="flex-1 min-w-0 relative" ref={switcherRef}>
                            <p className="text-sm font-semibold text-gray-900 truncate">{startupName}</p>
                            <button
                                onClick={() => setSwitcherOpen(!switcherOpen)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <span className="truncate">{subtitleLabel}</span>
                                <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Mode Switcher Popover */}
                            {switcherOpen && (
                                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-[60]">
                                    <button
                                        onClick={() => handleSwitchMode('seller')}
                                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium text-gray-900">{t('sellerProgramLabel')}</span>
                                        </div>
                                        {effectiveMode === 'seller' && <Check className="w-4 h-4 text-purple-600" />}
                                    </button>
                                    <button
                                        onClick={() => handleSwitchMode('marketing')}
                                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Megaphone className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium text-gray-900">{t('marketingLabel')}</span>
                                        </div>
                                        {effectiveMode === 'marketing' && <Check className="w-4 h-4 text-purple-600" />}
                                    </button>
                                </div>
                            )}
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
                                                flex items-center gap-3 rounded-lg transition-all duration-150 text-sm
                                                ${collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'}
                                                ${isActive
                                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
                                                <div className="relative">
                                                    <Icon
                                                        className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
                                                        strokeWidth={2}
                                                    />
                                                    {collapsed && badge > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                                            {badge > 9 ? '9+' : badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {!collapsed && <span>{t(item.nameKey)}</span>}
                                            </div>
                                            {!collapsed && badge > 0 && (
                                                <span className="min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                                                    {badge > 99 ? '99+' : badge}
                                                </span>
                                            )}
                                            {!collapsed && !badge && item.external && (
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
