'use client'

import {
    Home, MessageSquare, CreditCard, Users, UserCheck, UserPlus,
    BarChart3, Contact, Coins, Shield, Gift, Mail, FileText,
    Puzzle, ChevronDown, User, ExternalLink, Target, Zap
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

// =============================================
// NAVIGATION STRUCTURE (Traaaction style)
// =============================================

interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    external?: boolean
}

interface NavSection {
    title: string
    items: NavItem[]
}

const navigation: NavSection[] = [
    {
        title: 'Seller Program',
        items: [
            { name: 'Overview', href: '/dashboard', icon: Home },
            { name: 'Payouts', href: '/dashboard/payouts', icon: CreditCard },
            { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
        ]
    },
    {
        title: 'Sellers',
        items: [
            { name: 'All Sellers', href: '/dashboard/sellers', icon: Users },
            { name: 'Groups', href: '/dashboard/sellers/groups', icon: Users },
            { name: 'My Sellers', href: '/dashboard/sellers/applications', icon: UserPlus },
        ]
    },
    {
        title: 'Insights',
        items: [
            { name: 'Missions', href: '/dashboard/missions', icon: Target },
            { name: 'Customers', href: '/dashboard/customers', icon: Contact },
            { name: 'Commissions', href: '/dashboard/commissions', icon: Coins },
            { name: 'Fraud Detection', href: '/dashboard/fraud', icon: Shield },
        ]
    },
    {
        title: 'Engagement',
        items: [
            { name: 'Bounties', href: '/dashboard/bounties', icon: Gift },
            { name: 'Email Campaigns', href: '/dashboard/campaigns', icon: Mail },
            { name: 'Resources', href: '/dashboard/resources', icon: FileText },
        ]
    },
    {
        title: 'Configuration',
        items: [
            { name: 'Intégration', href: '/dashboard/integration', icon: Puzzle, external: true },
        ]
    },
]

// =============================================
// SIDEBAR COMPONENT
// =============================================

export function Sidebar() {
    const pathname = usePathname()
    const [userEmail, setUserEmail] = useState<string>('')
    const [startupName, setStartupName] = useState<string>('Seller Program')

    // Add dev tools section in development only
    const isDev = process.env.NODE_ENV !== 'production'
    const navigationWithDevTools = isDev
        ? [
            ...navigation,
            {
                title: 'Dev Tools',
                items: [
                    { name: 'Force Mature', href: '/dashboard/admin/debug', icon: Zap }
                ]
            }
        ]
        : navigation

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

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50">
            {/* Logo/Workspace Switcher */}
            <div className="h-16 flex items-center px-4 border-b border-gray-100">
                <div className="flex items-center gap-2 w-full p-2 rounded-lg text-left">
                    <img
                        src="/Logotrac/logo1.png"
                        alt="Logo"
                        className="w-12 h-12 rounded-lg object-contain"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{startupName}</p>
                        <p className="text-xs text-gray-500 truncate">Startup Program</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
                {navigationWithDevTools.map((section, idx) => (
                    <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
                        {/* Section Title */}
                        <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                            {section.title}
                        </p>

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
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={`
                                                flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm
                                                ${isActive
                                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon
                                                    className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
                                                    strokeWidth={2}
                                                />
                                                <span>{item.name}</span>
                                            </div>
                                            {item.external && (
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

            {/* Profile Section */}
            <div className="p-3 border-t border-gray-100">
                <Link
                    href="/dashboard/profile"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                        pathname === '/dashboard/profile' ? 'bg-purple-50' : ''
                    }`}
                >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center ${
                        pathname === '/dashboard/profile' ? 'border-purple-300' : 'text-gray-500'
                    }`}>
                        <User className={`w-4 h-4 ${pathname === '/dashboard/profile' ? 'text-purple-600' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                            pathname === '/dashboard/profile' ? 'text-purple-700' : 'text-gray-900'
                        }`}>{userEmail || 'Loading...'}</p>
                    </div>
                </Link>
            </div>
        </aside>
    )
}
