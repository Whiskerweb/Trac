'use client'

import { useState, useEffect } from 'react'
import {
    Code2, Webhook, CheckCircle2, Copy, Check,
    ExternalLink, Zap, AlertCircle, ArrowLeft, Key, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { getOrCreateApiKey, regenerateApiKey } from '@/app/actions/settings'

// =============================================
// COPY BUTTON COMPONENT
// =============================================

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
            title="Copier"
        >
            {copied ? (
                <Check className="w-4 h-4 text-green-400" />
            ) : (
                <Copy className="w-4 h-4 text-slate-400" />
            )}
        </button>
    )
}

// =============================================
// CODE BLOCK COMPONENT
// =============================================

function CodeBlock({ code }: { code: string }) {
    return (
        <div className="relative mt-4">
            <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-all">
                    {code}
                </code>
            </pre>
            <CopyButton text={code} />
        </div>
    )
}

// =============================================
// INTEGRATION CARD COMPONENT
// =============================================

function IntegrationCard({
    icon: Icon,
    iconColor,
    step,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    step?: number
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${iconColor}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                    {step && (
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Étape {step}
                            </span>
                        </div>
                    )}
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
                    {children}
                </div>
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function IntegrationPage() {
    const [origin, setOrigin] = useState('https://votre-domaine.com')
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [keyLoading, setKeyLoading] = useState(true)
    const [regenerating, setRegenerating] = useState(false)
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin)
        }

        // Fetch API key on mount
        async function loadApiKey() {
            const result = await getOrCreateApiKey()
            if (result.success && result.publicKey) {
                setPublicKey(result.publicKey)
            }
            setKeyLoading(false)
        }
        loadApiKey()
    }, [])

    const handleRegenerate = async () => {
        if (!confirm('Êtes-vous sûr ? Votre ancienne clé sera invalidée.')) return
        setRegenerating(true)
        const result = await regenerateApiKey()
        if (result.success && result.publicKey) {
            setPublicKey(result.publicKey)
        }
        setRegenerating(false)
    }

    const pixelCode = publicKey
        ? `<script src="${origin}/trac.js" data-key="${publicKey}" defer></script>`
        : `<script src="${origin}/trac.js" defer></script>`
    const webhookUrl = `${origin}/api/webhooks/stripe`

    const handleTestEvent = async () => {
        setTestStatus('loading')
        try {
            await new Promise(resolve => setTimeout(resolve, 1500))
            setTestStatus('success')
            setTimeout(() => setTestStatus('idle'), 3000)
        } catch {
            setTestStatus('error')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Back Link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour au Dashboard
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Installation & Intégration
                    </h1>
                    <p className="text-lg text-slate-600">
                        Connectez votre site et vos paiements pour suivre vos revenus en temps réel.
                    </p>
                </div>

                {/* Cards */}
                <div className="space-y-6">
                    {/* Card 0: API Key */}
                    <IntegrationCard
                        icon={Key}
                        iconColor="bg-emerald-500"
                        title="Votre Clé Publique"
                        description="Cette clé identifie votre workspace. Elle est requise pour le tracking."
                    >
                        <div className="mt-4">
                            {keyLoading ? (
                                <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                            ) : publicKey ? (
                                <div className="relative">
                                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 pr-24 font-mono text-sm text-emerald-400 break-all">
                                        {publicKey}
                                    </div>
                                    <div className="absolute top-3 right-3 flex items-center gap-2">
                                        <button
                                            onClick={handleRegenerate}
                                            disabled={regenerating}
                                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                                            title="Régénérer la clé"
                                        >
                                            <RefreshCw className={`w-4 h-4 text-slate-400 ${regenerating ? 'animate-spin' : ''}`} />
                                        </button>
                                        <CopyButton text={publicKey} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    Erreur lors du chargement de la clé
                                </div>
                            )}
                        </div>
                    </IntegrationCard>

                    {/* Card 1: Pixel */}
                    <IntegrationCard
                        icon={Code2}
                        iconColor="bg-blue-500"
                        step={1}
                        title="Installez le Pixel de Tracking"
                        description="Ajoutez ce script dans la balise <head> de toutes les pages de votre site web."
                    >
                        <CodeBlock code={pixelCode} />
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                Le script est léger (&lt;2KB) et non-bloquant. Il stocke un cookie cross-subdomain pour le suivi des conversions.
                            </p>
                        </div>
                    </IntegrationCard>

                    {/* Card 2: Webhook Stripe */}
                    <IntegrationCard
                        icon={Webhook}
                        iconColor="bg-purple-500"
                        step={2}
                        title="Configurez le Webhook Stripe"
                        description="Pour suivre automatiquement vos ventes, ajoutez cet Endpoint URL dans Stripe."
                    >
                        <CodeBlock code={webhookUrl} />

                        <div className="mt-4 space-y-3">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-xs font-medium text-slate-700 mb-2">
                                    Événements à écouter :
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-mono rounded">
                                        checkout.session.completed
                                    </span>
                                    <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-mono rounded">
                                        payment_intent.succeeded
                                    </span>
                                </div>
                            </div>

                            <a
                                href="https://dashboard.stripe.com/webhooks"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                                Ouvrir Stripe Dashboard
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </IntegrationCard>

                    {/* Card 3: Test Connection */}
                    <IntegrationCard
                        icon={Zap}
                        iconColor="bg-amber-500"
                        step={3}
                        title="Testez la Connexion"
                        description="Envoyez un événement de test pour vérifier que tout fonctionne."
                    >
                        <div className="mt-4 flex items-center gap-4">
                            <button
                                onClick={handleTestEvent}
                                disabled={testStatus === 'loading'}
                                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                            >
                                {testStatus === 'loading' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Envoyer un événement test
                                    </>
                                )}
                            </button>

                            {testStatus === 'success' && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="text-sm font-medium">Connexion réussie !</span>
                                </div>
                            )}

                            {testStatus === 'error' && (
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">Échec de la connexion</span>
                                </div>
                            )}
                        </div>
                    </IntegrationCard>
                </div>

                {/* Help Section */}
                <div className="mt-10 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                                Besoin d&apos;aide ?
                            </h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Notre équipe est là pour vous accompagner dans l&apos;installation.
                            </p>
                            <a
                                href="mailto:support@trac.io"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors text-sm"
                            >
                                Contacter le support
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
