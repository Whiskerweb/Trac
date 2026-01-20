'use client'

import { Home, Link2, ShoppingBag, Settings, Target, Puzzle, Globe, ChevronDown, User, LogOut, DollarSign, Users, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const navigation: NavItem[] = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'My Links', href: '/dashboard/links', icon: Link2 },
    { name: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBag },
    { name: 'Missions', href: '/dashboard/missions', icon: Target },
    { name: 'Partners', href: '/dashboard/partners', icon: Users },
    { name: 'Commissions', href: '/dashboard/commissions', icon: DollarSign },
    { name: 'Payouts', href: '/dashboard/payouts', icon: CreditCard },
    { name: 'Domains', href: '/dashboard/domains', icon: Globe },
    { name: 'Setup & Diagnostics', href: '/dashboard/integration', icon: Puzzle },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const [userEmail, setUserEmail] = useState<string>('')

    useEffect(() => {
        // Simple fetch to get user email for the profile section
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUserEmail(data.user?.email || 'User'))
            .catch(() => { })
    }, [])

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E5E7EB] flex flex-col z-50">
            {/* Logo/Workspace Switcher Mockup */}
            <div className="h-16 flex items-center px-4 border-b border-[#E5E7EB]">
                <button className="flex items-center gap-2 w-full hover:bg-gray-50 p-2 rounded-lg transition-colors text-left group">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        T
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">Trac App</p>
                        <p className="text-xs text-gray-500 truncate group-hover:text-gray-700">Free Plan</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 overflow-y-auto">
                <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Menu
                </div>
                <ul className="space-y-0.5">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm
                                        ${isActive
                                            ? 'bg-gray-100 text-black font-medium'
                                            : 'text-gray-500 hover:text-black hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-500'}`} strokeWidth={2} />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Profile Section */}
            <div className="p-3 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-100 flex items-center justify-center text-gray-500">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{userEmail || 'Loading...'}</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
