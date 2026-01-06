'use client'

import { useState, useEffect } from 'react'
import {
    Activity, MousePointer2, DollarSign, Clock,
    Link2, User, Globe, Smartphone, RefreshCw,
    AlertCircle, ChevronDown, ChevronUp, Monitor,
    Shield, Zap, Package
} from 'lucide-react'

interface ActivityEvent {
    type: 'click' | 'sale'
    timestamp: string
    link_id: string | null
    link_slug?: string | null
    affiliate_id: string | null
    workspace_id: string
    amount?: number
    net_amount?: number
    currency?: string
    click_id?: string
    country?: string
    device?: string
    // NEW: Mission Control fields
    hostname?: string
    product_name?: string
    user_agent?: string
    referrer?: string
    payment_processor?: string
}

interface ActivityLogProps {
    mode: 'startup' | 'affiliate'
}

// Country code to emoji flag
function countryToFlag(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌍'
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
}

// Parse browser from user agent
function parseBrowser(ua: string | undefined): string {
    if (!ua) return ''
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
    return 'Other'
}

// Check if hostname is a custom domain (not default)
function isCustomDomain(hostname: string | undefined): boolean {
    if (!hostname) return false
    const defaultDomains = ['traaaction.com', 'www.traaaction.com', 'localhost', '127.0.0.1']
    return !defaultDomains.some(d => hostname.includes(d))
}

export function ActivityLog({ mode }: ActivityLogProps) {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

    async function fetchActivity() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/stats/activity?mode=${mode}&limit=30`)
            const data = await res.json()
            if (data.success) {
                setEvents(data.events)
                setLastUpdate(new Date())
            } else {
                setError(data.error || 'Failed to load')
            }
        } catch (err) {
            setError('Network error')
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchActivity()
        // Auto refresh every 15 seconds (faster polling)
        const interval = setInterval(fetchActivity, 15000)
        return () => clearInterval(interval)
    }, [mode])

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    }

    const formatCurrency = (cents: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
        }).format(cents / 100)
    }

    return (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-slate-800 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Activity className="w-4 h-4 text-green-400" />
                        {!loading && events.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                    </div>
                    <span className="text-white font-medium text-sm">Mission Control</span>
                    <span className="text-slate-400 text-xs">
                        ({mode === 'startup' ? 'Startup View' : 'Affiliate View'})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdate && (
                        <span className="text-xs text-slate-500">
                            {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchActivity() }}
                        className="p-1 hover:bg-slate-700 rounded"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Body */}
            {expanded && (
                <div className="max-h-96 overflow-y-auto">
                    {loading && events.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-400 text-sm flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            No activity yet
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {events.map((event, idx) => (
                                <div key={idx} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        {/* Event Type Icon */}
                                        <div className={`p-1.5 rounded ${event.type === 'click' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                                            {event.type === 'click' ? (
                                                <MousePointer2 className="w-3.5 h-3.5 text-blue-400" />
                                            ) : (
                                                <DollarSign className="w-3.5 h-3.5 text-green-400" />
                                            )}
                                        </div>

                                        {/* Event Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-sm flex-wrap">
                                                <span className={`font-semibold ${event.type === 'click' ? 'text-blue-400' : 'text-green-400'}`}>
                                                    {event.type === 'click' ? 'CLICK' : 'SALE'}
                                                </span>

                                                {/* Amount for sales */}
                                                {event.type === 'sale' && event.amount !== undefined && (
                                                    <span className="text-green-300 font-bold">
                                                        {formatCurrency(event.amount, event.currency)}
                                                    </span>
                                                )}

                                                {/* Net amount badge for sales */}
                                                {event.type === 'sale' && event.net_amount !== undefined && event.net_amount !== event.amount && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-300 rounded">
                                                        net: {formatCurrency(event.net_amount, event.currency)}
                                                    </span>
                                                )}

                                                {/* Country Flag */}
                                                {event.country && (
                                                    <span className="text-base" title={event.country}>
                                                        {countryToFlag(event.country)}
                                                    </span>
                                                )}

                                                {/* Custom Domain Badge - CRITICAL for validation */}
                                                {event.hostname && (
                                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${isCustomDomain(event.hostname)
                                                            ? 'bg-purple-900/50 text-purple-300'
                                                            : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                        {isCustomDomain(event.hostname) ? (
                                                            <>
                                                                <Shield className="w-3 h-3" />
                                                                {event.hostname}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Globe className="w-3 h-3" />
                                                                Default
                                                            </>
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Product Name for sales */}
                                            {event.type === 'sale' && event.product_name && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-amber-300">
                                                    <Package className="w-3 h-3" />
                                                    {event.product_name}
                                                </div>
                                            )}

                                            {/* Attribution Info */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                                                {event.link_id && (
                                                    <span className="flex items-center gap-1">
                                                        <Link2 className="w-3 h-3" />
                                                        <code className="text-purple-400">{event.link_slug || event.link_id.slice(0, 8) + '...'}</code>
                                                    </span>
                                                )}
                                                {event.affiliate_id && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <code className="text-amber-400">{event.affiliate_id.slice(0, 8)}...</code>
                                                    </span>
                                                )}
                                                {event.device && (
                                                    <span className="flex items-center gap-1">
                                                        <Smartphone className="w-3 h-3" />
                                                        {event.device}
                                                    </span>
                                                )}
                                                {event.user_agent && (
                                                    <span className="flex items-center gap-1">
                                                        <Monitor className="w-3 h-3" />
                                                        {parseBrowser(event.user_agent)}
                                                    </span>
                                                )}
                                                {event.type === 'sale' && event.payment_processor && (
                                                    <span className="flex items-center gap-1">
                                                        <Zap className="w-3 h-3 text-yellow-400" />
                                                        {event.payment_processor}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timestamp */}
                                        <div className="text-right text-xs text-slate-500 flex-shrink-0">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(event.timestamp)}
                                            </div>
                                            <div>{formatDate(event.timestamp)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Footer Legend */}
            {expanded && (
                <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-purple-400" />
                            First-Party
                        </span>
                        <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-slate-400" />
                            Default
                        </span>
                        <span className="flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-purple-400" />
                            link_id
                        </span>
                        <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            processor
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>Auto-refresh: 15s</span>
                    </div>
                </div>
            )}
        </div>
    )
}
