'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    Gift,
    Users,
    CreditCard,
    Settings,
    Shield,
    ChevronRight,
    Wallet
} from 'lucide-react'

interface NavItem {
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Treasury', href: '/admin/treasury', icon: Wallet },
    { name: 'Gift Cards', href: '/admin/gift-cards', icon: Gift },
    { name: 'Sellers', href: '/admin/sellers', icon: Users },
    { name: 'Payouts', href: '/admin/payouts', icon: CreditCard },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
    const [userEmail, setUserEmail] = useState<string>('')

    useEffect(() => {
        checkAdminAccess()
    }, [])

    async function checkAdminAccess() {
        try {
            const res = await fetch('/api/auth/me')
            const data = await res.json()

            if (!data.user?.email) {
                router.push('/login')
                return
            }

            setUserEmail(data.user.email)

            if (data.user.isAdmin) {
                setIsAdmin(true)
            } else {
                setIsAdmin(false)
                // Redirect non-admins
                router.push('/dashboard')
            }
        } catch (error) {
            console.error('Admin check failed:', error)
            router.push('/login')
        }
    }

    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Shield className="w-8 h-8 text-neutral-600 animate-pulse" />
                    <span className="text-sm text-neutral-500">Verifying access...</span>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-medium text-white mb-2">Access denied</h1>
                    <p className="text-neutral-400 text-sm">
                        Vous n'avez pas les droits administrateur.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
                {/* Header */}
                <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Admin</p>
                            <p className="text-xs text-neutral-500">Traaaction</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6">
                    <ul className="space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href))
                            const Icon = item.icon

                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm
                                            ${isActive
                                                ? 'bg-violet-500/10 text-violet-400'
                                                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                        {isActive && (
                                            <ChevronRight className="w-4 h-4 ml-auto" />
                                        )}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-neutral-400">
                                {userEmail.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
                            <p className="text-xs text-neutral-600">Administrateur</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    )
}
