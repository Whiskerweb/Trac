'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Key, Bell, Shield, Save, Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'api' | 'notifications'>('profile')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Profile state
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    // API Keys state
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)
    const [regenerating, setRegenerating] = useState(false)

    // Notifications state
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [weeklyReport, setWeeklyReport] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            // Load API keys
            const keysRes = await fetch('/api/auth/keys')
            const keysData = await keysRes.json()
            if (keysData.success) {
                setPublicKey(keysData.public_key)
                setSecretKey(keysData.secret_key)
            }

            // Load user profile (from session or API)
            const authRes = await fetch('/api/auth/me')
            const authData = await authRes.json()
            if (authData.user) {
                setName(authData.user.name || '')
                setEmail(authData.user.email || '')
            }
        } catch (err) {
            console.error('Failed to load settings:', err)
        }
    }

    async function saveProfile() {
        setSaving(true)
        // Simulate save - would call API in production
        await new Promise(r => setTimeout(r, 500))
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    async function regenerateKeys() {
        if (!confirm('Regenerate API keys? Your current keys will stop working.')) return
        setRegenerating(true)
        try {
            const res = await fetch('/api/auth/keys', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setPublicKey(data.public_key)
                setSecretKey(data.secret_key)
            }
        } catch (err) {
            console.error('Failed to regenerate keys:', err)
        }
        setRegenerating(false)
    }

    function copyToClipboard(text: string, keyType: string) {
        navigator.clipboard.writeText(text)
        setCopiedKey(keyType)
        setTimeout(() => setCopiedKey(null), 2000)
    }

    const tabs = [
        { id: 'profile', name: 'Profile', icon: User },
        { id: 'api', name: 'API Keys', icon: Key },
        { id: 'notifications', name: 'Notifications', icon: Bell },
    ] as const

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />

            <main className="flex-1 ml-64">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Tabs */}
                        <div className="border-b border-gray-200">
                            <nav className="flex">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.name}
                                        </button>
                                    )
                                })}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            disabled
                                            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                                    </div>
                                    <button
                                        onClick={saveProfile}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {saved ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                Saved!
                                            </>
                                        ) : saving ? (
                                            'Saving...'
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'api' && (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-amber-800">Keep your keys secure</p>
                                                <p className="text-sm text-amber-700 mt-1">
                                                    Never share your secret key publicly. Use environment variables in production.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Public Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Public Key
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700 truncate">
                                                {publicKey || 'Loading...'}
                                            </code>
                                            <button
                                                onClick={() => publicKey && copyToClipboard(publicKey, 'public')}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                                title="Copy"
                                            >
                                                {copiedKey === 'public' ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Secret Key */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Secret Key
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700 truncate">
                                                {showSecret ? secretKey || 'Loading...' : '••••••••••••••••••••'}
                                            </code>
                                            <button
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                                title={showSecret ? "Hide" : "Show"}
                                            >
                                                {showSecret ? (
                                                    <EyeOff className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => secretKey && copyToClipboard(secretKey, 'secret')}
                                                className="p-2 hover:bg-gray-100 rounded-lg"
                                                title="Copy"
                                            >
                                                {copiedKey === 'secret' ? (
                                                    <Check className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={regenerateKeys}
                                        disabled={regenerating}
                                        className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                                        {regenerating ? 'Regenerating...' : 'Regenerate Keys'}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                        <div>
                                            <p className="font-medium text-gray-900">Email Notifications</p>
                                            <p className="text-sm text-gray-500">Receive alerts for new sales and conversions</p>
                                        </div>
                                        <button
                                            onClick={() => setEmailNotifications(!emailNotifications)}
                                            className={`w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                        <div>
                                            <p className="font-medium text-gray-900">Weekly Report</p>
                                            <p className="text-sm text-gray-500">Get a summary of your performance every Monday</p>
                                        </div>
                                        <button
                                            onClick={() => setWeeklyReport(!weeklyReport)}
                                            className={`w-12 h-6 rounded-full transition-colors ${weeklyReport ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${weeklyReport ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
