'use client'

import { useState, useEffect } from 'react'
import { User, Key, Bell, Shield, Save, Check, Copy, Eye, EyeOff, RefreshCw, Mail, Percent, Tag } from 'lucide-react'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'api' | 'notifications' | 'discount'>('profile')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Profile Data
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [secretKey, setSecretKey] = useState<string | null>(null)
    const [showSecret, setShowSecret] = useState(false)

    // Discount Data
    const [discountEnabled, setDiscountEnabled] = useState(false)
    const [discountAmount, setDiscountAmount] = useState<number>(20)
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
    const [couponId, setCouponId] = useState('')
    const [couponTestId, setCouponTestId] = useState('')

    useEffect(() => {
        const load = async () => {
            // Load auth and keys
            const [auth, keys] = await Promise.all([
                fetch('/api/auth/me').then(r => r.json()),
                fetch('/api/auth/keys').then(r => r.json())
            ])
            if (auth.user) {
                setName(auth.user.name || '')
                setEmail(auth.user.email || '')
            }
            if (keys.success) {
                setPublicKey(keys.public_key)
                setSecretKey(keys.secret_key)
            }

            // Load discount settings
            try {
                const discountRes = await fetch('/api/settings/discount')
                if (discountRes.ok) {
                    const discountData = await discountRes.json()
                    if (discountData.discount) {
                        setDiscountEnabled(discountData.discount.active)
                        setDiscountAmount(discountData.discount.amount)
                        setDiscountType(discountData.discount.type)
                        setCouponId(discountData.discount.coupon_id || '')
                        setCouponTestId(discountData.discount.coupon_test_id || '')
                    }
                }
            } catch (e) {
                // Discount not set yet
            }
        }
        load()
    }, [])

    async function saveProfile() {
        setSaving(true)
        await new Promise(r => setTimeout(r, 600))
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    async function saveDiscount() {
        setSaving(true)
        try {
            const res = await fetch('/api/settings/discount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: discountAmount,
                    type: discountType,
                    coupon_id: couponId || null,
                    coupon_test_id: couponTestId || null,
                    active: discountEnabled
                })
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } catch (e) {
            console.error('Failed to save discount:', e)
        }
        setSaving(false)
    }

    const tabs = [
        { id: 'profile', label: 'General' },
        { id: 'api', label: 'API Keys' },
        { id: 'discount', label: 'Discount' },
        { id: 'notifications', label: 'Notifications' },
    ] as const

    return (
        <div className="w-full max-w-4xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Settings</h1>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="max-w-xl">
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={saveProfile}
                                disabled={saving}
                                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-70 transition-all flex items-center gap-2"
                            >
                                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {saved ? 'Saved' : saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'api' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex gap-3">
                            <Shield className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Security Note</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Your secret key grants full access to your account. Never share it client-side.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Public Key</label>
                            <div className="flex gap-2">
                                <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm text-gray-600 truncate">
                                    {publicKey || 'Loading...'}
                                </code>
                                <button
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                                    onClick={() => navigator.clipboard.writeText(publicKey || '')}
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret Key</label>
                            <div className="flex gap-2">
                                <code className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm text-gray-800 truncate">
                                    {showSecret ? secretKey : 'sk_live_••••••••••••••••••••••••••••'}
                                </code>
                                <button
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                                >
                                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                                    onClick={() => navigator.clipboard.writeText(secretKey || '')}
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'discount' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex gap-3">
                            <Percent className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Partner Discount</p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Configure a discount for users referred by your partners. This creates a dual-sided incentive.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Enable Discount</p>
                                <p className="text-xs text-gray-500 mt-0.5">Show discount banner to referred users</p>
                            </div>
                            <button
                                onClick={() => setDiscountEnabled(!discountEnabled)}
                                className={`h-6 w-11 rounded-full relative transition-colors ${discountEnabled ? 'bg-black' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm transition-all ${discountEnabled ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>

                        {discountEnabled && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={discountAmount}
                                            onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                                        <select
                                            value={discountType}
                                            onChange={(e) => setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                        >
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="FIXED">Fixed Amount (€)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Stripe Coupon ID (Production)
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g., PARTNER20"
                                            value={couponId}
                                            onChange={(e) => setCouponId(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Create in Stripe Dashboard → Products → Coupons</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Stripe Coupon ID (Test Mode)
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g., PARTNER20_TEST"
                                            value={couponTestId}
                                            onChange={(e) => setCouponTestId(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <button
                                onClick={saveDiscount}
                                disabled={saving}
                                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-70 transition-all flex items-center gap-2"
                            >
                                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {saved ? 'Saved' : saving ? 'Saving...' : 'Save Discount'}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-full">
                                    <Bell className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Weekly Digest</p>
                                    <p className="text-xs text-gray-500">Receive a weekly summary of your stats.</p>
                                </div>
                            </div>
                            <div className="h-6 w-11 bg-black rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

