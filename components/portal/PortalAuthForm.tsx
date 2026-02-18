'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { isPortalSubdomain, portalPath } from './portal-utils'

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
    )
}

interface PortalAuthFormProps {
    workspaceSlug: string
    workspaceId: string
    primaryColor: string
}

export default function PortalAuthForm({ workspaceSlug, workspaceId, primaryColor }: PortalAuthFormProps) {
    const t = useTranslations('portal')

    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [error, setError] = useState('')
    const [confirmationSent, setConfirmationSent] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)

    const supabase = createClient()

    // Set portal source cookie on mount (short-lived, for auth flow tracking)
    useEffect(() => {
        if (workspaceId) {
            document.cookie = `trac_portal_source=${workspaceId};path=/;max-age=600;samesite=lax`
        }
    }, [workspaceId])

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true)
        setError('')

        const siteUrl = window.location.origin
        const onSub = isPortalSubdomain()
        const nextPath = onSub ? '/' : `/join/${workspaceSlug}`

        const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${siteUrl}/auth/callback?role=seller&next=${nextPath}`,
                queryParams: { access_type: 'offline', prompt: 'consent' },
            },
        })

        if (err) { setError(err.message); setGoogleLoading(false) }
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (name.length < 2) { setError(t('errorNameMin')); setLoading(false); return }
        if (password.length < 6) { setError(t('errorPasswordMin')); setLoading(false); return }

        const siteUrl = window.location.origin
        const onSub = isPortalSubdomain()
        const nextPath = onSub ? '/' : `/join/${workspaceSlug}`
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=${nextPath}`

        const { error: err } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: 'seller' },
                emailRedirectTo: redirectUrl,
            },
        })

        if (err) { setError(err.message); setLoading(false); return }
        setConfirmationSent(true)
        setLoading(false)
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error: err } = await supabase.auth.signInWithPassword({ email, password })

        if (err) { setError(err.message); setLoading(false); return }
        window.location.reload()
    }

    const handleResend = async () => {
        setResendLoading(true)
        const siteUrl = window.location.origin
        const onSub = isPortalSubdomain()
        const nextPath = onSub ? '/' : `/join/${workspaceSlug}`
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=${nextPath}`
        await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: redirectUrl },
        })
        setResendLoading(false)
    }

    if (confirmationSent) {
        return (
            <div className="text-center py-6">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('checkEmail')}</h2>
                <p className="text-sm text-gray-500 mb-6">
                    {t('confirmationSent', { email })}
                </p>
                <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="text-sm font-medium disabled:opacity-50"
                    style={{ color: primaryColor }}
                >
                    {resendLoading ? t('resending') : t('resendEmail')}
                </button>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                    {authMode === 'signup' ? t('createAccount') : t('signIn')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    {authMode === 'signup' ? t('signUpDesc') : t('signInDesc')}
                </p>
            </div>

            {/* Google OAuth */}
            <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all disabled:opacity-50 hover:border-gray-300 hover:bg-gray-50"
            >
                {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        <GoogleIcon className="w-5 h-5" />
                        {t('googleSignIn')}
                    </>
                )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{t('orEmail')}</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={authMode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
                {authMode === 'signup' && (
                    <input
                        type="text"
                        placeholder={t('namePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
                        required
                    />
                )}
                <input
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
                    required
                />
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-10"
                        style={{ '--tw-ring-color': `${primaryColor}33` } as React.CSSProperties}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                {error && <p className="text-xs text-red-500 px-1">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        authMode === 'signup' ? t('signUpButton') : t('signInButton')
                    )}
                </button>
            </form>

            <div className="mt-4 text-center">
                <button
                    onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError('') }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    {authMode === 'signup' ? t('alreadyHaveAccount') : t('noAccount')}
                </button>
            </div>
        </div>
    )
}
