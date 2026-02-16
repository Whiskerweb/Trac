'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Globe, MapPin, Briefcase, BarChart3, ExternalLink, FileText } from 'lucide-react'
import { getOrgMemberProfile } from '@/app/actions/organization-actions'
import type { OrgMemberProfileData } from '@/app/actions/organization-actions'

/* ── Palette for avatar gradients keyed off first letter ── */
const AVATAR_GRADIENTS: Record<string, string> = {
    A: 'from-rose-400 to-pink-500', B: 'from-orange-400 to-amber-500',
    C: 'from-amber-400 to-yellow-500', D: 'from-lime-400 to-green-500',
    E: 'from-emerald-400 to-teal-500', F: 'from-teal-400 to-cyan-500',
    G: 'from-cyan-400 to-sky-500', H: 'from-sky-400 to-blue-500',
    I: 'from-blue-400 to-indigo-500', J: 'from-indigo-400 to-violet-500',
    K: 'from-violet-400 to-purple-500', L: 'from-purple-400 to-fuchsia-500',
    M: 'from-fuchsia-400 to-pink-500', N: 'from-rose-400 to-red-500',
    O: 'from-orange-400 to-red-400', P: 'from-violet-400 to-indigo-500',
    Q: 'from-teal-400 to-emerald-500', R: 'from-blue-400 to-cyan-500',
    S: 'from-amber-400 to-orange-500', T: 'from-pink-400 to-rose-500',
    U: 'from-sky-400 to-indigo-500', V: 'from-emerald-400 to-green-500',
    W: 'from-purple-400 to-violet-500', X: 'from-red-400 to-orange-500',
    Y: 'from-lime-400 to-emerald-500', Z: 'from-cyan-400 to-blue-500',
}

function OrgCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
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

const SOCIAL_ICONS: Record<string, { label: string; icon: string }> = {
    tiktok: { label: 'TikTok', icon: '🎵' },
    instagram: { label: 'Instagram', icon: '📸' },
    twitter: { label: 'X / Twitter', icon: '𝕏' },
    youtube: { label: 'YouTube', icon: '▶️' },
    website: { label: 'Website', icon: '🌐' },
    linkedin: { label: 'LinkedIn', icon: '💼' },
}

export default function OrgMemberProfilePage() {
    const params = useParams()
    const orgId = params.orgId as string
    const sellerId = params.sellerId as string

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<OrgMemberProfileData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const result = await getOrgMemberProfile(orgId, sellerId)
            if (result.success && result.profile) {
                setProfile(result.profile)
            } else {
                setError(result.error || 'Failed to load profile')
            }
            setLoading(false)
        }
        load()
    }, [orgId, sellerId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div>
                <Link
                    href={`/seller/manage/${orgId}/members`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Members
                </Link>
                <p className="text-[14px] text-neutral-500">{error || 'Profile not found'}</p>
            </div>
        )
    }

    const name = profile.name || profile.email
    const letter = name.charAt(0).toUpperCase()
    const gradient = AVATAR_GRADIENTS[letter] || 'from-neutral-400 to-neutral-500'

    const socials = Object.entries(profile.socials).filter(([, url]) => !!url)
    const hasIndustries = profile.industryInterests.length > 0
    const hasResources = !!profile.portfolioUrl || !!profile.cvUrl

    return (
        <div>
            {/* Back link */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Link
                    href={`/seller/manage/${orgId}/members`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-6"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Members
                </Link>
            </motion.div>

            <div className="space-y-4">
                {/* Hero Card */}
                <OrgCard className="p-6">
                    <div className="flex items-start gap-5">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt=""
                                className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                <span className="text-xl font-bold text-white/90 drop-shadow-sm">{letter}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-[20px] font-semibold tracking-tight text-neutral-900 truncate">
                                {profile.name || 'Seller'}
                            </h2>
                            <p className="text-[14px] text-neutral-400 truncate">{profile.email}</p>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {profile.country && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-neutral-600 bg-neutral-100 rounded-lg">
                                        <MapPin className="w-3 h-3" />
                                        {profile.country}
                                    </span>
                                )}
                                {profile.activityType && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-lg">
                                        <Briefcase className="w-3 h-3" />
                                        {profile.activityType.replace(/_/g, ' ')}
                                    </span>
                                )}
                                {profile.monthlyTraffic && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-purple-600 bg-purple-50 rounded-lg">
                                        <BarChart3 className="w-3 h-3" />
                                        {profile.monthlyTraffic}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </OrgCard>

                {/* Bio */}
                {profile.bio && (
                    <OrgCard className="p-6">
                        <h3 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Bio</h3>
                        <p className="text-[14px] text-neutral-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                    </OrgCard>
                )}

                {/* Industries */}
                {hasIndustries && (
                    <OrgCard className="p-6">
                        <h3 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Industries</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.industryInterests.map(interest => (
                                <span
                                    key={interest}
                                    className="px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-neutral-50 border border-neutral-200/60 rounded-xl"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </OrgCard>
                )}

                {/* Social Links */}
                {socials.length > 0 && (
                    <OrgCard className="p-6">
                        <h3 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Social Links</h3>
                        <div className="space-y-2">
                            {socials.map(([key, url]) => {
                                const social = SOCIAL_ICONS[key]
                                return (
                                    <a
                                        key={key}
                                        href={url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors group"
                                    >
                                        <span className="text-base">{social?.icon}</span>
                                        <span className="text-[14px] text-neutral-700 group-hover:text-neutral-900 flex-1">{social?.label || key}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-400" />
                                    </a>
                                )
                            })}
                        </div>
                    </OrgCard>
                )}

                {/* Resources */}
                {hasResources && (
                    <OrgCard className="p-6">
                        <h3 className="text-[13px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">Resources</h3>
                        <div className="space-y-2">
                            {profile.portfolioUrl && (
                                <a
                                    href={profile.portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors group"
                                >
                                    <Globe className="w-4 h-4 text-neutral-400" />
                                    <span className="text-[14px] text-neutral-700 group-hover:text-neutral-900 flex-1">Portfolio</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-400" />
                                </a>
                            )}
                            {profile.cvUrl && (
                                <a
                                    href={profile.cvUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors group"
                                >
                                    <FileText className="w-4 h-4 text-neutral-400" />
                                    <span className="text-[14px] text-neutral-700 group-hover:text-neutral-900 flex-1">CV / Resume</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-400" />
                                </a>
                            )}
                        </div>
                    </OrgCard>
                )}
            </div>
        </div>
    )
}
