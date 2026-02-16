'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowLeft, AlertTriangle, Users, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'
import { createGroup } from '@/app/actions/group-actions'
import { getMyStripeAccountInfo } from '@/app/actions/sellers'
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

export default function CreateGroupPage() {
    const t = useTranslations('seller.groups')
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [stripeReady, setStripeReady] = useState<boolean | null>(null)

    useEffect(() => {
        getMyStripeAccountInfo().then((res) => {
            if (res.success && res.account) {
                setStripeReady(res.account.connected && res.account.payoutsEnabled)
            } else {
                setStripeReady(false)
            }
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError(null)

        const result = await createGroup({ name: name.trim(), description: description.trim() || undefined })

        if (result.success && result.groupId) {
            router.push('/seller/groups')
        } else {
            setError(result.error || 'Failed to create group')
            setLoading(false)
        }
    }

    // Loading state
    if (stripeReady === null) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <span className="text-sm text-neutral-500">Loading...</span>
                </motion.div>
            </div>
        )
    }

    // Stripe not configured
    if (!stripeReady) {
        return (
            <div className="min-h-screen bg-[#FAFAFA]">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <Link
                            href="/seller/groups"
                            className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-8"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> {t('backToGroups')}
                        </Link>
                    </motion.div>

                    <GroupCard>
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                            <h1 className="text-[17px] font-semibold text-neutral-900 mb-2">
                                {t('stripeRequired')}
                            </h1>
                            <p className="text-[14px] text-neutral-500 max-w-sm mb-6">
                                {t('stripeRequiredDesc')}
                            </p>
                            <Link
                                href="/seller/settings"
                                className="h-11 px-5 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 transition-colors inline-flex items-center"
                            >
                                {t('setupStripe')}
                            </Link>
                            <Link
                                href="/seller/groups"
                                className="mt-4 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
                            >
                                {t('backToGroups')}
                            </Link>
                        </div>
                    </GroupCard>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
                        <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-neutral-600" />
                        </div>
                        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                            {t('create')}
                        </h1>
                    </div>
                    <p className="text-[15px] text-neutral-500">
                        {t('noGroupDesc')}
                    </p>
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

                {/* Form */}
                <GroupCard>
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div>
                            <label className="block text-[13px] font-medium text-neutral-700 mb-2">
                                {t('groupName')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('groupNamePlaceholder')}
                                maxLength={50}
                                className="w-full h-11 px-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-colors text-neutral-900 placeholder:text-neutral-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-neutral-700 mb-2">
                                {t('description')}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('descriptionPlaceholder')}
                                maxLength={200}
                                rows={3}
                                className="w-full px-4 py-3 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-colors text-neutral-900 placeholder:text-neutral-400 resize-none"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="h-11 px-5 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('createButton')}
                            </button>
                        </div>
                    </form>
                </GroupCard>
            </div>
        </div>
    )
}
