'use client'

import { useState, useEffect } from 'react'
import { Loader2, Globe, Youtube, ExternalLink, MapPin, Briefcase, Users, TrendingUp, CheckCircle2, BadgeCheck } from 'lucide-react'
import Link from 'next/link'
import { getMySellerProfile } from '@/app/actions/sellers'

interface ProfileData {
    name: string
    email: string
    avatarUrl: string | null
    bio: string | null
    country: string | null
    profileType: 'INDIVIDUAL' | 'COMPANY' | null
    activityType: string | null
    websiteUrl: string | null
    youtubeUrl: string | null
    twitterUrl: string | null
    linkedinUrl: string | null
    instagramUrl: string | null
    tiktokUrl: string | null
    industryInterests: string[]
    monthlyTraffic: string | null
    profileScore: number
    earningPreferences: { revShare: boolean; cpc: boolean; cpl: boolean; oneTime: boolean } | null
    salesChannels: { blogs: boolean; newsletters: boolean; socialMedia: boolean; events: boolean; companyReferrals: boolean } | null
}

// Calculate if profile is complete (7 tasks)
function isProfileComplete(profile: ProfileData): boolean {
    const hasBasicInfo = !!profile.name?.trim()
    const hasDescription = !!profile.bio && profile.bio.trim().length > 10
    const hasEarningStructure = !!(profile.earningPreferences && Object.values(profile.earningPreferences).some(v => v))
    const hasHealthyProfile = true // Always true
    const hasWebsiteSocial = !!profile.websiteUrl?.trim()
    const hasTraffic = !!profile.monthlyTraffic
    const hasSalesChannels = !!(profile.salesChannels && Object.values(profile.salesChannels).some(v => v))

    return hasBasicInfo && hasDescription && hasEarningStructure && hasHealthyProfile && hasWebsiteSocial && hasTraffic && hasSalesChannels
}

const ACTIVITY_LABELS: Record<string, string> = {
    'CONTENT_CREATOR': 'Content creator',
    'SALES_REP': 'Commercial',
    'INFLUENCER': 'Influenceur',
    'MARKETER': 'Marketeur',
    'BLOGGER': 'Blogueur',
    'DEVELOPER': 'Developer',
    'CONSULTANT': 'Consultant',
    'OTHER': 'Autre'
}

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
    'FR': 'France',
    'US': 'États-Unis',
    'GB': 'Royaume-Uni',
    'DE': 'Allemagne',
    'ES': 'Espagne',
    'IT': 'Italie',
    'CA': 'Canada',
    'NL': 'Pays-Bas',
    'BE': 'Belgique',
    'CH': 'Suisse',
    'PT': 'Portugal',
    'AT': 'Autriche',
    'PL': 'Pologne',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Danemark',
    'FI': 'Finlande',
    'IE': 'Irlande',
    'AU': 'Australie',
    'JP': 'Japon',
    'BR': 'Brazil',
    'MX': 'Mexique',
    'IN': 'Inde',
    'SG': 'Singapour',
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [hasSeenValidation, setHasSeenValidation] = useState(false)

    // Check localStorage for validation seen status
    useEffect(() => {
        const seen = localStorage.getItem('seller_validation_seen')
        if (seen === 'true') {
            setHasSeenValidation(true)
        }
    }, [])

    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    setProfile(result.profile as ProfileData)
                } else {
                    setError(result.error || 'Failed to load')
                }
            } catch (err) {
                setError('Failed to load')
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [])

    // Mark validation as seen when banner is displayed
    useEffect(() => {
        if (profile && isProfileComplete(profile) && !hasSeenValidation && !loading) {
            const timer = setTimeout(() => {
                localStorage.setItem('seller_validation_seen', 'true')
                setHasSeenValidation(true)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [profile, hasSeenValidation, loading])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">{error || 'Profile not found'}</p>
                    <Link href="/seller" className="text-violet-600 hover:text-violet-700 text-sm font-medium">
                        Back to dashboard
                    </Link>
                </div>
            </div>
        )
    }

    const hasSocials = profile.websiteUrl || profile.youtubeUrl || profile.twitterUrl || profile.linkedinUrl || profile.instagramUrl || profile.tiktokUrl

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-8 py-10">

                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-6">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.name}
                                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-3xl font-semibold text-white">
                                    {profile.name ? profile.name[0].toUpperCase() : 'S'}
                                </span>
                            </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                        {profile.name || 'Sans nom'}
                                    </h1>
                                    <p className="text-gray-500 text-sm mt-1">
                                        {profile.email}
                                    </p>
                                </div>
                                <Link
                                    href="/seller/settings"
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors flex-shrink-0"
                                >
                                    Edit
                                </Link>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                {profile.country && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                        <MapPin className="w-3 h-3" />
                                        {COUNTRY_NAMES[profile.country] || profile.country}
                                    </span>
                                )}
                                {profile.activityType && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
                                        <Briefcase className="w-3 h-3" />
                                        {ACTIVITY_LABELS[profile.activityType] || profile.activityType}
                                    </span>
                                )}
                                {profile.profileType && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                        <Users className="w-3 h-3" />
                                        {profile.profileType === 'INDIVIDUAL' ? 'Individuel' : 'Entreprise'}
                                    </span>
                                )}
                                {profile.monthlyTraffic && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                                        <TrendingUp className="w-3 h-3" />
                                        {profile.monthlyTraffic} visiteurs/mois
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {profile.bio}
                            </p>
                        </div>
                    )}

                    {/* Profile Status */}
                    {(() => {
                        const profileComplete = isProfileComplete(profile)
                        const shouldShowValidatedBanner = profileComplete && !hasSeenValidation

                        // Only show status section if profile is not complete or just validated
                        if (profileComplete && hasSeenValidation) {
                            return null // Don't show anything if already validated and seen
                        }

                        return (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                {shouldShowValidatedBanner ? (
                                    // Just validated state - show celebration banner
                                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl animate-pulse">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <BadgeCheck className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800">Account validated</p>
                                            <p className="text-xs text-emerald-600">Your profile is visible in the network</p>
                                        </div>
                                    </div>
                                ) : (
                                    // Progress state
                                    <>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Progression du profil</span>
                                            <span className="text-sm font-semibold text-gray-900">{profile.profileScore || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                                                style={{ width: `${profile.profileScore || 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            <Link href="/seller/settings" className="text-violet-600 hover:text-violet-700">
                                                Complete your profile
                                            </Link>
                                            {' '}pour valider votre compte
                                        </p>
                                    </>
                                )}
                            </div>
                        )
                    })()}
                </div>

                {/* Industry interests */}
                {profile.industryInterests && profile.industryInterests.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-4">Industry interests</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.industryInterests.map((industry) => (
                                <span
                                    key={industry}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg"
                                >
                                    {industry}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Social media */}
                {hasSocials && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-sm font-semibold text-gray-900 mb-4">Liens</h2>
                        <div className="space-y-3">
                            {profile.websiteUrl && (
                                <a
                                    href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <Globe className="w-5 h-5 text-gray-500" />
                                    <span className="flex-1 text-sm text-gray-700 truncate">{profile.websiteUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                </a>
                            )}
                            {profile.youtubeUrl && (
                                <a
                                    href={`https://youtube.com/${profile.youtubeUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors group"
                                >
                                    <Youtube className="w-5 h-5 text-red-600" />
                                    <span className="flex-1 text-sm text-gray-700 truncate">{profile.youtubeUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                                </a>
                            )}
                            {profile.twitterUrl && (
                                <a
                                    href={`https://twitter.com/${profile.twitterUrl.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl hover:bg-black transition-colors group"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    <span className="flex-1 text-sm text-white truncate">{profile.twitterUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                </a>
                            )}
                            {profile.linkedinUrl && (
                                <a
                                    href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://linkedin.com/in/${profile.linkedinUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                                >
                                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                    <span className="flex-1 text-sm text-gray-700 truncate">{profile.linkedinUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                </a>
                            )}
                            {profile.instagramUrl && (
                                <a
                                    href={`https://instagram.com/${profile.instagramUrl.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-colors group"
                                >
                                    <svg className="w-5 h-5 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    <span className="flex-1 text-sm text-gray-700 truncate">{profile.instagramUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-pink-600" />
                                </a>
                            )}
                            {profile.tiktokUrl && (
                                <a
                                    href={`https://tiktok.com/${profile.tiktokUrl.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl hover:bg-black transition-colors group"
                                >
                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                    </svg>
                                    <span className="flex-1 text-sm text-white truncate">{profile.tiktokUrl}</span>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
