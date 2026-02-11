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
                router.push('/seller/groups')
            }, 1000)
        } else {
            setError(result.error || 'Failed to join group')
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md mx-auto py-8"
        >
            <Link
                href="/seller/groups"
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors mb-12"
            >
                <ArrowLeft className="w-3.5 h-3.5" /> {t('backToGroups')}
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center mb-12"
            >
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-6">
                    <Users className="w-4 h-4 text-neutral-400" />
                </div>
                <h1 className="text-2xl font-extralight tracking-tight text-neutral-900 mb-2">{t('join')}</h1>
                <p className="text-sm text-neutral-400 max-w-xs mx-auto">{t('invited')}</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
            >
                <div className="py-4 px-4 bg-neutral-50 rounded-xl text-center">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-1">{t('inviteCode')}</p>
                    <p className="text-sm font-mono font-medium text-neutral-900">{inviteCode}</p>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 text-center"
                    >
                        {error}
                    </motion.p>
                )}

                {joined ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 py-3 text-sm text-green-600"
                    >
                        <Check className="w-4 h-4" />
                        {t('joinSuccess')} {t('redirecting')}
                    </motion.div>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full px-4 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('joinButton')}
                    </button>
                )}
            </motion.div>
        </motion.div>
    )
}
