'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Building2, Link2, ArrowRight } from 'lucide-react'
import { checkSlugAvailability, createWorkspaceOnboarding } from './actions'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

export default function OnboardingPage() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [roleChecked, setRoleChecked] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
    const [error, setError] = useState('')

    // Guard: sellers should NEVER see this page
    useEffect(() => {
        async function checkRole() {
            // Fast check: if trac_signup_role cookie says seller, redirect immediately
            if (document.cookie.includes('trac_signup_role=seller')) {
                console.log('[Onboarding] Seller signup cookie detected, redirecting to /seller/onboarding')
                router.replace('/seller/onboarding')
                return
            }

            try {
                const res = await fetch('/api/auth/workspace-check')
                if (res.ok) {
                    const data = await res.json()
                    if (data.hasSeller && !data.hasWorkspace) {
                        console.log('[Onboarding] Seller detected via API, redirecting to /seller')
                        router.replace('/seller')
                        return
                    }
                    if (data.hasWorkspace) {
                        router.replace('/dashboard')
                        return
                    }
                } else {
                    console.warn('[Onboarding] workspace-check returned', res.status)
                }
            } catch (err) {
                console.error('[Onboarding] Role check failed:', err)
            }
            setRoleChecked(true)
        }
        checkRole()
    }, [router])

    // Auto-generate slug from name
    useEffect(() => {
        if (name && !slug) {
            const generated = name
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .slice(0, 30)
            setSlug(generated)
        }
    }, [name, slug])

    // Debounced slug check
    useEffect(() => {
        if (!slug || slug.length < 3) {
            setSlugStatus('idle')
            return
        }

        const slugRegex = /^[a-z0-9-]+$/
        if (!slugRegex.test(slug)) {
            setSlugStatus('invalid')
            return
        }

        setSlugStatus('checking')

        const timer = setTimeout(async () => {
            const result = await checkSlugAvailability(slug)
            setSlugStatus(result.available ? 'available' : 'taken')
        }, 400)

        return () => clearTimeout(timer)
    }, [slug])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (slugStatus !== 'available') {
            setError('Veuillez choisir un slug valide et disponible')
            return
        }

        startTransition(async () => {
            const formData = new FormData()
            formData.set('name', name)
            formData.set('slug', slug)

            const result = await createWorkspaceOnboarding(formData)

            if (result.success) {
                router.push(result.redirectTo || '/dashboard')
            } else {
                setError(result.error || 'Une erreur est survenue')
            }
        })
    }

    const isValid = name.length >= 2 && slugStatus === 'available'

    // Show loading while checking if user is a seller (prevents flash of wrong page)
    if (!roleChecked) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <TraaactionLoader size={20} className="text-gray-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-xl mb-4">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create your workspace</h1>
                    <p className="text-gray-500 mt-2">
                        Your workspace is where you manage links, track conversions, and collaborate with your team.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Workspace Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Workspace Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Acme, Inc."
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm transition-all"
                                autoFocus
                                required
                            />
                        </div>

                        {/* Workspace Slug */}
                        <div>
                            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Workspace URL
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                                    app.traaaction.com/
                                </span>
                                <div className="relative flex-1">
                                    <input
                                        id="slug"
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="acme"
                                        className={`w-full px-3 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm transition-all pr-10 ${slugStatus === 'taken' || slugStatus === 'invalid'
                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                            : slugStatus === 'available'
                                                ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                                                : 'border-gray-300'
                                            }`}
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {slugStatus === 'checking' && (
                                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                        )}
                                        {slugStatus === 'available' && (
                                            <Check className="w-4 h-4 text-green-500" />
                                        )}
                                        {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                                            <X className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                                {slugStatus === 'taken' && <span className="text-red-500">This slug is already taken</span>}
                                {slugStatus === 'invalid' && <span className="text-red-500">Invalid characters</span>}
                                {slugStatus === 'available' && <span className="text-green-600">Disponible !</span>}
                                {(slugStatus === 'idle' || slugStatus === 'checking') && 'Lettres minuscules, chiffres et tirets uniquement'}
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={!isValid || isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Create workspace
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    By creating a workspace, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    )
}
