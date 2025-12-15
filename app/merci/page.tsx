'use client'

import Script from 'next/script'
import { useState } from 'react'

declare global {
    interface Window {
        trac: {
            capture: (eventName: string, meta?: { amount?: number; currency?: string; external_id?: string }) => Promise<unknown>
            getClickId: () => string | null
        }
    }
}

export default function MerciPage() {
    const [logs, setLogs] = useState<string[]>([])
    const [clickId, setClickId] = useState<string | null>(null)

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
    }

    const handleTrackerLoad = () => {
        addLog('Tracker loaded')
        if (window.trac) {
            const id = window.trac.getClickId()
            setClickId(id)
            addLog(`Click ID: ${id || 'None found'}`)
        }
    }

    const simulateLead = async () => {
        if (!window.trac) {
            addLog('ERROR: Tracker not loaded')
            return
        }
        addLog('Sending Lead event...')
        const result = await window.trac.capture('lead')
        addLog(`Result: ${JSON.stringify(result)}`)
    }

    const simulateSale = async () => {
        if (!window.trac) {
            addLog('ERROR: Tracker not loaded')
            return
        }
        addLog('Sending Sale event (50 EUR)...')
        const result = await window.trac.capture('sale', { amount: 50, currency: 'EUR' })
        addLog(`Result: ${JSON.stringify(result)}`)
    }

    return (
        <>
            <Script src="/tracker.js" onLoad={handleTrackerLoad} />

            <div className="min-h-screen bg-zinc-950 text-white p-8">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                        Merci ! 🎉
                    </h1>
                    <p className="text-zinc-400 mb-8">Page de test des conversions</p>

                    {/* Click ID Status */}
                    <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-4">État du Tracking</h2>
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${clickId ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-mono text-sm">
                                {clickId ? `click_id: ${clickId}` : 'Aucun click_id trouvé'}
                            </span>
                        </div>
                        {!clickId && (
                            <p className="text-zinc-500 text-sm mt-2">
                                💡 Pour tester, créez un lien puis cliquez dessus pour arriver ici avec un ref_id
                            </p>
                        )}
                    </div>

                    {/* Test Buttons */}
                    <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-4">Simuler des Conversions</h2>
                        <div className="flex gap-4">
                            <button
                                onClick={simulateLead}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                            >
                                📧 Simuler Lead
                            </button>
                            <button
                                onClick={simulateSale}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg transition"
                            >
                                💰 Simuler Achat 50€
                            </button>
                        </div>
                    </div>

                    {/* Console Logs */}
                    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                        <h2 className="text-xl font-semibold mb-4">Console</h2>
                        <div className="bg-black rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto">
                            {logs.length === 0 ? (
                                <span className="text-zinc-600">Waiting for events...</span>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="text-green-400">{log}</div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Back Link */}
                    <div className="mt-6 text-center">
                        <a href="/" className="text-blue-400 hover:text-blue-300">
                            ← Retour à l&apos;accueil
                        </a>
                    </div>
                </div>
            </div>
        </>
    )
}
