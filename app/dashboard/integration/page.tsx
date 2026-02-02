'use client'

import { useState, useEffect } from 'react'
import {
    Code2, Copy, Check, Zap, AlertCircle, RefreshCw,
    Loader2, Eye, EyeOff, Building2, Globe, ShieldCheck,
    ExternalLink, Users, CreditCard, Webhook
} from 'lucide-react'
import Link from 'next/link'
import { getOrCreateApiKey, regenerateApiKey } from '@/app/actions/settings'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { WebhookManager } from '@/components/WebhookManager'

// =============================================
// COMPONENTS
// =============================================

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={async () => {
                await navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }}
            className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
        </button>
    )
}

function CodeBlock({ code, language = 'javascript' }: { code: string; language?: string }) {
    return (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-800">
                <span className="text-xs text-gray-500 uppercase font-mono">{language}</span>
                <CopyButton text={code} />
            </div>
            <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
    )
}

function StepHeader({ number, title, description, color = 'gray' }: {
    number: number; title: string; description: string; color?: string
}) {
    const colors: Record<string, string> = {
        gray: 'bg-gray-200 text-gray-600',
        green: 'bg-green-500 text-white',
        blue: 'bg-blue-500 text-white',
        purple: 'bg-purple-500 text-white',
        orange: 'bg-orange-500 text-white'
    }
    return (
        <div className="flex items-start gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors[color]}`}>
                {number}
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
    )
}

function InfoBox({ type, children }: { type: 'info' | 'warning' | 'success'; children: React.ReactNode }) {
    const styles = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-green-50 border-green-200 text-green-800'
    }
    return <div className={`p-3 rounded-lg border text-sm ${styles[type]}`}>{children}</div>
}

// =============================================
// MAIN PAGE
// =============================================

export default function IntegrationPage() {
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [workspaceName, setWorkspaceName] = useState('')
    const [customDomain, setCustomDomain] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [eventCount, setEventCount] = useState(0)

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
                if (status?.eventCount) setEventCount(status.eventCount)
            } catch (e) {
                console.error(e)
            }
            setLoading(false)
        }
        init()
    }, [])

    // =============================================
    // CODE SNIPPETS
    // =============================================

    const sdkSnippet = customDomain
        ? `<!-- next.config.js - Ajoute ces rewrites -->
module.exports = {
  async rewrites() {
    return [
      { source: "/_trac/script.js", destination: "https://traaaction.com/trac.js" },
      { source: "/_trac/api/:path*", destination: "https://traaaction.com/api/:path*" },
    ];
  },
};

<!-- HTML <head> -->
<script 
  src="/_trac/script.js" 
  defer
  data-api-host="/_trac"
  data-domains='{"refer":"${customDomain}"}'
></script>`
        : `<!-- HTML <head> - Simple (Third-party) -->
<script 
  src="https://traaaction.com/trac.js" 
  defer
  data-domains='{"refer":"short.yourdomain.com"}'
></script>`

    const leadSnippet = customDomain
        ? `// Backend (Next.js API ou Server Action)
// Get clickId from trac_id cookie
const clickId = cookies().get('trac_id')?.value;

await fetch('/_trac/api/track/lead', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-publishable-key': '${publicKey}'  // Workspace public key
  },
  body: JSON.stringify({
    eventName: 'sign_up',
    customerExternalId: user.id,  // Obligatoire - ID unique de l'utilisateur
    clickId,                       // Attribution partenaire
    customerEmail: user.email,
    customerName: user.name
  })
});`
        : `// Backend - Track un signup/lead
const clickId = cookies().get('trac_id')?.value;

await fetch('https://traaaction.com/api/track/lead', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-publishable-key': '${publicKey}'  // Your workspace public key
  },
  body: JSON.stringify({
    eventName: 'sign_up',
    customerExternalId: user.id,  // Obligatoire
    clickId,                       // Retrieved from cookie
    customerEmail: user.email
  })
});`

    const stripeSnippet = `// Backend - Stripe Checkout creation
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  mode: 'payment',
  metadata: {
    tracCustomerExternalId: user.id,  // Same ID as trackLead
    tracClickId: clickId              // Optional if lead created
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
        <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Code2 className="w-6 h-6 text-gray-700" />
                    <h1 className="text-2xl font-bold text-gray-900">Integration</h1>
                    {workspaceName && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{workspaceName}
                        </span>
                    )}
                </div>
                <p className="text-gray-500">Connecte ton site pour tracker les clics et conversions.</p>
            </div>

            {/* Mode Indicator */}
            <div className="mb-8 p-4 rounded-xl border bg-gradient-to-r from-gray-50 to-white">
                {customDomain ? (
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">Mode First-Party</p>
                            <p className="text-sm text-gray-600">Domaine: <code className="bg-gray-100 px-1 rounded">{customDomain}</code></p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Globe className="w-6 h-6 text-amber-600" />
                        <div>
                            <p className="font-medium text-amber-800">Mode Third-Party</p>
                            <p className="text-sm text-gray-600">
                                <Link href="/dashboard/domains" className="underline">Configure a domain</Link> to avoid adblockers
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Steps */}
            <div className="space-y-10">

                {/* Step 1: SDK */}
                <section>
                    <StepHeader
                        number={1}
                        title="Installe le SDK"
                        description="Ajoute ce script dans le <head> de ton site"
                        color="blue"
                    />
                    <CodeBlock code={sdkSnippet} language="html" />
                    {eventCount > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                            <Zap className="w-4 h-4" />
                            <span>{eventCount} events received</span>
                        </div>
                    )}
                </section>

                {/* Step 2: Lead Tracking */}
                <section>
                    <StepHeader
                        number={2}
                        title="Track les Signups"
                        description="Call the API when creating an account"
                        color="purple"
                    />
                    <CodeBlock code={leadSnippet} />
                    <div className="mt-3 space-y-2">
                        <InfoBox type="success">
                            <strong>🔑 x-publishable-key:</strong> This key identifies your workspace. It is automatically displayed in the code above.
                        </InfoBox>
                        <InfoBox type="info">
                            <strong>💡 Attribution automatique:</strong> Once the lead is created with a <code className="bg-blue-100 px-1 rounded">clickId</code>, all future sales from this customer are attributed to the partner.
                        </InfoBox>
                    </div>
                </section>

                {/* Step 3: Stripe Attribution */}
                <section>
                    <StepHeader
                        number={3}
                        title="Attribution Stripe"
                        description="Passe les metadata dans Stripe Checkout"
                        color="orange"
                    />
                    <CodeBlock code={stripeSnippet} />
                </section>

                {/* Step 4: Webhook */}
                <section>
                    <StepHeader
                        number={4}
                        title="Configure le Webhook Stripe"
                        description="To receive payments and create commissions"
                        color="gray"
                    />
                    <WebhookManager onStatusChange={() => { }} />
                </section>

            </div>

            {/* API Keys (Collapsible) */}
            <details className="mt-10 bg-gray-50 rounded-xl border border-gray-200">
                <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors rounded-xl">
                    <div className="flex items-center gap-3">
                        <Code2 className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">API Keys</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                </summary>
                <div className="p-4 border-t border-gray-200 space-y-3">
                    <div className="bg-white border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Public Key</span>
                            <CopyButton text={publicKey || ''} />
                        </div>
                        <code className="font-mono text-sm text-gray-900">{publicKey}</code>
                    </div>
                    <div className="bg-white border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Secret Key</span>
                            <div className="flex gap-1">
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
                            <code className="font-mono text-sm text-gray-900">
                                {showSecret ? secretKey : 'sk_live_••••••••••••••••••••••••'}
                            </code>
                        ) : (
                            <div className="space-y-2">
                                <code className="font-mono text-sm text-gray-400">sk_live_••••••••••••••••••••••••</code>
                                <button
                                    onClick={async () => {
                                        if (confirm('Regenerate will invalidate the current key. Continue?')) {
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
                                    <RefreshCw className="w-3 h-3" /> Regenerate
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </details>
        </div>
    )
}
