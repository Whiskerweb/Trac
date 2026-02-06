'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, X, ArrowRight } from 'lucide-react'
import { getProfileCompletionStatus, type ProfileCompletionStatus } from '@/app/actions/sellers'

export default function ProfileCompletionBanner() {
    const [status, setStatus] = useState<ProfileCompletionStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        async function checkProfile() {
            const result = await getProfileCompletionStatus()
            if (result.success && result.status) {
                setStatus(result.status)

                // Check if user dismissed this session
                const sessionDismissed = sessionStorage.getItem('profile_banner_dismissed')
                if (sessionDismissed === 'true') {
                    setDismissed(true)
                }
            }
            setLoading(false)
        }
        checkProfile()
    }, [])

    function handleDismiss() {
        setDismissed(true)
        sessionStorage.setItem('profile_banner_dismissed', 'true')
    }

    // Don't show if loading, complete, or dismissed
    if (loading || !status || status.isComplete || dismissed) {
        return null
    }

    return (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium text-sm">
                            Complete your profile to appear in the Seller Network
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/seller/profile"
                            className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                        >
                            Complete Profile
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={handleDismiss}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
