'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Loader2, Eye, EyeOff, ChevronDown, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { getOrCreateApiKey, regenerateApiKey } from '@/app/actions/settings'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { WebhookManager } from '@/components/WebhookManager'

// =============================================
// COMPONENTS
// =============================================

function CopyButton({ text, small = false }: { text: string; small?: boolean }) {
    const [copied, setCopied] = useState(false)
    return (
        <button
            onClick={async () => {
                await navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }}
            className={`inline-flex items-center justify-center transition-colors ${
                small
                    ? 'w-7 h-7 rounded-md hover:bg-neutral-100'
                    : 'px-3 py-1.5 rounded-md text-sm hover:bg-neutral-100'
            } ${copied ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
            {copied ? <Check className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : <Copy className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
        </button>
    )
}

function CodeBlock({ code, filename }: { code: string; filename?: string }) {
    return (
        <div className="rounded-lg bg-neutral-950 overflow-hidden">
            {filename && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
                    <span className="text-xs text-neutral-500 font-mono">{filename}</span>
                    <CopyButton text={code} small />
                </div>
            )}
            {!filename && (
                <div className="flex justify-end px-3 py-2 border-b border-neutral-800/50">
                    <CopyButton text={code} small />
                </div>
            )}
            <pre className="p-4 text-[13px] leading-relaxed font-mono text-neutral-300 overflow-x-auto">
                <code>{code}</code>
            </pre>
        </div>
    )
}

function Section({
    id,
    number,
    title,
    children,
    defaultOpen = false
}: {
    id: string;
    number: number;
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div id={id} className="border-b border-neutral-200 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-4 py-5 text-left group"
            >
                <span className="text-sm text-neutral-400 font-mono w-6">{String(number).padStart(2, '0')}</span>
                <span className="flex-1 text-base font-medium text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    {title}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[3000px] opacity-100 pb-8' : 'max-h-0 opacity-0'}`}>
                <div className="pl-10">
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
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [customDomain, setCustomDomain] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [aiCopied, setAiCopied] = useState(false)

    useEffect(() => {
        async function init() {
            try {
                const [keys, domain] = await Promise.all([
                    getOrCreateApiKey(),
                    getVerifiedDomainForWorkspace(),
                ])
                if (keys.success) {
                    setPublicKey(keys.publicKey!)
                    setSecretKey(keys.secretKey || null)
                }
                if (domain.success) setCustomDomain(domain.domain || null)
            } catch (e) {
                console.error(e)
            }
            setLoading(false)
        }
        init()
    }, [])

    // Use custom domain if available, otherwise use main domain
    const trackingDomain = customDomain || 'traaaction.com'

    // =============================================
    // CODE SNIPPETS
    // =============================================

    const rewritesConfig = `// next.config.js - Add these rewrites
module.exports = {
  async rewrites() {
    return [
      { source: "/_trac/script.js", destination: "https://${trackingDomain}/trac.js" },
      { source: "/_trac/api/:path*", destination: "https://${trackingDomain}/api/:path*" },
    ];
  },
};`

    const scriptTag = `<!-- Add in your HTML <head> -->
<script
  src="/_trac/script.js"
  defer
  data-api-host="/_trac"
  data-domains='{"refer":"${customDomain || 'yourdomain.com'}"}'
></script>`

    const trackSignup = `// Backend (Next.js API or Server Action)
// Get clickId from trac_id cookie
const clickId = cookies().get('trac_id')?.value;

await fetch('/_trac/api/track/lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-key': '${publicKey || 'pk_...'}'
  },
  body: JSON.stringify({
    eventName: 'sign_up',
    customerExternalId: user.id,  // Required - unique user ID
    clickId,                       // Seller attribution
    customerEmail: user.email,
    customerName: user.name
  })
});`

    const stripeMetadata = `// Backend - Stripe Checkout creation
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  mode: 'payment',
  metadata: {
    tracCustomerExternalId: user.id,  // Same ID as trackLead
    tracClickId: clickId              // Optional if lead already created
  }
});`

    // AI Markdown export
    const aiMarkdown = `# Traaaction Integration Guide

## Configuration
- Public Key: \`${publicKey || 'pk_...'}\`
- Tracking Domain: \`${trackingDomain}\`

## Step 1: Configure Rewrites (First-Party Tracking)

Add these rewrites to proxy tracking requests through your domain:

\`\`\`javascript
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: "/_trac/script.js", destination: "https://${trackingDomain}/trac.js" },
      { source: "/_trac/api/:path*", destination: "https://${trackingDomain}/api/:path*" },
    ];
  },
};
\`\`\`

## Step 2: Add Tracking Script

Add to your HTML \`<head>\`:

\`\`\`html
<script
  src="/_trac/script.js"
  defer
  data-api-host="/_trac"
  data-domains='{"refer":"${customDomain || 'yourdomain.com'}"}'
></script>
\`\`\`

## Step 3: Track Signups

After creating a user, track the lead:

\`\`\`typescript
// Get clickId from trac_id cookie
const clickId = cookies().get('trac_id')?.value;

await fetch('/_trac/api/track/lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-key': '${publicKey || 'pk_...'}'
  },
  body: JSON.stringify({
    eventName: 'sign_up',
    customerExternalId: user.id,  // Required - unique user ID
    clickId,                       // Seller attribution
    customerEmail: user.email,
    customerName: user.name
  })
});
\`\`\`

## Step 4: Stripe Metadata

Add tracking metadata to your checkout session:

\`\`\`typescript
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  mode: 'payment',
  metadata: {
    tracCustomerExternalId: user.id,  // Same ID as trackLead
    tracClickId: clickId              // Optional if lead already created
  }
});
\`\`\`

## Step 5: Configure Webhook

Add webhook in Traaaction dashboard for Stripe events:
- checkout.session.completed
- invoice.paid
- charge.refunded`

    const handleCopyAI = async () => {
        await navigator.clipboard.writeText(aiMarkdown)
        setAiCopied(true)
        setTimeout(() => setAiCopied(false), 3000)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            {/* Header */}
            <header className="mb-12">
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                    Integration
                </h1>
                <p className="text-neutral-500 text-sm leading-relaxed">
                    Connect your application to track affiliate conversions.
                </p>
            </header>

            {/* Domain Status */}
            {!customDomain && (
                <div className="mb-10 pb-10 border-b border-neutral-200">
                    <p className="text-sm text-neutral-500">
                        <Link href="/dashboard/domains" className="text-neutral-900 hover:underline">
                            Add a custom domain
                        </Link>
                        {' '}for better tracking reliability.
                    </p>
                </div>
            )}

            {/* AI Export Link */}
            <div className="mb-10 pb-10 border-b border-neutral-200">
                <button
                    onClick={handleCopyAI}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                    {aiCopied ? (
                        <span className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Copied to clipboard
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <Copy className="w-3.5 h-3.5" />
                            Copy as Markdown for AI assistants
                        </span>
                    )}
                </button>
            </div>

            {/* Steps */}
            <div className="mb-12">
                <Section id="step-1" number={1} title="Configure rewrites" defaultOpen>
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                        Add these rewrites to your Next.js config. This proxies tracking requests through your domain to avoid ad blockers.
                    </p>

                    <CodeBlock code={rewritesConfig} filename="next.config.js" />

                    <p className="text-xs text-neutral-400 mt-4">
                        For other frameworks, configure equivalent proxy rules.
                    </p>
                </Section>

                <Section id="step-2" number={2} title="Add the tracking script">
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                        Add this script to your HTML head. It tracks affiliate link clicks and stores a cookie for attribution.
                    </p>

                    <CodeBlock code={scriptTag} filename="app/layout.tsx" />

                    <p className="text-xs text-neutral-400 mt-4">
                        The script uses your proxied path to avoid being blocked.
                    </p>
                </Section>

                <Section id="step-3" number={3} title="Track user signups">
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                        After creating a user, send a tracking event. This links the user to their referring seller.
                    </p>

                    <CodeBlock code={trackSignup} filename="signup handler" />

                    <div className="mt-6 space-y-3 text-xs text-neutral-500">
                        <p>
                            <span className="text-neutral-700 font-medium">x-publishable-key:</span> Identifies your workspace. Your key is shown above.
                        </p>
                        <p>
                            <span className="text-neutral-700 font-medium">Automatic attribution:</span> Once the lead is created with a clickId, all future sales from this customer are attributed to the seller.
                        </p>
                    </div>
                </Section>

                <Section id="step-4" number={4} title="Add Stripe metadata">
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                        Include tracking metadata in your Stripe checkout session for payment attribution.
                    </p>

                    <CodeBlock code={stripeMetadata} filename="checkout handler" />

                    <p className="text-xs text-neutral-400 mt-4">
                        Use the same customerExternalId as in trackLead.
                    </p>
                </Section>

                <Section id="step-5" number={5} title="Configure webhook">
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                        Connect your Stripe account to receive payment notifications automatically.
                    </p>

                    <div className="mt-4">
                        <WebhookManager onStatusChange={() => { }} />
                    </div>
                </Section>
            </div>

            {/* API Keys */}
            <div className="pt-8 border-t border-neutral-200">
                <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 list-none">
                        <span className="text-sm font-medium text-neutral-900">API Keys</span>
                        <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                    </summary>

                    <div className="mt-6 space-y-6">
                        {/* Public Key */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-neutral-500 uppercase tracking-wide">Public Key</span>
                                <CopyButton text={publicKey || ''} small />
                            </div>
                            <code className="text-sm font-mono text-neutral-900 break-all">{publicKey}</code>
                            <p className="text-xs text-neutral-400 mt-1.5">Use in x-publishable-key header.</p>
                        </div>

                        {/* Secret Key */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-neutral-500 uppercase tracking-wide">Secret Key</span>
                                <div className="flex items-center gap-1">
                                    {secretKey && (
                                        <>
                                            <button
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                                            >
                                                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                            <CopyButton text={secretKey} small />
                                        </>
                                    )}
                                </div>
                            </div>
                            {secretKey ? (
                                <code className="text-sm font-mono text-neutral-900 break-all">
                                    {showSecret ? secretKey : 'sk_live_' + '•'.repeat(32)}
                                </code>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <code className="text-sm font-mono text-neutral-400">sk_live_{'•'.repeat(32)}</code>
                                    <button
                                        onClick={async () => {
                                            if (confirm('This will invalidate your current key. Continue?')) {
                                                const result = await regenerateApiKey()
                                                if (result.success) {
                                                    setPublicKey(result.publicKey!)
                                                    setSecretKey(result.secretKey!)
                                                    setShowSecret(true)
                                                }
                                            }
                                        }}
                                        className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Regenerate
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-neutral-400 mt-1.5">Keep secret. Never expose in frontend.</p>
                        </div>
                    </div>
                </details>
            </div>

            {/* Support */}
            <div className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                    Need help?{' '}
                    <a href="mailto:support@traaaction.com" className="text-neutral-900 hover:underline">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    )
}
