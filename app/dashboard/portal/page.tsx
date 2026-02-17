'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
    Globe, Copy, Check, ExternalLink, Code, Loader2,
    ToggleRight, ToggleLeft, Type, Palette, MessageSquare,
    Eye, EyeOff, Users, DollarSign, BarChart3, ChevronDown
} from 'lucide-react'
import {
    getPortalSettings, togglePortal,
    toggleMissionPortalVisibility,
    getPortalOverview, updatePortalBranding
} from '@/app/actions/portal-settings'

interface PortalSettings {
    slug: string
    portal_enabled: boolean
    portal_welcome_text: string | null
    portal_primary_color: string | null
    portal_headline: string | null
    customDomain: string | null
    missions: { id: string; title: string; portal_visible: boolean }[]
}

interface PortalStats {
    totalAffiliates: number
    totalCommissions: number
    totalRevenue: number
}

export default function PortalManagementPage() {
    const t = useTranslations('portal.settings')

    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<PortalSettings | null>(null)
    const [stats, setStats] = useState<PortalStats | null>(null)
    const [savingBranding, setSavingBranding] = useState(false)
    const [brandingSaved, setBrandingSaved] = useState(false)
    const [welcomeText, setWelcomeText] = useState('')
    const [headline, setHeadline] = useState('')
    const [primaryColor, setPrimaryColor] = useState('#7C3AED')
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedIframe, setCopiedIframe] = useState(false)
    const [togglingMission, setTogglingMission] = useState<string | null>(null)
    const [showEmbed, setShowEmbed] = useState(false)

    const loadData = useCallback(async () => {
        const [settingsResult, overviewResult] = await Promise.all([
            getPortalSettings(),
            getPortalOverview(),
        ])

        if (settingsResult.success && settingsResult.data) {
            setSettings(settingsResult.data)
            setWelcomeText(settingsResult.data.portal_welcome_text || '')
            setHeadline(settingsResult.data.portal_headline || '')
            setPrimaryColor(settingsResult.data.portal_primary_color || '#7C3AED')
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
        // Re-fetch to get updated mission visibility
        if (newVal) {
            const result = await getPortalSettings()
            if (result.success && result.data) setSettings(result.data)
        }
    }

    const handleSaveBranding = async () => {
        setSavingBranding(true)
        const result = await updatePortalBranding({
            headline,
            welcomeText,
            primaryColor,
        })
        setSavingBranding(false)
        if (result.success) {
            setBrandingSaved(true)
            setTimeout(() => setBrandingSaved(false), 2000)
        }
    }

    const handleToggleMission = async (missionId: string, currentVisible: boolean) => {
        if (!settings) return
        setTogglingMission(missionId)
        const newVisible = !currentVisible
        setSettings({
            ...settings,
            missions: settings.missions.map(m =>
                m.id === missionId ? { ...m, portal_visible: newVisible } : m
            ),
        })
        await toggleMissionPortalVisibility(missionId, newVisible)
        setTogglingMission(null)
    }

    const portalUrl = settings ? `https://traaaction.com/join/${settings.slug}` : ''
    const iframeSnippet = `<iframe src="${portalUrl}" style="width:100%;height:850px;border:none;" allow="clipboard-write"></iframe>`

    const handleCopy = (text: string, type: 'url' | 'iframe') => {
        navigator.clipboard.writeText(text)
        if (type === 'url') { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000) }
        else { setCopiedIframe(true); setTimeout(() => setCopiedIframe(false), 2000) }
    }

    const visibleCount = settings?.missions.filter(m => m.portal_visible).length || 0

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
                {/* Section 1: Enable & Programs */}
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

                    {/* Mission visibility */}
                    {settings.portal_enabled && (
                        <>
                            <div className="border-t border-gray-100 pt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-700">{t('missionSelection')}</h3>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{t('missionSelectionDesc')}</p>
                                    </div>
                                    {visibleCount === 0 && settings.missions.length > 0 && (
                                        <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            {t('noMissions')}
                                        </span>
                                    )}
                                </div>

                                {settings.missions.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                                        <Eye className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs text-gray-500">{t('noMissions')}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{t('noMissionsDesc')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {settings.missions.map(mission => (
                                            <div
                                                key={mission.id}
                                                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                                            >
                                                <p className="text-sm font-medium text-gray-900 truncate flex-1">{mission.title}</p>
                                                <button
                                                    onClick={() => handleToggleMission(mission.id, mission.portal_visible)}
                                                    disabled={togglingMission === mission.id}
                                                    className="flex-shrink-0 focus:outline-none ml-3"
                                                >
                                                    {togglingMission === mission.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                                                    ) : mission.portal_visible ? (
                                                        <Eye className="w-5 h-5 text-purple-600" />
                                                    ) : (
                                                        <EyeOff className="w-5 h-5 text-gray-300" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </motion.div>

                {settings.portal_enabled && (
                    <>
                        {/* Section 2: Branding (single save) */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('branding')}</h2>

                            {/* Headline */}
                            <div className="mb-5">
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
                            <div className="mb-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Palette className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('brandColor')}</label>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-2">{t('brandColorDesc')}</p>
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
                            <div className="mb-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="w-4 h-4 text-gray-400" />
                                    <label className="text-xs font-medium text-gray-700">{t('welcomeText')}</label>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-2">{t('welcomeTextDesc')}</p>
                                <textarea
                                    value={welcomeText}
                                    onChange={(e) => setWelcomeText(e.target.value)}
                                    placeholder={t('welcomeTextPlaceholder')}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                />
                            </div>

                            {/* Single Save Button */}
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
                        </motion.div>

                        {/* Section 3: Share */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('portalUrl')}</h2>
                            <p className="text-xs text-gray-500 mb-3">{t('primaryUrlDesc')}</p>

                            {/* URL */}
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                <code className="text-sm text-gray-700 truncate flex-1">{portalUrl}</code>
                                <button onClick={() => handleCopy(portalUrl, 'url')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                    {copiedUrl ? t('copied') : t('copy')}
                                </button>
                            </div>

                            {/* Custom domain */}
                            {settings.customDomain && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-1.5">{t('customDomainUrl')}</p>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                        <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <code className="text-sm text-gray-700 truncate flex-1">{`https://${settings.customDomain}/join/${settings.slug}`}</code>
                                    </div>
                                </div>
                            )}

                            {/* Preview button */}
                            <a
                                href={portalUrl}
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
