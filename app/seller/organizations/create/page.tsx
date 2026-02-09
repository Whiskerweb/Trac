'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import { applyToCreateOrg } from '@/app/actions/organization-actions'

export default function CreateOrganizationPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setSubmitting(true)
        setError('')

        const result = await applyToCreateOrg({
            name: name.trim(),
            description: description.trim() || undefined,
        })

        if (result.success) {
            router.push('/seller/organizations')
        } else {
            setError(result.error || 'Failed to create organization')
        }
        setSubmitting(false)
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Organization</h1>
                    <p className="text-sm text-gray-500">Your application will be reviewed by Traaaction admins</p>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                    Creating an organization requires admin approval. You need to demonstrate an active community of sellers. Once approved, you can invite members and accept mission proposals from startups.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Organization Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="My Seller Community"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        required
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Describe your organization, your community, and why startups should work with you..."
                        rows={4}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
            </form>
        </div>
    )
}
