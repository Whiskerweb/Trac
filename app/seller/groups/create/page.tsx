'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { createGroup } from '@/app/actions/group-actions'
import { getMyStripeAccountInfo } from '@/app/actions/sellers'
import { useTranslations } from 'next-intl'

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
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
            </div>
        )
    }

    // Stripe not configured
    if (!stripeReady) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-lg mx-auto py-8"
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
                    className="flex flex-col items-center text-center pt-8"
                >
                    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <h1 className="text-xl font-medium tracking-tight text-neutral-900 mb-2">
                        {t('stripeRequired')}
                    </h1>
                    <p className="text-sm text-neutral-400 max-w-sm mb-8">
                        {t('stripeRequiredDesc')}
                    </p>
                    <Link
                        href="/seller/settings"
                        className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                    >
                        {t('setupStripe')}
                    </Link>
                    <Link
                        href="/seller/groups"
                        className="mt-4 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        {t('backToGroups')}
                    </Link>
                </motion.div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-lg mx-auto py-8"
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
                className="mb-10"
            >
                <h1 className="text-2xl font-extralight tracking-tight text-neutral-900 mb-2">{t('create')}</h1>
                <p className="text-sm text-neutral-400">{t('noGroupDesc')}</p>
            </motion.div>

            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-neutral-400 mb-3">
                        {t('groupName')}
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('groupNamePlaceholder')}
                        maxLength={50}
                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 focus:border-neutral-900 focus:ring-0 transition-colors text-sm text-neutral-900 placeholder:text-neutral-300"
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-neutral-400 mb-3">
                        {t('description')}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('descriptionPlaceholder')}
                        maxLength={200}
                        rows={3}
                        className="w-full px-0 py-3 bg-transparent border-0 border-b border-neutral-200 focus:border-neutral-900 focus:ring-0 transition-colors text-sm text-neutral-900 placeholder:text-neutral-300 resize-none"
                    />
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500"
                    >
                        {error}
                    </motion.p>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="px-6 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('createButton')}
                    </button>
                </div>
            </motion.form>
        </motion.div>
    )
}
