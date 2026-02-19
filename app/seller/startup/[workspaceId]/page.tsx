'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ChevronLeft, Globe, Building2, MapPin, Calendar, Users,
    FileText, ExternalLink, Loader2, ArrowUpRight, Download
} from 'lucide-react'
import { getPublicStartupProfile, type StartupProfileData } from '@/app/actions/startup-profile'
import { TraaactionLoader } from '@/components/ui/TraaactionLoader'

// =============================================
// SOCIAL ICONS
// =============================================

function LinkedInIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
    )
}

function XIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    )
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    )
}

function YouTubeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    )
}

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
    )
}

function GitHubIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
    )
}

const SOCIAL_LINKS: { key: keyof StartupProfileData; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'linkedinUrl', label: 'LinkedIn', icon: LinkedInIcon },
    { key: 'twitterUrl', label: 'X', icon: XIcon },
    { key: 'instagramUrl', label: 'Instagram', icon: InstagramIcon },
    { key: 'youtubeUrl', label: 'YouTube', icon: YouTubeIcon },
    { key: 'tiktokUrl', label: 'TikTok', icon: TikTokIcon },
    { key: 'githubUrl', label: 'GitHub', icon: GitHubIcon },
]

// =============================================
// MAIN PAGE
// =============================================

export default function StartupProfileViewPage() {
    const params = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<StartupProfileData | null>(null)

    useEffect(() => {
        async function load() {
            if (!params.workspaceId || typeof params.workspaceId !== 'string') {
                setLoading(false)
                return
            }
            try {
                const result = await getPublicStartupProfile(params.workspaceId)
                if (result.success && result.profile) {
                    setProfile(result.profile)
                }
            } catch (error) {
                console.error('Error loading startup profile:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [params.workspaceId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <TraaactionLoader size={20} className="text-gray-400" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-6 h-6 text-slate-300" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 mb-1">Startup not found</h2>
                    <p className="text-sm text-slate-400 mb-6">This profile could not be loaded.</p>
                    <button
                        onClick={() => router.back()}
                        className="text-sm font-medium text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition-colors"
                    >
                        Go back
                    </button>
                </div>
            </div>
        )
    }

    const activeSocials = SOCIAL_LINKS.filter(s => profile[s.key])
    const hasDetails = profile.headquarters || profile.foundedYear || profile.companySize || profile.industry
    const hasDocs = profile.pitchDeckUrl || profile.docUrl

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Subtle dot grid */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
                backgroundSize: '24px 24px'
            }} />

            <div className="relative max-w-[720px] mx-auto px-6 py-8">
                {/* Navigation */}
                <button
                    onClick={() => router.back()}
                    className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-all duration-300 mb-10"
                >
                    <div className="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-900 transition-all duration-300">
                        <ChevronLeft className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                    </div>
                    <span className="tracking-tight">Back to messages</span>
                </button>

                {/* === HERO CARD === */}
                <div className="relative border border-slate-200/60 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm mb-6">
                    {/* Top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-900 to-transparent" />

                    <div className="p-8 pb-7">
                        {/* Logo + Identity */}
                        <div className="flex items-start gap-6 mb-7">
                            <div className="relative group flex-shrink-0">
                                <div className="absolute -inset-1 bg-gradient-to-b from-slate-200 to-slate-100 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
                                {profile.logoUrl ? (
                                    <img
                                        src={profile.logoUrl}
                                        alt={profile.name}
                                        className="relative w-[72px] h-[72px] rounded-2xl object-cover border border-slate-200"
                                    />
                                ) : (
                                    <div className="relative w-[72px] h-[72px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                                        <span className="text-white text-2xl font-black tracking-tighter">
                                            {profile.name.charAt(0)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 pt-1">
                                <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1.5">
                                    {profile.name}
                                </h1>
                                {profile.industry && (
                                    <span className="inline-block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                        {profile.industry}
                                    </span>
                                )}
                            </div>

                            {profile.websiteUrl && (
                                <a
                                    href={profile.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    Website
                                    <ArrowUpRight className="w-3 h-3 opacity-50" />
                                </a>
                            )}
                        </div>

                        {/* Description */}
                        {profile.description && (
                            <p className="text-[15px] text-slate-600 leading-relaxed mb-6">
                                {profile.description}
                            </p>
                        )}

                        {/* Meta chips */}
                        {hasDetails && (
                            <div className="flex flex-wrap items-center gap-2">
                                {profile.headquarters && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-600 tracking-tight">{profile.headquarters}</span>
                                    </div>
                                )}
                                {profile.foundedYear && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-600 tracking-tight">Founded {profile.foundedYear}</span>
                                    </div>
                                )}
                                {profile.companySize && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                                        <Users className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-600 tracking-tight">{profile.companySize} people</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* === BOTTOM ROW: Socials + Documents side by side === */}
                {(activeSocials.length > 0 || hasDocs) && (
                    <div className={`grid gap-6 ${activeSocials.length > 0 && hasDocs ? 'grid-cols-[1fr_auto]' : 'grid-cols-1'}`}>

                        {/* Social links */}
                        {activeSocials.length > 0 && (
                            <div className="border border-slate-200/60 rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
                                <div className="px-6 pt-5 pb-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Connect</p>
                                </div>
                                <div className="px-3 pb-3">
                                    {activeSocials.map(({ key, label, icon: Icon }) => (
                                        <a
                                            key={key}
                                            href={profile[key] as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors duration-200">
                                                <Icon className="w-4 h-4 text-slate-600" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                                                {label}
                                            </span>
                                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents */}
                        {hasDocs && (
                            <div className="border border-slate-200/60 rounded-2xl bg-white/80 backdrop-blur-sm overflow-hidden min-w-[240px]">
                                <div className="px-6 pt-5 pb-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Resources</p>
                                </div>
                                <div className="px-3 pb-3 space-y-1">
                                    {profile.pitchDeckUrl && (
                                        <a
                                            href={profile.pitchDeckUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-all duration-200"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                                <FileText className="w-4.5 h-4.5 text-rose-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">Pitch Deck</p>
                                                <p className="text-[11px] text-slate-400 tracking-wide">PDF</p>
                                            </div>
                                            <Download className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </a>
                                    )}
                                    {profile.docUrl && (
                                        <a
                                            href={profile.docUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-all duration-200"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                                                <FileText className="w-4.5 h-4.5 text-sky-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">Document</p>
                                                <p className="text-[11px] text-slate-400 tracking-wide">PDF</p>
                                            </div>
                                            <Download className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
