'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Loader2, Save, Upload, X, ChevronLeft,
    Globe, Building2, MapPin, Calendar, Users,
    FileText, ExternalLink, Image as ImageIcon, Check, LogOut
} from 'lucide-react'
import { getStartupProfile, updateStartupProfile } from '@/app/actions/startup-profile'
import { logout } from '@/app/login/actions'

// =============================================
// CONSTANTS
// =============================================

const INDUSTRIES = [
    'SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'EdTech',
    'MarTech', 'AI / ML', 'Cybersecurity', 'CleanTech', 'FoodTech',
    'PropTech', 'LegalTech', 'HRTech', 'Gaming', 'Media',
    'Marketplace', 'B2B Services', 'Consumer Apps', 'Other'
]

const COMPANY_SIZES = [
    '1-10', '11-50', '51-200', '201-500', '500+'
]

// =============================================
// COMPONENTS
// =============================================

function SectionCard({ title, icon, children }: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="border border-slate-200 bg-white rounded-2xl p-6 hover:border-slate-300 transition-colors duration-300">
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                <div className="w-7 h-7 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600">
                    {icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            {children}
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, type = 'text' }: {
    label: string
    value: string
    onChange: (val: string) => void
    placeholder?: string
    type?: string
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-900 transition-colors"
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options, placeholder }: {
    label: string
    value: string
    onChange: (val: string) => void
    options: string[]
    placeholder?: string
}) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors appearance-none bg-white"
            >
                <option value="">{placeholder || 'Select...'}</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    )
}

function FileUpload({ label, currentUrl, accept, type, onUpload, onRemove }: {
    label: string
    currentUrl: string | null
    accept: string
    type: 'logo' | 'pitch_deck' | 'doc'
    onUpload: (url: string) => void
    onRemove: () => void
}) {
    const [uploading, setUploading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', type)

            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await res.json()

            if (data.success && data.url) {
                onUpload(data.url)
            }
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const isImage = type === 'logo'

    return (
        <div>
            {label && (
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            {currentUrl ? (
                <div className="flex items-center gap-3">
                    {isImage ? (
                        <img
                            src={currentUrl}
                            alt="Logo"
                            className="w-16 h-16 rounded-xl object-cover border-2 border-slate-200"
                        />
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex-1">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600 truncate">{currentUrl.split('/').pop()}</span>
                            <a
                                href={currentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto"
                            >
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-900" />
                            </a>
                        </div>
                    )}
                    <button
                        onClick={onRemove}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:border-slate-900 hover:text-slate-900 transition-colors disabled:opacity-50"
                    >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Change'}
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                    {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {isImage ? <ImageIcon className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            {isImage ? 'Upload logo' : 'Upload PDF'}
                        </>
                    )}
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleUpload}
                className="hidden"
            />
        </div>
    )
}

// =============================================
// MAIN PAGE
// =============================================

export default function StartupProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [industry, setIndustry] = useState('')
    const [companySize, setCompanySize] = useState('')
    const [foundedYear, setFoundedYear] = useState('')
    const [headquarters, setHeadquarters] = useState('')
    const [twitterUrl, setTwitterUrl] = useState('')
    const [linkedinUrl, setLinkedinUrl] = useState('')
    const [instagramUrl, setInstagramUrl] = useState('')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [tiktokUrl, setTiktokUrl] = useState('')
    const [githubUrl, setGithubUrl] = useState('')
    const [pitchDeckUrl, setPitchDeckUrl] = useState<string | null>(null)
    const [docUrl, setDocUrl] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const result = await getStartupProfile()
                if (result.success && result.profile) {
                    const p = result.profile
                    setName(p.name || '')
                    setDescription(p.description || '')
                    setLogoUrl(p.logoUrl)
                    setWebsiteUrl(p.websiteUrl || '')
                    setIndustry(p.industry || '')
                    setCompanySize(p.companySize || '')
                    setFoundedYear(p.foundedYear || '')
                    setHeadquarters(p.headquarters || '')
                    setTwitterUrl(p.twitterUrl || '')
                    setLinkedinUrl(p.linkedinUrl || '')
                    setInstagramUrl(p.instagramUrl || '')
                    setYoutubeUrl(p.youtubeUrl || '')
                    setTiktokUrl(p.tiktokUrl || '')
                    setGithubUrl(p.githubUrl || '')
                    setPitchDeckUrl(p.pitchDeckUrl)
                    setDocUrl(p.docUrl)
                } else if (result.error) {
                    setError(result.error)
                }
            } catch (err) {
                console.error('Error loading profile:', err)
                setError('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    async function handleSave() {
        console.log('=== handleSave called ===')
        setSaving(true)
        setSaved(false)
        setError(null)

        const payload = {
            name: name.trim() || undefined,
            description: description.trim() || null,
            logoUrl,
            websiteUrl: websiteUrl.trim() || null,
            industry: industry || null,
            companySize: companySize || null,
            foundedYear: foundedYear.trim() || null,
            headquarters: headquarters.trim() || null,
            twitterUrl: twitterUrl.trim() || null,
            linkedinUrl: linkedinUrl.trim() || null,
            instagramUrl: instagramUrl.trim() || null,
            youtubeUrl: youtubeUrl.trim() || null,
            tiktokUrl: tiktokUrl.trim() || null,
            githubUrl: githubUrl.trim() || null,
            pitchDeckUrl,
            docUrl,
        }

        console.log('Payload to send:', payload)

        try {
            const result = await updateStartupProfile(payload)
            console.log('Save result:', result)

            if (result.success) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            } else {
                setError(result.error || 'Failed to save profile')
            }
        } catch (err) {
            console.error('Error saving profile:', err)
            setError('An unexpected error occurred while saving')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen">
            <div className="fixed inset-0 bg-grid-small-black opacity-[0.015] pointer-events-none" />

            <div className="relative space-y-8 pb-20 max-w-4xl">
                {/* Back + Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="group flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-900 transition-all duration-300 mb-4"
                        >
                            <div className="w-6 h-6 border border-slate-200 rounded-md flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-900 transition-all duration-300">
                                <ChevronLeft className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
                            </div>
                            <span className="tracking-tight">Dashboard</span>
                        </button>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900">
                            Startup Profile
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Configure your startup's public profile
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                            saved
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-black'
                        } disabled:opacity-50`}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
                    </button>
                </div>

                {/* Error / Success messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Logo + Name Hero */}
                <div className="relative border border-slate-200/60 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-sm">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-slate-900 to-transparent" />
                    <div className="p-8">
                        <div className="flex items-start gap-6">
                            {/* Logo Upload */}
                            <div className="flex-shrink-0">
                                {logoUrl ? (
                                    <div className="relative group">
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200"
                                        />
                                        <button
                                            onClick={() => setLogoUrl(null)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <FileUpload
                                        label=""
                                        currentUrl={null}
                                        accept="image/jpeg,image/png,image/webp"
                                        type="logo"
                                        onUpload={setLogoUrl}
                                        onRemove={() => setLogoUrl(null)}
                                    />
                                )}
                            </div>

                            {/* Name + Description */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Startup Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Startup"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-900 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your startup in a few lines..."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-slate-900 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Company Info */}
                        <SectionCard title="Company Info" icon={<Building2 className="w-4 h-4" />}>
                            <div className="space-y-4">
                                <InputField
                                    label="Website"
                                    value={websiteUrl}
                                    onChange={setWebsiteUrl}
                                    placeholder="https://www.mystartup.com"
                                />
                                <SelectField
                                    label="Industry"
                                    value={industry}
                                    onChange={setIndustry}
                                    options={INDUSTRIES}
                                    placeholder="Select..."
                                />
                                <SelectField
                                    label="Team Size"
                                    value={companySize}
                                    onChange={setCompanySize}
                                    options={COMPANY_SIZES}
                                    placeholder="Select..."
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Founded Year"
                                        value={foundedYear}
                                        onChange={setFoundedYear}
                                        placeholder="2024"
                                    />
                                    <InputField
                                        label="Headquarters"
                                        value={headquarters}
                                        onChange={setHeadquarters}
                                        placeholder="Paris, France"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Documents */}
                        <SectionCard title="Documents" icon={<FileText className="w-4 h-4" />}>
                            <div className="space-y-4">
                                <FileUpload
                                    label="Pitch Deck (PDF)"
                                    currentUrl={pitchDeckUrl}
                                    accept="application/pdf"
                                    type="pitch_deck"
                                    onUpload={setPitchDeckUrl}
                                    onRemove={() => setPitchDeckUrl(null)}
                                />
                                <FileUpload
                                    label="Additional Document (PDF)"
                                    currentUrl={docUrl}
                                    accept="application/pdf"
                                    type="doc"
                                    onUpload={setDocUrl}
                                    onRemove={() => setDocUrl(null)}
                                />
                            </div>
                        </SectionCard>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Social Links */}
                        <SectionCard title="Links" icon={<Globe className="w-4 h-4" />}>
                            <div className="space-y-4">
                                <InputField
                                    label="LinkedIn"
                                    value={linkedinUrl}
                                    onChange={setLinkedinUrl}
                                    placeholder="https://linkedin.com/company/..."
                                />
                                <InputField
                                    label="Twitter / X"
                                    value={twitterUrl}
                                    onChange={setTwitterUrl}
                                    placeholder="https://x.com/..."
                                />
                                <InputField
                                    label="Instagram"
                                    value={instagramUrl}
                                    onChange={setInstagramUrl}
                                    placeholder="https://instagram.com/..."
                                />
                                <InputField
                                    label="YouTube"
                                    value={youtubeUrl}
                                    onChange={setYoutubeUrl}
                                    placeholder="https://youtube.com/@..."
                                />
                                <InputField
                                    label="TikTok"
                                    value={tiktokUrl}
                                    onChange={setTiktokUrl}
                                    placeholder="https://tiktok.com/@..."
                                />
                                <InputField
                                    label="GitHub"
                                    value={githubUrl}
                                    onChange={setGithubUrl}
                                    placeholder="https://github.com/..."
                                />
                            </div>
                        </SectionCard>
                    </div>
                </div>

                {/* Bottom Save Button (for long pages) */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                            saved
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-900 text-white hover:bg-black'
                        } disabled:opacity-50`}
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
                    </button>
                </div>

                {/* Account Section */}
                <SectionCard title="Account" icon={<LogOut className="w-4 h-4" />}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Sign out of your account</p>
                            <p className="text-xs text-slate-400 mt-1">You will be redirected to the login page</p>
                        </div>
                        <form action={logout}>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </form>
                    </div>
                </SectionCard>
            </div>
        </div>
    )
}
