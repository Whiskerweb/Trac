'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutGrid,
    Users,
    Wallet,
    HelpCircle,
    MessageSquare,
    Settings,
    Bell,
    User,
    ChevronDown,
    Mail,
    Banknote,
    Store
} from 'lucide-react'
import { WalletButton } from '@/components/partner/WalletButton'

// ==========================================
// STRICT DESIGN SYSTEM - DUB.CO STYLE
// ==========================================
const DS = {
    rail: {
        width: 'w-[56px]',
        bg: 'bg-[#FAFAFA]',
        border: 'border-r border-[rgba(0,0,0,0.06)]'
    },
    sidebar: {
        width: 'w-[240px]',
        bg: 'bg-white',
        border: 'border-r border-[rgba(0,0,0,0.06)]'
    },
    content: {
        bg: 'bg-[#FAFAFA]'
    }
}

// Rail Navigation (Global)
const RAIL_NAV = [
    { label: 'Programs', href: '/partner', icon: LayoutGrid },
    { label: 'Payouts', href: '/partner/payouts', icon: Wallet },
    { label: 'Members', href: '/partner/members', icon: Users },
    { label: 'Messages', href: '/partner/messages', icon: MessageSquare },
]

// Sidebar Navigation - CONTEXT 1: All programs
const PROGRAMS_NAV = [
    { label: 'Programs', href: '/partner', icon: LayoutGrid },
    { label: 'Marketplace', href: '/partner/marketplace', icon: Store },
    { label: 'Invitations', href: '/partner/invitations', icon: Mail },
]



// Sidebar Navigation - CONTEXT 2: Partner Profile
const PROFILE_NAV = [
    { label: 'Profile', href: '/partner/profile', icon: User },
    { label: 'Members', href: '/partner/members', icon: Users },
    { label: 'Account', href: '/partner/account', icon: Settings },
    { label: 'Notifications', href: '/partner/notifications', icon: Bell },
]

export default function PartnerDualLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    // Determine which context we're in
    const isProfileContext = ['/partner/profile', '/partner/members', '/partner/account', '/partner/notifications'].includes(pathname)
    const isProgramsContext = ['/partner', '/partner/invitations', '/partner/analytics', '/partner/marketplace'].includes(pathname) || pathname.startsWith('/partner/marketplace/')
    const isPayoutsContext = pathname === '/partner/payouts'
    const isMessagesContext = pathname === '/partner/messages'

    // Helper to check if route is active
    const isRailActive = (href: string) => {
        if (href === '/partner') return pathname === '/partner' || pathname === '/partner/invitations'
        if (href === '/partner/analytics') return pathname === '/partner/analytics'
        if (href === '/partner/payouts') return pathname === '/partner/payouts'
        if (href === '/partner/messages') return pathname === '/partner/messages'
        if (href === '/partner/members') return pathname.startsWith('/partner/members') || pathname.startsWith('/partner/profile') || pathname.startsWith('/partner/account') || pathname.startsWith('/partner/notifications')
        return pathname.startsWith(href)
    }

    // Payouts and Messages pages have no sidebar, only rail
    const showSidebar = !isPayoutsContext && !isMessagesContext
    const currentNav = isProgramsContext ? PROGRAMS_NAV : PROFILE_NAV
    const sidebarTitle = isProgramsContext ? 'All programs' : 'Partner profile'

    return (
        <div className="flex min-h-screen bg-white">

            {/* 1. LEFT RAIL (Global Navigation) */}
            <aside className={`
                fixed top-0 left-0 bottom-0 z-50
                ${DS.rail.width} ${DS.rail.bg} ${DS.rail.border}
                flex flex-col items-center py-4
            `}>
                {/* Logo */}
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm mb-8">
                    T
                </div>

                {/* Rail Nav Icons */}
                <nav className="flex-1 space-y-2 w-full px-1.5">
                    {RAIL_NAV.map((item) => {
                        const active = isRailActive(item.href)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    w-full h-10 rounded-lg flex items-center justify-center
                                    transition-all duration-150
                                    ${active
                                        ? 'bg-white shadow-sm text-gray-900'
                                        : 'text-gray-500 hover:bg-gray-100'
                                    }
                                `}
                                title={item.label}
                            >
                                <item.icon strokeWidth={1.5} size={20} />
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer Items */}
                <div className="space-y-2 w-full px-1.5 pb-2">
                    <button
                        className="w-full h-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Help"
                    >
                        <HelpCircle strokeWidth={1.5} size={20} />
                    </button>

                    {/* Avatar */}
                    <div className="w-full h-10 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-medium">
                            P
                        </div>
                    </div>
                </div>
            </aside>

            {/* 2. MAIN SIDEBAR (Contextual Navigation) - Hidden for Payouts */}
            {showSidebar && (
                <aside className={`
                    fixed top-0 left-[56px] bottom-0 z-40
                    ${DS.sidebar.width} ${DS.sidebar.bg} ${DS.sidebar.border}
                    flex flex-col
                `}>
                    {/* Header Section with Dropdown */}
                    <div className="px-4 py-6 border-b border-gray-100">
                        <button className="flex items-center justify-between w-full px-2 py-1 hover:bg-gray-50 rounded-lg transition-colors">
                            <span className="text-sm font-semibold text-gray-900">{sidebarTitle}</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Navigation Links - Dynamic based on context */}
                    <nav className="flex-1 px-3 py-4 space-y-0.5">
                        {currentNav.map((item) => {
                            const active = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-lg
                                        text-[14px] font-medium
                                        transition-colors
                                        ${active
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <item.icon strokeWidth={1.5} size={18} />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Bottom Payouts Section */}
                    <div className="p-4 border-t border-gray-100">
                        <Link
                            href="/partner/payouts"
                            className="block"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Wallet className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                                <span className="text-sm font-semibold text-gray-900">Payouts</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Upcoming payouts</span>
                                    <span className="font-medium text-gray-900">$0.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Received payouts</span>
                                    <span className="font-medium text-gray-900">$0.00</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </aside>
            )}

            {/* 3. MAIN CONTENT */}
            <main className={`flex-1 ${showSidebar ? 'ml-[296px]' : 'ml-[56px]'} min-h-screen ${DS.content.bg}`}>
                {/* Top Header with Wallet Button - only on payouts page */}
                {isPayoutsContext && (
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                        <div className="flex items-center justify-end px-6 py-3">
                            <WalletButton />
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

        </div>
    )
}

