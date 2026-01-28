'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, Loader2, ArrowRight } from 'lucide-react'

interface UserRoles {
    hasWorkspace: boolean
    hasPartner: boolean
    primaryRole: 'startup' | 'partner' | 'none'
    workspaces: { id: string; name: string; slug: string }[]
    partners: { id: string; programName: string; status: string }[]
}

export default function AuthChoicePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [roles, setRoles] = useState<UserRoles | null>(null)
    const [selecting, setSelecting] = useState<'startup' | 'partner' | null>(null)

    useEffect(() => {
        async function loadRoles() {
            try {
                const res = await fetch('/api/auth/user-roles')
                if (res.ok) {
                    const data = await res.json()
                    setRoles(data)

                    // If only one role, redirect immediately
                    if (data.hasWorkspace && !data.hasPartner) {
                        router.replace('/dashboard')
                        return
                    }
                    if (data.hasPartner && !data.hasWorkspace) {
                        router.replace('/seller')
                        return
                    }
                    if (!data.hasWorkspace && !data.hasPartner) {
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

    const handleChoice = async (role: 'startup' | 'partner') => {
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
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement...</span>
                </div>
            </div>
        )
    }

    if (!roles || (!roles.hasWorkspace && !roles.hasPartner)) {
        return null // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Bienvenue sur Traaaction
                    </h1>
                    <p className="text-slate-600">
                        Vous avez accès à plusieurs espaces. Lequel souhaitez-vous ouvrir ?
                    </p>
                </div>

                {/* Choice Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Startup Option */}
                    <button
                        onClick={() => handleChoice('startup')}
                        disabled={selecting !== null}
                        className="group relative bg-white border-2 border-slate-200 rounded-2xl p-8 text-left hover:border-indigo-500 hover:shadow-lg transition-all duration-200 disabled:opacity-70"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-5 h-5 text-indigo-500" />
                        </div>

                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Mon Startup
                        </h2>
                        <p className="text-slate-600 text-sm mb-4">
                            Gérer mes liens, voir mes conversions et piloter mes campagnes d&apos;affiliation.
                        </p>

                        {roles.workspaces.length > 0 && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                {roles.workspaces.length} workspace{roles.workspaces.length > 1 ? 's' : ''} •
                                {roles.workspaces[0]?.name}
                            </div>
                        )}

                        {selecting === 'startup' && (
                            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                            </div>
                        )}
                    </button>

                    {/* Partner Option */}
                    <button
                        onClick={() => handleChoice('partner')}
                        disabled={selecting !== null}
                        className="group relative bg-white border-2 border-slate-200 rounded-2xl p-8 text-left hover:border-purple-500 hover:shadow-lg transition-all duration-200 disabled:opacity-70"
                    >
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-5 h-5 text-purple-500" />
                        </div>

                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-white" />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 mb-2">
                            Mon Compte Partenaire
                        </h2>
                        <p className="text-slate-600 text-sm mb-4">
                            Voir mes gains, suivre mes conversions et demander des versements.
                        </p>

                        {roles.partners.length > 0 && (
                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                                {roles.partners.length} programme{roles.partners.length > 1 ? 's' : ''} •
                                {roles.partners[0]?.programName}
                            </div>
                        )}

                        {selecting === 'partner' && (
                            <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            </div>
                        )}
                    </button>
                </div>

                {/* Footer note */}
                <p className="text-center text-slate-500 text-sm mt-8">
                    Vous pouvez changer d&apos;espace à tout moment depuis votre profil.
                </p>
            </div>
        </div>
    )
}
