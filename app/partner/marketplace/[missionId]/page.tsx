'use client'

import { useState, useEffect, use } from 'react'
import {
    ArrowLeft, Loader2, Gift, Copy, Check, ExternalLink,
    Play, FileText, Link as LinkIcon, FileType, Building,
    Lock, Globe, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { getMissionWithResources } from '@/app/actions/marketplace-actions'

interface Resource {
    id: string
    type: 'YOUTUBE' | 'PDF' | 'LINK' | 'TEXT'
    url: string | null
    title: string
    description: string | null
}

interface MissionData {
    id: string
    title: string
    description: string
    target_url: string
    reward: string
    visibility: string
    industry: string | null
    gain_type: string | null
    workspace_name: string
}

interface EnrollmentData {
    id: string
    status: string
    link_slug: string | null
    link_url: string | null
}

// =============================================
// YOUTUBE EMBED COMPONENT
// =============================================

function YouTubeEmbed({ url }: { url: string }) {
    // Extract video ID from YouTube URL
    const getVideoId = (url: string): string | null => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return match && match[2].length === 11 ? match[2] : null
    }

    const videoId = getVideoId(url)
    if (!videoId) return null

    return (
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-900">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    )
}

// =============================================
// RESOURCE CARD
// =============================================

function ResourceCard({ resource }: { resource: Resource }) {
    const icons = {
        YOUTUBE: Play,
        PDF: FileText,
        LINK: LinkIcon,
        TEXT: FileType
    }
    const Icon = icons[resource.type]

    const colors = {
        YOUTUBE: 'bg-red-50 text-red-600 border-red-200',
        PDF: 'bg-blue-50 text-blue-600 border-blue-200',
        LINK: 'bg-purple-50 text-purple-600 border-purple-200',
        TEXT: 'bg-gray-50 text-gray-600 border-gray-200'
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colors[resource.type]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                        {resource.title}
                    </h4>
                    {resource.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                            {resource.description}
                        </p>
                    )}
                    {resource.url && resource.type !== 'YOUTUBE' && (
                        <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                            {resource.type === 'PDF' ? 'Download' : 'Open Link'}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function MissionDetailPage({
    params
}: {
    params: Promise<{ missionId: string }>
}) {
    const resolvedParams = use(params)
    const [mission, setMission] = useState<MissionData | null>(null)
    const [resources, setResources] = useState<Resource[]>([])
    const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        async function load() {
            const result = await getMissionWithResources(resolvedParams.missionId)

            if (!result.success) {
                if (result.error === 'ACCESS_DENIED') {
                    setError('You do not have access to this mission.')
                } else {
                    setError(result.error || 'Failed to load mission')
                }
            } else {
                setMission(result.mission as MissionData)
                setResources((result.resources || []) as Resource[])
                setEnrollment(result.enrollment as EnrollmentData | null)
            }
            setLoading(false)
        }

        load()
    }, [resolvedParams.missionId])

    async function handleCopyLink() {
        if (enrollment?.link_url) {
            await navigator.clipboard.writeText(enrollment.link_url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Get featured video (first YouTube resource)
    const featuredVideo = resources.find(r => r.type === 'YOUTUBE')
    const otherResources = resources.filter(r => r.type !== 'YOUTUBE' || r.id !== featuredVideo?.id)

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Link
                        href="/partner/marketplace"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Marketplace
                    </Link>
                </div>
            </div>
        )
    }

    if (!mission) return null

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-5xl mx-auto px-8 py-10">

                {/* Back Link */}
                <Link
                    href="/partner/marketplace"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Marketplace
                </Link>

                {/* Header */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Building className="w-4 h-4" />
                            {mission.workspace_name}
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${mission.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {mission.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {mission.visibility}
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        {mission.title}
                    </h1>

                    <p className="text-gray-600 mb-4">
                        {mission.description}
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                            <Gift className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-800">{mission.reward}</span>
                        </div>
                        {mission.industry && (
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {mission.industry}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tracking Link (if enrolled) */}
                {enrollment?.link_url && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                        <h3 className="text-sm font-medium text-blue-900 mb-3">
                            Your Tracking Link
                        </h3>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={enrollment.link_url}
                                readOnly
                                className="flex-1 px-4 py-2.5 bg-white border border-blue-200 rounded-lg font-mono text-sm text-blue-700"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Featured Video */}
                {featuredVideo?.url && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {featuredVideo.title}
                        </h3>
                        <YouTubeEmbed url={featuredVideo.url} />
                        {featuredVideo.description && (
                            <p className="text-sm text-gray-600 mt-3">
                                {featuredVideo.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Resources Grid */}
                {otherResources.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Resources & Assets
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {otherResources.map((resource) => (
                                <ResourceCard key={resource.id} resource={resource} />
                            ))}
                        </div>
                    </div>
                )}

                {/* No Resources */}
                {resources.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No resources yet
                        </h3>
                        <p className="text-gray-500">
                            The program owner hasn't added any resources to this mission.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
