'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { portalPath } from './portal-utils'

interface PortalHeaderProps {
    workspaceSlug: string
    workspaceName: string
    logoUrl: string | null
    primaryColor: string
    userName: string
}

export default function PortalHeader({ workspaceSlug, workspaceName, logoUrl, primaryColor, userName }: PortalHeaderProps) {
    const t = useTranslations('portal.nav')
    const [menuOpen, setMenuOpen] = useState(false)

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = portalPath(workspaceSlug)
    }

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                        <img src={logoUrl} alt={workspaceName} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {workspaceName.charAt(0)}
                        </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900">{workspaceName}</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <span className="max-w-[120px] truncate">{userName}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-[140px]">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    {t('logout')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}
