'use client'

import { useState, useMemo, useEffect } from 'react'
import { Upload, Check, ChevronUp, ChevronDown, CheckCircle2, Circle, Youtube, Globe, Loader2, User, Settings, LogOut } from 'lucide-react'
import { getMySellerProfile, updateMySellerProfile, type MySellerProfileData } from '@/app/actions/sellers'
import { logout } from '@/app/login/actions'

const INDUSTRY_INTERESTS = [
    'AI', 'SaaS', 'Sales', 'E-commerce', 'Developer tools',
    'Productivity', 'Marketing', 'Analytics', 'Design'
]

const TRAFFIC_OPTIONS = [
    '< 1,000',
    '1,000 - 10,000',
    '10,000 - 50,000',
    '50,000 - 100,000',
    '100,000+'
]

// Countries with ISO codes - must match mission country filter codes
const COUNTRIES = [
    { code: 'FR', name: 'France' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'CA', name: 'Canada' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'AT', name: 'Austria' },
    { code: 'PL', name: 'Poland' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'IE', name: 'Ireland' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
]

// Profile completion tasks (7 tasks for account validation)
const PROFILE_TASKS = [
    { id: 'basic_info', label: 'Basic information' },
    { id: 'description', label: 'Profile description' },
    { id: 'earning_structure', label: 'Earning preferences' },
    { id: 'healthy_profile', label: 'Healthy profile' },
    { id: 'website_social', label: 'Website or social media' },
    { id: 'traffic', label: 'Estimated monthly traffic' },
    { id: 'sales_channels', label: 'Sales channels' },
]

type TabType = 'profile' | 'account'

export default function SettingsPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('profile')

    // UI state
    const [isExpanded, setIsExpanded] = useState(true)
    const [showValidatedBanner, setShowValidatedBanner] = useState(false)
    const [hasSeenValidation, setHasSeenValidation] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state - Basic info
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [country, setCountry] = useState('')
    const [profileType, setProfileType] = useState<'INDIVIDUAL' | 'COMPANY' | ''>('')

    // Form state - Social URLs
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [twitterUrl, setTwitterUrl] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [instagramUrl, setInstagramUrl] = useState('')
    const [tiktokUrl, setTiktokUrl] = useState('')

    // Form state - Media & Documents
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [portfolioUrl, setPortfolioUrl] = useState('')
    const [cvUrl, setCvUrl] = useState<string | null>(null)

    // Upload state
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [uploadingCv, setUploadingCv] = useState(false)

    // Form state - About & Expertise
    const [aboutYou, setAboutYou] = useState('')
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [trafficRange, setTrafficRange] = useState('')
    const [activityType, setActivityType] = useState<'CONTENT_CREATOR' | 'SALES_REP' | 'INFLUENCER' | 'MARKETER' | 'BLOGGER' | 'DEVELOPER' | 'CONSULTANT' | 'OTHER' | ''>('')

    // Form state - Preferences
    const [earningPreferences, setEarningPreferences] = useState({
        revShare: false,
        cpc: false,
        cpl: false,
        oneTime: false
    })
    const [salesChannels, setSalesChannels] = useState({
        blogs: false,
        newsletters: false,
        socialMedia: false,
        events: false,
        companyReferrals: false
    })

    // Check localStorage for validation seen status
    useEffect(() => {
        const seen = localStorage.getItem('seller_validation_seen')
        if (seen === 'true') {
            setHasSeenValidation(true)
        }
    }, [])

    // Load profile data on mount
    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    const profile = result.profile
                    setFullName(profile.name || '')
                    setEmail(profile.email || '')
                    setCountry(profile.country || '')
                    setProfileType(profile.profileType || '')

                    setWebsiteUrl(profile.websiteUrl || '')
                    setYoutubeUrl(profile.youtubeUrl || '')
                    setTwitterUrl(profile.twitterUrl || '')
                    setLinkedinUrl(profile.linkedinUrl || '')
                    setInstagramUrl(profile.instagramUrl || '')
                    setTiktokUrl(profile.tiktokUrl || '')

                    setAvatarUrl(profile.avatarUrl || null)
                    setPortfolioUrl(profile.portfolioUrl || '')
                    setCvUrl(profile.cvUrl || null)

                    setAboutYou(profile.bio || '')
                    setSelectedIndustries(profile.industryInterests || [])
                    setTrafficRange(profile.monthlyTraffic || '')
                    setActivityType(profile.activityType || '')

                    if (profile.earningPreferences) {
                        setEarningPreferences(profile.earningPreferences)
                    }
                    if (profile.salesChannels) {
                        setSalesChannels(profile.salesChannels)
                    }
                } else {
                    setError(result.error || 'Failed to load')
                }
            } catch (err) {
                console.error('Error loading profile:', err)
                setError('Failed to load')
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [])

    // Upload avatar
    async function handleAvatarUpload(file: File) {
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'avatar')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (data.success && data.url) {
                setAvatarUrl(data.url)
            } else {
                setError(data.error || 'Error d\'upload de la photo')
            }
        } catch (err) {
            console.error('Avatar upload error:', err)
            setError('Error d\'upload de la photo')
        } finally {
            setUploadingAvatar(false)
        }
    }

    // Upload CV
    async function handleCvUpload(file: File) {
        setUploadingCv(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'cv')

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (data.success && data.url) {
                setCvUrl(data.url)
            } else {
                setError(data.error || 'Error d\'upload du CV')
            }
        } catch (err) {
            console.error('CV upload error:', err)
            setError('Error d\'upload du CV')
        } finally {
            setUploadingCv(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setSaveSuccess(false)
        setError(null)

        const payload = {
            name: fullName,
            bio: aboutYou,
            country: country || undefined,
            profileType: (profileType === 'INDIVIDUAL' || profileType === 'COMPANY') ? profileType : undefined,
            websiteUrl: websiteUrl || undefined,
            youtubeUrl: youtubeUrl || undefined,
            twitterUrl: twitterUrl || undefined,
            linkedinUrl: linkedinUrl || undefined,
            instagramUrl: instagramUrl || undefined,
            tiktokUrl: tiktokUrl || undefined,
            avatarUrl: avatarUrl || undefined,
            portfolioUrl: portfolioUrl || undefined,
            cvUrl: cvUrl || undefined,
            industryInterests: selectedIndustries.length > 0 ? selectedIndustries : undefined,
            monthlyTraffic: trafficRange || undefined,
            activityType: activityType || undefined,
            earningPreferences: earningPreferences,
            salesChannels: salesChannels
        }

        try {
            const result = await updateMySellerProfile(payload)

            if (result.success) {
                setSaveSuccess(true)
                setTimeout(() => setSaveSuccess(false), 3000)
            } else {
                setError(result.error || 'Failed to save')
            }
        } catch (err) {
            console.error('Error saving profile:', err)
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    // Calculate completed tasks
    const completedTasks = useMemo(() => {
        const completed: string[] = []
        if (fullName.trim().length > 0) completed.push('basic_info')
        if (aboutYou.trim().length > 10) completed.push('description')
        if (Object.values(earningPreferences).some(v => v)) completed.push('earning_structure')
        completed.push('healthy_profile')
        if (websiteUrl.trim().length > 0) completed.push('website_social')
        if (trafficRange) completed.push('traffic')
        if (Object.values(salesChannels).some(v => v)) completed.push('sales_channels')
        return completed
    }, [fullName, aboutYou, earningPreferences, websiteUrl, trafficRange, salesChannels])

    const toggleIndustry = (industry: string) => {
        setSelectedIndustries(prev =>
            prev.includes(industry)
                ? prev.filter(i => i !== industry)
                : [...prev, industry]
        )
    }

    // Check if profile just got validated and show banner
    const isProfileComplete = completedTasks.length === PROFILE_TASKS.length
    const shouldShowValidatedBanner = isProfileComplete && !hasSeenValidation

    // Mark as seen when banner is displayed
    useEffect(() => {
        if (shouldShowValidatedBanner && !loading) {
            // Show banner for 5 seconds then mark as seen
            const timer = setTimeout(() => {
                localStorage.setItem('seller_validation_seen', 'true')
                setHasSeenValidation(true)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [shouldShowValidatedBanner, loading])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
                        Settings
                    </h1>
                    <p className="text-gray-500">
                        Manage your profile and account preferences
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'profile'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <User className="w-4 h-4" />
                        Profil
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'account'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        Compte
                    </button>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {error}
                    </div>
                )}
                {saveSuccess && (
                    <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Profile updated successfully
                    </div>
                )}

                {/* Profile Tab Content */}
                {activeTab === 'profile' && (
                    <>
                        {/* Get discovered - Progress Component */}
                        {shouldShowValidatedBanner ? (
                            // Account just validated - show celebration banner (disappears after 5 seconds)
                            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl mb-8 p-6 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Account validated</h3>
                                        <p className="text-sm text-white/80">
                                            Your profile is complete. You are visible in the partner network.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : !isProfileComplete ? (
                            // Progress state - show when profile incomplete
                            <div className="bg-[#18181B] text-white rounded-xl mb-8 overflow-hidden">
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                            <span className="text-sm font-medium">{completedTasks.length} / {PROFILE_TASKS.length} tasks</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-6 pb-6">
                                        <h3 className="text-lg font-semibold mb-1">Get discovered</h3>
                                        <p className="text-sm text-white/70 mb-6">
                                            Complete these steps to validate your account and appear in the network.
                                        </p>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                            {PROFILE_TASKS.map((task) => {
                                                const isCompleted = completedTasks.includes(task.id)
                                                return (
                                                    <div key={task.id} className="flex items-center gap-3">
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                                                        )}
                                                        <span className={`text-sm ${isCompleted ? 'text-white' : 'text-white/60'}`}>
                                                            {task.label}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Profile details */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-base font-semibold mb-1">Profile details</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Basic information qui composent votre profil.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium mb-4">Basic information</h3>

                                    <div className="flex items-start gap-6 mb-6">
                                        <div className="relative">
                                            {avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    alt="Profile"
                                                    className="w-20 h-20 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                                    <span className="text-white text-2xl font-medium">
                                                        {fullName ? fullName[0].toUpperCase() : 'S'}
                                                    </span>
                                                </div>
                                            )}
                                            <label className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) handleAvatarUpload(file)
                                                    }}
                                                    disabled={uploadingAvatar}
                                                />
                                                {uploadingAvatar ? (
                                                    <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" />
                                                ) : (
                                                    <Upload className="w-3.5 h-3.5 text-gray-600" />
                                                )}
                                            </label>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Photo de profil</label>
                                            <p className="text-xs text-gray-500">Recommended: 400x400. Formats: JPG, PNG, WebP. Max 5MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Nom complet</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Votre nom complet"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Pays</label>
                                            <select
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                            >
                                                <option value="">Select a country</option>
                                                {COUNTRIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Type de profil</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setProfileType('INDIVIDUAL')}
                                                className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                                                    profileType === 'INDIVIDUAL'
                                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                Individuel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProfileType('COMPANY')}
                                                className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                                                    profileType === 'COMPANY'
                                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                Entreprise
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Website and socials */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Website and social media</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Ajoutez votre site et vos comptes sociaux que vous utilisez pour partager des liens.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <Globe className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="https://votre-site.com"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                        <Youtube className="w-5 h-5 text-red-600" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="@votre-chaine"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="@username"
                                        value={twitterUrl}
                                        onChange={(e) => setTwitterUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="linkedin.com/in/username"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="@username"
                                        value={instagramUrl}
                                        onChange={(e) => setInstagramUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="@username"
                                        value={tiktokUrl}
                                        onChange={(e) => setTiktokUrl(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* About you */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">À propos de vous</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Help programs know you, your background and what makes you a good partner.
                            </p>

                            <div className="mb-1">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <span className="text-xs text-gray-400">{aboutYou.length}/1000</span>
                                </div>
                                <textarea
                                    value={aboutYou}
                                    onChange={(e) => setAboutYou(e.target.value)}
                                    placeholder="Describe your experience, skills and what makes you unique..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm resize-none"
                                />
                            </div>
                        </div>

                        {/* Industry interests */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Industry interests</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Select the industries you are passionate about.
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {INDUSTRY_INTERESTS.map((industry) => (
                                    <button
                                        key={industry}
                                        onClick={() => toggleIndustry(industry)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedIndustries.includes(industry)
                                            ? 'bg-violet-100 text-violet-700 border-2 border-violet-300'
                                            : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300'
                                            }`}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Traffic */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Estimated monthly traffic</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Estimate the traffic of your websites, newsletters and social media.
                            </p>

                            <div className="space-y-2">
                                {TRAFFIC_OPTIONS.map((option) => (
                                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="traffic"
                                            checked={trafficRange === option}
                                            onChange={() => setTrafficRange(option)}
                                            className="w-4 h-4 text-violet-600"
                                        />
                                        <span className="text-sm text-gray-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Activity Type */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Activity type</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Select your main activity.
                            </p>

                            <select
                                value={activityType}
                                onChange={(e) => setActivityType(e.target.value as any)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                            >
                                <option value="">Select...</option>
                                <option value="CONTENT_CREATOR">Content creator</option>
                                <option value="SALES_REP">Commercial</option>
                                <option value="INFLUENCER">Influenceur</option>
                                <option value="MARKETER">Marketeur</option>
                                <option value="BLOGGER">Blogueur</option>
                                <option value="DEVELOPER">Developer</option>
                                <option value="CONSULTANT">Consultant</option>
                                <option value="OTHER">Autre</option>
                            </select>
                        </div>

                        {/* How you work */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Comment vous travaillez</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Choose how you like to be paid and promote products.
                            </p>

                            <div className="mb-6">
                                <h4 className="text-sm font-medium mb-3">Preferred earning structure</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={earningPreferences.revShare}
                                            onChange={(e) => setEarningPreferences(prev => ({ ...prev, revShare: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Rev-share (% des ventes)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={earningPreferences.cpc}
                                            onChange={(e) => setEarningPreferences(prev => ({ ...prev, cpc: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Par clic (CPC)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={earningPreferences.cpl}
                                            onChange={(e) => setEarningPreferences(prev => ({ ...prev, cpl: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Par lead (CPL)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={earningPreferences.oneTime}
                                            onChange={(e) => setEarningPreferences(prev => ({ ...prev, oneTime: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Paiement unique</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium mb-3">Sales channels</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={salesChannels.blogs}
                                            onChange={(e) => setSalesChannels(prev => ({ ...prev, blogs: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Blogs</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={salesChannels.newsletters}
                                            onChange={(e) => setSalesChannels(prev => ({ ...prev, newsletters: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Newsletters</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={salesChannels.socialMedia}
                                            onChange={(e) => setSalesChannels(prev => ({ ...prev, socialMedia: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Social media</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={salesChannels.events}
                                            onChange={(e) => setSalesChannels(prev => ({ ...prev, events: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Events</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={salesChannels.companyReferrals}
                                            onChange={(e) => setSalesChannels(prev => ({ ...prev, companyReferrals: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300 text-violet-600"
                                        />
                                        <span className="text-sm">Business referrals</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Portfolio & CV */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h3 className="text-sm font-medium mb-2">Portfolio & CV</h3>
                            <p className="text-xs text-gray-500 mb-4">
                                Share your portfolio and resume to help startups understand your experience.
                            </p>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">Lien portfolio</label>
                                <input
                                    type="url"
                                    value={portfolioUrl}
                                    onChange={(e) => setPortfolioUrl(e.target.value)}
                                    placeholder="https://votreportfolio.com"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">CV / Resume</label>
                                {cvUrl ? (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">CV.pdf</p>
                                                <p className="text-xs text-gray-500">Uploaded successfully</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={cvUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-violet-600 hover:text-violet-700"
                                            >
                                                Voir
                                            </a>
                                            <button
                                                onClick={() => setCvUrl(null)}
                                                className="text-sm text-red-600 hover:text-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleCvUpload(file)
                                            }}
                                            disabled={uploadingCv}
                                        />
                                        {uploadingCv ? (
                                            <>
                                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                                                <p className="text-sm text-gray-600">Uploading...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-600 mb-1">Click to upload</p>
                                                <p className="text-xs text-gray-500">PDF uniquement. Max 10MB.</p>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Save button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </>
                )}

                {/* Account Tab Content */}
                {activeTab === 'account' && (
                    <>
                        {/* Account Settings */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-base font-semibold mb-1">Account settings</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Manage your account settings.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Your email is used for login and notifications
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Password</label>
                                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                        Change password
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Language</label>
                                    <select className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-sm">
                                        <option>English</option>
                                        <option>French</option>
                                        <option>Español</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Sign Out */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <h2 className="text-base font-semibold mb-1">Sign out</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Sign out of your account on this device.
                            </p>

                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign out
                                </button>
                            </form>
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-white rounded-xl border border-red-200 p-6">
                            <h2 className="text-base font-semibold text-red-600 mb-1">Danger zone</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Irreversible actions that affect your account.
                            </p>

                            <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                                Delete account
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                                This will permanently delete your account and all associated data.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
