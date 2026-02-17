'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
    ExternalLink, Copy, Check, Loader2, Eye, EyeOff,
    TrendingUp, MousePointerClick, DollarSign, RefreshCw,
    Users, ArrowRight, FileText, Youtube, Link2,
    Mail, LogOut
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getPortalMission, getPortalUserStatus, portalJoinMission, getPortalDashboard } from '@/app/actions/portal'

// =============================================
// HELPERS
// =============================================

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}€`
}

// =============================================
// MISSION PORTAL PAGE
// =============================================

export default function MissionPortalPage() {
    const params = useParams()
    const t = useTranslations('portal')
    const workspaceSlug = params.workspaceSlug as string
    const missionId = params.missionId as string

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [workspace, setWorkspace] = useState<{ id: string; name: string; slug: string; portal_welcome_text: string | null } | null>(null)
    const [mission, setMission] = useState<{
        id: string; title: string; description: string; company_name: string | null; logo_url: string | null;
        visibility: string; sale_enabled: boolean; sale_reward_amount: number | null; sale_reward_structure: string | null;
        lead_enabled: boolean; lead_reward_amount: number | null; recurring_enabled: boolean;
        recurring_reward_amount: number | null; recurring_reward_structure: string | null; recurring_duration_months: number | null;
        contents: { id: string; type: string; url: string | null; title: string; description: string | null }[]
    } | null>(null)
    const [userStatus, setUserStatus] = useState<{ authenticated: boolean; enrolled: boolean; enrolledMissionIds: string[] }>({ authenticated: false, enrolled: false, enrolledMissionIds: [] })
    const [enrollmentData, setEnrollmentData] = useState<{ linkUrl: string | null; clicks: number } | null>(null)
    const [commissionStats, setCommissionStats] = useState({ pendingCount: 0, pendingAmount: 0, earnedTotal: 0 })

    // Auth
    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
    const [authName, setAuthName] = useState('')
    const [authEmail, setAuthEmail] = useState('')
    const [authPassword, setAuthPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [confirmationSent, setConfirmationSent] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)

    const [joining, setJoining] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    const supabase = createClient()

    const loadData = useCallback(async () => {
        setLoading(true)
        const [missionResult, statusResult] = await Promise.all([
            getPortalMission(workspaceSlug, missionId),
            getPortalUserStatus(workspaceSlug),
        ])

        if (!missionResult.success || !missionResult.data) {
            setError(missionResult.error || 'Mission not found')
            setLoading(false)
            return
        }

        setWorkspace(missionResult.data.workspace)
        setMission(missionResult.data.mission)
        setUserStatus(statusResult)

        // If enrolled in this mission, load enrollment data
        if (statusResult.enrolledMissionIds.includes(missionId)) {
            const dashResult = await getPortalDashboard(workspaceSlug)
            if (dashResult.success && dashResult.data) {
                const enrollment = dashResult.data.enrollments.find(e => e.missionId === missionId)
                if (enrollment) {
                    setEnrollmentData({ linkUrl: enrollment.linkUrl, clicks: enrollment.clicks })
                }
                setCommissionStats(dashResult.data.commissionStats)
            }
        }

        setLoading(false)
    }, [workspaceSlug, missionId])

    useEffect(() => { loadData() }, [loadData])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setAuthLoading(true)

        if (authName.length < 2) { setAuthError(t('errorNameMin')); setAuthLoading(false); return }
        if (authPassword.length < 6) { setAuthError(t('errorPasswordMin')); setAuthLoading(false); return }

        const siteUrl = window.location.origin
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}/${missionId}`

        const { error } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
                data: { full_name: authName, role: 'seller' },
                emailRedirectTo: redirectUrl,
            },
        })

        if (error) { setAuthError(error.message); setAuthLoading(false); return }
        setConfirmationSent(true)
        setAuthLoading(false)
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setAuthLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) { setAuthError(error.message); setAuthLoading(false); return }
        window.location.reload()
    }

    const handleResendConfirmation = async () => {
        setResendLoading(true)
        const siteUrl = window.location.origin
        await supabase.auth.resend({
            type: 'signup',
            email: authEmail,
            options: { emailRedirectTo: `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}/${missionId}` },
        })
        setResendLoading(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    const handleJoin = async () => {
        setJoining(true)
        const result = await portalJoinMission(missionId)
        if (result.success) await loadData()
        setJoining(false)
    }

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
    }

    // Enrolled in this specific mission?
    const isEnrolled = userStatus.enrolledMissionIds.includes(missionId)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (error || !workspace || !mission) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ExternalLink className="w-8 h-8 text-gray-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('notAvailable')}</h1>
                    <p className="text-sm text-gray-500">{t('notAvailableDesc')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
            {/* Header */}
            <header className="border-b border-gray-100 bg-white/70 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <a href={`/join/${workspaceSlug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
                            {workspace.name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{workspace.name}</p>
                            <p className="text-xs text-gray-500">{t('affiliateProgram')}</p>
                        </div>
                    </a>
                    <div className="flex items-center gap-3">
                        {userStatus.authenticated && (
                            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <a href="https://traaaction.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-500 transition-colors">
                            Powered by Traaaction
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Mission Hero */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="flex items-start gap-4 mb-4">
                        {mission.logo_url ? (
                            <img src={mission.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-7 h-7 text-purple-500" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{mission.title}</h1>
                            {mission.company_name && <p className="text-sm text-gray-500 mt-1">{mission.company_name}</p>}
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{mission.description}</p>
                </motion.div>

                {/* Reward Cards */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {mission.sale_enabled && mission.sale_reward_amount && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4">
                            <DollarSign className="w-5 h-5 text-emerald-500 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">{t('perSale')}</p>
                            <p className="text-xl font-bold text-gray-900">{formatReward(mission.sale_reward_amount, mission.sale_reward_structure)}</p>
                        </div>
                    )}
                    {mission.lead_enabled && mission.lead_reward_amount && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4">
                            <Users className="w-5 h-5 text-blue-500 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">{t('perLead')}</p>
                            <p className="text-xl font-bold text-gray-900">{formatReward(mission.lead_reward_amount, null)}</p>
                        </div>
                    )}
                    {mission.recurring_enabled && mission.recurring_reward_amount && (
                        <div className="bg-white rounded-2xl border border-gray-200 p-4">
                            <RefreshCw className="w-5 h-5 text-purple-500 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">{t('recurringCommission')}</p>
                            <p className="text-xl font-bold text-gray-900">{formatReward(mission.recurring_reward_amount, mission.recurring_reward_structure)}</p>
                            {mission.recurring_duration_months && (
                                <p className="text-[11px] text-gray-400 mt-0.5">{mission.recurring_duration_months} {t('months')}</p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* ===== ENROLLED: Mini Dashboard ===== */}
                {userStatus.authenticated && isEnrolled && enrollmentData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mb-8">
                        {/* Affiliate Link */}
                        {enrollmentData.linkUrl && (
                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <p className="text-xs font-medium text-gray-500 mb-2">{t('yourLink')}</p>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                                    <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <code className="text-sm text-gray-700 truncate flex-1">{enrollmentData.linkUrl}</code>
                                    <button
                                        onClick={() => handleCopy(enrollmentData.linkUrl!)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                                    >
                                        {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedLink ? t('copied') : t('copyLink')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                                <MousePointerClick className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                                <p className="text-lg font-bold text-gray-900">{enrollmentData.clicks}</p>
                                <p className="text-[11px] text-gray-500">{t('clicks')}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                                <DollarSign className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                                <p className="text-lg font-bold text-gray-900">{(commissionStats.pendingAmount / 100).toFixed(2)}€</p>
                                <p className="text-[11px] text-gray-500">{t('pending')}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                                <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                                <p className="text-lg font-bold text-gray-900">{(commissionStats.earnedTotal / 100).toFixed(2)}€</p>
                                <p className="text-[11px] text-gray-500">{t('earned')}</p>
                            </div>
                        </div>

                        {/* Full Dashboard Link */}
                        <div className="text-center">
                            <a
                                href={`${typeof window !== 'undefined' && window.location.hostname.includes('traaaction.com') ? 'https://seller.traaaction.com' : ''}/seller`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
                            >
                                {t('fullDashboard')}
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* ===== AUTHENTICATED BUT NOT ENROLLED: Join Button ===== */}
                {userStatus.authenticated && !isEnrolled && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <button
                            onClick={handleJoin}
                            disabled={joining}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                        >
                            {joining ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowRight className="w-4 h-4" />
                                    {mission.visibility === 'PRIVATE' ? t('requestToJoin') : t('joinMission')}
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* ===== NOT AUTHENTICATED: Auth Form ===== */}
                {!userStatus.authenticated && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-md mx-auto mb-8">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                            {confirmationSent ? (
                                <div className="text-center py-4">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Mail className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('checkEmail')}</h2>
                                    <p className="text-sm text-gray-500 mb-6">{t('confirmationSent', { email: authEmail })}</p>
                                    <button onClick={handleResendConfirmation} disabled={resendLoading} className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50">
                                        {resendLoading ? t('resending') : t('resendEmail')}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {authMode === 'signup' ? t('createAccount') : t('signIn')}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {authMode === 'signup' ? t('signUpToJoinMission') : t('signInDesc')}
                                        </p>
                                    </div>

                                    <form onSubmit={authMode === 'signup' ? handleSignup : handleLogin} className="space-y-3">
                                        {authMode === 'signup' && (
                                            <input
                                                type="text"
                                                placeholder={t('namePlaceholder')}
                                                value={authName}
                                                onChange={(e) => setAuthName(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                                required
                                            />
                                        )}
                                        <input
                                            type="email"
                                            placeholder={t('emailPlaceholder')}
                                            value={authEmail}
                                            onChange={(e) => setAuthEmail(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                                            required
                                        />
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder={t('passwordPlaceholder')}
                                                value={authPassword}
                                                onChange={(e) => setAuthPassword(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all pr-10"
                                                required
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}

                                        <button
                                            type="submit"
                                            disabled={authLoading}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                        >
                                            {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : authMode === 'signup' ? t('signUpButton') : t('signInButton')}
                                        </button>
                                    </form>

                                    <div className="mt-4 text-center">
                                        <button onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError('') }} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                            {authMode === 'signup' ? t('alreadyHaveAccount') : t('noAccount')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Resources */}
                {mission.contents.length > 0 && (isEnrolled || !userStatus.authenticated) && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('resources')}</h2>
                        <div className="space-y-2">
                            {mission.contents.map(c => (
                                <a
                                    key={c.id}
                                    href={c.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200 hover:border-purple-200 transition-all"
                                >
                                    {c.type === 'YOUTUBE' && <Youtube className="w-5 h-5 text-red-500 flex-shrink-0" />}
                                    {c.type === 'PDF' && <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                                    {(c.type === 'LINK' || c.type === 'TEXT') && <Link2 className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                                        {c.description && <p className="text-xs text-gray-500 truncate">{c.description}</p>}
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-6 mt-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <a href="https://traaaction.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
                        Powered by Traaaction
                    </a>
                </div>
            </footer>
        </div>
    )
}
