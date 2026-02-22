'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Eye, EyeOff, ChevronDown, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { getOrCreateApiKey, regenerateApiKey } from '@/app/actions/settings'
import { getVerifiedDomainForWorkspace } from '@/app/actions/domains'
import { WebhookManager } from '@/components/WebhookManager'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

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
                <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-neutral-800">
                    <span className="text-xs text-neutral-500 font-mono truncate mr-2">{filename}</span>
                    <CopyButton text={code} small />
                </div>
            )}
            {!filename && (
                <div className="flex justify-end px-3 py-2 border-b border-neutral-800/50">
                    <CopyButton text={code} small />
                </div>
            )}
            <pre className="p-3 sm:p-4 text-xs sm:text-[13px] leading-relaxed font-mono text-neutral-300 overflow-x-auto">
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
                className="w-full flex items-center gap-3 sm:gap-4 py-4 sm:py-5 text-left group"
            >
                <span className="text-xs sm:text-sm text-neutral-400 font-mono w-5 sm:w-6 flex-shrink-0">{String(number).padStart(2, '0')}</span>
                <span className="flex-1 text-sm sm:text-base font-medium text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    {title}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[3000px] opacity-100 pb-6 sm:pb-8' : 'max-h-0 opacity-0'}`}>
                <div className="pl-8 sm:pl-10">
                    {children}
                </div>
            </div>
        </div>
    )
}

type Framework = 'nextjs' | 'django' | 'other'

// =============================================
// MAIN PAGE
// =============================================

export default function IntegrationPage() {
    const t = useTranslations('dashboard.integration')
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [customDomain, setCustomDomain] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [aiCopied, setAiCopied] = useState(false)
    const [framework, setFramework] = useState<Framework>('nextjs')

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
    const pk = publicKey || 'pk_...'

    // =============================================
    // CODE SNIPPETS
    // =============================================

    // Step 1 — Proxy / Rewrites
    const rewritesConfigNextjs = `// next.config.js - Add these rewrites
module.exports = {
  async rewrites() {
    return [
      { source: "/_trac/script.js", destination: "https://${trackingDomain}/trac.js" },
      { source: "/_trac/api/:path*", destination: "https://${trackingDomain}/api/:path*" },
    ];
  },
};`

    const rewritesConfigDjango = `# urls.py
from django.urls import re_path
from . import views

urlpatterns = [
    re_path(r'^_trac/script\\.js$', views.trac_script_proxy),
    re_path(r'^_trac/api/(?P<path>.+)$', views.trac_api_proxy),
]

# views.py
import httpx
from django.http import HttpResponse

def trac_script_proxy(request):
    r = httpx.get('https://${trackingDomain}/trac.js')
    return HttpResponse(r.content, content_type='application/javascript')

def trac_api_proxy(request, path):
    url = 'https://${trackingDomain}/api/' + path
    r = httpx.request(request.method, url,
        content=request.body,
        headers={'Content-Type': 'application/json'})
    return HttpResponse(r.content, status=r.status_code)`

    const rewritesConfigOther = `# nginx.conf
location /_trac/script.js {
    proxy_pass https://${trackingDomain}/trac.js;
    proxy_ssl_server_name on;
}

location /_trac/api/ {
    proxy_pass https://${trackingDomain}/api/;
    proxy_ssl_server_name on;
}`

    const rewritesConfig = framework === 'nextjs' ? rewritesConfigNextjs : framework === 'django' ? rewritesConfigDjango : rewritesConfigOther
    const rewritesFilename = framework === 'nextjs' ? 'next.config.js' : framework === 'django' ? 'urls.py + views.py' : 'nginx.conf'

    // Step 2 — Script tag (same HTML, different filename)
    const scriptTag = `<!-- Add in your HTML <head> -->
<script
  src="/_trac/script.js"
  defer
  data-api-host="/_trac"
  data-domains='{"refer":"${customDomain || 'yourdomain.com'}"}'
></script>`

    const scriptFilename = framework === 'nextjs' ? 'app/layout.tsx' : framework === 'django' ? 'templates/base.html' : 'index.html'

    // Step 3 — Track signup
    const trackSignupNextjs = `// Backend (Next.js API or Server Action)
// Get clickId from trac_id cookie
const clickId = cookies().get('trac_id')?.value;

await fetch('/_trac/api/track/lead', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-key': '${pk}'
  },
  body: JSON.stringify({
    eventName: 'sign_up',
    customerExternalId: user.id,  // Required - unique user ID
    clickId,                       // Seller attribution
    customerEmail: user.email,
    customerName: user.name
  })
});`

    const trackSignupDjango = `# views.py - signup handler
import requests

click_id = request.COOKIES.get('trac_id', '')

requests.post('/_trac/api/track/lead',
    headers={
        'Content-Type': 'application/json',
        'x-publishable-key': '${pk}'
    },
    json={
        'eventName': 'sign_up',
        'customerExternalId': str(user.id),
        'clickId': click_id,
        'customerEmail': user.email,
        'customerName': user.get_full_name()
    }
)`

    const trackSignupOther = `# Get trac_id from your HTTP request cookies
# CLICK_ID = <value of trac_id cookie>

curl -X POST "https://yourdomain.com/_trac/api/track/lead" \\
  -H "Content-Type: application/json" \\
  -H "x-publishable-key: ${pk}" \\
  -d '{
    "eventName": "sign_up",
    "customerExternalId": "<user-id>",
    "clickId": "<trac_id cookie value>",
    "customerEmail": "<user@email.com>",
    "customerName": "<Full Name>"
  }'`

    const trackSignup = framework === 'nextjs' ? trackSignupNextjs : framework === 'django' ? trackSignupDjango : trackSignupOther
    const trackSignupFilename = framework === 'nextjs' ? 'signup handler' : framework === 'django' ? 'views.py' : 'shell'

    // Step 4 — Stripe metadata
    const stripeMetadataNextjs = `// Backend - Stripe Checkout creation

// One-time payment
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  mode: 'payment',
  metadata: {
    tracCustomerExternalId: user.id,  // Same ID as trackLead
    tracClickId: clickId              // Optional if lead already created
  }
});

// Subscription (recurring)
const session = await stripe.checkout.sessions.create({
  line_items: [...],
  mode: 'subscription',              // Required for recurring commissions
  metadata: {
    tracCustomerExternalId: user.id,
    tracClickId: clickId
  }
});`

    const stripeMetadataDjango = `import stripe

click_id = request.COOKIES.get('trac_id', '')

# One-time payment
session = stripe.checkout.Session.create(
    line_items=[...],
    mode='payment',
    metadata={
        'tracCustomerExternalId': str(user.id),
        'tracClickId': click_id
    }
)

# Subscription (recurring)
session = stripe.checkout.Session.create(
    line_items=[...],
    mode='subscription',
    metadata={
        'tracCustomerExternalId': str(user.id),
        'tracClickId': click_id
    }
)`

    const stripeMetadataOther = `# Add these metadata fields to your Stripe Checkout Session:

metadata = {
    "tracCustomerExternalId": "<user-id>",   # Same ID as in track signup
    "tracClickId": "<trac_id cookie value>"  # Optional if lead already tracked
}

# For subscriptions:  mode = "subscription"
# For one-time payments: mode = "payment"`

    const stripeMetadata = framework === 'nextjs' ? stripeMetadataNextjs : framework === 'django' ? stripeMetadataDjango : stripeMetadataOther
    const stripeMetadataFilename = framework === 'nextjs' ? 'checkout handler' : framework === 'django' ? 'views.py' : 'checkout handler'

    // =============================================
    // AI MARKDOWN EXPORT
    // =============================================

    const frameworkLabel = framework === 'nextjs' ? 'Next.js' : framework === 'django' ? 'Django' : 'Generic'
    const step1Lang = framework === 'nextjs' ? 'javascript' : framework === 'django' ? 'python' : 'nginx'
    const step3Lang = framework === 'nextjs' ? 'typescript' : framework === 'django' ? 'python' : 'bash'
    const step4Lang = framework === 'nextjs' ? 'typescript' : framework === 'django' ? 'python' : 'text'

    const aiMarkdown = `# Traaaction Integration Guide (${frameworkLabel})

## Configuration
- Public Key: \`${pk}\`
- Tracking Domain: \`${trackingDomain}\`

## Step 1: Configure Proxy (First-Party Tracking)

Add these rules to proxy tracking requests through your domain:

\`\`\`${step1Lang}
${rewritesConfig}
\`\`\`

## Step 2: Add Tracking Script

Add to your HTML \`<head>\` (${scriptFilename}):

\`\`\`html
${scriptTag}
\`\`\`

## Step 3: Track Signups

After creating a user, track the lead (${trackSignupFilename}):

\`\`\`${step3Lang}
${trackSignup}
\`\`\`

## Step 4: Stripe Metadata

Add tracking metadata to your checkout session (${stripeMetadataFilename}):

\`\`\`${step4Lang}
${stripeMetadata}
\`\`\`

> **Important:** Use \`mode: 'subscription'\` for recurring products.
> Traaaction automatically detects the subscription and tracks recurring commissions.

## Step 5: Configure Webhook

Add webhook in Traaaction dashboard for Stripe events:
- checkout.session.completed
- invoice.paid
- charge.refunded
- customer.subscription.deleted (recommended)`

    const handleCopyAI = async () => {
        await navigator.clipboard.writeText(aiMarkdown)
        setAiCopied(true)
        setTimeout(() => setAiCopied(false), 3000)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32">
                <TraaactionLoader size={20} className="text-gray-400" />
            </div>
        )
    }

    const frameworkOptions: { id: Framework; label: string }[] = [
        { id: 'nextjs', label: t('frameworkSelector.nextjs') },
        { id: 'django', label: t('frameworkSelector.django') },
        { id: 'other', label: t('frameworkSelector.other') },
    ]

    const step1Description = framework === 'django'
        ? t('step1.descriptionDjango')
        : framework === 'other'
            ? t('step1.descriptionOther')
            : t('step1.description')

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                    {t('title')}
                </h1>
                <p className="text-neutral-500 text-sm leading-relaxed">
                    {t('subtitle')}
                </p>
            </header>

            {/* Framework Selector */}
            <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-neutral-200">
                <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">{t('frameworkSelector.label')}</p>
                <div className="flex gap-2 flex-wrap">
                    {frameworkOptions.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setFramework(id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                framework === id
                                    ? 'bg-neutral-900 text-white'
                                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Domain Status */}
            {!customDomain && (
                <div className="mb-6 sm:mb-10 pb-6 sm:pb-10 border-b border-neutral-200">
                    <p className="text-sm text-neutral-500">
                        <Link href="/dashboard/domains" className="text-neutral-900 hover:underline">
                            {t('addCustomDomain')}
                        </Link>
                        {' '}{t('betterTracking')}
                    </p>
                </div>
            )}

            {/* AI Export Link */}
            <div className="mb-6 sm:mb-10 pb-6 sm:pb-10 border-b border-neutral-200">
                <button
                    onClick={handleCopyAI}
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors min-h-[44px] flex items-center"
                >
                    {aiCopied ? (
                        <span className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            {t('copiedToClipboard')}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <Copy className="w-3.5 h-3.5" />
                            {t('copyAsMarkdown')}
                        </span>
                    )}
                </button>
            </div>

            {/* Steps */}
            <div className="mb-8 sm:mb-12">
                <Section id="step-1" number={1} title={t('step1.title')} defaultOpen>
                    <p className="text-sm text-neutral-600 mb-4 sm:mb-6 leading-relaxed">
                        {step1Description}
                    </p>

                    <CodeBlock key={framework} code={rewritesConfig} filename={rewritesFilename} />
                </Section>

                <Section id="step-2" number={2} title={t('step2.title')}>
                    <p className="text-sm text-neutral-600 mb-4 sm:mb-6 leading-relaxed">
                        {t('step2.description')}
                    </p>

                    <CodeBlock key={framework} code={scriptTag} filename={scriptFilename} />

                    <p className="text-xs text-neutral-400 mt-3 sm:mt-4">
                        {t('step2.avoidBlocked')}
                    </p>
                </Section>

                <Section id="step-3" number={3} title={t('step3.title')}>
                    <p className="text-sm text-neutral-600 mb-4 sm:mb-6 leading-relaxed">
                        {t('step3.description')}
                    </p>

                    <CodeBlock key={framework} code={trackSignup} filename={trackSignupFilename} />

                    <div className="mt-4 sm:mt-6 space-y-3 text-xs text-neutral-500">
                        <p>
                            <span className="text-neutral-700 font-medium">{t('step3.publishableKey')}</span> {t('step3.publishableKeyDesc')}
                        </p>
                        <p>
                            <span className="text-neutral-700 font-medium">{t('step3.automaticAttribution')}</span> {t('step3.automaticAttributionDesc')}
                        </p>
                    </div>
                </Section>

                <Section id="step-4" number={4} title={t('step4.title')}>
                    <p className="text-sm text-neutral-600 mb-4 sm:mb-6 leading-relaxed">
                        {t('step4.description')}
                    </p>

                    <CodeBlock key={framework} code={stripeMetadata} filename={stripeMetadataFilename} />

                    <div className="mt-4 sm:mt-6 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-800 font-medium">{t('step4.subscriptionNote')}</p>
                        <p className="text-xs text-amber-700 mt-1">{t('step4.subscriptionNoteDesc')}</p>
                    </div>

                    <p className="text-xs text-neutral-400 mt-3 sm:mt-4">
                        {t('step4.sameCustomerId')}
                    </p>
                </Section>

                <Section id="step-5" number={5} title={t('step5.title')}>
                    <p className="text-sm text-neutral-600 mb-4 sm:mb-6 leading-relaxed">
                        {t('step5.description')}
                    </p>

                    <div className="mt-3 sm:mt-4">
                        <WebhookManager onStatusChange={() => { }} />
                    </div>
                </Section>
            </div>

            {/* API Keys */}
            <div className="pt-6 sm:pt-8 border-t border-neutral-200">
                <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 list-none min-h-[44px]">
                        <span className="text-sm font-medium text-neutral-900">{t('apiKeys.title')}</span>
                        <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                    </summary>

                    <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                        {/* Public Key */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-neutral-500 uppercase tracking-wide">{t('apiKeys.publicKey')}</span>
                                <CopyButton text={publicKey || ''} small />
                            </div>
                            <code className="text-xs sm:text-sm font-mono text-neutral-900 break-all block">{publicKey}</code>
                            <p className="text-xs text-neutral-400 mt-1.5">{t('apiKeys.publicKeyDesc')}</p>
                        </div>

                        {/* Secret Key */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-neutral-500 uppercase tracking-wide">{t('apiKeys.secretKey')}</span>
                                <div className="flex items-center gap-1">
                                    {secretKey && (
                                        <>
                                            <button
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="w-9 h-9 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                                            >
                                                {showSecret ? <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                                            </button>
                                            <CopyButton text={secretKey} small />
                                        </>
                                    )}
                                </div>
                            </div>
                            {secretKey ? (
                                <code className="text-xs sm:text-sm font-mono text-neutral-900 break-all block">
                                    {showSecret ? secretKey : 'sk_live_' + '•'.repeat(32)}
                                </code>
                            ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <code className="text-xs sm:text-sm font-mono text-neutral-400">sk_live_{'•'.repeat(32)}</code>
                                    <button
                                        onClick={async () => {
                                            if (confirm(t('apiKeys.regenerateConfirm'))) {
                                                const result = await regenerateApiKey()
                                                if (result.success) {
                                                    setPublicKey(result.publicKey!)
                                                    setSecretKey(result.secretKey!)
                                                    setShowSecret(true)
                                                }
                                            }
                                        }}
                                        className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> {t('apiKeys.regenerate')}
                                    </button>
                                </div>
                            )}
                            <p className="text-xs text-neutral-400 mt-1.5">{t('apiKeys.secretKeyDesc')}</p>
                        </div>
                    </div>
                </details>
            </div>

            {/* Support */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                    {t('support.needHelp')}{' '}
                    <a href="mailto:support@traaaction.com" className="text-neutral-900 hover:underline">
                        {t('support.contactSupport')}
                    </a>
                </p>
            </div>
        </div>
    )
}
