'use client'

import { Home, Link2, ShoppingBag, Settings, Target, Puzzle, Globe } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    { name: 'Domains', href: '/dashboard/domains', icon: Globe },
    { name: 'Setup & Diagnostics', href: '/dashboard/integration', icon: Puzzle },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]


export function Sidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo/Brand */}
            <div className="h-16 flex items-center px-6 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
                    <span className="font-bold text-xl text-gray-900" style={{ letterSpacing: '-0.02em' }}>Trac</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6">
                <ul className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                                        ${isActive
                                            ? 'bg-gray-100 text-gray-900 font-medium'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                                    <span className="text-sm">{item.name}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                    v2.0.0
                </div>
            </div>
        </aside>
    )
}
