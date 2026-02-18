'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
    Search,
    FolderOpen,
    Crown,
    Loader2,
    Gift
} from 'lucide-react'
import { motion, LayoutGroup } from 'framer-motion'
import ProfileCompletionBanner from '@/components/seller/ProfileCompletionBanner'
import FeedbackWidget from '@/components/FeedbackWidget'
import { springSnappy } from '@/lib/animations'
import { getMySellerProfile } from '@/app/actions/sellers'
import { getMyOrganizations } from '@/app/actions/organization-actions'
import { getUnreadCount } from '@/app/actions/messaging'
import { getOnboardingStatus } from '@/app/actions/seller-onboarding'

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
    const router = useRouter()
    const isOnboarding = pathname === '/seller/onboarding'

    // ==========================================
    // ALL HOOKS — called unconditionally (Rules of Hooks)
    // ==========================================
    const [sellerVerified, setSellerVerified] = useState(false)
    const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null; hasStripeConnect: boolean } | null>(null)
    const [managedOrgs, setManagedOrgs] = useState<{ id: string; name: string; status: string }[]>([])
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isHydrated, setIsHydrated] = useState(false)

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        if (isOnboarding) return
        const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (saved !== null) {
            setIsCollapsed(saved === 'true')
        }
        setIsHydrated(true)
    }, [isOnboarding])

    // Persist collapsed state to localStorage
    const handleToggleCollapse = () => {
        const newState = !isCollapsed
        setIsCollapsed(newState)
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState))
    }

    // ==========================================
    // SELLER VERIFICATION GUARD
    // Replaces the middleware workspace-check.
    // If no seller record → redirect to onboarding.
    // ==========================================
    useEffect(() => {
        if (isOnboarding) {
            setSellerVerified(true) // Skip check for onboarding page
            return
        }

        async function verifySeller() {
            try {
                const result = await getOnboardingStatus('current-user')
                if (!result.success || !result.hasSeller) {
                    // No seller record — send to onboarding to create one
                    router.replace('/seller/onboarding')
                    return
                }
                if (result.seller && result.seller.onboardingStep < 4) {
                    // Onboarding not complete
                    router.replace('/seller/onboarding')
                    return
                }
                setSellerVerified(true)
            } catch (err) {
                console.error('[SellerLayout] Seller verification failed:', err)
                // Fail open — show the page rather than blocking
                setSellerVerified(true)
            }
        }

        verifySeller()
    }, [isOnboarding, router])

    // Load profile data + managed orgs for sidebar
    useEffect(() => {
        if (isOnboarding || !sellerVerified) return

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
        async function loadOrgs() {
            try {
                const result = await getMyOrganizations()
                if (result.success && result.led) {
                    setManagedOrgs(result.led.filter((o: any) => o.status === 'ACTIVE').map((o: any) => ({ id: o.id, name: o.name, status: o.status })))
                }
            } catch (err) {
                console.error('Failed to load orgs for sidebar:', err)
            }
        }
        async function loadUnread() {
            try {
                const count = await getUnreadCount('partner')
                setUnreadMessages(count)
            } catch {}
        }
        loadProfile()
        loadOrgs()
        loadUnread()
        // Poll unread count every 30s
        const interval = setInterval(loadUnread, 30000)
        return () => clearInterval(interval)
    }, [isOnboarding, sellerVerified])

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

    // ==========================================
    // EARLY RETURNS (after all hooks)
    // ==========================================

    // Onboarding page renders standalone — no sidebar, no banner
    if (isOnboarding) {
        return <>{children}</>
    }

    // Loading while verifying seller record
    if (!sellerVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    // ==========================================
    // SIDEBAR COMPONENTS
    // ==========================================

    // Check if route is active
    const isActive = (href: string) => {
        if (href === '/seller') {
            return pathname === '/seller' || pathname.startsWith('/seller/programs')
        }
        // Organizations browse should not match /seller/organizations/my or /seller/organizations/apply
        if (href === '/seller/organizations') {
            return pathname === '/seller/organizations'
        }
        return pathname === href || pathname.startsWith(href + '/')
    }

    const isProfileActive = pathname === '/seller/profile'

    // Navigation item component
    const NavItem = ({ href, icon: Icon, label, collapsed = false, badge = 0 }: { href: string; icon: React.ElementType; label: string; collapsed?: boolean; badge?: number }) => {
        const active = isActive(href)
        return (
            <Link
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                    relative flex items-center gap-3 rounded-xl
                    text-[14px] font-medium
                    transition-colors duration-150
                    ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                    ${active
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }
                `}
            >
                {/* Animated active indicator */}
                {active && !collapsed && (
                    <motion.div
                        layoutId="seller-sidebar-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-violet-500 rounded-r-full"
                        transition={springSnappy}
                    />
                )}
                <motion.div className="relative" whileHover={{ scale: 1.12 }} transition={springSnappy}>
                    <Icon
                        strokeWidth={1.5}
                        size={18}
                        className={active ? 'text-violet-600' : 'text-gray-400'}
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
                </motion.div>
                {!collapsed && (
                    <>
                        <span className="flex-1">{label}</span>
                        {badge > 0 && (
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
                    </>
                )}
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
                <LayoutGroup id="seller-sidebar">
                {/* PROGRAMMES Section */}
                <SectionLabel collapsed={collapsed}>Programmes</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller" icon={Home} label="Overview" collapsed={collapsed} />
                    <NavItem href="/seller/marketplace" icon={Store} label="Marketplace" collapsed={collapsed} />
                </div>

                {/* ORGANIZATIONS Section */}
                <SectionLabel collapsed={collapsed}>Organizations</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller/organizations" icon={Search} label="Browse" collapsed={collapsed} />
                    <NavItem href="/seller/organizations/my" icon={FolderOpen} label="My Orgs" collapsed={collapsed} />
                    {managedOrgs.map(org => (
                        <NavItem key={org.id} href={`/seller/manage/${org.id}`} icon={Crown} label={org.name} collapsed={collapsed} />
                    ))}
                    <NavItem href="/seller/groups" icon={Users} label="Groups" collapsed={collapsed} />
                </div>

                {/* GAINS Section - Conditional: Stripe Connect = Payouts, No Stripe = Wallet */}
                <SectionLabel collapsed={collapsed}>Gains</SectionLabel>
                <div className="space-y-1">
                    {profile?.hasStripeConnect ? (
                        <NavItem href="/seller/payouts" icon={CreditCard} label="Payouts" collapsed={collapsed} />
                    ) : (
                        <NavItem href="/seller/wallet" icon={Wallet} label="Wallet" collapsed={collapsed} />
                    )}
                    <NavItem href="/seller/referral" icon={Gift} label="Referral" collapsed={collapsed} />
                </div>

                {/* COMMUNICATION Section */}
                <SectionLabel collapsed={collapsed}>Communication</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller/messages" icon={MessageSquare} label="Messages" collapsed={collapsed} badge={unreadMessages} />
                </div>

                {/* COMPTE Section */}
                <SectionLabel collapsed={collapsed}>Compte</SectionLabel>
                <div className="space-y-1">
                    <NavItem href="/seller/settings" icon={Settings} label="Settings" collapsed={collapsed} />
                </div>
                </LayoutGroup>
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
                        <motion.div
                            animate={{ rotate: collapsed ? 180 : 0 }}
                            whileHover={{ scale: 1.12 }}
                            transition={springSnappy}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </motion.div>
                        {!collapsed && <span className="text-xs font-medium">Collapse</span>}
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
                    <motion.div whileHover={{ scale: 1.08 }} transition={springSnappy}>
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
                    </motion.div>
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
