'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { applyToCreateOrg } from '@/app/actions/organization-actions'

const AUDIENCE_OPTIONS = ['< 10', '10-50', '50-200', '200+']

export default function ApplyCreateOrgPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [motivation, setMotivation] = useState('')
    const [estimatedAudience, setEstimatedAudience] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const canSubmit = name.trim().length > 0 && description.trim().length > 0 && motivation.trim().length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setSubmitting(true)
        setError('')

        const result = await applyToCreateOrg({
            name: name.trim(),
            description: description.trim(),
            motivation: motivation.trim(),
            estimated_audience: estimatedAudience || undefined,
        })

        if (result.success) {
            router.push('/seller/organizations/my')
        } else {
            setError(result.error || 'Something went wrong')
        }
        setSubmitting(false)
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
            <Link href="/seller/organizations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
                <ArrowLeft className="w-4 h-4" /> Back to browse
            </Link>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an Organization</h1>
            <p className="text-gray-500 text-sm mb-8">
                Build a team of sellers and earn together on shared missions.
            </p>

            {/* Warning */}
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-8">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-800">Application reviewed by admins</p>
                    <p className="text-xs text-amber-600 mt-0.5">Your organization will be reviewed and approved by our team before it becomes active.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. SaaS Growth Collective"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all"
                        maxLength={100}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does your organization do? What kind of products will your team promote?"
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all resize-none"
                        maxLength={1000}
                    />
                </div>

                {/* Motivation */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Why create an organization? <span className="text-red-500">*</span></label>
                    <textarea
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder="Tell us about your motivation, your experience in affiliation, and how you plan to manage your team."
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all resize-none"
                        maxLength={2000}
                    />
                </div>

                {/* Estimated Audience */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated team size</label>
                    <div className="flex gap-2">
                        {AUDIENCE_OPTIONS.map(option => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setEstimatedAudience(estimatedAudience === option ? '' : option)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                    estimatedAudience === option
                                        ? 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="w-full px-4 py-3 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Application
                </button>
            </form>
        </div>
    )
}
