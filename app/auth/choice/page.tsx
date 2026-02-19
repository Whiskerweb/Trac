'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

interface UserRoles {
    hasWorkspace: boolean
    hasSeller: boolean
    hasPartner: boolean
    primaryRole: 'startup' | 'seller' | 'partner' | 'none'
    workspaces: { id: string; name: string; slug: string }[]
    sellers: { id: string; programName: string; status: string }[]
    partners: { id: string; programName: string; status: string }[]
}

export default function AuthChoicePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [roles, setRoles] = useState<UserRoles | null>(null)
    const [selecting, setSelecting] = useState<'startup' | 'seller' | null>(null)

    useEffect(() => {
        async function loadRoles() {
            try {
                const res = await fetch('/api/auth/user-roles')
                if (res.ok) {
                    const data = await res.json()
                    setRoles(data)

                    const hasSeller = data.hasSeller || data.hasPartner

                    // If only one role, redirect immediately
                    if (data.hasWorkspace && !hasSeller) {
                        router.replace('/dashboard')
                        return
                    }
                    if (hasSeller && !data.hasWorkspace) {
                        router.replace('/seller')
                        return
                    }
                    if (!data.hasWorkspace && !hasSeller) {
                        router.replace('/onboarding')
                        return
                    }
                } else {
                    // Not authenticated
                    router.replace('/login')
                }
            } catch (error) {
                console.error('Failed to load roles:', error)
                router.replace('/login')
            } finally {
                setLoading(false)
            }
        }

        loadRoles()
    }, [router])

    const handleChoice = async (role: 'startup' | 'seller') => {
        setSelecting(role)

        // Set preference cookie (30 days)
        document.cookie = `preferred_role=${role}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`

        // Redirect based on choice
        if (role === 'startup') {
            router.push('/dashboard')
        } else {
            router.push('/seller')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <TraaactionLoader size={20} className="text-gray-400" />
            </div>
        )
    }

    const hasSeller = roles?.hasSeller || roles?.hasPartner
    const sellers = roles?.sellers || roles?.partners || []

    if (!roles || (!roles.hasWorkspace && !hasSeller)) {
        return null // Will redirect
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image
                            src="/Logotrac/Logo5.png"
                            alt="Traaaction"
                            width={32}
                            height={32}
                            className="rounded-lg"
                        />
                        <span className="font-semibold text-neutral-900 tracking-tight">Traaaction</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 pt-20 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full max-w-3xl"
                >
                    {/* Header */}
                    <div className="text-center mb-14">
                        <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 tracking-tight mb-4">
                            Welcome back
                        </h1>
                        <p className="text-lg text-neutral-500 max-w-md mx-auto">
                            You have access to multiple spaces. Which one would you like to open?
                        </p>
                    </div>

                    {/* Choice Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Startup Option */}
                        <motion.button
                            onClick={() => handleChoice('startup')}
                            disabled={selecting !== null}
                            className="group relative bg-white rounded-2xl p-8 text-left border border-neutral-200/60 hover:border-neutral-300 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50 disabled:opacity-70"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.995 }}
                        >
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <ArrowRight className="w-5 h-5 text-neutral-400" />
                            </div>

                            <div className="w-14 h-14 bg-neutral-900 rounded-xl flex items-center justify-center mb-6">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>

                            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                Startup Dashboard
                            </h2>
                            <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                                Manage your links, track conversions and run your affiliate campaigns.
                            </p>

                            {roles.workspaces.length > 0 && (
                                <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                                    {roles.workspaces.length} workspace{roles.workspaces.length > 1 ? 's' : ''} •{' '}
                                    {roles.workspaces[0]?.name}
                                </div>
                            )}

                            {selecting === 'startup' && (
                                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                    <TraaactionLoader size={20} className="text-gray-400" />
                                </div>
                            )}
                        </motion.button>

                        {/* Seller Option */}
                        <motion.button
                            onClick={() => handleChoice('seller')}
                            disabled={selecting !== null}
                            className="group relative bg-white rounded-2xl p-8 text-left border border-neutral-200/60 hover:border-neutral-300 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50 disabled:opacity-70"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.995 }}
                        >
                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <ArrowRight className="w-5 h-5 text-neutral-400" />
                            </div>

                            <div className="w-14 h-14 bg-neutral-900 rounded-xl flex items-center justify-center mb-6">
                                <Users className="w-7 h-7 text-white" />
                            </div>

                            <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                                Seller Dashboard
                            </h2>
                            <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                                View your earnings, track conversions and request payouts.
                            </p>

                            {sellers.length > 0 && (
                                <div className="text-xs text-neutral-500 bg-neutral-50 rounded-lg px-3 py-2">
                                    {sellers.length} program{sellers.length > 1 ? 's' : ''} •{' '}
                                    {sellers[0]?.programName}
                                </div>
                            )}

                            {selecting === 'seller' && (
                                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                    <TraaactionLoader size={20} className="text-gray-400" />
                                </div>
                            )}
                        </motion.button>
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-neutral-400 text-sm mt-10">
                        You can switch spaces anytime from your profile.
                    </p>
                </motion.div>
            </main>

            {/* Subtle Background Pattern */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-neutral-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neutral-200/20 rounded-full blur-3xl" />
            </div>
        </div>
    )
}
