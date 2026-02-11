'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Check, ArrowLeft } from 'lucide-react'
import { joinGroup } from '@/app/actions/group-actions'

export default function JoinGroupPage() {
    const router = useRouter()
    const params = useParams()
    const code = params.code as string

    const [loading, setLoading] = useState(false)
    const [joined, setJoined] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleJoin = async () => {
        setLoading(true)
        setError(null)

        const result = await joinGroup(code)

        if (result.success && result.groupId) {
            setJoined(true)
            setTimeout(() => router.push(`/seller/groups/${result.groupId}`), 1500)
        } else {
            setError(result.error || 'Failed to join group')
            setLoading(false)
        }
    }

    if (joined) {
        return (
            <div className="max-w-md mx-auto px-6 py-20 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">You joined the group!</h1>
                <p className="text-gray-500 mt-2">Redirecting...</p>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto px-6 py-20">
            <Link href="/seller/groups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
                    <Users className="w-8 h-8 text-violet-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Join a Group</h1>
                <p className="text-gray-500 mt-2 mb-6">
                    You&apos;ve been invited to join a seller group. All group mission earnings will be split equally among members.
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Join Group
                </button>

                <p className="text-xs text-gray-400 mt-4">
                    Invite code: <span className="font-mono">{code}</span>
                </p>
            </div>
        </div>
    )
}
