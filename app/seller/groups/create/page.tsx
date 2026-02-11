'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createGroup } from '@/app/actions/group-actions'
import { useTranslations } from 'next-intl'

export default function CreateGroupPage() {
    const t = useTranslations('seller.groups')
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError(null)

        const result = await createGroup({ name: name.trim(), description: description.trim() || undefined })

        if (result.success && result.groupId) {
            router.push(`/seller/groups/${result.groupId}`)
        } else {
            setError(result.error || 'Failed to create group')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16"
            >
                <Link href="/seller/groups" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4" /> {t('backToGroups')}
                </Link>

                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-1">{t('create')}</h1>
                <p className="text-gray-500 text-[15px] mb-8">{t('noGroupDesc')}</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('groupName')} *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('groupNamePlaceholder')}
                            maxLength={50}
                            className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors text-sm text-gray-900 placeholder:text-gray-300"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                            maxLength={200}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors text-sm text-gray-900 placeholder:text-gray-300 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t('createButton')}
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
