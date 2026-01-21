'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, MapPin, Monitor, Globe, Smartphone, Calendar, DollarSign, Link2, ExternalLink, Copy, Check, MousePointer, ShoppingCart, UserPlus, Loader2 } from 'lucide-react'

interface CustomerProfile {
    id: string
    name: string
    email: string
    avatar: string
    location: string
    os: string
    device: string
    browser: string
    customerSince: Date
    lifetimeValue: number
    externalId: string
    referralLink: string
}

interface Sale {
    id: string
    date: Date
    event: string
    amount: number
}

interface Activity {
    id: string
    type: 'subscription' | 'signup' | 'click' | 'sale' | 'lead'
    description: string
    metadata?: Record<string, string>
    date: Date
    source?: string
}

// Mock data - matches Traaaction screenshot
const MOCK_CUSTOMER: CustomerProfile = {
    id: 'cust_1',
    name: 'Marvin Ta',
    email: 'marvin@email.com',
    avatar: 'MT',
    location: 'Los Angeles, USA',
    os: 'Mac OS',
    device: 'Desktop',
    browser: 'Safari',
    customerSince: new Date('2024-10-02'),
    lifetimeValue: 140,
    externalId: 'cjk29fsj3l1',
    referralLink: 'traaaction.com'
}

const MOCK_SALES: Sale[] = [
    { id: '1', date: new Date('2025-04-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '2', date: new Date('2025-03-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '3', date: new Date('2025-02-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '4', date: new Date('2025-01-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '5', date: new Date('2024-12-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '6', date: new Date('2024-11-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '7', date: new Date('2024-10-02T15:34:00'), event: 'Invoice paid', amount: 20 },
    { id: '8', date: new Date('2024-09-02T15:34:00'), event: 'Subscription created', amount: 20 },
]

const MOCK_ACTIVITY: Activity[] = [
    {
        id: '1',
        type: 'subscription',
        description: 'Subscription creation',
        metadata: { country: 'US', ip_address: 'xxxxxx', view: 'metadata' },
        date: new Date('2024-10-02T15:34:00')
    },
    {
        id: '2',
        type: 'signup',
        description: 'Sign up',
        metadata: { country: 'US', ip_address: 'xxxxxx' },
        date: new Date('2024-09-02T15:34:00')
    },
    {
        id: '3',
        type: 'click',
        description: 'Found',
        source: 'refer.traaaction.com/steven via direct',
        date: new Date('2024-09-02T15:31:00')
    },
    {
        id: '4',
        type: 'click',
        description: 'Found',
        source: 'refer.traaaction.com/steven via youtube.com',
        date: new Date('2024-04-02T15:34:00')
    },
    {
        id: '5',
        type: 'lead',
        description: 'Lead registered via partner link',
        date: new Date('2024-08-15T10:00:00')
    },
    {
        id: '6',
        type: 'sale',
        description: 'First purchase completed',
        date: new Date('2024-09-05T14:22:00')
    },
]

function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600`}>
            {initials}
        </div>
    )
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(date: Date): string {
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function formatCurrency(amount: number): string {
    return `$${amount} USD`
}

function getActivityIcon(type: Activity['type']) {
    switch (type) {
        case 'subscription': return <DollarSign className="w-4 h-4 text-green-500" />
        case 'signup': return <UserPlus className="w-4 h-4 text-blue-500" />
        case 'click': return <MousePointer className="w-4 h-4 text-purple-500" />
        case 'sale': return <ShoppingCart className="w-4 h-4 text-orange-500" />
        case 'lead': return <Check className="w-4 h-4 text-green-500" />
        default: return <Globe className="w-4 h-4 text-gray-400" />
    }
}

export default function CustomerProfilePage() {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [customer, setCustomer] = useState<CustomerProfile | null>(null)
    const [sales, setSales] = useState<Sale[]>([])
    const [activity, setActivity] = useState<Activity[]>([])
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        // Simulate loading - In production, fetch from API
        setTimeout(() => {
            setCustomer(MOCK_CUSTOMER)
            setSales(MOCK_SALES)
            setActivity(MOCK_ACTIVITY)
            setLoading(false)
        }, 300)
    }, [params.customerId])

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading || !customer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button
                onClick={() => router.push('/dashboard/customers')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Customers
            </button>

            {/* Main Content */}
            <div className="flex gap-8">
                {/* Left Column - Sales & Activity */}
                <div className="flex-1 space-y-6">
                    {/* Customer Header */}
                    <div className="flex items-center gap-4">
                        <Avatar initials={customer.avatar} size="lg" />
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
                            <p className="text-gray-500">{customer.email}</p>
                        </div>
                    </div>

                    {/* Sales Table */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales</h2>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Sale Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(sale.date)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{sale.event}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(sale.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                                {sales.length} of {sales.length} results
                            </div>
                        </div>
                    </div>

                    {/* Activity */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
                        <div className="space-y-4">
                            {activity.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 group">
                                    <div className="mt-0.5">
                                        {getActivityIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">{item.description}</span>
                                            {item.source && (
                                                <span className="text-sm text-gray-500">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                        <Link2 className="w-3 h-3" />
                                                        {item.source}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        {item.metadata && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {Object.entries(item.metadata).map(([key, value]) => (
                                                    <span key={key} className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                                        {key}: {value}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(item.date)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
                    <div className="space-y-4">
                        {/* Location */}
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{customer.location}</span>
                        </div>

                        {/* OS */}
                        <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{customer.os}</span>
                        </div>

                        {/* Device */}
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{customer.device}</span>
                        </div>

                        {/* Browser */}
                        <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{customer.browser}</span>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Customer Since */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Customer since</p>
                            <p className="text-sm text-gray-900">{formatDate(customer.customerSince)}</p>
                        </div>

                        {/* Lifetime Value */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Lifetime value</p>
                            <p className="text-sm text-gray-900">${customer.lifetimeValue}</p>
                        </div>

                        {/* External ID */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">External ID</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm text-gray-900 font-mono">{customer.externalId}</code>
                                <button
                                    onClick={() => handleCopy(customer.externalId)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Referral Link */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Referral link</p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-900">{customer.referralLink}</span>
                                <a
                                    href={`https://${customer.referralLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
