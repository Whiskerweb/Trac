'use client'

import { Sidebar } from '@/components/dashboard/Sidebar'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'trac_sidebar_collapsed'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
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

    return (
        <div className="flex min-h-screen bg-[#FAFAFA]">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
                <Sidebar
                    collapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                />
            </div>

            {/* Mobile Sidebar (Drawer) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Sidebar Content */}
                    <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl animate-in slide-in-from-left duration-300">
                        {/* Close button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <Sidebar isMobile />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className={`
                flex-1 min-h-screen transition-all duration-300
                ${isHydrated
                    ? (isCollapsed ? 'md:ml-[68px]' : 'md:ml-64')
                    : 'md:ml-64'
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
                        <span className="font-bold text-lg text-gray-900 tracking-tight">Trac</span>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
