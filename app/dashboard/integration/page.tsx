'use client'

import { useState, useEffect } from 'react'
import {
    Code2, CheckCircle2, Copy, Check,
    Zap, AlertCircle, RefreshCw,
    Loader2, Eye, EyeOff, Building2,
    Globe, ShieldCheck, ExternalLink
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

function CopyButton({ text, label, className = '' }: { text: string; label?: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors text-sm ${className}`}
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            {label && <span className="text-gray-300">{copied ? 'Copié !' : label}</span>}
        </button>
    )
}

function CodeBlock({ code, language = 'html' }: { code: string; language?: string }) {
    return (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
                <span className="text-xs text-gray-500 uppercase font-mono">{language}</span>
                <CopyButton text={code} label="Copier" />
            </div>
            <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
    )
}

function StatusBadge({ status, children }: { status: 'success' | 'warning' | 'info' | 'loading'; children: React.ReactNode }) {
    const styles = {
        success: 'bg-green-50 border-green-200 text-green-700',
        warning: 'bg-amber-50 border-amber-200 text-amber-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700',
        loading: 'bg-gray-50 border-gray-200 text-gray-500'
    }
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${styles[status]}`}>
            {children}
        </div>
    )
}

export default function IntegrationPage() {
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [workspaceName, setWorkspaceName] = useState('')
    const [customDomain, setCustomDomain] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [installStatus, setInstallStatus] = useState<InstallationStatus | null>(null)

    useEffect(() => {
        async function init() {
            try {
                const [keys, domain, status] = await Promise.all([
                    getOrCreateApiKey(),
                    getVerifiedDomainForWorkspace(),
                    fetch('/api/stats/check-installation').then(r => r.json())
                ])
                if (keys.success) {
                    setPublicKey(keys.publicKey!)
                    setWorkspaceName(keys.workspaceName || '')
                    setSecretKey(keys.secretKey || null)
                }
                if (domain.success) setCustomDomain(domain.domain || null)
                if (status) setInstallStatus(status)
            } catch (e) {
                console.error(e)
            }
            setLoading(false)
        }
        init()
        const interval = setInterval(() => fetch('/api/stats/check-installation').then(r => r.json()).then(setInstallStatus), 5000)
        return () => clearInterval(interval)
    }, [])

    // Generate SDK snippets based on configuration
    // FIRST-PARTY: Requires reverse proxy setup on startup's site
    const firstPartySnippet = `<!-- Step 1: Add to next.config.js -->
module.exports = {
  async rewrites() {
    return [
      { source: "/_trac/script.js", destination: "https://traaaction.com/trac.js" },
      { source: "/_trac/api/:path*", destination: "https://traaaction.com/api/:path*" },
    ];
  },
};

<!-- Step 2: Add to your HTML <head> -->
<script 
  src="/_trac/script.js" 
  defer
  data-api-host="/_trac"
  data-domains='{"refer":"${customDomain || 'short.yourdomain.com'}"}'
  data-query-params='["via", "ref"]'
  data-attribution-model="first-click"
></script>`

    // THIRD-PARTY: Simpler but can be blocked by adblockers
    const thirdPartySnippet = `<!-- Option simple (peut être bloqué par adblockers) -->
<script 
  src="https://traaaction.com/trac.js" 
  defer
  data-domains='{"refer":"${customDomain || 'short.yourdomain.com'}"}'
  data-query-params='["via", "ref"]'
  data-attribution-model="first-click"
></script>`

    const reactBannerSnippet = `// Afficher la bannière de réduction partenaire
import { DiscountBanner } from '@/components/DiscountBanner'

function MyPage() {
  return (
    <div>
      <DiscountBanner />
      {/* Affiche: "John vous offre 25% de réduction" */}
    </div>
  )
}`

    const hookSnippet = `// Utiliser le hook pour accéder aux données partenaire
import { useTracAnalytics } from '@/lib/hooks/useTracAnalytics'

function MyComponent() {
  const { partner, discount } = useTracAnalytics()
  
  if (partner && discount) {
    console.log(partner.name, discount.amount)
  }
}`

    const vanillaJsSnippet = `// Usage sans React (vanilla JS)
tracAnalytics("ready", function() {
  if (Trac.partner && Trac.discount) {
    var banner = document.createElement("div");
    banner.innerHTML = Trac.partner.name + " vous offre " + 
      Trac.discount.amount + "% de réduction";
    document.body.prepend(banner);
  }
});`

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <Code2 className="w-6 h-6 text-gray-700" />
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intégration</h1>
                    {workspaceName && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{workspaceName}
                        </span>
                    )}
                </div>
                <p className="text-gray-500">Connecte ton site pour tracker les clics et conversions de tes partenaires.</p>
            </div>

            {/* Mode Indicator */}
            <div className="mb-8">
                {customDomain ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-green-800">Mode First-Party Activé ✓</h3>
                                <p className="text-green-600 text-sm">Ton domaine <code className="bg-green-100 px-1.5 py-0.5 rounded">{customDomain}</code> est configuré</p>
                            </div>
                        </div>
                        <p className="text-green-700 text-sm mt-2">
                            Le script sera servi depuis ton propre domaine. Aucun problème de CSP ou d'ad-blocker !
                        </p>
                    </div>
                ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Globe className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-800">Mode Third-Party</h3>
                                <p className="text-amber-600 text-sm">Le script est servi depuis traaaction.com</p>
                            </div>
                        </div>
                        <p className="text-amber-700 text-sm mt-2">
                            <Link href="/dashboard/domains" className="underline font-medium hover:text-amber-800">
                                Configure un domaine personnalisé
                            </Link> pour activer le mode First-Party et éviter les blocages CSP.
                        </p>
                    </div>
                )}
            </div>

            {/* Step 1: Install SDK */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${installStatus?.installed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                        }`}>
                        {installStatus?.installed ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Installe le SDK</h2>
                        <p className="text-sm text-gray-500">Ajoute ce code dans le <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> de ton site</p>
                    </div>
                </div>

                <CodeBlock code={customDomain ? firstPartySnippet : thirdPartySnippet} />

                {/* Platform-specific instructions */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { name: 'Shopify', hint: 'Theme > Edit code > theme.liquid' },
                        { name: 'WordPress', hint: 'Appearance > Theme Editor > header.php' },
                        { name: 'Webflow', hint: 'Project Settings > Custom Code' }
                    ].map(platform => (
                        <div key={platform.name} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="font-medium text-gray-900 text-sm">{platform.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{platform.hint}</p>
                        </div>
                    ))}
                </div>

                {/* Installation status */}
                <div className="mt-4">
                    {installStatus?.installed ? (
                        <StatusBadge status="success">
                            <Zap className="w-4 h-4 fill-current" />
                            <span>SDK détecté et actif sur ton site</span>
                        </StatusBadge>
                    ) : (
                        <StatusBadge status="loading">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>En attente de l'installation...</span>
                        </StatusBadge>
                    )}
                </div>
            </div>

            {/* Step 2: Stripe Webhook */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                        2
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Configure ton Webhook Stripe</h2>
                        <p className="text-sm text-gray-500">Pour recevoir les paiements et calculer les commissions</p>
                    </div>
                </div>

                <WebhookManager onStatusChange={() => { }} />
            </div>

            {/* Step 3: Verify */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${installStatus?.lastEventAt
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                        }`}>
                        {installStatus?.lastEventAt ? <Check className="w-4 h-4" /> : '3'}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Vérifie la réception</h2>
                        <p className="text-sm text-gray-500">Assure-toi que les événements arrivent correctement</p>
                    </div>
                </div>

                {installStatus?.lastEventAt ? (
                    <StatusBadge status={
                        (Date.now() - new Date(installStatus.lastEventAt).getTime()) < 15 * 60 * 1000
                            ? 'success'
                            : 'warning'
                    }>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Dernier événement: {new Date(installStatus.lastEventAt).toLocaleString('fr-FR')}</span>
                        {installStatus.eventCount > 0 && (
                            <span className="ml-1 opacity-75">({installStatus.eventCount} total)</span>
                        )}
                    </StatusBadge>
                ) : (
                    <StatusBadge status="loading">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>En attente du premier événement...</span>
                    </StatusBadge>
                )}

                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-2">💡 Comment tester ?</h4>
                    <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                        <li>Ouvre ton site dans un nouvel onglet</li>
                        <li>Clique sur un lien partenaire (depuis /s/xxx)</li>
                        <li>Reviens ici - le compteur devrait se mettre à jour</li>
                    </ol>
                </div>
            </div>

            {/* Step 4: Partner Features */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-sm font-bold text-white">
                        4
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Fonctionnalités Partenaires</h2>
                        <p className="text-sm text-gray-500">Affiche une bannière de réduction aux visiteurs référés</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">🎁 Bannière DiscountBanner</h4>
                        <p className="text-sm text-purple-700 mb-3">
                            Quand un utilisateur arrive via <code className="bg-purple-100 px-1 rounded">?via=john</code>,
                            le SDK stocke les données du partenaire. Affiche une bannière pour augmenter les conversions !
                        </p>
                        <CodeBlock code={reactBannerSnippet} language="tsx" />
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">🔧 Hook useTracAnalytics (React)</h4>
                        <p className="text-sm text-gray-600 mb-3">
                            Pour un contrôle plus fin, utilise le hook React pour accéder aux données brutes.
                        </p>
                        <CodeBlock code={hookSnippet} language="tsx" />
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h4 className="font-medium text-amber-900 mb-2">📜 Vanilla JS (autres frameworks)</h4>
                        <p className="text-sm text-amber-700 mb-3">
                            Pour Shopify, WordPress, ou tout site sans React, utilise le callback <code className="bg-amber-100 px-1 rounded">tracAnalytics("ready")</code>.
                        </p>
                        <CodeBlock code={vanillaJsSnippet} language="javascript" />
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">⚙️ Configuration Discount</h4>
                        <p className="text-sm text-blue-700">
                            Configure ton discount dans
                            <Link href="/dashboard/settings" className="underline font-medium ml-1">Settings → Discount</Link>.
                            Lie un coupon Stripe pour appliquer automatiquement la réduction au checkout.
                        </p>
                    </div>
                </div>
            </div>

            {/* API Keys Section (collapsed by default for simplicity) */}
            <details className="mb-10 bg-gray-50 rounded-xl border border-gray-200">
                <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-100 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Code2 className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Clés API</h2>
                            <p className="text-sm text-gray-500">Pour les intégrations serveur avancées</p>
                        </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                </summary>

                <div className="p-4 border-t border-gray-200 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Public Key</span>
                            <CopyButton text={publicKey || ''} />
                        </div>
                        <code className="font-mono text-sm text-gray-900 block truncate">{publicKey}</code>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Secret Key</span>
                            <div className="flex gap-2">
                                {secretKey && (
                                    <>
                                        <button onClick={() => setShowSecret(!showSecret)} className="p-1.5 hover:bg-gray-100 rounded">
                                            {showSecret ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                        </button>
                                        <CopyButton text={secretKey} />
                                    </>
                                )}
                            </div>
                        </div>
                        {secretKey ? (
                            <code className="font-mono text-sm text-gray-900 block truncate">
                                {showSecret ? secretKey : 'sk_live_••••••••••••••••••••••••••••'}
                            </code>
                        ) : (
                            <div className="space-y-2">
                                <code className="font-mono text-sm text-gray-400 block">sk_live_••••••••••••••••••••••••••••</code>
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    La clé secrète n&apos;est visible qu&apos;à la création.
                                </p>
                                <button
                                    onClick={async () => {
                                        if (confirm('Attention : Cela invalidera ta clé actuelle. Continuer ?')) {
                                            const result = await regenerateApiKey()
                                            if (result.success) {
                                                setPublicKey(result.publicKey!)
                                                setSecretKey(result.secretKey!)
                                                setShowSecret(true)
                                            }
                                        }
                                    }}
                                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Régénérer les clés
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </details>
        </div>
    )
}
