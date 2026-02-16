'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Loader2, Check, ArrowLeft, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { joinGroup } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

function GroupCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm ${className}`}
        >
            {children}
        </motion.div>
    )
}

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
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Link
                        href="/seller/groups"
                        className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> {t('backToGroups')}
                    </Link>
                </motion.div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-neutral-600" />
                        </div>
                        <div>
                            <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                                {t('join')}
                            </h1>
                            <p className="text-[15px] text-neutral-500">
                                {t('invited')}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Invite code card */}
                <GroupCard>
                    <div className="p-6">
                        <label className="block text-[13px] font-medium text-neutral-700 mb-3">{t('inviteCode')}</label>
                        <div className="py-3 px-4 bg-neutral-50 rounded-xl text-center mb-6">
                            <p className="text-[15px] font-mono font-medium text-neutral-900">{inviteCode}</p>
                        </div>

                        {joined ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center justify-center gap-3 py-3"
                            >
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Check className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-emerald-700">{t('joinSuccess')}</p>
                                    <p className="text-[13px] text-neutral-500">{t('redirecting')}</p>
                                </div>
                            </motion.div>
                        ) : (
                            <button
                                onClick={handleJoin}
                                disabled={loading}
                                className="w-full h-11 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('joinButton')}
                            </button>
                        )}
                    </div>
                </GroupCard>
            </div>
        </div>
    )
}
