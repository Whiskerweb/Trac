'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface PortalAuthFormProps {
    workspaceSlug: string
    primaryColor: string
}

export default function PortalAuthForm({ workspaceSlug, primaryColor }: PortalAuthFormProps) {
    const t = useTranslations('portal')

    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [confirmationSent, setConfirmationSent] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)

    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (name.length < 2) { setError(t('errorNameMin')); setLoading(false); return }
        if (password.length < 6) { setError(t('errorPasswordMin')); setLoading(false); return }

        const siteUrl = window.location.origin
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}`

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
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}`
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
