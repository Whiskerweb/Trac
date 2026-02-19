'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Users, Check, ArrowRight } from 'lucide-react'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'
import { getOrgByInviteCode, joinOrgByInviteCode } from '@/app/actions/organization-actions'

export default function InviteCodePage() {
    const params = useParams()
    const router = useRouter()
    const code = params.code as string

    const [org, setOrg] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [joined, setJoined] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            const result = await getOrgByInviteCode(code)
            if (result.success) {
                setOrg(result.organization)
            }
            setLoading(false)
        }
        load()
    }, [code])

    const handleJoin = async () => {
        setJoining(true)
        setError('')
        const result = await joinOrgByInviteCode(code)
        if (result.success) {
            setJoined(true)
            setTimeout(() => {
                router.push('/seller/organizations/my')
            }, 1500)
        } else {
            setError(result.error || 'Failed to join')
        }
        setJoining(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <TraaactionLoader size={28} className="text-gray-300" />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">Invalid or expired invite link</p>
                <Link href="/" className="text-violet-600 text-sm font-medium hover:underline">Back to home</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
            <div className="max-w-md mx-auto px-4 text-center">
                {/* Logo */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl font-bold text-white">{org.name.charAt(0)}</span>
                </div>

                <p className="text-sm text-gray-400 mb-2">You've been invited to join</p>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{org.name}</h1>

                {org.description && (
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">{org.description}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mb-8">
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        <Users className="w-4 h-4" />
                        {org.memberCount} members
                    </div>
                    {org.leaderName && (
                        <p className="text-sm text-gray-400">Led by {org.leaderName}</p>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl mb-4">{error}</p>
                )}

                {/* CTA */}
                {joined ? (
                    <div className="flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                        <Check className="w-5 h-5" /> Joined! Redirecting...
                    </div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 w-full"
                    >
                        {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Accept Invitation
                    </button>
                )}

                <p className="text-xs text-gray-400 mt-4">
                    You need to be signed in to join
                </p>

                {/* Branding */}
                <div className="mt-12 pt-8 border-t border-gray-100">
                    <a href="https://traaaction.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                        <img src="/Logotrac/logo1.png" alt="Traaaction" className="w-6 h-6 rounded-lg" />
                        Propulsé par traaaction.com
                    </a>
                </div>
            </div>
        </div>
    )
}
