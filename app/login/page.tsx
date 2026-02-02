'use client'

import { useState, useEffect } from 'react'
import { login, signup } from './actions'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, Users, Loader2, Eye, EyeOff } from 'lucide-react'

type UserType = 'startup' | 'seller' | null
type Mode = 'login' | 'signup'

export default function LoginPage() {
    const [userType, setUserType] = useState<UserType>(null)
    const [mode, setMode] = useState<Mode>('login')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    async function handleSubmit(formData: FormData) {
        if (!userType) return

        setLoading(true)
        setError('')

        try {
            formData.set('role', userType)

            const result = mode === 'login'
                ? await login(formData)
                : await signup(formData)

            if (result?.error) {
                setError(result.error)
            }
        } catch {
            setError('Une erreur inattendue est survenue')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        if (userType) {
            setUserType(null)
            setError('')
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
                        {userType ? (
                            <motion.button
                                key="back"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                onClick={handleBack}
                                className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Retour</span>
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
                            Accueil
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 pt-20 pb-12">
                <AnimatePresence mode="wait">
                    {!userType ? (
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
                                    Bienvenue sur Traaaction
                                </h1>
                                <p className="text-lg text-neutral-500 max-w-md mx-auto">
                                    Choisissez votre espace pour continuer
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
                                        Créez et gérez vos programmes d&apos;affiliation. Suivez vos conversions et payez vos sellers.
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
                                        Rejoignez des programmes et gagnez des commissions. Suivez vos gains en temps réel.
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
                            <div className="text-center mb-10">
                                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${userType === 'startup' ? 'bg-neutral-900' : 'bg-neutral-900'}`}>
                                    {userType === 'startup' ? (
                                        <Building2 className="w-7 h-7 text-white" />
                                    ) : (
                                        <Users className="w-7 h-7 text-white" />
                                    )}
                                </div>

                                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                                    {mode === 'login' ? 'Connexion' : 'Créer un compte'}
                                </h1>
                                <p className="text-neutral-500 text-sm">
                                    {mode === 'login'
                                        ? `Accédez à votre espace ${userType === 'startup' ? 'Startup' : 'Seller'}`
                                        : `Rejoignez Traaaction en tant que ${userType === 'startup' ? 'Startup' : 'Seller'}`
                                    }
                                </p>
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
                                                Nom complet
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required={mode === 'signup'}
                                                autoComplete="name"
                                                className="w-full h-12 bg-white border border-neutral-200 rounded-xl px-4 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 transition-all"
                                                placeholder="Jean Dupont"
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
                                        placeholder="vous@exemple.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                                        Mot de passe
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
                                            Minimum 6 caractères
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
                                    className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-6"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Toggle Login/Signup */}
                            <div className="mt-8 text-center">
                                <p className="text-sm text-neutral-500">
                                    {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMode(mode === 'login' ? 'signup' : 'login')
                                            setError('')
                                        }}
                                        className="text-neutral-900 font-medium hover:underline underline-offset-4"
                                    >
                                        {mode === 'login' ? "S'inscrire" : 'Se connecter'}
                                    </button>
                                </p>
                            </div>

                            {/* Legal */}
                            <p className="mt-8 text-center text-xs text-neutral-400 leading-relaxed">
                                En continuant, vous acceptez les{' '}
                                <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-600 transition-colors">
                                    Conditions d&apos;utilisation
                                </Link>{' '}
                                et la{' '}
                                <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-600 transition-colors">
                                    Politique de confidentialité
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
