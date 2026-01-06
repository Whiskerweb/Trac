'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Loader2, AlertCircle, Sparkles, Key } from 'lucide-react'
import { createWorkspaceAction } from '@/app/actions/workspace'

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50)
}

export default function NewWorkspacePage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugTouched, setSlugTouched] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)

    const handleNameChange = (value: string) => {
        setName(value)
        if (!slugTouched) {
            setSlug(slugify(value))
        }
    }

    const handleSlugChange = (value: string) => {
        setSlugTouched(true)
        setSlug(slugify(value))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const result = await createWorkspaceAction(name.trim(), slug)

            if (!result.success) {
                setError(result.error || 'Failed to create workspace')
                setLoading(false)
                return
            }

            // Show secret key if returned
            if (result.secretKey) {
                setSecretKey(result.secretKey)
                setShowSuccess(true)
            } else {
                router.push('/dashboard')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    const handleContinue = () => {
        router.push('/dashboard')
    }

    const handleCopySecret = async () => {
        if (secretKey) {
            await navigator.clipboard.writeText(secretKey)
        }
    }

    // Success state with secret key
    if (showSuccess && secretKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="max-w-lg w-full">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                Workspace Created!
                            </h1>
                            <p className="text-slate-600">
                                Your workspace <strong>{name}</strong> is ready.
                            </p>
                        </div>

                        {/* Secret Key Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-amber-800 mb-1">
                                        Save your Secret API Key
                                    </h3>
                                    <p className="text-sm text-amber-700 mb-3">
                                        This key will only be shown <strong>once</strong>. Copy and store it securely.
                                    </p>
                                    <div className="bg-white border border-amber-300 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Key className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                                                Secret Key
                                            </span>
                                        </div>
                                        <code className="block text-sm font-mono text-slate-900 break-all">
                                            {secretKey}
                                        </code>
                                    </div>
                                    <button
                                        onClick={handleCopySecret}
                                        className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800 underline"
                                    >
                                        Copy to clipboard
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleContinue}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors"
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Creation form
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Back Link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                {/* Card */}
                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Create a Workspace
                        </h1>
                        <p className="text-slate-600">
                            Workspaces help you organize your links, analytics, and team members.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Workspace Name */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Workspace Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Acme Inc."
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label
                                htmlFor="slug"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Workspace URL
                            </label>
                            <div className="flex items-center">
                                <span className="px-4 py-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-slate-500 text-sm">
                                    trac.io/
                                </span>
                                <input
                                    type="text"
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="acme-inc"
                                    className="flex-1 px-4 py-3 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Only lowercase letters, numbers, and hyphens allowed.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !name.trim() || !slug}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Building2 className="w-5 h-5" />
                                    Create Workspace
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
