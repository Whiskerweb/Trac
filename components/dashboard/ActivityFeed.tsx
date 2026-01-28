'use client'

import { useEffect, useState } from 'react'
import { MousePointerClick, UserPlus, ShoppingCart } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityEvent {
    id: string
    type: 'click' | 'lead' | 'sale'
    timestamp: string
    seller: {
        id: string
        name: string
        avatar?: string
    }
    metadata?: {
        amount?: number
        eventName?: string
    }
}

interface ActivityFeedProps {
    workspaceId?: string
}

export function ActivityFeed({ workspaceId }: ActivityFeedProps) {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchActivity() {
            try {
                const response = await fetch('/api/stats/activity?limit=20')
                if (response.ok) {
                    const data = await response.json()
                    // Transform events to include seller info or default
                    const transformedEvents = (data.data || []).map((event: any) => ({
                        ...event,
                        seller: event.seller || {
                            id: 'anonymous',
                            name: 'Anonymous',
                            avatar: undefined
                        }
                    }))
                    setEvents(transformedEvents)
                }
            } catch (error) {
                console.error('Failed to fetch activity:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchActivity()
        // Refresh every 30 seconds
        const interval = setInterval(fetchActivity, 30000)
        return () => clearInterval(interval)
    }, [workspaceId])

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'click':
                return <MousePointerClick className="w-3.5 h-3.5 text-violet-600" />
            case 'lead':
                return <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            case 'sale':
                return <ShoppingCart className="w-3.5 h-3.5 text-green-600" />
            default:
                return <MousePointerClick className="w-3.5 h-3.5 text-gray-600" />
        }
    }

    const getEventText = (event: ActivityEvent) => {
        switch (event.type) {
            case 'click':
                return 'triggered a click'
            case 'lead':
                return event.metadata?.eventName
                    ? `generated a lead (${event.metadata.eventName})`
                    : 'generated a lead'
            case 'sale':
                return event.metadata?.amount
                    ? `made a sale (€${(event.metadata.amount / 100).toFixed(2)})`
                    : 'made a sale'
            default:
                return 'triggered an event'
        }
    }

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-base font-semibold text-gray-900">Live Activity</h3>
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-start gap-2 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-200" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-gray-200 rounded w-3/4" />
                                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-base font-semibold text-gray-900">Live Activity</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    Recent clicks, leads, and sales
                </p>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-gray-50 max-h-[450px] overflow-y-auto">
                {events.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 mx-auto mb-2 flex items-center justify-center">
                            <MousePointerClick className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">No recent activity</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Events will appear here as they happen
                        </p>
                    </div>
                ) : (
                    events.map((event, index) => (
                        <div
                            key={`${event.type}-${event.timestamp}-${index}`}
                            className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="flex items-start gap-2.5">
                                {/* Seller Avatar */}
                                <div className="flex-shrink-0">
                                    {event.seller.avatar ? (
                                        <img
                                            src={event.seller.avatar}
                                            alt={event.seller.name}
                                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                                            {event.seller.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-medium text-gray-900">
                                            {event.seller.name}
                                        </p>
                                        <span className="flex-shrink-0">
                                            {getEventIcon(event.type)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                        {getEventText(event)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {events.length > 0 && (
                <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-500 text-center">
                        Showing last {events.length} events
                    </p>
                </div>
            )}
        </div>
    )
}
