'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, MapPin, Monitor, Globe, Smartphone, Calendar, DollarSign, Link2, ExternalLink, Copy, Check, MousePointer, ShoppingCart, UserPlus, Loader2, User } from 'lucide-react'
import { getCustomerWithActivity, CustomerDetailWithActivity, CustomerActivity } from '@/app/actions/customers'

function Avatar({ name, avatar, size = 'md' }: { name: string | null; avatar: string | null; size?: 'sm' | 'md' | 'lg' }) {
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-lg'
    }

    if (avatar) {
        return (
            <img
                src={avatar}
                alt={name || 'Customer'}
                className={`${sizeClasses[size]} rounded-full object-cover`}
            />
        )
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600`}>
            {initials}
        </div>
    )
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

function formatDateTime(date: Date): string {
    const d = new Date(date)
    return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function formatCurrency(cents: number): string {
    return `€${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getActivityIcon(type: CustomerActivity['type']) {
    switch (type) {
        case 'sale': return <ShoppingCart className="w-4 h-4 text-green-500" />
        case 'lead': return <UserPlus className="w-4 h-4 text-blue-500" />
        case 'click': return <MousePointer className="w-4 h-4 text-purple-500" />
        default: return <Globe className="w-4 h-4 text-gray-400" />
    }
}

function getActivityBadgeStyles(type: CustomerActivity['type']) {
    switch (type) {
        case 'sale': return 'bg-green-50 text-green-700'
        case 'lead': return 'bg-blue-50 text-blue-700'
        case 'click': return 'bg-purple-50 text-purple-700'
        default: return 'bg-gray-50 text-gray-700'
    }
}

export default function CustomerProfilePage() {
    const router = useRouter()
    const params = useParams()
    const [loading, setLoading] = useState(true)
    const [customer, setCustomer] = useState<CustomerDetailWithActivity | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        async function loadCustomer() {
            if (!params.customerId || typeof params.customerId !== 'string') return

            const result = await getCustomerWithActivity(params.customerId)
            if (result.success && result.customer) {
                setCustomer(result.customer)
            }
            setLoading(false)
        }
        loadCustomer()
    }, [params.customerId])

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <User className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-900 font-medium">Customer non trouvé</p>
                <button
                    onClick={() => router.push('/dashboard/customers')}
                    className="mt-4 text-sm text-blue-600 hover:underline"
                >
                    Retour aux customers
                </button>
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
                        <Avatar name={customer.name} avatar={customer.avatar} size="lg" />
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                {customer.name || customer.email || customer.externalId}
                            </h1>
                            {customer.email && customer.name && (
                                <p className="text-gray-500">{customer.email}</p>
                            )}
                            {customer.referrerName && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-400">Référé par</span>
                                    <span className="text-sm font-medium text-purple-600">{customer.referrerName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sales Table */}
                    {customer.sales.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventes</h2>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID Commande</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {customer.sales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(sale.timestamp)}</td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-500">{sale.orderId.slice(0, 20)}...</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(sale.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                                    {customer.sales.length} vente{customer.sales.length > 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lead Events */}
                    {customer.leadEvents.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads</h2>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="divide-y divide-gray-50">
                                    {customer.leadEvents.map((lead) => (
                                        <div key={lead.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <UserPlus className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-gray-900">{lead.eventName}</span>
                                            </div>
                                            <span className="text-sm text-gray-500">{formatDateTime(lead.createdAt)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Timeline */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité</h2>
                        {customer.activity.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                                <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Aucune activité enregistrée</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customer.activity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3 group">
                                        <div className="mt-0.5">
                                            {getActivityIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getActivityBadgeStyles(item.type)}`}>
                                                    {item.type === 'click' ? 'Click' : item.type === 'lead' ? 'Lead' : 'Vente'}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">{item.description}</span>
                                                {item.amount && (
                                                    <span className="text-sm font-semibold text-green-600">
                                                        {formatCurrency(item.amount * 100)}
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
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(item.timestamp)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="w-64 shrink-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Détails</h3>
                    <div className="space-y-4">
                        {/* Location */}
                        {(customer.city || customer.country) && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    {[customer.city, customer.region, customer.country].filter(Boolean).join(', ')}
                                </span>
                            </div>
                        )}

                        {/* OS */}
                        {customer.os && (
                            <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{customer.os}</span>
                            </div>
                        )}

                        {/* Device */}
                        {customer.device && (
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{customer.device}</span>
                            </div>
                        )}

                        {/* Browser */}
                        {customer.browser && (
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{customer.browser}</span>
                            </div>
                        )}

                        <hr className="border-gray-100" />

                        {/* Customer Since */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Client depuis</p>
                            <p className="text-sm text-gray-900">{formatDate(customer.createdAt)}</p>
                        </div>

                        {/* Lifetime Value */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Valeur totale</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(customer.lifetimeValue)}</p>
                        </div>

                        {/* External ID */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">External ID</p>
                            <div className="flex items-center gap-2">
                                <code className="text-sm text-gray-900 font-mono truncate max-w-[150px]">{customer.externalId}</code>
                                <button
                                    onClick={() => handleCopy(customer.externalId)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Referrer Link */}
                        {customer.referrerLinkSlug && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Lien d'affiliation</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900">/{customer.referrerLinkSlug}</span>
                                    <a
                                        href={`/s/${customer.referrerLinkSlug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Referrer Info */}
                        {customer.referrerName && (
                            <>
                                <hr className="border-gray-100" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-2">Référent</p>
                                    <div className="flex items-center gap-2">
                                        <Avatar name={customer.referrerName} avatar={customer.referrerAvatar} size="sm" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{customer.referrerName}</p>
                                            {customer.referrerEmail && (
                                                <p className="text-xs text-gray-500">{customer.referrerEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
