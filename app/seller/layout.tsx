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
    Wallet
} from 'lucide-react'
import { WalletButton } from '@/components/seller/WalletButton'
import ProfileCompletionBanner from '@/components/seller/ProfileCompletionBanner'
import { getMySellerProfile } from '@/app/actions/sellers'

// ==========================================
// DESIGN SYSTEM - TRAAACTION SELLER
// ==========================================
const DS = {
    sidebar: {
        width: 'w-[260px]',
        bg: 'bg-[#FAFAFA]',
        border: 'border-r border-gray-200'
    },
    content: {
        bg: 'bg-white'
    }
}

export default function SellerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [profile, setProfile] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null)

    // Load profile data for sidebar
    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    setProfile({
                        name: result.profile.name || '',
                        email: result.profile.email || '',
                        avatarUrl: result.profile.avatarUrl || null
                    })
                }
            } catch (err) {
                console.error('Failed to load profile for sidebar:', err)
            }
        }
        loadProfile()
    }, [])

    // Check if route is active
    const isActive = (href: string) => {
        if (href === '/seller') {
            return pathname === '/seller' || pathname.startsWith('/seller/programs')
        }
        return pathname === href || pathname.startsWith(href + '/')
    }

    const isSettingsActive = pathname === '/seller/settings'
    const isProfileActive = pathname === '/seller/profile'

    // Navigation item component
    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
        const active = isActive(href)
        return (
            <Link
                href={href}
                className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-[14px] font-medium
                    transition-all duration-150
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
                {label}
            </Link>
        )
    }

    // Section label component
    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <p className="px-3 pt-6 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {children}
        </p>
    )

    return (
        <div className="flex min-h-screen bg-white">

            {/* SIDEBAR */}
            <aside className={`
                fixed top-0 left-0 bottom-0 z-50
                ${DS.sidebar.width} ${DS.sidebar.bg} ${DS.sidebar.border}
                flex flex-col
            `}>
                {/* Logo Header */}
                <div className="px-5 py-5 border-b border-gray-200">
                    <Link href="/seller" className="flex items-center gap-3">
                        <img
                            src="/Logotrac/logo1.png"
                            alt="Traaaction"
                            className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                            <p className="text-[15px] font-semibold text-gray-900">{profile?.name || 'Mon compte'}</p>
                            <p className="text-xs text-gray-500">Seller Dashboard</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 overflow-y-auto">
                    {/* PROGRAMMES Section */}
                    <SectionLabel>Programmes</SectionLabel>
                    <div className="space-y-1">
                        <NavItem href="/seller" icon={Home} label="Overview" />
                        <NavItem href="/seller/marketplace" icon={Store} label="Marketplace" />
                    </div>

                    {/* GAINS Section */}
                    <SectionLabel>Gains</SectionLabel>
                    <div className="space-y-1">
                        <NavItem href="/seller/payouts" icon={CreditCard} label="Payouts" />
                        <NavItem href="/seller/wallet" icon={Wallet} label="Wallet" />
                    </div>

                    {/* COMMUNICATION Section */}
                    <SectionLabel>Communication</SectionLabel>
                    <div className="space-y-1">
                        <NavItem href="/seller/messages" icon={MessageSquare} label="Messages" />
                    </div>

                    {/* COMPTE Section */}
                    <SectionLabel>Compte</SectionLabel>
                    <div className="space-y-1">
                        <NavItem href="/seller/settings" icon={Settings} label="Settings" />
                    </div>
                </nav>

                {/* Profile Footer */}
                <div className="p-3 border-t border-gray-200">
                    <Link
                        href="/seller/profile"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                            isProfileActive ? 'bg-violet-50' : 'hover:bg-white'
                        }`}
                    >
                        {profile?.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.name || 'Profil'}
                                className="w-9 h-9 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {profile?.email || 'Mon compte'}
                            </p>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`flex-1 ml-[260px] min-h-screen ${DS.content.bg}`}>
                {/* Profile Completion Banner */}
                <ProfileCompletionBanner />

                {/* Top Header with Wallet Button - only on payouts page */}
                {pathname === '/seller/payouts' && (
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

