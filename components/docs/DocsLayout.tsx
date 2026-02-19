'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import DocsSidebar from './DocsSidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const c = useTranslations('docs.common')

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Fixed header */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-slate-100 transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5 text-slate-600" />
                        </button>
                        <Link href="/docs" className="flex items-center gap-2">
                            <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={24} height={24} className="rounded-md" />
                            <span className="text-sm font-medium text-slate-500">{c('headerLabel')}</span>
                        </Link>
                    </div>
                    <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
                        {c('backToHome')}
                    </Link>
                </div>
            </header>

            {/* Mobile drawer overlay */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 shadow-xl overflow-y-auto">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <Image src="/Logotrac/Logo5.png" alt="Traaaction" width={20} height={20} className="rounded-md" />
                                <span className="text-sm font-medium text-slate-700">{c('headerLabel')}</span>
                            </div>
                            <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-md hover:bg-slate-100">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="px-2">
                            <DocsSidebar onNavigate={() => setDrawerOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Main layout */}
            <div className="pt-[57px] max-w-[1440px] mx-auto flex">
                {/* Sidebar — visible lg+ */}
                <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-slate-200/60">
                    <div className="fixed w-60 top-[57px] bottom-0 overflow-y-auto px-3">
                        <DocsSidebar />
                    </div>
                </aside>

                {/* Content area */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
