'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createGroup } from '@/app/actions/group-actions'

export default function CreateGroupPage() {
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
        <div className="max-w-lg mx-auto px-6 py-12">
            <Link href="/seller/groups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Groups
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create a Group</h1>
            <p className="text-gray-500 mb-8">Start a group to pool earnings with other sellers. All commissions from group missions will be split equally.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Group name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., SaaS Sales Team"
                        maxLength={50}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-sm"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does your group focus on?"
                        maxLength={200}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-sm resize-none"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="w-full px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Group
                </button>
            </form>
        </div>
    )
}
