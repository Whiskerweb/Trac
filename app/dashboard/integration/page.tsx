'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Code2, Webhook, CheckCircle2, Copy, Check,
    Zap, AlertCircle, Key, RefreshCw,
    Play, Terminal, Loader2, Eye, EyeOff, Building2
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

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <button onClick={handleCopy} className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${className}`}>
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
        </button>
    )
}

function StepItem({
    number,
    title,
    description,
    isComplete,
    children
}: {
    number: number
    title: string
    description: string
    isComplete: boolean
    children: React.ReactNode
}) {
    return (
        <div className="flex gap-4 sm:gap-6">
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border ${isComplete
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}>
                    {isComplete ? <Check className="w-4 h-4" /> : number}
                </div>
                <div className="w-px h-full bg-gray-200 my-2 min-h-[2rem]" />
            </div>
            <div className="flex-1 pb-12">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{description}</p>
                </div>
                {children}
            </div>
        </div>
    )
}

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
        addLog('info', 'Simulating click...')
        try {
            if (typeof window !== 'undefined' && (window as any).Trac) {
                const clickId = (window as any).Trac.getClickId() || (window as any).TracUtils?.generateClickId()
                addLog('success', `Click ID captured: ${clickId}`)
            } else {
                addLog('info', 'SDK not detected. Mocking server request.')
                const testClickId = `clk_test_${Date.now()}`
                await fetch('/_trac/api/track/click', {
                    method: 'POST',
                    body: JSON.stringify({ click_id: testClickId })
                })
                addLog('success', 'Click event sent to server ✓')
            }
        } catch (err: any) {
            addLog('error', err.message)
        }
        setIsRunning(false)
    }

    const simulateSale = async () => {
        setIsRunning(true)
        addLog('info', 'Simulating conversion...')
        try {
            if (typeof window !== 'undefined' && (window as any).Trac?.recordSale) {
                await (window as any).Trac.recordSale({ amount: 5000, currency: 'USD', orderId: `ord_${Date.now()}` })
                addLog('success', 'Conversion recorded via SDK ✓')
            } else {
                await fetch('/_trac/api/conversions/sale', {
                    method: 'POST',
                    body: JSON.stringify({ click_id: `clk_test_${Date.now()}`, amount: 5000, currency: 'USD' })
                })
                addLog('success', 'Conversion sent to server ✓')
            }
        } catch (err: any) {
            addLog('error', err.message)
        }
        setIsRunning(false)
    }

    return (
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 text-gray-400">
                    <Terminal className="w-4 h-4" />
                    <span>Test Console</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={simulateClick} disabled={isRunning} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors">
                        Simulate Click
                    </button>
                    <button onClick={simulateSale} disabled={isRunning} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-green-400 rounded text-xs transition-colors">
                        Simulate Sale
                    </button>
                </div>
            </div>
            <div className="space-y-1 h-32 overflow-y-auto custom-scrollbar">
                {logs.length === 0 && <span className="text-gray-600 italic">Ready to test...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-gray-600 text-xs">[{log.time}]</span>
                        <span className={log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-gray-300'}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
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

    const sdkCode = publicKey ? (customDomain ?
        `<script 
  src="https://${customDomain}/trac.js" 
  data-key="${publicKey}"
  data-api-host="https://${customDomain}/_trac"
  defer
></script>` :
        `<script>
  window.TracConfig = { apiKey: '${publicKey}', autoInject: true };
</script>
<script src="https://traaaction.com/trac.js" defer></script>`) : 'Loading...'

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

    return (
        <div className="w-full max-w-5xl mx-auto px-6 py-8">
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Setup Integration</h1>
                    {workspaceName && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1"><Building2 className="w-3 h-3" />{workspaceName}</span>}
                </div>
                <p className="text-gray-500">Connect your website to start tracking clicks and conversions.</p>
            </div>

            <StepItem
                number={1}
                title="Install SDK"
                description="Add this code snippet to the <head> of your website."
                isComplete={!!installStatus?.installed}
            >
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 group relative">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={sdkCode} />
                    </div>
                    <pre className="text-sm font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{sdkCode}</pre>
                </div>
                {!customDomain && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-3 text-amber-800 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Recommended: <Link href="/dashboard/domains" className="underline font-medium">Configure a custom domain</Link> to bypass ad-blockers.</span>
                    </div>
                )}
                {installStatus?.installed && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded-md border border-green-100 w-fit">
                        <Zap className="w-4 h-4 fill-current" />
                        SDK Detected active on your site
                    </div>
                )}
            </StepItem>

            <StepItem
                number={2}
                title="Verify Tracking"
                description="Use the console below to simulate events and verify data flow."
                isComplete={false}
            >
                <SimulatorConsole />
            </StepItem>

            <StepItem
                number={3}
                title="API Keys"
                description="Use these keys for server-side integration."
                isComplete={!!publicKey}
            >
                <div className="grid gap-4 max-w-2xl">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Public Key</span>
                            <CopyButton text={publicKey || ''} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50" />
                        </div>
                        <code className="font-mono text-sm text-gray-900 block truncate">{publicKey}</code>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Secret Key</span>
                            <div className="flex gap-2">
                                <button onClick={() => setShowSecret(!showSecret)} className="p-1 hover:bg-gray-50 rounded">
                                    {showSecret ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                                </button>
                                <CopyButton text={secretKey || ''} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50" />
                            </div>
                        </div>
                        <code className="font-mono text-sm text-gray-900 block truncate">
                            {showSecret ? secretKey : 'sk_live_••••••••••••••••••••••••••••'}
                        </code>
                    </div>
                </div>
            </StepItem>

            <div className="pt-4 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhooks</h3>
                <WebhookManager onStatusChange={() => { }} />
            </div>
        </div>
    )
}
