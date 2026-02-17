'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
    Globe, Copy, Check, ExternalLink, Code, MessageSquare,
    Loader2, Link2, ToggleLeft, ToggleRight
} from 'lucide-react'
import { getPortalSettings, togglePortal, updatePortalWelcomeText } from '@/app/actions/portal-settings'

export default function PortalSettingsPage() {
    const t = useTranslations('portal.settings')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<{
        slug: string
        portal_enabled: boolean
        portal_welcome_text: string | null
        customDomain: string | null
        missions: { id: string; title: string }[]
    } | null>(null)

    const [welcomeText, setWelcomeText] = useState('')
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedIframe, setCopiedIframe] = useState(false)
    const [copiedMission, setCopiedMission] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        const result = await getPortalSettings()
        if (result.success && result.data) {
            setSettings(result.data)
            setWelcomeText(result.data.portal_welcome_text || '')
        }
        setLoading(false)
    }

    const handleToggle = async () => {
        if (!settings) return
        const newEnabled = !settings.portal_enabled
        setSettings({ ...settings, portal_enabled: newEnabled })
        await togglePortal(newEnabled)
    }

    const handleSaveWelcome = async () => {
        setSaving(true)
        await updatePortalWelcomeText(welcomeText)
        setSaving(false)
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.traaaction.com'
    const portalUrl = settings ? `${baseUrl}/join/${settings.slug}` : ''
    const iframeSnippet = `<iframe src="${portalUrl}" style="width:100%;height:850px;border:none;" allow="clipboard-write"></iframe>`

    const handleCopy = (text: string, type: 'url' | 'iframe' | string) => {
        navigator.clipboard.writeText(text)
        if (type === 'url') { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000) }
        else if (type === 'iframe') { setCopiedIframe(true); setTimeout(() => setCopiedIframe(false), 2000) }
        else { setCopiedMission(type); setTimeout(() => setCopiedMission(null), 2000) }
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
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
            </div>

            <div className="space-y-6">
                {/* Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between">
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
                </motion.div>

                {settings.portal_enabled && (
                    <>
                        {/* Portal URL */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('portalUrl')}</h2>
                            <p className="text-xs text-gray-500 mb-3">{t('portalUrlDesc')}</p>
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <code className="text-sm text-gray-700 truncate flex-1">{portalUrl}</code>
                                <button onClick={() => handleCopy(portalUrl, 'url')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
                                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
                                    {copiedUrl ? t('copied') : t('copy')}
                                </button>
                                <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>

                            {settings.customDomain && (
                                <div className="mt-3">
                                    <p className="text-xs text-gray-500 mb-1.5">{t('customDomainUrl')}</p>
                                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                        <Globe className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                        <code className="text-sm text-gray-700 truncate flex-1">{`https://${settings.customDomain}/join/${settings.slug}`}</code>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Iframe Embed */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('embedCode')}</h2>
                            <p className="text-xs text-gray-500 mb-3">{t('embedCodeDesc')}</p>
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
                        </motion.div>

                        {/* Welcome Text */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('welcomeText')}</h2>
                            <p className="text-xs text-gray-500 mb-3">{t('welcomeTextDesc')}</p>
                            <textarea
                                value={welcomeText}
                                onChange={(e) => setWelcomeText(e.target.value)}
                                placeholder={t('welcomeTextPlaceholder')}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSaveWelcome}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                    {t('save')}
                                </button>
                            </div>
                        </motion.div>

                        {/* Mission Links */}
                        {settings.missions.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-gray-200 p-6">
                                <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('missionLinks')}</h2>
                                <p className="text-xs text-gray-500 mb-3">{t('missionLinksDesc')}</p>
                                <div className="space-y-2">
                                    {settings.missions.map(mission => {
                                        const missionUrl = `${portalUrl}/${mission.id}`
                                        return (
                                            <div key={mission.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                                                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium text-gray-900 truncate">{mission.title}</p>
                                                    <p className="text-[11px] text-gray-500 truncate">{missionUrl}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(missionUrl, mission.id)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                                                >
                                                    {copiedMission === mission.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-500" />}
                                                </button>
                                                <a href={missionUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-gray-600">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
