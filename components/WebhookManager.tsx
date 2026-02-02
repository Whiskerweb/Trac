'use client'

import { useState, useEffect } from 'react'
import {
    Webhook, Copy, Check, Loader2, Shield,
    ShieldCheck, ExternalLink, Eye, EyeOff
} from 'lucide-react'
import {
    getOrCreateWebhookEndpoint,
    getWebhookConfig,
    updateWebhookSecret
} from '@/app/actions/webhooks'

interface WebhookConfig {
    endpointId: string
    webhookUrl: string
    hasSecret: boolean
    description: string | null
    createdAt: Date
}

interface WebhookManagerProps {
    onStatusChange?: (configured: boolean) => void
}

export function WebhookManager({ onStatusChange }: WebhookManagerProps) {
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<WebhookConfig | null>(null)
    const [copied, setCopied] = useState(false)
    const [secret, setSecret] = useState('')
    const [showSecretInput, setShowSecretInput] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Load config on mount
    useEffect(() => {
        loadConfig()
    }, [])

    async function loadConfig() {
        setLoading(true)
        const result = await getWebhookConfig()
        if (result.success && result.config) {
            setConfig(result.config)
            onStatusChange?.(result.config.hasSecret)
        } else {
            onStatusChange?.(false)
        }
        setLoading(false)
    }

    async function handleCreate() {
        setCreating(true)
        setError(null)

        const result = await getOrCreateWebhookEndpoint()

        if (result.success && result.webhookUrl) {
            setConfig({
                endpointId: result.endpointId!,
                webhookUrl: result.webhookUrl,
                hasSecret: !!result.secret,
                description: 'Stripe Webhook',
                createdAt: new Date(),
            })
            setSuccess('Endpoint created! Configure it in Stripe.')
            setTimeout(() => setSuccess(null), 3000)
        } else {
            setError(result.error || 'Error during creation')
        }

        setCreating(false)
    }

    async function handleSaveSecret() {
        if (!secret.trim()) {
            setError('Veuillez entrer un secret')
            return
        }

        if (!secret.startsWith('whsec_')) {
            setError('Le secret doit commencer par whsec_')
            return
        }

        setSaving(true)
        setError(null)

        const result = await updateWebhookSecret(secret)

        if (result.success) {
            setConfig(prev => prev ? { ...prev, hasSecret: true } : null)
            setSecret('')
            setShowSecretInput(false)
            setSuccess('Secret saved successfully!')
            onStatusChange?.(true)
            setTimeout(() => setSuccess(null), 3000)
        } else {
            setError(result.error || 'Erreur lors de la sauvegarde')
        }

        setSaving(false)
    }

    async function handleCopy(text: string) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Loading state
    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Chargement...</span>
                </div>
            </div>
        )
    }

    // No webhook yet
    if (!config) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-purple-500">
                        <Webhook className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Configurer le Webhook Stripe
                        </h3>
                        <p className="text-slate-600 text-sm mb-4">
                            Create your unique endpoint to receive Stripe events.
                        </p>

                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Webhook className="w-4 h-4" />
                                    Generate my unique Webhook URL
                                </>
                            )}
                        </button>

                        {error && (
                            <p className="mt-3 text-sm text-red-600">{error}</p>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Webhook exists
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500">
                    <Webhook className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        Webhook Stripe
                    </h3>
                    <p className="text-slate-500 text-sm">
                        Endpoint ID: <span className="font-mono">{config.endpointId}</span>
                    </p>
                </div>
                {config.hasSecret ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                        <ShieldCheck className="w-4 h-4" />
                        Actif
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">
                        <Shield className="w-4 h-4" />
                        Not configured
                    </div>
                )}
            </div>

            {/* Success/Error Messages */}
            {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {success}
                </div>
            )}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Webhook URL */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                    URL du Webhook
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={config.webhookUrl}
                        readOnly
                        className="w-full px-4 py-3 pr-24 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-700"
                    />
                    <button
                        onClick={() => handleCopy(config.webhookUrl)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-md transition-colors flex items-center gap-1.5 text-sm"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-green-600" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copier
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Instructions - Stripe Connect Multi-Tenant Tutorial */}
            <div className="space-y-4">
                {/* Info Alert - V2 Requirement */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-blue-800 font-semibold text-sm">Configuration Multi-Tenant requise</p>
                        <p className="text-blue-700 text-sm mt-1">
                            You must select <strong>&quot;Connected accounts and v2&quot;</strong> to allow Traaaction to track sales in an isolated and secure way.
                        </p>
                    </div>
                </div>

                {/* Step by Step Tutorial */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        Webhook Creation
                    </h4>
                    <p className="text-sm text-slate-600 ml-8">
                        Rendez-vous dans votre{' '}
                        <a
                            href="https://dashboard.stripe.com/developers/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                        >
                            Stripe Dashboard (Developers → Webhooks)
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        {' '}et cliquez sur <strong>&quot;Ajouter une destination&quot;</strong>.
                    </p>

                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 pt-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        The strategic choice (V2)
                    </h4>
                    <div className="ml-8 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Select &quot;Connected accounts and v2&quot;
                        </p>
                        <p className="text-amber-700 text-xs mt-1 ml-6">
                            This allows Traaaction to track sales from all your customers in an isolated way via our Stripe Connect infrastructure.
                        </p>
                    </div>

                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 pt-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        Event Selection
                    </h4>
                    <div className="ml-8 space-y-2">
                        <p className="text-sm text-slate-600 mb-3">Select these 3 essential events:</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                                <div className="w-5 h-5 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <code className="text-sm font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">checkout.session.completed</code>
                                <span className="text-xs text-slate-500">Attribution initiale</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                                <div className="w-5 h-5 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <code className="text-sm font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">invoice.paid</code>
                                <span className="text-xs text-slate-500">Recurring subscriptions</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                                <div className="w-5 h-5 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-600" />
                                </div>
                                <code className="text-sm font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded">charge.refunded</code>
                                <span className="text-xs text-slate-500">Remboursements / Clawbacks</span>
                            </div>
                        </div>
                    </div>

                    <h4 className="font-semibold text-slate-900 flex items-center gap-2 pt-2">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        Validation
                    </h4>
                    <p className="text-sm text-slate-600 ml-8">
                        Copiez le <strong>Signing Secret</strong> (whsec_...) et collez-le ci-dessous.
                    </p>
                    <div className="ml-8 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            Le <code className="bg-green-100 px-1 rounded">click_id</code> sera automatiquement extrait du champ <code className="bg-green-100 px-1 rounded">client_reference_id</code>. No additional configuration required.
                        </p>
                    </div>
                </div>
            </div>

            {/* Secret Configuration */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                        Secret de Signature
                    </label>
                    {config.hasSecret && !showSecretInput && (
                        <button
                            onClick={() => setShowSecretInput(true)}
                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                            Modifier
                        </button>
                    )}
                </div>

                {config.hasSecret && !showSecretInput ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 text-sm font-medium">
                            Active & secure secret
                        </span>
                        <span className="font-mono text-green-600 text-sm">whsec_••••••••••••</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="whsec_..."
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSaveSecret}
                                disabled={saving || !secret.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sauvegarde...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4" />
                                        Sauvegarder
                                    </>
                                )}
                            </button>
                            {showSecretInput && config.hasSecret && (
                                <button
                                    onClick={() => {
                                        setShowSecretInput(false)
                                        setSecret('')
                                        setError(null)
                                    }}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                                >
                                    Annuler
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
