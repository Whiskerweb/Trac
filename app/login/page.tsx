'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import Link from 'next/link'
import { ArrowRight, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [role, setRole] = useState<'startup' | 'partner'>('startup')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError('')

        try {
            // Append role to formData since we removed the hidden input or need to ensure it's correct
            formData.set('role', role)

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

    const isStartup = role === 'startup';

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100 z-50"
            >
                <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="w-full max-w-sm relative z-10">
                {/* Logo */}
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center justify-center w-12 h-12 bg-black text-white rounded-xl font-bold text-xl shadow-lg mb-6">
                        T
                    </Link>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">
                        {mode === 'login'
                            ? (isStartup ? 'Log in to Traaaction' : 'Partner Login')
                            : (isStartup ? 'Create your Traaaction account' : 'Become a Partner')
                        }
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {mode === 'login'
                            ? (isStartup
                                ? 'Welcome back. Log in to your startup dashboard.'
                                : 'Welcome back. Log in to your partner dashboard.')
                            : (isStartup
                                ? 'Start growing your business with intelligent partnerships.'
                                : 'Join the ecosystem and start earning commissions.')
                        }
                    </p>
                </div>

                {/* Form */}
                <form action={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required={mode === 'signup'}
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                            placeholder="panic@thedis.co"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wider">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            required
                            minLength={6}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-slate-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-gray-200/50 flex items-center justify-center group"
                    >
                        {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
                        {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                    </button>

                    {/* Toggle Login/Signup */}
                    <div className="pt-2 text-center">
                        <p className="text-sm text-gray-500">
                            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                className="text-black font-medium hover:underline"
                            >
                                {mode === 'login' ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    </div>
                </form>

                {/* Partner/Startup Link Box */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 text-center">
                        <p className="text-sm text-gray-500 mb-1">
                            {mode === 'login'
                                ? (isStartup ? "Looking for your Partner account?" : "Looking for your Startup account?")
                                : (isStartup ? "Looking to create a Partner account?" : "Looking to create a Startup account?")
                            }
                        </p>
                        <button
                            type="button"
                            onClick={() => setRole(isStartup ? 'partner' : 'startup')}
                            className="text-sm font-semibold text-slate-900 hover:text-black hover:underline transition-colors"
                        >
                            {mode === 'login'
                                ? (isStartup ? "Sign in to Partner Dashboard" : "Sign in to Startup Dashboard")
                                : (isStartup ? "Sign up as a Partner" : "Sign up as a Startup")
                            }
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        By continuing, you agree to Traaaction's <Link href="/terms" className="underline hover:text-gray-500">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-gray-500">Privacy Policy</Link>.
                    </p>
                </div>
            </div>
        </div>
    )
}
