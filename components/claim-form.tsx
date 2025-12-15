'use client'

import { useState } from 'react'

interface ClaimFormProps {
    projectId: string
    destinationUrl: string
}

export default function ClaimForm({ projectId, destinationUrl }: ClaimFormProps) {
    const [userId, setUserId] = useState('')
    const [linkName, setLinkName] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; tracking_url?: string; error?: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setResult(null)

        try {
            const response = await fetch('/api/links/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId,
                    destinationUrl,
                    userId,
                    name: linkName || undefined,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                setResult({ success: true, tracking_url: data.tracking_url })
                // Clear form on success
                setUserId('')
                setLinkName('')
            } else {
                setResult({ success: false, error: data.error || 'Failed to claim link' })
            }
        } catch (error) {
            setResult({ success: false, error: 'Network error. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-zinc-300 mb-2">
                        Your User ID *
                    </label>
                    <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                        placeholder="e.g., thomas_123"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                        Link Name (optional)
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={linkName}
                        onChange={(e) => setLinkName(e.target.value)}
                        placeholder="e.g., My Instagram Link"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !userId}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                >
                    {loading ? 'Claiming...' : 'CLAIM LINK 🚀'}
                </button>
            </form>

            {/* Result Display */}
            {result && (
                <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {result.success ? (
                        <div>
                            <p className="text-green-400 font-semibold mb-2">✅ Link claimed successfully!</p>
                            <p className="text-sm text-zinc-300 mb-2">Your tracking link:</p>
                            <div className="bg-zinc-900 p-3 rounded border border-zinc-700">
                                <code className="text-sm text-blue-300 break-all">{result.tracking_url}</code>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(result.tracking_url!)
                                    alert('Copied to clipboard!')
                                }}
                                className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                                📋 Copy to clipboard
                            </button>
                        </div>
                    ) : (
                        <p className="text-red-400">❌ {result.error}</p>
                    )}
                </div>
            )}
        </div>
    )
}
