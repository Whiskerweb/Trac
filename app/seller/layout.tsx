'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    CreditCard,
    MessageSquare,
    Store,
    Settings,
    User,
    Users,
    Wallet,
    Menu,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import ProfileCompletionBanner from '@/components/seller/ProfileCompletionBanner'
import FeedbackWidget from '@/components/FeedbackWidget'
import { getMySellerProfile } from '@/app/actions/sellers'

// ==========================================
// DESIGN SYSTEM - TRAAACTION SELLER
// ==========================================
const DS = {
    sidebar: {
        widthExpanded: 'w-[260px]',
        widthCollapsed: 'w-[68px]',
        bg: 'bg-[#FAFAFA]',
        border: 'border-r border-gray-200'
    },
    content: {
        bg: 'bg-white'
    }
}

const SIDEBAR_COLLAPSED_KEY = 'trac_seller_sidebar_collapsed'

export default function SellerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    // Onboarding page renders standalone — no sidebar, no banner, no layout wrapper
    if (pathname === '/seller/onboarding') {
        return <>{children}</>
    }
    const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null; hasStripeConnect: boolean } | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (saved !== null) {
            setIsCollapsed(saved === 'true')
        }
        setIsHydrated(true)
    }, [])

    // Persist collapsed state to localStorage
    const handleToggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
    }

    // Load profile data for sidebar
    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    setProfile({
                        name: result.profile.name || '',
                        email: result.profile.email || '',
                        avatarUrl: result.profile.avatarUrl || null,
                        hasStripeConnect: result.profile.hasStripeConnect || false
                    })
                }
            } catch (err) {
                console.error('Failed to load profile for sidebar:', err)
            }
        }
        loadProfile()
    }, [])

    // Close mobile menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMobileMenuOpen) {
                setIsMobileMenuOpen(false)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isMobileMenuOpen])

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isMobileMenuOpen])

    // Check if route is active
    const isActive = (href: string) => {
        if (href === '/seller') {
            return pathname === '/seller' || pathname.startsWith('/seller/programs')
        }
        return pathname === href || pathname.startsWith(href + '/')
    }

    const isProfileActive = pathname === '/seller/profile'

    // Navigation item component
    const NavItem = ({ href, icon: Icon, label, collapsed = false }: { href: string; icon: React.ElementType; label: string; collapsed?: boolean }) => {
        const active = isActive(href)
        return (
            <Link
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                    flex items-center gap-3 rounded-xl
                    text-[14px] font-medium
                    transition-all duration-150
                    ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                    ${active
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                `}
            >
                <Icon
                    strokeWidth={1.5}
                    size={18}
                    className={active ? 'text-violet-600' : 'text-gray-400'}
                />
                {!collapsed && label}
            </Link>
        )
    }

    // Section label component
    const SectionLabel = ({ children, collapsed = false }: { children: React.ReactNode; collapsed?: boolean }) => {
        if (collapsed) {
            return <div className="w-8 h-px bg-gray-200 mx-auto my-3" />
        }
        return (
            <p className="px-3 pt-6 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {children}
            </p>
        )
    }

    // Sidebar content component (shared between desktop and mobile)
    const SidebarContent = ({ collapsed = false, isMobile = false }: { collapsed?: boolean; isMobile?: boolean }) => (
        <>
            {/* Logo Header */}
            <div className={`border-b border-gray-200 ${collapsed ? 'px-2 py-5' : 'px-5 py-5'}`}>
                <Link
                    href="/seller"
                    className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                >
                    <img
                        src="/Logotrac/logo1.png"
                        alt="Traaaction"
                        className={`rounded-xl object-cover transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
                    />
                    {!collapsed && (
                        <div>
                            <p className="text-[15px] font-semibold text-gray-900">{profile?.name || 'Mon compte'}</p>
                            <p className="text-xs text-gray-500">Seller Dashboard</p>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
                {/* PROGRAMMES Section */}
                <SectionLabel collapsed={collapsed}>Programmes</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller" icon={Home} label="Overview" collapsed={collapsed} />
                    <NavItem href="/seller/marketplace" icon={Store} label="Marketplace" collapsed={collapsed} />
                    <NavItem href="/seller/organizations" icon={Users} label="Organizations" collapsed={collapsed} />
                </div>

                {/* GAINS Section - Conditional: Stripe Connect = Payouts, No Stripe = Wallet */}
                <SectionLabel collapsed={collapsed}>Gains</SectionLabel>
                <div className="space-y-1">
                    {profile?.hasStripeConnect ? (
                        <NavItem href="/seller/payouts" icon={CreditCard} label="Payouts" collapsed={collapsed} />
                    ) : (
                        <NavItem href="/seller/wallet" icon={Wallet} label="Wallet" collapsed={collapsed} />
                    )}
                </div>

                {/* COMMUNICATION Section */}
                <SectionLabel collapsed={collapsed}>Communication</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller/messages" icon={MessageSquare} label="Messages" collapsed={collapsed} />
                </div>

                {/* COMPTE Section */}
                <SectionLabel collapsed={collapsed}>Compte</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller/settings" icon={Settings} label="Settings" collapsed={collapsed} />
                </div>
            </nav>

            {/* Collapse Toggle Button (desktop only) */}
            {!isMobile && (
                <div className={`px-3 py-2 border-t border-gray-200 ${collapsed ? 'flex justify-center' : ''}`}>
                    <button
                        onClick={handleToggleCollapse}
                        className={`
                            flex items-center gap-2 text-gray-500 hover:text-gray-700
                            hover:bg-white rounded-xl transition-colors
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

            {/* Profile Footer */}
            <div className={`p-3 border-t border-gray-200 ${collapsed ? 'flex justify-center' : ''}`}>
                <Link
                    href="/seller/profile"
                    title={collapsed ? (profile?.email || 'Profile') : undefined}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl transition-colors ${
                        collapsed ? 'p-2' : 'px-3 py-2.5'
                    } ${isProfileActive ? 'bg-violet-50' : 'hover:bg-white'}`}
                >
                    {profile?.avatarUrl ? (
                        <img
                            src={profile.avatarUrl}
                            alt={profile.name || 'Profil'}
                            className={`rounded-full object-cover ${collapsed ? 'w-9 h-9' : 'w-9 h-9'}`}
                        />
                    ) : (
                        <div className={`rounded-full bg-gray-200 flex items-center justify-center ${collapsed ? 'w-9 h-9' : 'w-9 h-9'}`}>
                            <User className="w-4 h-4 text-gray-500" />
                        </div>
                    )}
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {profile?.email || 'Mon compte'}
                            </p>
                        </div>
                    )}
                </Link>
            </div>
        </>
    )

    return (
        <div className="flex min-h-screen bg-white">

            {/* DESKTOP SIDEBAR */}
            <aside className={`
                hidden md:flex
                fixed top-0 left-0 bottom-0 z-50
                ${isHydrated
                    ? (isCollapsed ? DS.sidebar.widthCollapsed : DS.sidebar.widthExpanded)
                    : DS.sidebar.widthExpanded
                }
                ${DS.sidebar.bg} ${DS.sidebar.border}
                flex-col transition-all duration-300 ease-in-out
            `}>
                <SidebarContent collapsed={isCollapsed} />
            </aside>

            {/* MOBILE SIDEBAR (Drawer) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Sidebar Content */}
                    <aside className={`
                        absolute left-0 top-0 h-full ${DS.sidebar.widthExpanded} ${DS.sidebar.bg}
                        shadow-xl animate-in slide-in-from-left duration-300
                        flex flex-col
                    `}>
                        {/* Close button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SidebarContent isMobile />
                    </aside>
                </div>
            )}

            {/* MAIN CONTENT */}
            <main className={`
                flex-1 min-h-screen ${DS.content.bg}
                transition-all duration-300
                ${isHydrated
                    ? (isCollapsed ? 'md:ml-[68px]' : 'md:ml-[260px]')
                    : 'md:ml-[260px]'
                }
            `}>
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <img
                            src="/Logotrac/logo1.png"
                            alt="Traaaction"
                            className="w-8 h-8 rounded-lg object-contain"
                        />
                        <span className="font-bold text-lg text-gray-900 tracking-tight">Seller</span>
                    </div>
                    {/* Profile Avatar in mobile header */}
                    <Link href="/seller/profile" className="p-1">
                        {profile?.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.name || 'Profile'}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                            </div>
                        )}
                    </Link>
                </div>

                {/* Profile Completion Banner */}
                <ProfileCompletionBanner />

                {/* Page Content */}
                <div className="p-4 md:p-6">
                    {children}
                </div>
            </main>

            {/* Feedback Widget */}
            <FeedbackWidget userType="SELLER" />

        </div>
    )
}
