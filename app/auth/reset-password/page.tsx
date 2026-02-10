'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react'
import { updatePassword } from '@/app/login/actions'
import { useTranslations } from 'next-intl'

export default function ResetPasswordPage() {
    const t = useTranslations('auth')
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError(t('errors.passwordTooShort'))
            return
        }

        if (password !== confirmPassword) {
            setError(t('resetPassword.mismatch'))
            return
        }

        setLoading(true)

        try {
            const result = await updatePassword(password)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                // Redirect to login after short delay
                setTimeout(() => {
                    router.push('/login?success=password_updated')
                }, 2000)
            }
        } catch {
            setError(t('errors.unexpected'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/login" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        <span>{t('back')}</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2.5">
                        <Image
                            src="/Logotrac/Logo5.png"
                            alt="Traaaction"
                            width={28}
                            height={28}
                            className="rounded-lg"
                        />
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center px-6 pt-20 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full max-w-[380px]"
                >
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-3">
                                    {t('resetPassword.successTitle')}
                                </h1>
                                <p className="text-neutral-500 mb-6">
                                    {t('resetPassword.successSubtitle')}
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('resetPassword.redirecting')}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="form">
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <KeyRound className="w-8 h-8 text-neutral-600" />
                                    </div>
                                    <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                                        {t('resetPassword.title')}
                                    </h1>
                                    <p className="text-neutral-500 text-sm">
                                        {t('resetPassword.subtitle')}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-medium text-neutral-700 mb-2">
                                            {t('resetPassword.newPassword')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="new-password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                autoComplete="new-password"
                                                autoFocus
                                                className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 pr-12 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        <p className="mt-1.5 text-xs text-neutral-400">
                                            {t('signup.minChars', { count: 6 })}
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="confirm-password" className="block text-sm font-medium text-neutral-700 mb-2">
                                            {t('resetPassword.confirmPassword')}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                id="confirm-password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                autoComplete="new-password"
                                                className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 pr-12 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                            >
                                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
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
                                                {t('resetPassword.submit')}
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </main>

            {/* Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-neutral-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neutral-200/20 rounded-full blur-3xl" />
            </div>
        </div>
    )
}
