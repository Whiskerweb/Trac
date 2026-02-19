'use client'

import { useState, useEffect } from 'react'
import { getWorkspaceDNSStatus } from '@/app/actions/domains'
import Link from 'next/link'
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

export function DNSGatekeeper({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const [hasDomain, setHasDomain] = useState(false)

    useEffect(() => {
        const check = async () => {
            const res = await getWorkspaceDNSStatus()
            if (res.success) {
                setHasDomain(res.hasVerifiedDomain)
            }
            setLoading(false)
        }
        check()
    }, [])

    if (loading) {
        return (
            <div className="relative min-h-[400px]">
                <div className="blur-sm opacity-50 pointer-events-none" aria-hidden="true">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                    <TraaactionLoader size={32} className="text-gray-400" />
                </div>
            </div>
        )
    }

    if (hasDomain) {
        return <>{children}</>
    }

    return (
        <div className="relative min-h-[600px] overflow-hidden rounded-xl">
            {/* Blurred Content */}
            <div className="filter blur-md opacity-40 pointer-events-none select-none h-full" aria-hidden="true">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white/90 backdrop-blur-xl border border-gray-200/60 shadow-2xl rounded-2xl p-8 max-w-md w-full ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Configuration Requise
                    </h3>

                    <p className="text-gray-600 mb-6 leading-relaxed">
                        To protect your attribution against ad blockers and Safari ITP, a custom domain is required.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/dashboard/domains"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition-all shadow-lg shadow-black/5 group"
                        >
                            Configurer mon domaine
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </Link>

                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Tracking First-Party
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
