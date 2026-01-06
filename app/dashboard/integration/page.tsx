'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Code2, Webhook, CheckCircle2, Copy, Check,
    ExternalLink, Zap, AlertCircle, Key, RefreshCw,
    Play, Terminal, Loader2, XCircle, Clock, Building2, Eye, EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { getOrCreateApiKey, regenerateApiKey } from '@/app/actions/settings'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { WebhookManager } from '@/components/WebhookManager'

// =============================================
// TYPES
// =============================================

interface InstallationStatus {
    installed: boolean
    eventCount: number
    lastEventAt: string | null
    status: 'connected' | 'waiting' | 'no_workspace' | 'error' | 'no_tinybird_token' | 'query_failed'
}

// =============================================
// COPY BUTTON COMPONENT
// =============================================

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className={`p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-all ${className}`}
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

function CodeBlock({ code, language = 'html' }: { code: string; language?: string }) {
    return (
        <div className="relative mt-4 group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={code} />
            </div>
            <pre className="bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm text-slate-300 font-mono whitespace-pre">
                    {code}
                </code>
            </pre>
        </div>
    )
}

// =============================================
// STEP CARD WITH SUCCESS INDICATOR
// =============================================

function StepCard({
    icon: Icon,
    iconColor,
    step,
    title,
    description,
    isComplete,
    isLoading,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>
    iconColor: string
    step: number
    title: string
    description: string
    isComplete: boolean
    isLoading?: boolean
    children: React.ReactNode
}) {
    return (
        <div className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
            }`}>
            <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="relative">
                    <div className={`p-3 rounded-xl ${iconColor}`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {isComplete && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                            <Loader2 className="w-3 h-3 text-white animate-spin" />
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isComplete
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                            }`}>
                            ÉTAPE {step}
                        </span>
                        {isComplete && (
                            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Configuré
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">{description}</p>
                    {children}
                </div>
            </div>
        </div>
    )
}

// =============================================
// INSTALLATION STATUS COMPONENT
// =============================================

function InstallationChecker({
    status,
    isPolling,
    onRefresh
}: {
    status: InstallationStatus | null
    isPolling: boolean
    onRefresh: () => void
}) {
    if (!status) {
        return (
            <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-600">Vérification de l&apos;installation...</span>
            </div>
        )
    }

    if (status.installed) {
        return (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold text-emerald-800">SDK Connecté !</span>
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={isPolling}
                        className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-emerald-600 ${isPolling ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Events Reçus</p>
                        <p className="text-2xl font-bold text-emerald-800">{status.eventCount}</p>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3">
                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Dernier Event</p>
                        <p className="text-sm font-medium text-emerald-800">
                            {status.lastEventAt
                                ? new Date(status.lastEventAt).toLocaleString('fr-FR')
                                : 'N/A'
                            }
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span className="font-semibold text-amber-800">En attente du premier event...</span>
                </div>
                {isPolling && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Polling...
                    </span>
                )}
            </div>
            <p className="text-sm text-amber-700">
                Installez le SDK sur votre site et cette section se mettra à jour automatiquement.
            </p>
        </div>
    )
}

// =============================================
// SIMULATOR CONSOLE
// =============================================

function SimulatorConsole() {
    const [logs, setLogs] = useState<Array<{ type: 'info' | 'success' | 'error'; message: string; time: string }>>([])
    const [isRunning, setIsRunning] = useState(false)

    const addLog = (type: 'info' | 'success' | 'error', message: string) => {
        setLogs(prev => [...prev, {
            type,
            message,
            time: new Date().toLocaleTimeString('fr-FR')
        }])
    }

    const simulateClick = async () => {
        setIsRunning(true)
        addLog('info', 'Démarrage de la simulation de clic...')

        try {
            // Check if Trac is available
            if (typeof window !== 'undefined' && (window as any).Trac) {
                const clickId = (window as any).Trac.getClickId()
                if (clickId) {
                    addLog('success', `Click ID existant trouvé: ${clickId}`)
                } else {
                    // Generate new click
                    const newClickId = (window as any).TracUtils?.generateClickId() || `clk_${Date.now()}_test`
                    addLog('success', `Nouveau Click ID généré: ${newClickId}`)
                }
            } else {
                // SDK not loaded - simulate manually
                const testClickId = `clk_${Math.floor(Date.now() / 1000)}_${Math.random().toString(16).slice(2, 18)}`
                addLog('info', `SDK non chargé. Click ID de test: ${testClickId}`)

                // Try to send to server
                const res = await fetch('/_trac/api/track/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ click_id: testClickId }),
                    credentials: 'include'
                })

                if (res.ok) {
                    addLog('success', 'Event envoyé au serveur avec succès ✓')
                } else {
                    addLog('error', `Erreur serveur: ${res.status}`)
                }
            }
        } catch (err: any) {
            addLog('error', `Erreur: ${err.message}`)
        }

        setIsRunning(false)
    }

    const simulateSale = async () => {
        setIsRunning(true)
        addLog('info', 'Démarrage de la simulation de vente...')

        try {
            if (typeof window !== 'undefined' && (window as any).Trac?.recordSale) {
                await (window as any).Trac.recordSale({
                    amount: 9900,
                    currency: 'EUR',
                    orderId: `test_${Date.now()}`
                })
                addLog('success', 'Vente enregistrée via SDK ✓')
            } else {
                // Try API directly
                const res = await fetch('/_trac/api/conversions/sale', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        click_id: `clk_test_${Date.now()}`,
                        amount: 9900,
                        currency: 'EUR'
                    })
                })

                if (res.ok) {
                    addLog('success', 'Vente de test envoyée au serveur ✓')
                } else {
                    const data = await res.json().catch(() => ({}))
                    addLog('error', `Erreur: ${data.error || res.status}`)
                }
            }
        } catch (err: any) {
            addLog('error', `Erreur: ${err.message}`)
        }

        setIsRunning(false)
    }

    const clearLogs = () => setLogs([])

    return (
        <div className="mt-4">
            {/* Buttons */}
            <div className="flex gap-3 mb-4">
                <button
                    onClick={simulateClick}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
                >
                    <Play className="w-4 h-4" />
                    Simuler un Clic
                </button>
                <button
                    onClick={simulateSale}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-xl transition-colors"
                >
                    <Zap className="w-4 h-4" />
                    Simuler une Vente
                </button>
                {logs.length > 0 && (
                    <button
                        onClick={clearLogs}
                        className="px-3 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Effacer
                    </button>
                )}
            </div>

            {/* Console Output */}
            {logs.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm max-h-48 overflow-y-auto">
                    {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1">
                            <span className="text-slate-500 text-xs">{log.time}</span>
                            <span className={
                                log.type === 'success' ? 'text-emerald-400' :
                                    log.type === 'error' ? 'text-red-400' :
                                        'text-slate-400'
                            }>
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function SetupDiagnosticsPage() {
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [workspaceName, setWorkspaceName] = useState<string>('')
    const [customDomain, setCustomDomain] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [regenerating, setRegenerating] = useState(false)
    const [hasWebhooks, setHasWebhooks] = useState(false)

    // Installation status
    const [installStatus, setInstallStatus] = useState<InstallationStatus | null>(null)
    const [isPolling, setIsPolling] = useState(false)

    // Load API keys on mount
    useEffect(() => {
        async function loadData() {
            // Load API keys
            const keyResult = await getOrCreateApiKey()
            if (keyResult.success) {
                setPublicKey(keyResult.publicKey || null)
                setWorkspaceName(keyResult.workspaceName || '')
                if (keyResult.secretKey) {
                    setSecretKey(keyResult.secretKey)
                }
            }

            // Load verified domain
            const domainResult = await getVerifiedDomainForWorkspace()
            if (domainResult.success && domainResult.domain) {
                setCustomDomain(domainResult.domain)
            }

            setLoading(false)
        }
        loadData()
    }, [])

    // Poll installation status
    const checkInstallation = useCallback(async () => {
        setIsPolling(true)
        try {
            const res = await fetch('/api/stats/check-installation')
            if (res.ok) {
                const data = await res.json()
                setInstallStatus(data)
            }
        } catch (err) {
            console.error('Failed to check installation:', err)
        }
        setIsPolling(false)
    }, [])

    useEffect(() => {
        checkInstallation()
        const interval = setInterval(checkInstallation, 10000) // Poll every 10s
        return () => clearInterval(interval)
    }, [checkInstallation])

    // Handle key regeneration
    const handleRegenerate = async () => {
        if (!confirm('Régénérer les clés ? L\'ancienne clé secrète sera invalidée.')) return

        setRegenerating(true)
        const result = await regenerateApiKey()

        if (result.success) {
            setPublicKey(result.publicKey || null)
            if (result.secretKey) {
                setSecretKey(result.secretKey)
                setShowSecret(true)
            }
        }
        setRegenerating(false)
    }

    // Build SDK code snippet (Dynamic based on custom domain)
    const sdkCode = publicKey ? (customDomain ? `<!-- Trac Analytics SDK (First-Party Mode) -->
<script 
  src="https://${customDomain}/trac.js" 
  data-key="${publicKey}"
  data-api-host="https://${customDomain}/_trac"
  defer
></script>` : `<!-- Trac Analytics SDK -->
<script>
  window.TracConfig = {
    apiKey: '${publicKey}',
    debug: false,
    autoInject: true
  };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://traaaction.com'}/trac.js" defer></script>`) : ''

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Chargement...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-slate-900">Setup & Diagnostics</h1>
                                {workspaceName && (
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4" />
                                        {workspaceName}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600">
                                Configurez votre tracking et vérifiez que tout fonctionne correctement.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            ← Retour
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="space-y-6">

                    {/* STEP 1: SDK Installation */}
                    <StepCard
                        icon={Code2}
                        iconColor="bg-blue-500"
                        step={1}
                        title="Installer le SDK"
                        description="Ajoutez ce snippet dans le <head> de votre site pour commencer le tracking."
                        isComplete={installStatus?.installed || false}
                        isLoading={isPolling && !installStatus?.installed}
                    >
                        {customDomain ? (
                            <div className="mb-3 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
                                <Zap className="w-4 h-4 text-purple-600 fill-current" />
                                <span className="text-sm font-medium text-purple-900">
                                    Mode First-Party activé via <span className="font-bold">{customDomain}</span>
                                </span>
                            </div>
                        ) : (
                            <div className="mb-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800">Mode Standard</p>
                                        <p className="text-sm text-amber-700 mt-0.5">
                                            Pour un tracking 100% anti-adblock et une meilleure résilience ITP, configurez un domaine personnalisé dans{' '}
                                            <Link href="/dashboard/domains" className="underline font-medium hover:text-amber-900">
                                                Paramètres → Domaines
                                            </Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <CodeBlock code={sdkCode} />

                        {/* Installation Status */}
                        <div className="mt-4">
                            <InstallationChecker
                                status={installStatus}
                                isPolling={isPolling}
                                onRefresh={checkInstallation}
                            />
                        </div>

                        {/* Simulator */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-slate-500" />
                                Console de Test
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                                Testez votre intégration en simulant des events directement depuis cette page.
                            </p>
                            <SimulatorConsole />
                        </div>
                    </StepCard>

                    {/* STEP 2: API Keys */}
                    <StepCard
                        icon={Key}
                        iconColor="bg-amber-500"
                        step={2}
                        title="Clés API"
                        description="Utilisez ces clés pour authentifier vos appels API côté serveur."
                        isComplete={!!publicKey}
                    >
                        <div className="space-y-4">
                            {/* Public Key */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                        Clé Publique
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        Pour le SDK côté client
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 font-mono text-sm text-slate-900 bg-white px-3 py-2 rounded-lg border border-slate-200">
                                        {publicKey}
                                    </code>
                                    <CopyButton text={publicKey || ''} className="bg-slate-200 hover:bg-slate-300" />
                                </div>
                            </div>

                            {/* Secret Key */}
                            {secretKey && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        <span className="text-sm font-semibold text-amber-800">
                                            Clé Secrète - Affichée une seule fois !
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 font-mono text-sm text-amber-900 bg-white px-3 py-2 rounded-lg border border-amber-300">
                                            {showSecret ? secretKey : '•'.repeat(40)}
                                        </code>
                                        <button
                                            onClick={() => setShowSecret(!showSecret)}
                                            className="p-2 rounded-lg bg-amber-200 hover:bg-amber-300 transition-colors"
                                        >
                                            {showSecret ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-amber-700" />}
                                        </button>
                                        <CopyButton text={secretKey} className="bg-amber-200 hover:bg-amber-300" />
                                    </div>
                                </div>
                            )}

                            {/* Regenerate Button */}
                            <button
                                onClick={handleRegenerate}
                                disabled={regenerating}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                                Régénérer les clés
                            </button>
                        </div>
                    </StepCard>

                    {/* STEP 3: Webhooks */}
                    <StepCard
                        icon={Webhook}
                        iconColor="bg-purple-500"
                        step={3}
                        title="Webhooks Stripe"
                        description="Configurez vos webhooks pour recevoir les événements de paiement automatiquement."
                        isComplete={hasWebhooks}
                    >
                        <WebhookManager onStatusChange={(configured) => setHasWebhooks(configured)} />
                    </StepCard>

                </div>
            </div>
        </div>
    )
}
