'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Copy, Check, ExternalLink, Code, Loader2,
    ToggleRight, ToggleLeft, Type, Palette, MessageSquare, Image,
    Users, DollarSign, BarChart3, ChevronDown, Plus,
    Pencil, Trash2, X, Link2, RefreshCw, UserPlus
} from 'lucide-react'
import {
    getPortalSettings, togglePortal, updatePortalBranding,
    getPortalOverview, createPortalMission, updatePortalMission,
    deletePortalMission, getPortalAnalytics, updatePortalSubdomain
} from '@/app/actions/portal-settings'

interface PortalMission {
    id: string
    title: string
    description: string
    target_url: string
    portal_visible: boolean
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
    recurring_duration_months: number | null
    Contents: { id: string; type: string; url: string | null; title: string; description: string | null }[]
}

interface PortalSettings {
    slug: string
    portal_enabled: boolean
    portal_welcome_text: string | null
    portal_primary_color: string | null
    portal_headline: string | null
    portal_logo_url: string | null
    portal_subdomain: string | null
    customDomain: string | null
    missions: PortalMission[]
}

interface PortalStats {
    totalAffiliates: number
    totalCommissions: number
    totalRevenue: number
}

interface MissionFormData {
    title: string
    description: string
    targetUrl: string
    sale: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number }
    lead: { enabled: boolean; amount: number }
    recurring: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number; duration: number | null }
    resources: { title: string; url: string; type: 'LINK' | 'PDF' | 'YOUTUBE' | 'TEXT' }[]
}

const EMPTY_FORM: MissionFormData = {
    title: '', description: '', targetUrl: '',
    sale: { enabled: true, structure: 'PERCENTAGE', amount: 0 },
    lead: { enabled: false, amount: 0 },
    recurring: { enabled: false, structure: 'PERCENTAGE', amount: 0, duration: null },
    resources: [],
}

export default function PortalManagementPage() {
    const t = useTranslations('portal.settings')

    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<PortalSettings | null>(null)
    const [stats, setStats] = useState<PortalStats | null>(null)

    // Branding form
    const [savingBranding, setSavingBranding] = useState(false)
    const [brandingSaved, setBrandingSaved] = useState(false)
    const [welcomeText, setWelcomeText] = useState('')
    const [headline, setHeadline] = useState('')
    const [primaryColor, setPrimaryColor] = useState('#7C3AED')
    const [logoUrl, setLogoUrl] = useState('')

    // Subdomain
    const [subdomain, setSubdomain] = useState('')
    const [savingSubdomain, setSavingSubdomain] = useState(false)
    const [subdomainSaved, setSubdomainSaved] = useState(false)
    const [subdomainError, setSubdomainError] = useState('')

    // Share
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedIframe, setCopiedIframe] = useState(false)
    const [showEmbed, setShowEmbed] = useState(false)

    // Mission CRUD
    const [showMissionForm, setShowMissionForm] = useState(false)
    const [editingMission, setEditingMission] = useState<string | null>(null)
    const [missionForm, setMissionForm] = useState<MissionFormData>(EMPTY_FORM)
    const [savingMission, setSavingMission] = useState(false)
    const [deletingMission, setDeletingMission] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        const [settingsResult, overviewResult] = await Promise.all([
            getPortalSettings(),
            getPortalOverview(),
        ])

        if (settingsResult.success && settingsResult.data) {
            setSettings(settingsResult.data as unknown as PortalSettings)
            setWelcomeText(settingsResult.data.portal_welcome_text || '')
            setHeadline(settingsResult.data.portal_headline || '')
            setPrimaryColor(settingsResult.data.portal_primary_color || '#7C3AED')
            setLogoUrl(settingsResult.data.portal_logo_url || '')
            setSubdomain(settingsResult.data.portal_subdomain || '')
        }

        if (overviewResult.success && overviewResult.data) {
            setStats(overviewResult.data)
        }

        setLoading(false)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const handleToggle = async () => {
        if (!settings) return
        const newVal = !settings.portal_enabled
        setSettings({ ...settings, portal_enabled: newVal })
        await togglePortal(newVal)
        if (newVal) {
            const result = await getPortalSettings()
            if (result.success && result.data) setSettings(result.data as unknown as PortalSettings)
        }
    }

    const handleSaveBranding = async () => {
        setSavingBranding(true)
        const result = await updatePortalBranding({
            headline,
            welcomeText,
            primaryColor,
            logoUrl: logoUrl || undefined,
        })
        setSavingBranding(false)
        if (result.success) {
            setBrandingSaved(true)
            setTimeout(() => setBrandingSaved(false), 2000)
        }
    }

    // Mission form handlers
    const openCreateMission = () => {
        setMissionForm(EMPTY_FORM)
        setEditingMission(null)
        setShowMissionForm(true)
    }

    const openEditMission = (mission: PortalMission) => {
        setMissionForm({
            title: mission.title,
            description: mission.description,
            targetUrl: mission.target_url,
            sale: {
                enabled: mission.sale_enabled,
                structure: (mission.sale_reward_structure as 'FLAT' | 'PERCENTAGE') || 'PERCENTAGE',
                amount: mission.sale_reward_amount || 0,
            },
            lead: { enabled: mission.lead_enabled, amount: mission.lead_reward_amount || 0 },
            recurring: {
                enabled: mission.recurring_enabled,
                structure: (mission.recurring_reward_structure as 'FLAT' | 'PERCENTAGE') || 'PERCENTAGE',
                amount: mission.recurring_reward_amount || 0,
                duration: mission.recurring_duration_months,
            },
            resources: mission.Contents.map(c => ({
                title: c.title,
                url: c.url || c.description || '',
                type: c.type as 'LINK' | 'PDF' | 'YOUTUBE' | 'TEXT',
            })),
        })
        setEditingMission(mission.id)
        setShowMissionForm(true)
    }

    const handleSaveMission = async () => {
        setSavingMission(true)
        let result
        if (editingMission) {
            result = await updatePortalMission(editingMission, missionForm)
        } else {
            result = await createPortalMission(missionForm)
        }
        setSavingMission(false)
        if (result.success) {
            setShowMissionForm(false)
            setEditingMission(null)
            const settingsResult = await getPortalSettings()
            if (settingsResult.success && settingsResult.data) {
                setSettings(settingsResult.data as unknown as PortalSettings)
            }
        }
    }

    const handleDeleteMission = async (missionId: string) => {
        setDeletingMission(missionId)
        await deletePortalMission(missionId)
        setDeletingMission(null)
        const settingsResult = await getPortalSettings()
        if (settingsResult.success && settingsResult.data) {
            setSettings(settingsResult.data as unknown as PortalSettings)
        }
    }

    const addResource = () => {
        setMissionForm(prev => ({
            ...prev,
            resources: [...prev.resources, { title: '', url: '', type: 'LINK' as const }],
        }))
    }

    const removeResource = (index: number) => {
        setMissionForm(prev => ({
            ...prev,
            resources: prev.resources.filter((_, i) => i !== index),
        }))
    }

    const handleSaveSubdomain = async () => {
        setSavingSubdomain(true)
        setSubdomainError('')
        const result = await updatePortalSubdomain(subdomain)
        setSavingSubdomain(false)
        if (result.success) {
            setSubdomainSaved(true)
            setTimeout(() => setSubdomainSaved(false), 2000)
            // Reload settings to get updated portal_subdomain
            const sr = await getPortalSettings()
            if (sr.success && sr.data) setSettings(sr.data as unknown as PortalSettings)
        } else {
            setSubdomainError(result.error || 'Error')
        }
    }

    const portalSlug = settings?.portal_subdomain || settings?.slug || ''
    const portalUrl = settings ? `https://traaaction.com/join/${settings.slug}` : ''
    const subdomainUrl = portalSlug ? `https://${portalSlug}.traaaction.com` : ''
    const customDomainUrl = settings?.customDomain ? `https://${settings.customDomain}` : ''
    const iframeSnippet = `<iframe src="${subdomainUrl || portalUrl}" style="width:100%;height:850px;border:none;" allow="clipboard-write"></iframe>`

    const handleCopy = (text: string, type: 'url' | 'iframe') => {
        navigator.clipboard.writeText(text)
        if (type === 'url') { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000) }
        else { setCopiedIframe(true); setTimeout(() => setCopiedIframe(false), 2000) }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (!settings) {
        return (
            <div className="text-center py-20 text-gray-500">
                <p>{t('loadError')}</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
                        <p className="text-sm text-gray-500">{t('subtitle')}</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${settings.portal_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {settings.portal_enabled ? t('enabled') : t('disabled')}
                </div>
            </div>

            {/* Overview Stats */}
            {stats && settings.portal_enabled && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                        <Users className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{stats.totalAffiliates}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('totalAffiliates')}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                        <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{stats.totalCommissions}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('totalCommissions')}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                        <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-900">{(stats.totalRevenue / 100).toFixed(0)}&euro;</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('totalRevenue')}</p>
                    </div>
                </motion.div>
            )}

            <div className="space-y-6">
                {/* Section 1: Setup & Branding */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                    {/* Toggle */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">{t('enablePortal')}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{t('enablePortalDesc')}</p>
                        </div>
                        <button onClick={handleToggle} className="focus:outline-none">
                            {settings.portal_enabled ? (
                                <ToggleRight className="w-10 h-10 text-purple-600" />
                            ) : (
                                <ToggleLeft className="w-10 h-10 text-gray-300" />
                            )}
                        </button>
                    </div>

                    {settings.portal_enabled && (
                        <div className="border-t border-gray-100 pt-5 space-y-5">
                            {/* Logo URL */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Image className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('logoUrl')}</label>
                                </div>
                                <input
                                    type="url"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                />
                            </div>

                            {/* Headline */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Type className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('headline')}</label>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-2">{t('headlineDesc')}</p>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    placeholder={t('headlinePlaceholder')}
                                    maxLength={80}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                />
                                <span className="text-[11px] text-gray-400 mt-1 block">{headline.length}/80</span>
                            </div>

                            {/* Brand Color */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Palette className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('brandColor')}</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setPrimaryColor(val)
                                        }}
                                        className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                                    />
                                    <div
                                        className="flex-1 h-10 rounded-xl flex items-center justify-center text-white text-xs font-semibold"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {t('previewButton')}
                                    </div>
                                </div>
                            </div>

                            {/* Welcome Text */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('welcomeText')}</label>
                                </div>
                                <textarea
                                    value={welcomeText}
                                    onChange={(e) => setWelcomeText(e.target.value)}
                                    placeholder={t('welcomeTextPlaceholder')}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                />
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveBranding}
                                    disabled={savingBranding}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {savingBranding ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : brandingSaved ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : null}
                                    {brandingSaved ? t('saved') : t('save')}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {settings.portal_enabled && (
                    <>
                        {/* Section 2: Missions */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-white rounded-2xl border border-gray-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-900">{t('missions')}</h2>
                                <button
                                    onClick={openCreateMission}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t('addMission')}
                                </button>
                            </div>

                            {settings.missions.length === 0 && !showMissionForm ? (
                                <div className="text-center py-8 bg-amber-50 rounded-xl">
                                    <p className="text-xs text-amber-700">{t('noMissionsWarning')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {settings.missions.map(mission => (
                                        <div
                                            key={mission.id}
                                            className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{mission.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {mission.sale_enabled && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                            <DollarSign className="w-3 h-3" />Sale
                                                        </span>
                                                    )}
                                                    {mission.lead_enabled && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                            <UserPlus className="w-3 h-3" />Lead
                                                        </span>
                                                    )}
                                                    {mission.recurring_enabled && (
                                                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                            <RefreshCw className="w-3 h-3" />Recurring
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                                <button
                                                    onClick={() => openEditMission(mission)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMission(mission.id)}
                                                    disabled={deletingMission === mission.id}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingMission === mission.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Mission Form */}
                            <AnimatePresence>
                                {showMissionForm && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mt-4"
                                    >
                                        <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-semibold text-gray-700">
                                                    {editingMission ? t('editMission') : t('addMission')}
                                                </h3>
                                                <button onClick={() => { setShowMissionForm(false); setEditingMission(null) }}>
                                                    <X className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </div>

                                            {/* Title + Description + URL */}
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={missionForm.title}
                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder={t('missionTitle')}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                                                />
                                                <textarea
                                                    value={missionForm.description}
                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder={t('missionDescription')}
                                                    rows={2}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                                                />
                                                <input
                                                    type="url"
                                                    value={missionForm.targetUrl}
                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, targetUrl: e.target.value }))}
                                                    placeholder={t('missionTargetUrl')}
                                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                                                />
                                            </div>

                                            {/* Commission Config */}
                                            <div>
                                                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">{t('commissionConfig')}</p>
                                                <div className="space-y-2">
                                                    {/* Sale */}
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={missionForm.sale.enabled}
                                                            onChange={(e) => setMissionForm(prev => ({ ...prev, sale: { ...prev.sale, enabled: e.target.checked } }))}
                                                            className="rounded accent-purple-600"
                                                        />
                                                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-700 w-16">Sale</span>
                                                        {missionForm.sale.enabled && (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <select
                                                                    value={missionForm.sale.structure}
                                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, sale: { ...prev.sale, structure: e.target.value as 'FLAT' | 'PERCENTAGE' } }))}
                                                                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                >
                                                                    <option value="PERCENTAGE">%</option>
                                                                    <option value="FLAT">&euro; (cents)</option>
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    value={missionForm.sale.amount || ''}
                                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, sale: { ...prev.sale, amount: Number(e.target.value) } }))}
                                                                    className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                    placeholder="Amount"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Lead */}
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={missionForm.lead.enabled}
                                                            onChange={(e) => setMissionForm(prev => ({ ...prev, lead: { ...prev.lead, enabled: e.target.checked } }))}
                                                            className="rounded accent-purple-600"
                                                        />
                                                        <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-700 w-16">Lead</span>
                                                        {missionForm.lead.enabled && (
                                                            <input
                                                                type="number"
                                                                value={missionForm.lead.amount || ''}
                                                                onChange={(e) => setMissionForm(prev => ({ ...prev, lead: { ...prev.lead, amount: Number(e.target.value) } }))}
                                                                className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                placeholder="Cents"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Recurring */}
                                                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={missionForm.recurring.enabled}
                                                            onChange={(e) => setMissionForm(prev => ({ ...prev, recurring: { ...prev.recurring, enabled: e.target.checked } }))}
                                                            className="rounded accent-purple-600"
                                                        />
                                                        <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-700 w-16">Recurring</span>
                                                        {missionForm.recurring.enabled && (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <select
                                                                    value={missionForm.recurring.structure}
                                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, recurring: { ...prev.recurring, structure: e.target.value as 'FLAT' | 'PERCENTAGE' } }))}
                                                                    className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                >
                                                                    <option value="PERCENTAGE">%</option>
                                                                    <option value="FLAT">&euro; (cents)</option>
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    value={missionForm.recurring.amount || ''}
                                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, recurring: { ...prev.recurring, amount: Number(e.target.value) } }))}
                                                                    className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                    placeholder="Amount"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={missionForm.recurring.duration ?? ''}
                                                                    onChange={(e) => setMissionForm(prev => ({ ...prev, recurring: { ...prev.recurring, duration: e.target.value ? Number(e.target.value) : null } }))}
                                                                    className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                                    placeholder="Months"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Resources */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t('resources')}</p>
                                                    <button
                                                        onClick={addResource}
                                                        className="text-[11px] font-medium text-purple-600 hover:text-purple-700"
                                                    >
                                                        + {t('addResource')}
                                                    </button>
                                                </div>
                                                {missionForm.resources.map((r, i) => (
                                                    <div key={i} className="flex items-center gap-2 mb-2">
                                                        <select
                                                            value={r.type}
                                                            onChange={(e) => {
                                                                const newRes = [...missionForm.resources]
                                                                newRes[i] = { ...newRes[i], type: e.target.value as 'LINK' | 'PDF' | 'YOUTUBE' | 'TEXT' }
                                                                setMissionForm(prev => ({ ...prev, resources: newRes }))
                                                            }}
                                                            className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs w-24"
                                                        >
                                                            <option value="LINK">Link</option>
                                                            <option value="PDF">PDF</option>
                                                            <option value="YOUTUBE">YouTube</option>
                                                            <option value="TEXT">Text</option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={r.title}
                                                            onChange={(e) => {
                                                                const newRes = [...missionForm.resources]
                                                                newRes[i] = { ...newRes[i], title: e.target.value }
                                                                setMissionForm(prev => ({ ...prev, resources: newRes }))
                                                            }}
                                                            placeholder="Title"
                                                            className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={r.url}
                                                            onChange={(e) => {
                                                                const newRes = [...missionForm.resources]
                                                                newRes[i] = { ...newRes[i], url: e.target.value }
                                                                setMissionForm(prev => ({ ...prev, resources: newRes }))
                                                            }}
                                                            placeholder="URL"
                                                            className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                                        />
                                                        <button onClick={() => removeResource(i)} className="p-1.5 text-gray-400 hover:text-red-500">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Save Mission */}
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => { setShowMissionForm(false); setEditingMission(null) }}
                                                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveMission}
                                                    disabled={savingMission || !missionForm.title.trim()}
                                                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {savingMission && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                    {editingMission ? t('save') : t('addMission')}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Section 3: Share */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="bg-white rounded-2xl border border-gray-200 p-6"
                        >
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('portalUrl')}</h2>
                            <p className="text-xs text-gray-500 mb-3">{t('primaryUrlDesc')}</p>

                            {/* Primary URL (path-based) */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                <code className="text-sm text-gray-700 truncate flex-1">{portalUrl}</code>
                                <button onClick={() => handleCopy(portalUrl, 'url')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                    {copiedUrl ? t('copied') : t('copy')}
                                </button>
                            </div>

                            {/* Subdomain URL — editable */}
                            <div className="mt-4">
                                <p className="text-xs font-medium text-gray-700 mb-1.5">{t('subdomainUrl')}</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex-1">
                                        <span className="text-xs text-gray-400 pl-3 flex-shrink-0">https://</span>
                                        <input
                                            type="text"
                                            value={subdomain}
                                            onChange={(e) => {
                                                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                                                setSubdomainError('')
                                            }}
                                            placeholder={settings.slug}
                                            className="w-24 px-1 py-2.5 bg-transparent text-sm font-medium text-gray-900 focus:outline-none"
                                        />
                                        <span className="text-xs text-gray-400 pr-3 flex-shrink-0">.traaaction.com</span>
                                    </div>
                                    <button
                                        onClick={handleSaveSubdomain}
                                        disabled={savingSubdomain}
                                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                    >
                                        {savingSubdomain ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : subdomainSaved ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        ) : null}
                                        {subdomainSaved ? t('saved') : t('save')}
                                    </button>
                                    {subdomainUrl && (
                                        <button onClick={() => handleCopy(subdomainUrl, 'url')} className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
                                            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                            {copiedUrl ? t('copied') : t('copy')}
                                        </button>
                                    )}
                                </div>
                                {subdomainError && (
                                    <p className="text-[11px] text-red-500 mt-1">{subdomainError}</p>
                                )}
                                {subdomainUrl && !subdomainError && (
                                    <p className="text-[11px] text-gray-400 mt-1">{subdomainUrl}</p>
                                )}
                            </div>

                            {/* Custom domain */}
                            {settings.customDomain && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-1.5">{t('customDomainUrl')}</p>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                        <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <code className="text-sm text-gray-700 truncate flex-1">{customDomainUrl}</code>
                                        <button onClick={() => handleCopy(customDomainUrl, 'url')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                                            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                            {copiedUrl ? t('copied') : t('copy')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview button */}
                            <a
                                href={customDomainUrl || subdomainUrl || portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors mt-4"
                            >
                                <ExternalLink className="w-4 h-4" />
                                {t('viewPortal')}
                            </a>

                            {/* Embed — Accordion */}
                            <div className="mt-5 border-t border-gray-100 pt-4">
                                <button
                                    onClick={() => setShowEmbed(!showEmbed)}
                                    className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <Code className="w-4 h-4" />
                                    {t('embedCode')}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${showEmbed ? 'rotate-180' : ''}`} />
                                </button>
                                {showEmbed && (
                                    <div className="mt-3">
                                        <p className="text-[11px] text-gray-500 mb-2">{t('embedCodeDesc')}</p>
                                        <div className="relative">
                                            <pre className="bg-gray-900 text-gray-300 rounded-xl p-4 text-xs overflow-x-auto">
                                                <code>{iframeSnippet}</code>
                                            </pre>
                                            <button
                                                onClick={() => handleCopy(iframeSnippet, 'iframe')}
                                                className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors"
                                            >
                                                {copiedIframe ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                                                {copiedIframe ? t('copied') : t('copy')}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-2">{t('iframeNote')}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    )
}
