'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

const NOTIFICATION_PREFS = [
    {
        icon: '📊',
        title: 'New commission event',
        description: 'Alert when a new commission event is created.',
        key: 'commission_event'
    },
    {
        icon: '✅',
        title: 'Application approval',
        description: 'Alert when an application to a program is approved.',
        key: 'application_approval'
    },
    {
        icon: '💬',
        title: 'New message from program',
        description: 'Alert when a new message is received from a program.',
        key: 'new_message'
    },
    {
        icon: '📢',
        title: 'Marketing campaigns',
        description: 'Receive marketing emails from your programs.',
        key: 'marketing'
    },
]

export default function NotificationsPage() {
    const [prefs, setPrefs] = useState({
        commission_event: true,
        application_approval: true,
        new_message: true,
        marketing: true,
    })

    const toggle = (key: string) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-4xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                        Notifications
                    </h1>
                </div>

                {/* Notification Preferences */}
                <div className="bg-white rounded-lg border border-gray-200">
                    {NOTIFICATION_PREFS.map((pref, idx) => (
                        <div
                            key={pref.key}
                            className={`
                                flex items-center justify-between p-4
                                ${idx !== NOTIFICATION_PREFS.length - 1 ? 'border-b border-gray-100' : ''}
                            `}
                        >
                            <div className="flex items-start gap-3 flex-1">
                                <div className="text-2xl">{pref.icon}</div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900">
                                        {pref.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-0.5">
                                        {pref.description}
                                    </p>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <button
                                onClick={() => toggle(pref.key)}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                    ${prefs[pref.key as keyof typeof prefs] ? 'bg-blue-600' : 'bg-gray-200'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                        ${prefs[pref.key as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
