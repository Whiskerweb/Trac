'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Building2, Users } from 'lucide-react'

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [role, setRole] = useState<'startup' | 'partner'>('startup')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError('')

        try {
            const result = mode === 'login'
                ? await login(formData)
                : await signup(formData)

            if (result?.error) {
                setError(result.error)
            }
        } catch (err) {
            setError('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Trac
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        {mode === 'login'
                            ? (role === 'startup' ? 'Connexion Startup' : 'Espace Partenaire')
                            : (role === 'startup' ? 'Lancer votre Startup' : 'Devenir Partenaire')
                        }
                    </p>
                </div>

                {/* Role Switcher */}
                <div className="flex bg-zinc-900/50 p-1 rounded-lg mb-6 relative">
                    <div
                        className={`absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800 rounded-md transition-all duration-300 ease-out shadow-sm ${role === 'partner' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setRole('startup')}
                        className={`relative flex-1 py-2.5 text-sm font-medium transition-colors z-10 flex items-center justify-center gap-2 ${role === 'startup' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        Startup
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('partner')}
                        className={`relative flex-1 py-2.5 text-sm font-medium transition-colors z-10 flex items-center justify-center gap-2 ${role === 'partner' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Partenaire
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex mb-6 bg-zinc-900 rounded-lg p-1">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'login'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Se connecter
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${mode === 'signup'
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        Créer un compte
                    </button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <form action={handleSubmit} className="space-y-4">
                        <input type="hidden" name="role" value={role} />
                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required={mode === 'signup'}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                minLength={6}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                            {mode === 'signup' && (
                                <p className="text-xs text-zinc-500 mt-1">Minimum 6 characters</p>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                        >
                            {loading
                                ? 'Chargement...'
                                : (mode === 'login' ? 'Se connecter' : 'Créer un compte')
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
