'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getMissionByInviteCode, joinMissionByInviteCode } from '@/app/actions/marketplace'
import { Gift, Check, ArrowRight, AlertCircle, Loader2, Lock, ExternalLink } from 'lucide-react'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'
import Link from 'next/link'

interface MissionData {
    id: string
    title: string
    description: string
    reward: string
    visibility: string
    workspace_name: string
}

export default function InvitePage(props: { params: Promise<{ code: string }> }) {
    const params = use(props.params)
    const router = useRouter()
    const [mission, setMission] = useState<MissionData | null>(null)
    const [isEnrolled, setIsEnrolled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<{ linkUrl: string } | null>(null)

    useEffect(() => {
        async function loadMission() {
            setLoading(true)
            setError(null)

            const result = await getMissionByInviteCode(params.code)

            if (result.success && result.mission) {
                setMission(result.mission)
                setIsEnrolled(result.isEnrolled || false)
            } else {
                setError(result.error || 'Invalid invitation link')
            }

            setLoading(false)
        }

        loadMission()
    }, [params.code])

    const handleJoin = async () => {
        setJoining(true)
        setError(null)

        const result = await joinMissionByInviteCode(params.code)

        if (result.success && result.enrollment) {
            setSuccess({ linkUrl: result.enrollment.link_url })
            setIsEnrolled(true)
        } else {
            setError(result.error || 'Failed to join mission')
        }

        setJoining(false)
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <TraaactionLoader size={40} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Loading invitation...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error && !mission) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Invalid Invitation
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {error}
                    </p>
                    <Link
                        href="/seller/marketplace"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                        Browse Marketplace
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        You&apos;re In!
                    </h1>
                    <p className="text-gray-500 mb-6">
                        You&apos;ve successfully joined <span className="font-semibold text-gray-900">{mission?.title}</span>
                    </p>

                    {/* Affiliate Link */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Your Affiliate Link</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={success.linkUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-mono"
                            />
                            <button
                                onClick={() => navigator.clipboard.writeText(success.linkUrl)}
                                className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link
                            href="/seller"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                            href={success.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                        >
                            Test Your Link
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    // Mission preview state
    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Gift className="w-8 h-8 text-violet-600" />
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium mb-4">
                        <Lock className="w-3.5 h-3.5" />
                        Private Invitation
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        You&apos;ve Been Invited
                    </h1>
                </div>

                {/* Mission Details */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        from {mission?.workspace_name}
                    </p>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">
                        {mission?.title}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {mission?.description}
                    </p>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                        <span className="text-lg">{mission?.reward}</span>
                        <span className="text-sm text-gray-500 font-normal">commission</span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Action Buttons */}
                {isEnrolled ? (
                    <div className="text-center">
                        <p className="text-gray-500 mb-4">You&apos;re already enrolled in this mission.</p>
                        <Link
                            href="/seller"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {joining ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                Accept Invitation
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                )}

                {/* Footer */}
                <p className="text-center text-gray-400 text-sm mt-6">
                    Need an account?{' '}
                    <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
