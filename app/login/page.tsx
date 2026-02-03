'use client'

import { useState, useEffect } from 'react'
import { login, signup, resendConfirmationEmail } from './actions'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, Users, Loader2, Eye, EyeOff, Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type UserType = 'startup' | 'seller' | null
type Mode = 'login' | 'signup'
type ViewState = 'form' | 'confirmation-pending'

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

export default function LoginPage() {
    const [userType, setUserType] = useState<UserType>(null)
    const [mode, setMode] = useState<Mode>('login')
    const [viewState, setViewState] = useState<ViewState>('form')
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [confirmationEmail, setConfirmationEmail] = useState('')
    const [confirmationRole, setConfirmationRole] = useState<string>('startup')

    const supabase = createClient()

    useEffect(() => {
        setMounted(true)

        // Check for error in URL params (from auth callback)
        const params = new URLSearchParams(window.location.search)
        const urlError = params.get('error')
        const urlMessage = params.get('message')

        if (urlError) {
            let errorMessage = urlMessage || 'An error occurred during authentication'

            // Map error codes to user-friendly messages
            if (urlError === 'link_expired') {
                errorMessage = 'The confirmation link has expired. Please request a new one.'
            } else if (urlError === 'email_exists' || urlError === 'email_conflict') {
                errorMessage = 'An account with this email already exists. Please sign in instead.'
            } else if (urlError === 'no_code') {
                errorMessage = 'Invalid authentication link. Please try again.'
            } else if (urlError === 'seller_creation_failed') {
                errorMessage = urlMessage || 'Failed to create your seller account. Please try again.'
            }

            setError(errorMessage)

            // Clean up URL
            window.history.replaceState({}, '', '/login')
        }
    }, [])

    async function handleGoogleSignIn() {
        if (!userType) return

        setGoogleLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?role=${userType}`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            })

            if (error) {
                setError(error.message)
                setGoogleLoading(false)
            }
        } catch {
            setError('Failed to sign in with Google')
            setGoogleLoading(false)
        }
    }

    async function handleSubmit(formData: FormData) {
        if (!userType) return

        setLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            formData.set('role', userType)

            const result = mode === 'login'
                ? await login(formData)
                : await signup(formData)

            if (result?.error) {
                setError(result.error)
            } else if (result && 'confirmationRequired' in result && result.confirmationRequired) {
                // Email confirmation is required - show confirmation pending view
                setConfirmationEmail(result.email || '')
                setConfirmationRole(result.role || userType)
                setViewState('confirmation-pending')
            }
        } catch {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    async function handleResendConfirmation() {
        if (!confirmationEmail) return

        setResendLoading(true)
        setError('')
        setSuccessMessage('')

        try {
            const result = await resendConfirmationEmail(confirmationEmail, confirmationRole)

            if (result.error) {
                setError(result.error)
            } else {
                setSuccessMessage('Confirmation email sent! Please check your inbox.')
            }
        } catch {
            setError('Failed to resend confirmation email')
        } finally {
            setResendLoading(false)
        }
    }

    const handleBack = () => {
        if (viewState === 'confirmation-pending') {
            setViewState('form')
            setError('')
            setSuccessMessage('')
        } else if (userType) {
            setUserType(null)
            setError('')
            setSuccessMessage('')
        }
    }

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <AnimatePresence mode="wait">
                        {userType || viewState === 'confirmation-pending' ? (
                            <motion.button
                                key="back"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={handleBack}
                                className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </motion.button>
                        ) : (
                            <motion.div
                                key="logo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <Link href="/" className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        T
                                    </div>
                                    <span className="font-semibold text-neutral-900 tracking-tight">Traaaction</span>
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!userType && (
                        <Link
                            href="/"
                            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            Home
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 pt-20 pb-12">
                <AnimatePresence mode="wait">
                    {viewState === 'confirmation-pending' ? (
                        /* Email Confirmation Pending View */
                        <motion.div
                            key="confirmation"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="w-full max-w-[420px] text-center"
                        >
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-10 h-10 text-green-600" />
                            </div>

                            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-3">
                                Check your email
                            </h1>
                            <p className="text-neutral-500 mb-2">
                                We sent a confirmation link to
                            </p>
                            <p className="text-neutral-900 font-medium mb-6">
                                {confirmationEmail}
                            </p>

                            <div className="bg-neutral-100 rounded-xl p-4 mb-6">
                                <p className="text-sm text-neutral-600">
                                    Click the link in your email to verify your account and complete your registration.
                                </p>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 mb-4"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-600 mb-4 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {successMessage}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={handleResendConfirmation}
                                disabled={resendLoading}
                                className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                {resendLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Resend confirmation email'
                                )}
                            </button>

                            <p className="mt-6 text-sm text-neutral-400">
                                Did not receive the email? Check your spam folder or try another email address.
                            </p>

                            <button
                                onClick={() => {
                                    setViewState('form')
                                    setError('')
                                    setSuccessMessage('')
                                }}
                                className="mt-4 text-sm text-neutral-600 hover:text-neutral-900 font-medium"
                            >
                                Use a different email
                            </button>
                        </motion.div>
                    ) : !userType ? (
                        /* User Type Selection */
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="w-full max-w-3xl"
                        >
                            <div className="text-center mb-14">
                                <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 tracking-tight mb-4">
                                    Welcome to Traaaction
                                </h1>
                                <p className="text-lg text-neutral-500 max-w-md mx-auto">
                                    Choose your space to continue
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Startup Card */}
                                <motion.button
                                    onClick={() => setUserType('startup')}
                                    className="group relative bg-white rounded-2xl p-8 text-left border border-neutral-200/60 hover:border-neutral-300 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50"
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
                                        Startup
                                    </h2>
                                    <p className="text-neutral-500 text-sm leading-relaxed">
                                        Create and manage your affiliate programs. Track conversions and pay your sellers.
                                    </p>

                                    <div className="mt-6 pt-6 border-t border-neutral-100">
                                        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                            Dashboard Startup
                                        </span>
                                    </div>
                                </motion.button>

                                {/* Seller Card */}
                                <motion.button
                                    onClick={() => setUserType('seller')}
                                    className="group relative bg-white rounded-2xl p-8 text-left border border-neutral-200/60 hover:border-neutral-300 transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50"
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
                                        Seller
                                    </h2>
                                    <p className="text-neutral-500 text-sm leading-relaxed">
                                        Join programs and earn commissions. Track your earnings in real-time.
                                    </p>

                                    <div className="mt-6 pt-6 border-t border-neutral-100">
                                        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                            Dashboard Seller
                                        </span>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    ) : (
                        /* Login/Signup Form */
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="w-full max-w-[380px]"
                        >
                            {/* Form Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 bg-neutral-900">
                                    {userType === 'startup' ? (
                                        <Building2 className="w-7 h-7 text-white" />
                                    ) : (
                                        <Users className="w-7 h-7 text-white" />
                                    )}
                                </div>

                                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                                    {mode === 'login' ? 'Sign in' : 'Create account'}
                                </h1>
                                <p className="text-neutral-500 text-sm">
                                    {mode === 'login'
                                        ? `Access your ${userType === 'startup' ? 'Startup' : 'Seller'} dashboard`
                                        : `Join Traaaction as a ${userType === 'startup' ? 'Startup' : 'Seller'}`
                                    }
                                </p>
                            </div>

                            {/* Google Sign In Button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={googleLoading}
                                className="w-full h-12 bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 text-neutral-700 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                {googleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <GoogleIcon className="w-5 h-5" />
                                        Continue with Google
                                    </>
                                )}
                            </button>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-neutral-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#FAFAFA] px-3 text-neutral-400">or continue with email</span>
                                </div>
                            </div>

                            {/* Form */}
                            <form action={handleSubmit} className="space-y-4">
                                <AnimatePresence mode="wait">
                                    {mode === 'signup' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                                                Full name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required={mode === 'signup'}
                                                autoComplete="name"
                                                className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                                placeholder="John Doe"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        autoComplete="email"
                                        className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            required
                                            minLength={6}
                                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                            className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 pr-12 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {mode === 'signup' && (
                                        <p className="mt-1.5 text-xs text-neutral-400">
                                            Minimum 6 characters
                                        </p>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600"
                                        >
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' ? 'Sign in' : 'Create account'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Toggle Login/Signup */}
                            <div className="mt-6 text-center">
                                <p className="text-sm text-neutral-500">
                                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode(mode === 'login' ? 'signup' : 'login')
                                            setError('')
                                        }}
                                        className="text-neutral-900 font-medium hover:underline underline-offset-4"
                                    >
                                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                                    </button>
                                </p>
                            </div>

                            {/* Legal */}
                            <p className="mt-6 text-center text-xs text-neutral-400 leading-relaxed">
                                By continuing, you agree to the{' '}
                                <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-600 transition-colors">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-600 transition-colors">
                                    Privacy Policy
                                </Link>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Subtle Background Pattern */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-neutral-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neutral-200/20 rounded-full blur-3xl" />
            </div>
        </div>
    )
}
