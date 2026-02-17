'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
    ExternalLink, Copy, Check, Loader2, Eye, EyeOff,
    TrendingUp, MousePointerClick, DollarSign, RefreshCw,
    Users, ArrowRight, FileText, Youtube, Link2, CheckCircle2,
    Mail, ChevronDown, ChevronUp, LogOut
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getPortalData, getPortalUserStatus, portalJoinMission, getPortalDashboard } from '@/app/actions/portal'

// =============================================
// TYPES
// =============================================

interface MissionCard {
    id: string
    title: string
    description: string
    company_name: string | null
    logo_url: string | null
    visibility: string
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
    recurring_duration_months: number | null
}

interface PortalProfile {
    logo_url: string | null
    description: string | null
    website_url: string | null
    industry: string | null
    twitter_url: string | null
    linkedin_url: string | null
}

interface Enrollment {
    id: string
    missionId: string
    missionTitle: string
    missionDescription: string
    linkSlug: string | null
    linkUrl: string | null
    clicks: number
    contents: { id: string; type: string; url: string | null; title: string; description: string | null }[]
    sale_enabled: boolean
    sale_reward_amount: number | null
    sale_reward_structure: string | null
    lead_enabled: boolean
    lead_reward_amount: number | null
    recurring_enabled: boolean
    recurring_reward_amount: number | null
    recurring_reward_structure: string | null
}

// =============================================
// HELPERS
// =============================================

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}€`
}

function RewardBadge({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full text-xs font-medium text-gray-700">
            <Icon className="w-3 h-3 text-purple-500" />
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-900 font-semibold">{value}</span>
        </div>
    )
}

// =============================================
// MAIN PORTAL PAGE
// =============================================

export default function PortalPage() {
    const params = useParams()
    const router = useRouter()
    const t = useTranslations('portal')
    const workspaceSlug = params.workspaceSlug as string

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [workspace, setWorkspace] = useState<{ id: string; name: string; slug: string; portal_welcome_text: string | null } | null>(null)
    const [profile, setProfile] = useState<PortalProfile | null>(null)
    const [missions, setMissions] = useState<MissionCard[]>([])
    const [userStatus, setUserStatus] = useState<{ authenticated: boolean; enrolled: boolean; enrolledMissionIds: string[]; userName?: string }>({ authenticated: false, enrolled: false, enrolledMissionIds: [] })
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [commissionStats, setCommissionStats] = useState({ pendingCount: 0, pendingAmount: 0, earnedTotal: 0 })

    // Auth form state
    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
    const [authName, setAuthName] = useState('')
    const [authEmail, setAuthEmail] = useState('')
    const [authPassword, setAuthPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [authLoading, setAuthLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [confirmationSent, setConfirmationSent] = useState(false)
    const [resendLoading, setResendLoading] = useState(false)

    // Join state
    const [joiningMission, setJoiningMission] = useState<string | null>(null)
    const [copiedLink, setCopiedLink] = useState<string | null>(null)
    const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null)

    // Load portal data
    const loadData = useCallback(async () => {
        setLoading(true)
        const [portalResult, statusResult] = await Promise.all([
            getPortalData(workspaceSlug),
            getPortalUserStatus(workspaceSlug),
        ])

        if (!portalResult.success || !portalResult.data) {
            setError(portalResult.error || 'Portal not available')
            setLoading(false)
            return
        }

        setWorkspace(portalResult.data.workspace)
        setProfile(portalResult.data.profile)
        setMissions(portalResult.data.missions)
        setUserStatus(statusResult)

        // If user is enrolled, load dashboard data
        if (statusResult.enrolled) {
            const dashResult = await getPortalDashboard(workspaceSlug)
            if (dashResult.success && dashResult.data) {
                setEnrollments(dashResult.data.enrollments)
                setCommissionStats(dashResult.data.commissionStats)
            }
        }

        setLoading(false)
    }, [workspaceSlug])

    useEffect(() => { loadData() }, [loadData])

    // Auth handlers
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setAuthLoading(true)

        if (authName.length < 2) { setAuthError(t('errorNameMin')); setAuthLoading(false); return }
        if (authPassword.length < 6) { setAuthError(t('errorPasswordMin')); setAuthLoading(false); return }

        const siteUrl = window.location.origin
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}`

        const { error } = await supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
            options: {
                data: { full_name: authName, role: 'seller' },
                emailRedirectTo: redirectUrl,
            },
        })

        if (error) {
            setAuthError(error.message)
            setAuthLoading(false)
            return
        }

        setConfirmationSent(true)
        setAuthLoading(false)
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setAuthError('')
        setAuthLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
        })

        if (error) {
            setAuthError(error.message)
            setAuthLoading(false)
            return
        }

        // Reload to get authenticated state
        window.location.reload()
    }

    const handleResendConfirmation = async () => {
        setResendLoading(true)
        const siteUrl = window.location.origin
        const redirectUrl = `${siteUrl}/auth/callback?role=seller&next=/join/${workspaceSlug}`

        await supabase.auth.resend({
            type: 'signup',
            email: authEmail,
            options: { emailRedirectTo: redirectUrl },
        })
        setResendLoading(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    // Join a mission
    const handleJoin = async (missionId: string) => {
        setJoiningMission(missionId)
        const result = await portalJoinMission(missionId)

        if (result.success) {
            // Reload dashboard data
            await loadData()
        }
        setJoiningMission(null)
    }

    // Copy link
    const handleCopy = (url: string, enrollmentId: string) => {
        navigator.clipboard.writeText(url)
        setCopiedLink(enrollmentId)
        setTimeout(() => setCopiedLink(null), 2000)
    }

    // =============================================
    // RENDER
    // =============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (error || !workspace) {
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

    const unenrolledMissions = missions.filter(m => !userStatus.enrolledMissionIds.includes(m.id))
    const hasEnrollments = enrollments.length > 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
            {/* Header */}
            <header className="border-b border-gray-100 bg-white/70 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {profile?.logo_url ? (
                            <img src={profile.logo_url} alt={workspace.name} className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm">
                                {workspace.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{workspace.name}</p>
                            <p className="text-xs text-gray-500">{t('affiliateProgram')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {userStatus.authenticated && (
                            <>
                                <span className="text-xs text-gray-500 hidden sm:block">{userStatus.userName}</span>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                        <a
                            href="https://traaaction.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            Powered by Traaaction
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                        {workspace.portal_welcome_text || t('defaultWelcome', { name: workspace.name })}
                    </h1>
                    {profile?.description && (
                        <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">{profile.description}</p>
                    )}
                </motion.div>

                {/* ===== STATE 3: ENROLLED DASHBOARD ===== */}
                {userStatus.authenticated && hasEnrollments && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mb-10">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <MousePointerClick className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-medium text-gray-500">{t('totalClicks')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {enrollments.reduce((sum, e) => sum + e.clicks, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <DollarSign className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-medium text-gray-500">{t('pendingCommissions')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(commissionStats.pendingAmount / 100).toFixed(2)}€
                                </p>
                                <p className="text-[11px] text-gray-400">{commissionStats.pendingCount} {t('pending')}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium text-gray-500">{t('totalEarned')}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(commissionStats.earnedTotal / 100).toFixed(2)}€
                                </p>
                            </div>
                        </div>

                        {/* Enrolled Missions */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-gray-900">{t('yourMissions')}</h2>
                            {enrollments.map((enrollment) => (
                                <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                    <div
                                        className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedEnrollment(expandedEnrollment === enrollment.id ? null : enrollment.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 text-sm">{enrollment.missionTitle}</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-xs text-gray-500">{enrollment.clicks} {t('clicks')}</span>
                                                    {enrollment.sale_enabled && enrollment.sale_reward_amount && (
                                                        <RewardBadge label={t('sale')} value={formatReward(enrollment.sale_reward_amount, enrollment.sale_reward_structure) || ''} icon={DollarSign} />
                                                    )}
                                                    {enrollment.recurring_enabled && enrollment.recurring_reward_amount && (
                                                        <RewardBadge label={t('recurring')} value={formatReward(enrollment.recurring_reward_amount, enrollment.recurring_reward_structure) || ''} icon={RefreshCw} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                {enrollment.linkUrl && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(enrollment.linkUrl!, enrollment.id) }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                                                    >
                                                        {copiedLink === enrollment.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                        {copiedLink === enrollment.id ? t('copied') : t('copyLink')}
                                                    </button>
                                                )}
                                                {expandedEnrollment === enrollment.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {expandedEnrollment === enrollment.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                                                    {/* Affiliate Link */}
                                                    {enrollment.linkUrl && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('yourLink')}</p>
                                                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                                                                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                <code className="text-xs text-gray-700 truncate flex-1">{enrollment.linkUrl}</code>
                                                                <button
                                                                    onClick={() => handleCopy(enrollment.linkUrl!, enrollment.id)}
                                                                    className="text-purple-600 hover:text-purple-700"
                                                                >
                                                                    {copiedLink === enrollment.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Resources */}
                                                    {enrollment.contents.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('resources')}</p>
                                                            <div className="space-y-2">
                                                                {enrollment.contents.map(c => (
                                                                    <a
                                                                        key={c.id}
                                                                        href={c.url || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                                                    >
                                                                        {c.type === 'YOUTUBE' && <Youtube className="w-4 h-4 text-red-500" />}
                                                                        {c.type === 'PDF' && <FileText className="w-4 h-4 text-blue-500" />}
                                                                        {(c.type === 'LINK' || c.type === 'TEXT') && <Link2 className="w-4 h-4 text-gray-500" />}
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                                                                            {c.description && <p className="text-[11px] text-gray-500 truncate">{c.description}</p>}
                                                                        </div>
                                                                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>

                        {/* Link to full dashboard */}
                        <div className="text-center pt-2">
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

                {/* ===== MISSIONS GRID (for unenrolled or visitors) ===== */}
                {unenrolledMissions.length > 0 && (
                    <div className="mb-10">
                        {hasEnrollments && <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('moreMissions')}</h2>}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {unenrolledMissions.map((mission, i) => (
                                <motion.div
                                    key={mission.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-purple-200 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        {mission.logo_url ? (
                                            <img src={mission.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-gray-900 text-sm">{mission.title}</h3>
                                            {mission.company_name && (
                                                <p className="text-xs text-gray-500">{mission.company_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">{mission.description}</p>

                                    {/* Rewards */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {mission.sale_enabled && mission.sale_reward_amount && (
                                            <RewardBadge label={t('sale')} value={formatReward(mission.sale_reward_amount, mission.sale_reward_structure) || ''} icon={DollarSign} />
                                        )}
                                        {mission.lead_enabled && mission.lead_reward_amount && (
                                            <RewardBadge label={t('lead')} value={formatReward(mission.lead_reward_amount, null) || ''} icon={Users} />
                                        )}
                                        {mission.recurring_enabled && mission.recurring_reward_amount && (
                                            <RewardBadge label={t('recurring')} value={formatReward(mission.recurring_reward_amount, mission.recurring_reward_structure) || ''} icon={RefreshCw} />
                                        )}
                                    </div>

                                    {/* Action */}
                                    {userStatus.authenticated ? (
                                        <button
                                            onClick={() => handleJoin(mission.id)}
                                            disabled={joiningMission === mission.id}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                        >
                                            {joiningMission === mission.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <ArrowRight className="w-4 h-4" />
                                                    {mission.visibility === 'PRIVATE' ? t('requestToJoin') : t('joinMission')}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => document.getElementById('portal-auth')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                            {t('signUpToJoin')}
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== STATE 1: AUTH FORM (visitors only) ===== */}
                {!userStatus.authenticated && (
                    <motion.div
                        id="portal-auth"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
                            {confirmationSent ? (
                                // Confirmation sent state
                                <div className="text-center py-4">
                                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Mail className="w-7 h-7 text-emerald-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('checkEmail')}</h2>
                                    <p className="text-sm text-gray-500 mb-6">
                                        {t('confirmationSent', { email: authEmail })}
                                    </p>
                                    <button
                                        onClick={handleResendConfirmation}
                                        disabled={resendLoading}
                                        className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                                    >
                                        {resendLoading ? t('resending') : t('resendEmail')}
                                    </button>
                                </div>
                            ) : (
                                // Auth form
                                <>
                                    <div className="text-center mb-6">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {authMode === 'signup' ? t('createAccount') : t('signIn')}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {authMode === 'signup' ? t('signUpDesc') : t('signInDesc')}
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
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        {authError && (
                                            <p className="text-xs text-red-500 px-1">{authError}</p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={authLoading}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                        >
                                            {authLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                authMode === 'signup' ? t('signUpButton') : t('signInButton')
                                            )}
                                        </button>
                                    </form>

                                    <div className="mt-4 text-center">
                                        <button
                                            onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError('') }}
                                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {authMode === 'signup' ? t('alreadyHaveAccount') : t('noAccount')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Empty state if all enrolled and no more missions */}
                {userStatus.authenticated && unenrolledMissions.length === 0 && !hasEnrollments && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('noMissions')}</h2>
                        <p className="text-sm text-gray-500">{t('noMissionsDesc')}</p>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-6 mt-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    <a
                        href="https://traaaction.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        Powered by Traaaction
                    </a>
                    <div className="flex items-center gap-4">
                        {profile?.twitter_url && (
                            <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><ExternalLink className="w-3.5 h-3.5" /></a>
                        )}
                        {profile?.website_url && (
                            <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-600">{profile.website_url.replace(/https?:\/\//, '')}</a>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    )
}
