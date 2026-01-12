'use client'

import { useState, useEffect } from 'react'
import { Users, ShoppingCart, Award, UserPlus, Loader2 } from 'lucide-react'
import { getLastEvents, DashboardEvent } from '@/app/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// Event type icons and colors
const eventConfig = {
    click: { icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Click' },
    sale: { icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-50', label: 'Vente' },
    commission: { icon: Award, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Commission' },
    enrollment: { icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Inscription' },
}

function EventRow({ event }: { event: DashboardEvent }) {
    const config = eventConfig[event.type]
    const Icon = config.icon

    const partnerDisplay = event.partner_name || event.partner_email.split('@')[0]

    return (
        <div className="flex items-center gap-3 py-3 px-4 hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">
                        {partnerDisplay}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.color} font-medium`}>
                        {config.label}
                    </span>
                </div>
                {event.mission_title && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        {event.mission_title}
                    </p>
                )}
            </div>

            {/* Amount (if applicable) */}
            {event.amount && (
                <div className="text-right">
                    <span className="text-sm font-semibold text-green-600">
                        +{(event.amount / 100).toFixed(2)}€
                    </span>
                </div>
            )}

            {/* Time */}
            <div className="text-right w-20 flex-shrink-0">
                <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                        locale: fr
                    })}
                </span>
            </div>
        </div>
    )
}

export function LastEventsSection() {
    const [events, setEvents] = useState<DashboardEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadEvents() {
            const result = await getLastEvents(10)
            if (result.success && result.events) {
                setEvents(result.events)
            } else {
                setError(result.error || 'Failed to load events')
            }
            setLoading(false)
        }
        loadEvents()
    }, [])

    if (loading) {
        return (
            <div className="p-12 flex justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500 text-sm">
                {error}
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">Aucun événement</h3>
                <p className="text-gray-500 text-xs mt-1">
                    Les activités de vos partenaires apparaîtront ici.
                </p>
            </div>
        )
    }

    return (
        <div className="divide-y divide-gray-50">
            {events.map((event) => (
                <EventRow key={event.id} event={event} />
            ))}
        </div>
    )
}
