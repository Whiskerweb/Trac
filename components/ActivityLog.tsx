'use client'

import { useState, useEffect } from 'react'
import {
    Activity, MousePointer2, DollarSign, Clock,
    Link2, User, Globe, Smartphone, RefreshCw,
    AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'

interface ActivityEvent {
    type: 'click' | 'sale'
    timestamp: string
    link_id: string | null
    affiliate_id: string | null
    workspace_id: string
    amount?: number
    currency?: string
    click_id?: string
    country?: string
    device?: string
}

interface ActivityLogProps {
    mode: 'startup' | 'affiliate'
}

export function ActivityLog({ mode }: ActivityLogProps) {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(true)

    async function fetchActivity() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/stats/activity?mode=${mode}&limit=30`)
            const data = await res.json()
            if (data.success) {
                setEvents(data.events)
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
        // Auto refresh every 30 seconds
        const interval = setInterval(fetchActivity, 30000)
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

    return (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-slate-800 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-white font-medium text-sm">Activity Log</span>
                    <span className="text-slate-400 text-xs">
                        ({mode === 'startup' ? 'Startup View' : 'Affiliate View'})
                    </span>
                </div>
                <div className="flex items-center gap-2">
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
                <div className="max-h-80 overflow-y-auto">
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
                                <div key={idx} className="px-4 py-2 hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        {/* Event Type Icon */}
                                        <div className={`p-1.5 rounded ${event.type === 'click' ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                                            {event.type === 'click' ? (
                                                <MousePointer2 className="w-3 h-3 text-blue-400" />
                                            ) : (
                                                <DollarSign className="w-3 h-3 text-green-400" />
                                            )}
                                        </div>

                                        {/* Event Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={`font-medium ${event.type === 'click' ? 'text-blue-400' : 'text-green-400'}`}>
                                                    {event.type === 'click' ? 'CLICK' : 'SALE'}
                                                </span>
                                                {event.amount && (
                                                    <span className="text-green-300 font-bold">
                                                        €{(event.amount / 100).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attribution Info */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                                                {event.link_id && (
                                                    <span className="flex items-center gap-1">
                                                        <Link2 className="w-3 h-3" />
                                                        <code className="text-purple-400">{event.link_id.slice(0, 8)}...</code>
                                                    </span>
                                                )}
                                                {event.affiliate_id && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <code className="text-amber-400">{event.affiliate_id.slice(0, 8)}...</code>
                                                    </span>
                                                )}
                                                {event.country && (
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="w-3 h-3" />
                                                        {event.country}
                                                    </span>
                                                )}
                                                {event.device && (
                                                    <span className="flex items-center gap-1">
                                                        <Smartphone className="w-3 h-3" />
                                                        {event.device}
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
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-purple-400" />
                            link_id
                        </span>
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            affiliate_id
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>Auto-refresh: 30s</span>
                    </div>
                </div>
            )}
        </div>
    )
}
