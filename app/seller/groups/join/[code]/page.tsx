'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Loader2, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { joinGroup } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

export default function JoinGroupPage() {
    const t = useTranslations('seller.groups')
    const router = useRouter()
    const params = useParams()
    const inviteCode = params.code as string

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [joined, setJoined] = useState(false)

    const handleJoin = async () => {
        setLoading(true)
        setError(null)

        const result = await joinGroup(inviteCode)

        if (result.success && result.groupId) {
            setJoined(true)
            setTimeout(() => {
                router.push(`/seller/groups/${result.groupId}`)
            }, 1000)
        } else {
            setError(result.error || 'Failed to join group')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-16"
            >
                <Link href="/seller/groups" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" /> {t('backToGroups')}
                </Link>

                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6 text-violet-600" />
                    </div>

                    <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('join')}</h1>
                    <p className="text-sm text-gray-500 mb-6">{t('invited')}</p>

                    <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-400 mb-0.5">{t('inviteCode')}</p>
                        <p className="text-sm font-mono font-medium text-gray-900">{inviteCode}</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {joined ? (
                        <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-600">
                            <Check className="w-4 h-4" />
                            {t('joinSuccess')} {t('redirecting')}
                        </div>
                    ) : (
                        <button
                            onClick={handleJoin}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('joinButton')}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
