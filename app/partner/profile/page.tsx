'use client'

import { useState, useMemo } from 'react'
import { Upload, Check, X, ChevronUp, ChevronDown, CheckCircle2, Circle, Youtube, Globe } from 'lucide-react'

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

// Profile completion tasks
const PROFILE_TASKS = [
    { id: 'basic_info', label: 'Add basic profile info' },
    { id: 'description', label: 'Update your profile description' },
    { id: 'earning_structure', label: 'Select your preferred earning structures' },
    { id: 'healthy_profile', label: 'Maintain a healthy partner profile' },
    { id: 'website_social', label: 'Connect your website or social account' },
    { id: 'traffic', label: 'Specify your estimated monthly traffic' },
    { id: 'sales_channels', label: 'Choose your sales channels' },
    { id: 'earn_commission', label: 'Earn $10 in commissions' },
]

export default function ProfilePage() {
    const [isExpanded, setIsExpanded] = useState(true)
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>(['AI', 'SaaS'])
    const [trafficRange, setTrafficRange] = useState('10,000 - 50,000')
    const [fullName, setFullName] = useState('')
    const [aboutYou, setAboutYou] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [earningPreferences, setEarningPreferences] = useState({
        revShare: true,
        cpc: false,
        cpm: false,
        oneTime: false
    })
    const [salesChannels, setSalesChannels] = useState({
        blogs: true,
        newsletters: true,
        socialMedia: false,
        events: false,
        companyReferrals: false
    })

    // Calculate completed tasks based on form state
    const completedTasks = useMemo(() => {
        const completed: string[] = []

        // 1. Basic info - if name is filled
        if (fullName.trim().length > 0) completed.push('basic_info')

        // 2. Description - if about you is filled
        if (aboutYou.trim().length > 10) completed.push('description')

        // 3. Earning structure - if at least one is selected
        if (Object.values(earningPreferences).some(v => v)) completed.push('earning_structure')

        // 4. Healthy profile - always true for now (placeholder)
        completed.push('healthy_profile')

        // 5. Website/social - if any URL is added
        if (websiteUrl.trim().length > 0) completed.push('website_social')

        // 6. Traffic - if selected
        if (trafficRange) completed.push('traffic')

        // 7. Sales channels - if at least one is selected
        if (Object.values(salesChannels).some(v => v)) completed.push('sales_channels')

        // 8. Earn commission - external, default false
        // completed.push('earn_commission')

        return completed
    }, [fullName, aboutYou, earningPreferences, websiteUrl, trafficRange, salesChannels])

    const toggleIndustry = (industry: string) => {
        setSelectedIndustries(prev =>
            prev.includes(industry)
                ? prev.filter(i => i !== industry)
                : [...prev, industry]
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            <div className="max-w-3xl mx-auto px-8 py-10">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
                        Profile
                    </h1>
                </div>

                {/* Get discovered - Progress Component */}
                <div className="bg-[#18181B] text-white rounded-xl mb-8 overflow-hidden">
                    {/* Header bar */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                <span className="text-sm font-medium">{completedTasks.length} of {PROFILE_TASKS.length} tasks completed</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Expandable content */}
                    {isExpanded && (
                        <div className="px-6 pb-6">
                            <h3 className="text-lg font-semibold mb-1">Get discovered</h3>
                            <p className="text-sm text-white/70 mb-6">
                                Finish these steps to show up in the Partner Network and get invited to more programs.
                            </p>

                            {/* Tasks grid */}
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


                {/* Profile details */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h2 className="text-base font-semibold mb-1">Profile details</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Basic details that make up your profile.
                    </p>

                    {/* Basic information */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium mb-4">Basic information</h3>
                            <p className="text-xs text-gray-600 mb-4">
                                Your basic details and information that's required to set up your Traaaction Partner account.
                            </p>

                            <div className="flex items-start gap-6 mb-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                                        <span className="text-white text-2xl font-medium">L</span>
                                    </div>
                                    <button className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50">
                                        <Upload className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1">Upload image</label>
                                    <p className="text-xs text-gray-500">Recommended: 400x400</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Full name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Votre nom complet"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <div></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        defaultValue="lucasroncey69@gmail.com"
                                        disabled
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Country</label>
                                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                        <option>🇫🇷 France</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Profile type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400">
                                        Individual
                                    </button>
                                    <button className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400">
                                        Company
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Website and socials */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-medium mb-2">Website and socials</h3>
                    <p className="text-xs text-gray-600 mb-4">
                        Add your website and social accounts you use to share links, run traffic to websites etc. https://both.com from all your programs.
                    </p>

                    <div className="space-y-3">
                        {/* Website URL */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Globe className="w-5 h-5 text-gray-600" />
                            </div>
                            <input
                                type="url"
                                placeholder="https://votre-site.com"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        {/* YouTube */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                <Youtube className="w-5 h-5 text-red-600" />
                            </div>
                            <input
                                type="text"
                                placeholder="@votre-chaine"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        {/* X/Twitter */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="@username"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        {/* LinkedIn */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="linkedin.com/in/username"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        {/* Instagram */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="@username"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        {/* TikTok */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="@username"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* About you */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-medium mb-2">About you and your expertise</h3>
                    <p className="text-xs text-gray-600 mb-4">
                        Help programs get to know you, your background, interests, and what makes you a great partner.
                    </p>

                    <div className="mb-1">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium">About you</label>
                            <span className="text-xs text-gray-500">{aboutYou.length}/1000</span>
                        </div>
                        <textarea
                            value={aboutYou}
                            onChange={(e) => setAboutYou(e.target.value)}
                            placeholder="Décrivez votre expérience, vos compétences et ce qui vous rend unique en tant que partenaire..."
                            rows={4}
                            maxLength={1000}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        />
                    </div>
                </div>

                {/* Industry interests */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-medium mb-2">Industry interests</h3>
                    <p className="text-xs text-gray-600 mb-4">
                        Add the industries you are passionate about. This helps programs in those verticals find you.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {INDUSTRY_INTERESTS.map((industry) => (
                            <button
                                key={industry}
                                onClick={() => toggleIndustry(industry)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedIndustries.includes(industry)
                                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:border-gray-300'
                                    }`}
                            >
                                {industry}
                            </button>
                        ))}
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Edit interests
                    </button>
                </div>

                {/* Estimated monthly traffic */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-medium mb-2">Estimated monthly traffic</h3>
                    <p className="text-xs text-gray-600 mb-4">
                        Estimate websites, newsletters, and social accounts. Include monthly visits as well.
                    </p>

                    <div className="space-y-2">
                        {TRAFFIC_OPTIONS.map((option) => (
                            <label key={option} className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    name="traffic"
                                    checked={trafficRange === option}
                                    onChange={() => setTrafficRange(option)}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* How you work */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <h3 className="text-sm font-medium mb-2">How you work</h3>
                    <p className="text-xs text-gray-600 mb-4">
                        Choose how you like to earn and promote products to help programs understand your style of partnership.
                    </p>

                    <div className="mb-6">
                        <h4 className="text-sm font-medium mb-3">Preferred earning structure</h4>
                        <p className="text-xs text-gray-600 mb-3">
                            Choose how you'd like to be rewarded. Select all that apply.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={earningPreferences.revShare}
                                    onChange={(e) => setEarningPreferences(prev => ({ ...prev, revShare: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Rev-share (% of sales)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={earningPreferences.cpc}
                                    onChange={(e) => setEarningPreferences(prev => ({ ...prev, cpc: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Per click (CPC)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={earningPreferences.cpm}
                                    onChange={(e) => setEarningPreferences(prev => ({ ...prev, cpm: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Per lead (CPL)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={earningPreferences.oneTime}
                                    onChange={(e) => setEarningPreferences(prev => ({ ...prev, oneTime: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">One-time payment</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium mb-3">Sales channels</h4>
                        <p className="text-xs text-gray-600 mb-3">
                            Where you promote products and links. Select all that apply.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={salesChannels.blogs}
                                    onChange={(e) => setSalesChannels(prev => ({ ...prev, blogs: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Blogs</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={salesChannels.newsletters}
                                    onChange={(e) => setSalesChannels(prev => ({ ...prev, newsletters: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Newsletters</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={salesChannels.socialMedia}
                                    onChange={(e) => setSalesChannels(prev => ({ ...prev, socialMedia: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Social media</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={salesChannels.events}
                                    onChange={(e) => setSalesChannels(prev => ({ ...prev, events: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Events</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={salesChannels.companyReferrals}
                                    onChange={(e) => setSalesChannels(prev => ({ ...prev, companyReferrals: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm">Company referrals</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                    <button className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    )
}
