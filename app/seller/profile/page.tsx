'use client'

import { useState, useMemo, useEffect } from 'react'
import { Upload, Check, ChevronRight, Loader2, AlertCircle, X, FileText, Briefcase, MapPin, Sparkles, Globe, Youtube, User } from 'lucide-react'
import { getMySellerProfile, updateMySellerProfile, type MySellerProfileData } from '@/app/actions/sellers'
import { motion, AnimatePresence } from 'framer-motion'

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

const PROFILE_TASKS = [
    { id: 'country', label: 'Country', icon: MapPin },
    { id: 'social_media', label: 'Social media', icon: Globe },
    { id: 'description', label: 'Description', icon: FileText },
    { id: 'industry_interests', label: 'Industries', icon: Briefcase },
    { id: 'activity_type', label: 'Activity', icon: User },
    { id: 'how_you_work', label: 'Work style', icon: Sparkles },
]

const TASK_SECTION_MAP: Record<string, string> = {
    country: 'section-basic',
    social_media: 'section-social',
    description: 'section-about',
    industry_interests: 'section-industries',
    activity_type: 'section-activity',
    how_you_work: 'section-activity',
}

// Reusable card component
function ProfileCard({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    return (
        <motion.div
            id={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-2xl border border-neutral-200/60 shadow-sm ${className}`}
        >
            {children}
        </motion.div>
    )
}

// Reusable input component
function Input({ label, required, ...props }: { label?: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            {label && (
                <label className="block text-[13px] font-medium text-neutral-700 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <input
                {...props}
                className="w-full h-11 px-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-all"
            />
        </div>
    )
}

// Reusable select component
function Select({ label, required, children, ...props }: { label?: string; required?: boolean; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div>
            {label && (
                <label className="block text-[13px] font-medium text-neutral-700 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <select
                {...props}
                className="w-full h-11 px-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[15px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
                {children}
            </select>
        </div>
    )
}

export default function ProfilePage() {
    const [isExpanded, setIsExpanded] = useState(true)
    const [hasSeenValidation, setHasSeenValidation] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [originalValues, setOriginalValues] = useState<any>(null)
    const [hasChanges, setHasChanges] = useState(false)

    // Form state
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [country, setCountry] = useState('')
    const [profileType, setProfileType] = useState<'INDIVIDUAL' | 'COMPANY' | ''>('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [twitterUrl, setTwitterUrl] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [instagramUrl, setInstagramUrl] = useState('')
    const [tiktokUrl, setTiktokUrl] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [portfolioUrl, setPortfolioUrl] = useState('')
    const [cvUrl, setCvUrl] = useState<string | null>(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [uploadingCv, setUploadingCv] = useState(false)
    const [aboutYou, setAboutYou] = useState('')
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
    const [trafficRange, setTrafficRange] = useState('')
    const [activityType, setActivityType] = useState<'CONTENT_CREATOR' | 'SALES_REP' | 'INFLUENCER' | 'MARKETER' | 'BLOGGER' | 'DEVELOPER' | 'CONSULTANT' | 'OTHER' | ''>('')
    const [earningPreferences, setEarningPreferences] = useState({
        revShare: false, cpc: false, cpl: false, oneTime: false
    })
    const [salesChannels, setSalesChannels] = useState({
        blogs: false, newsletters: false, socialMedia: false, events: false, companyReferrals: false
    })

    useEffect(() => {
        const seen = localStorage.getItem('seller_validation_seen')
        if (seen === 'true') setHasSeenValidation(true)
    }, [])

    useEffect(() => {
        if (!originalValues) return
        const currentValues = {
            fullName, country, profileType, websiteUrl, youtubeUrl, twitterUrl,
            linkedinUrl, instagramUrl, tiktokUrl, avatarUrl, portfolioUrl, cvUrl,
            aboutYou, selectedIndustries, trafficRange, activityType,
            earningPreferences, salesChannels
        }
        setHasChanges(JSON.stringify(currentValues) !== JSON.stringify(originalValues))
    }, [originalValues, fullName, country, profileType, websiteUrl, youtubeUrl, twitterUrl,
        linkedinUrl, instagramUrl, tiktokUrl, avatarUrl, portfolioUrl, cvUrl,
        aboutYou, selectedIndustries, trafficRange, activityType, earningPreferences, salesChannels])

    useEffect(() => {
        async function loadProfile() {
            try {
                const result = await getMySellerProfile()
                if (result.success && result.profile) {
                    const p = result.profile
                    setFullName(p.name || '')
                    setEmail(p.email || '')
                    setCountry(p.country || '')
                    setProfileType(p.profileType || '')
                    setWebsiteUrl(p.websiteUrl || '')
                    setYoutubeUrl(p.youtubeUrl || '')
                    setTwitterUrl(p.twitterUrl || '')
                    setLinkedinUrl(p.linkedinUrl || '')
                    setInstagramUrl(p.instagramUrl || '')
                    setTiktokUrl(p.tiktokUrl || '')
                    setAvatarUrl(p.avatarUrl || null)
                    setPortfolioUrl(p.portfolioUrl || '')
                    setCvUrl(p.cvUrl || null)
                    setAboutYou(p.bio || '')
                    setSelectedIndustries(p.industryInterests || [])
                    setTrafficRange(p.monthlyTraffic || '')
                    setActivityType(p.activityType || '')
                    if (p.earningPreferences) setEarningPreferences(p.earningPreferences)
                    if (p.salesChannels) setSalesChannels(p.salesChannels)
                    setOriginalValues({
                        fullName: p.name || '', country: p.country || '', profileType: p.profileType || '',
                        websiteUrl: p.websiteUrl || '', youtubeUrl: p.youtubeUrl || '', twitterUrl: p.twitterUrl || '',
                        linkedinUrl: p.linkedinUrl || '', instagramUrl: p.instagramUrl || '', tiktokUrl: p.tiktokUrl || '',
                        avatarUrl: p.avatarUrl || null, portfolioUrl: p.portfolioUrl || '', cvUrl: p.cvUrl || null,
                        aboutYou: p.bio || '', selectedIndustries: p.industryInterests || [],
                        trafficRange: p.monthlyTraffic || '', activityType: p.activityType || '',
                        earningPreferences: p.earningPreferences || { revShare: false, cpc: false, cpl: false, oneTime: false },
                        salesChannels: p.salesChannels || { blogs: false, newsletters: false, socialMedia: false, events: false, companyReferrals: false }
                    })
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

    async function handleAvatarUpload(file: File) {
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'avatar')
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json()
            if (data.success && data.url) setAvatarUrl(data.url)
            else setError(data.error || 'Error uploading photo')
        } catch (err) {
            setError('Error uploading photo')
        } finally {
            setUploadingAvatar(false)
        }
    }

    async function handleCvUpload(file: File) {
        setUploadingCv(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', 'cv')
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json()
            if (data.success && data.url) setCvUrl(data.url)
            else setError(data.error || 'Error uploading CV')
        } catch (err) {
            setError('Error uploading CV')
        } finally {
            setUploadingCv(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setSaveSuccess(false)
        setError(null)
        const payload = {
            name: fullName, bio: aboutYou, country: country || undefined,
            profileType: (profileType === 'INDIVIDUAL' || profileType === 'COMPANY') ? profileType : undefined,
            websiteUrl: websiteUrl || undefined, youtubeUrl: youtubeUrl || undefined,
            twitterUrl: twitterUrl || undefined, linkedinUrl: linkedinUrl || undefined,
            instagramUrl: instagramUrl || undefined, tiktokUrl: tiktokUrl || undefined,
            avatarUrl: avatarUrl || undefined, portfolioUrl: portfolioUrl || undefined,
            cvUrl: cvUrl || undefined, industryInterests: selectedIndustries.length > 0 ? selectedIndustries : undefined,
            monthlyTraffic: trafficRange || undefined, activityType: activityType || undefined,
            earningPreferences, salesChannels
        }
        try {
            const result = await updateMySellerProfile(payload)
            if (result.success) {
                setSaveSuccess(true)
                setTimeout(() => setSaveSuccess(false), 3000)
                setOriginalValues({
                    fullName, country, profileType, websiteUrl, youtubeUrl, twitterUrl,
                    linkedinUrl, instagramUrl, tiktokUrl, avatarUrl, portfolioUrl, cvUrl,
                    aboutYou, selectedIndustries, trafficRange, activityType, earningPreferences, salesChannels
                })
            } else {
                setError(result.error || 'Failed to save')
            }
        } catch (err) {
            setError('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const completedTasks = useMemo(() => {
        const completed: string[] = []
        if (country.trim().length > 0) completed.push('country')
        const hasSocialMedia = [websiteUrl, youtubeUrl, twitterUrl, linkedinUrl, instagramUrl, tiktokUrl].some(url => url.trim().length > 0)
        if (hasSocialMedia) completed.push('social_media')
        if (aboutYou.trim().length > 10) completed.push('description')
        if (selectedIndustries.length > 0) completed.push('industry_interests')
        if (activityType) completed.push('activity_type')
        const hasHowYouWork = Object.values(earningPreferences).some(v => v) || Object.values(salesChannels).some(v => v)
        if (hasHowYouWork) completed.push('how_you_work')
        return completed
    }, [country, websiteUrl, youtubeUrl, twitterUrl, linkedinUrl, instagramUrl, tiktokUrl, aboutYou, selectedIndustries, activityType, earningPreferences, salesChannels])

    const toggleIndustry = (industry: string) => {
        setSelectedIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])
    }

    const isProfileComplete = completedTasks.length === PROFILE_TASKS.length
    const shouldShowValidatedBanner = isProfileComplete && !hasSeenValidation

    // Find first incomplete section for highlight
    const firstIncompleteSection = useMemo(() => {
        const incomplete = PROFILE_TASKS.find(t => !completedTasks.includes(t.id))
        return incomplete ? TASK_SECTION_MAP[incomplete.id] : null
    }, [completedTasks])

    const scrollToSection = (taskId: string) => {
        const sectionId = TASK_SECTION_MAP[taskId]
        if (sectionId) {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    useEffect(() => {
        if (shouldShowValidatedBanner && !loading) {
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
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    <span className="text-sm text-neutral-500">Loading profile...</span>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight">
                        Profile
                    </h1>
                    <p className="text-[15px] text-neutral-500 mt-1">
                        Manage your public profile information
                    </p>
                </motion.div>

                {/* Error/Success Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-[14px] text-red-600 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            {error}
                            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}
                    {saveSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-[14px] text-emerald-700 flex items-center gap-3"
                        >
                            <Check className="w-5 h-5 flex-shrink-0" />
                            Profile updated successfully
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-6">
                    {/* Profile Completion */}
                    {!isProfileComplete && (
                        <ProfileCard className="overflow-hidden sticky top-16 z-30">
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12">
                                            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                                <circle cx="24" cy="24" r="20" strokeWidth="4" className="fill-none stroke-neutral-100" />
                                                <circle
                                                    cx="24" cy="24" r="20" strokeWidth="4" strokeLinecap="round"
                                                    className="fill-none stroke-neutral-900"
                                                    style={{ strokeDasharray: `${(completedTasks.length / PROFILE_TASKS.length) * 125.6} 125.6`, transition: 'stroke-dasharray 0.5s ease-out' }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[13px] font-semibold text-neutral-900">
                                                    {completedTasks.length}/{PROFILE_TASKS.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-semibold text-neutral-900">Complete your profile</h3>
                                            <p className="text-[13px] text-neutral-500">to appear in the Seller Network</p>
                                            <p className="text-[12px] text-neutral-400 mt-1">{Math.round((completedTasks.length / PROFILE_TASKS.length) * 100)}% complete • {PROFILE_TASKS.length - completedTasks.length} fields remaining</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4 border-t border-neutral-100">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {PROFILE_TASKS.map((task) => {
                                                        const isCompleted = completedTasks.includes(task.id)
                                                        const Icon = task.icon
                                                        return (
                                                            <div
                                                                key={task.id}
                                                                onClick={() => !isCompleted && scrollToSection(task.id)}
                                                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                                                                    isCompleted ? 'bg-emerald-50' : 'bg-neutral-50 cursor-pointer hover:bg-neutral-100'
                                                                }`}
                                                            >
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                    isCompleted ? 'bg-emerald-500' : 'bg-neutral-200'
                                                                }`}>
                                                                    {isCompleted ? (
                                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                                    ) : (
                                                                        <Icon className="w-3 h-3 text-neutral-500" />
                                                                    )}
                                                                </div>
                                                                <span className={`text-[13px] font-medium ${isCompleted ? 'text-emerald-700' : 'text-neutral-600'}`}>
                                                                    {task.label}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ProfileCard>
                    )}

                    {/* Basic Info */}
                    <ProfileCard id="section-basic" className={firstIncompleteSection === 'section-basic' ? 'ring-2 ring-violet-200' : ''}>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-6">Basic information</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-5 mb-6">
                                <div className="relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-2xl object-cover" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                                            <span className="text-neutral-500 text-2xl font-medium">{fullName ? fullName[0].toUpperCase() : 'S'}</span>
                                        </div>
                                    )}
                                    <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 cursor-pointer shadow-sm transition-colors">
                                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden"
                                            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file) }}
                                            disabled={uploadingAvatar}
                                        />
                                        {uploadingAvatar ? <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" /> : <Upload className="w-4 h-4 text-neutral-600" />}
                                    </label>
                                </div>
                                <div>
                                    <p className="text-[14px] font-medium text-neutral-900">Profile photo</p>
                                    <p className="text-[13px] text-neutral-500">JPG, PNG, WebP. Max 5MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
                                <Select label="Country" required value={country} onChange={(e) => setCountry(e.target.value)}>
                                    <option value="">Select country</option>
                                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </Select>
                            </div>

                            <div className="mt-4">
                                <label className="block text-[13px] font-medium text-neutral-700 mb-2">Profile type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['INDIVIDUAL', 'COMPANY'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setProfileType(type)}
                                            className={`h-11 rounded-xl text-[14px] font-medium transition-all ${
                                                profileType === type
                                                    ? 'bg-neutral-900 text-white'
                                                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                            }`}
                                        >
                                            {type === 'INDIVIDUAL' ? 'Individual' : 'Company'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ProfileCard>

                    {/* Social Links */}
                    <ProfileCard id="section-social" className={firstIncompleteSection === 'section-social' ? 'ring-2 ring-violet-200' : ''}>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">Social links</h2>
                            <p className="text-[13px] text-neutral-500 mb-6">Add at least one social account <span className="text-red-500">*</span></p>

                            <div className="space-y-3">
                                {[
                                    { icon: 'globe', placeholder: 'https://your-website.com', value: websiteUrl, setter: setWebsiteUrl, bg: 'bg-neutral-100' },
                                    { icon: 'youtube', placeholder: '@your-channel', value: youtubeUrl, setter: setYoutubeUrl, bg: 'bg-red-50', iconColor: 'text-red-500' },
                                    { icon: 'twitter', placeholder: '@username', value: twitterUrl, setter: setTwitterUrl, bg: 'bg-neutral-900', iconColor: 'text-white' },
                                    { icon: 'linkedin', placeholder: 'linkedin.com/in/username', value: linkedinUrl, setter: setLinkedinUrl, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                                    { icon: 'instagram', placeholder: '@username', value: instagramUrl, setter: setInstagramUrl, bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', iconColor: 'text-white' },
                                    { icon: 'tiktok', placeholder: '@username', value: tiktokUrl, setter: setTiktokUrl, bg: 'bg-neutral-900', iconColor: 'text-white' },
                                ].map((social, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${social.bg} flex items-center justify-center flex-shrink-0`}>
                                            {social.icon === 'globe' && <Globe className={`w-5 h-5 ${social.iconColor || 'text-neutral-600'}`} />}
                                            {social.icon === 'youtube' && <Youtube className={`w-5 h-5 ${social.iconColor || 'text-neutral-600'}`} />}
                                            {social.icon === 'twitter' && <svg className={`w-4 h-4 ${social.iconColor || 'text-neutral-600'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>}
                                            {social.icon === 'linkedin' && <svg className={`w-5 h-5 ${social.iconColor || 'text-neutral-600'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>}
                                            {social.icon === 'instagram' && <svg className={`w-5 h-5 ${social.iconColor || 'text-neutral-600'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>}
                                            {social.icon === 'tiktok' && <svg className={`w-5 h-5 ${social.iconColor || 'text-neutral-600'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={social.placeholder}
                                            value={social.value}
                                            onChange={(e) => social.setter(e.target.value)}
                                            className="flex-1 h-10 px-4 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-all"
                                        />
                                    </div>
                                )) as React.ReactNode}
                            </div>
                        </div>
                    </ProfileCard>

                    {/* About */}
                    <ProfileCard id="section-about" className={firstIncompleteSection === 'section-about' ? 'ring-2 ring-violet-200' : ''}>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">About you</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">Share your background and expertise <span className="text-red-500">*</span></p>

                            <div className="relative">
                                <textarea
                                    value={aboutYou}
                                    onChange={(e) => setAboutYou(e.target.value)}
                                    placeholder="Describe your experience, skills and what makes you unique..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-4 py-3 bg-neutral-50/50 border border-neutral-200 rounded-xl text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-300 transition-all resize-none"
                                />
                                <span className="absolute bottom-3 right-3 text-[12px] text-neutral-400">{aboutYou.length}/1000</span>
                            </div>
                        </div>
                    </ProfileCard>

                    {/* Industries */}
                    <ProfileCard id="section-industries" className={firstIncompleteSection === 'section-industries' ? 'ring-2 ring-violet-200' : ''}>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">Industry interests</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">Select industries you're passionate about <span className="text-red-500">*</span></p>

                            <div className="flex flex-wrap gap-2">
                                {INDUSTRY_INTERESTS.map((industry) => (
                                    <button
                                        key={industry}
                                        onClick={() => toggleIndustry(industry)}
                                        className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                                            selectedIndustries.includes(industry)
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                        }`}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </ProfileCard>

                    {/* Activity & Traffic */}
                    <ProfileCard id="section-activity" className={firstIncompleteSection === 'section-activity' ? 'ring-2 ring-violet-200' : ''}>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-4">Activity details</h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <Select label="Activity type" required value={activityType} onChange={(e) => setActivityType(e.target.value as any)}>
                                    <option value="">Select...</option>
                                    <option value="CONTENT_CREATOR">Content creator</option>
                                    <option value="SALES_REP">Sales representative</option>
                                    <option value="INFLUENCER">Influencer</option>
                                    <option value="MARKETER">Marketer</option>
                                    <option value="BLOGGER">Blogger</option>
                                    <option value="DEVELOPER">Developer</option>
                                    <option value="CONSULTANT">Consultant</option>
                                    <option value="OTHER">Other</option>
                                </Select>
                                <Select label="Monthly traffic" value={trafficRange} onChange={(e) => setTrafficRange(e.target.value)}>
                                    <option value="">Select...</option>
                                    {TRAFFIC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </Select>
                            </div>

                            <div className="pt-4 border-t border-neutral-100">
                                <h3 className="text-[13px] font-medium text-neutral-700 mb-3">How you work <span className="text-red-500">*</span></h3>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[12px] text-neutral-500 mb-2 uppercase tracking-wide">Earning preferences</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { key: 'revShare', label: 'Rev-share' },
                                                { key: 'cpc', label: 'Per click' },
                                                { key: 'cpl', label: 'Per lead' },
                                                { key: 'oneTime', label: 'One-time' }
                                            ].map(({ key, label }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setEarningPreferences(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                                                        earningPreferences[key as keyof typeof earningPreferences]
                                                            ? 'bg-neutral-900 text-white'
                                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[12px] text-neutral-500 mb-2 uppercase tracking-wide">Sales channels</p>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { key: 'blogs', label: 'Blogs' },
                                                { key: 'newsletters', label: 'Newsletters' },
                                                { key: 'socialMedia', label: 'Social media' },
                                                { key: 'events', label: 'Events' },
                                                { key: 'companyReferrals', label: 'Referrals' }
                                            ].map(({ key, label }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => setSalesChannels(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                                                        salesChannels[key as keyof typeof salesChannels]
                                                            ? 'bg-neutral-900 text-white'
                                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ProfileCard>

                    {/* Portfolio & CV */}
                    <ProfileCard>
                        <div className="p-6">
                            <h2 className="text-[15px] font-semibold text-neutral-900 mb-1">Portfolio & CV</h2>
                            <p className="text-[13px] text-neutral-500 mb-4">Optional materials to showcase your work</p>

                            <Input label="Portfolio link" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" />

                            <div className="mt-4">
                                <label className="block text-[13px] font-medium text-neutral-700 mb-2">CV / Resume</label>
                                {cvUrl ? (
                                    <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-medium text-neutral-900">CV uploaded</p>
                                                <p className="text-[12px] text-neutral-500">PDF document</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors">View</a>
                                            <span className="text-neutral-300">·</span>
                                            <button onClick={() => setCvUrl(null)} className="text-[13px] font-medium text-red-600 hover:text-red-700 transition-colors">Remove</button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-all">
                                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCvUpload(file) }} disabled={uploadingCv} />
                                        {uploadingCv ? (
                                            <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                                                <p className="text-[13px] text-neutral-600">Click to upload PDF</p>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>
                    </ProfileCard>
                </div>

                {/* Floating Save Button */}
                <AnimatePresence>
                    {(hasChanges || saving || saveSuccess) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed bottom-8 right-8 z-50"
                        >
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`h-12 px-6 rounded-2xl text-[14px] font-semibold shadow-lg transition-all flex items-center gap-2 ${
                                    saveSuccess
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                }`}
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                ) : saveSuccess ? (
                                    <><Check className="w-4 h-4" /> Saved</>
                                ) : (
                                    'Save changes'
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
