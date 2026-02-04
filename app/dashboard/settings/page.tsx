'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Globe, ChevronDown, Check, Lock, LogOut, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { setLocale } from '@/app/actions/locale'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const

export default function SettingsPage() {
    const t = useTranslations('dashboard.settings')
    const tCommon = useTranslations('common')
    const router = useRouter()

    // Profile Data
    const [email, setEmail] = useState('')

    // Language
    const [currentLocale, setCurrentLocale] = useState<'en' | 'fr' | 'es'>('en')
    const [languageOpen, setLanguageOpen] = useState(false)

    // Password
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)

    // Logout
    const [loggingOut, setLoggingOut] = useState(false)

    useEffect(() => {
        const load = async () => {
            const auth = await fetch('/api/auth/me').then(r => r.json())
            if (auth.user) {
                setEmail(auth.user.email || '')
            }

            // Load current locale from cookie
            const localeCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('NEXT_LOCALE='))
                ?.split('=')[1] as 'en' | 'fr' | 'es' | undefined
            if (localeCookie && ['en', 'fr', 'es'].includes(localeCookie)) {
                setCurrentLocale(localeCookie)
            }
        }
        load()
    }, [])

    async function handleLanguageChange(locale: 'en' | 'fr' | 'es') {
        setCurrentLocale(locale)
        setLanguageOpen(false)
        await setLocale(locale)
        router.refresh()
    }

    async function handleChangePassword() {
        setPasswordError('')
        setPasswordSuccess(false)

        if (newPassword.length < 6) {
            setPasswordError(t('passwordTooShort'))
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('passwordMismatch'))
            return
        }

        setSavingPassword(true)
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) {
                setPasswordError(error.message)
            } else {
                setPasswordSuccess(true)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setShowPasswordForm(false)
                setTimeout(() => setPasswordSuccess(false), 3000)
            }
        } catch (e) {
            setPasswordError(t('passwordError'))
        }
        setSavingPassword(false)
    }

    async function handleLogout() {
        setLoggingOut(true)
        try {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
        } catch (e) {
            console.error('Logout error:', e)
            setLoggingOut(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">{t('title')}</h1>

            <div className="space-y-8">
                {/* Profile Section */}
                <section className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" />
                        {t('profile')}
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('emailAddress')}</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>
                </section>

                {/* Language Section */}
                <section className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-gray-500" />
                        {t('language')}
                    </h2>

                    <div className="relative">
                        <button
                            onClick={() => setLanguageOpen(!languageOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm hover:border-gray-400 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{LANGUAGES.find(l => l.code === currentLocale)?.flag}</span>
                                <span className="font-medium">{LANGUAGES.find(l => l.code === currentLocale)?.name}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {languageOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageChange(lang.code)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors ${
                                            currentLocale === lang.code ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                                        }`}
                                    >
                                        <span className="text-xl">{lang.flag}</span>
                                        <span className="font-medium">{lang.name}</span>
                                        {currentLocale === lang.code && (
                                            <Check className="w-4 h-4 ml-auto text-purple-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('languageHint')}</p>
                </section>

                {/* Password Section */}
                <section className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-gray-500" />
                        {t('password')}
                    </h2>

                    {passwordSuccess && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            {t('passwordChanged')}
                        </div>
                    )}

                    {!showPasswordForm ? (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            {t('changePassword')}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('newPassword')}</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{t('minChars', { count: 6 })}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('confirmPassword')}</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            {passwordError && (
                                <p className="text-sm text-red-600">{passwordError}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleChangePassword}
                                    disabled={savingPassword}
                                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-70 transition-all"
                                >
                                    {savingPassword ? tCommon('loading') : t('updatePassword')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPasswordForm(false)
                                        setNewPassword('')
                                        setConfirmPassword('')
                                        setPasswordError('')
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {tCommon('cancel')}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Logout Section */}
                <section className="bg-white border border-red-100 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <LogOut className="w-5 h-5 text-gray-500" />
                        {t('logout')}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">{t('logoutDesc')}</p>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-70 transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        {loggingOut ? tCommon('loading') : t('logoutButton')}
                    </button>
                </section>
            </div>
        </div>
    )
}
