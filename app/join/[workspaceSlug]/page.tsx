'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
    Loader2, DollarSign, RefreshCw, Users,
    Shield, Clock, BarChart3, CheckCircle2
} from 'lucide-react'
import { getPortalData, getPortalUserStatus } from '@/app/actions/portal'
import PortalAuthForm from '@/components/portal/PortalAuthForm'
import PortalMissionPreviewCard from '@/components/portal/PortalMissionPreviewCard'
import { portalPath } from '@/components/portal/portal-utils'

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

// =============================================
// HELPERS
// =============================================

function formatReward(amount: number | null, structure: string | null) {
    if (!amount) return null
    if (structure === 'PERCENTAGE') return `${amount}%`
    return `${(amount / 100).toFixed(0)}\u20AC`
}

// =============================================
// MAIN PORTAL LANDING PAGE
// =============================================

export default function PortalPage() {
    const params = useParams()
    const router = useRouter()
    const t = useTranslations('portal')
    const tLanding = useTranslations('portal.landing')
    const workspaceSlug = params.workspaceSlug as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [workspace, setWorkspace] = useState<{
        id: string; name: string; slug: string;
        portal_welcome_text: string | null;
        portal_primary_color: string | null;
        portal_headline: string | null;
    } | null>(null)
    const [profile, setProfile] = useState<PortalProfile | null>(null)
    const [missions, setMissions] = useState<MissionCard[]>([])

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

        // If authenticated, redirect to dashboard
        if (statusResult.authenticated) {
            router.replace(portalPath(workspaceSlug, '/dashboard'))
            return
        }

        setWorkspace(portalResult.data.workspace)
        setProfile(portalResult.data.profile)
        setMissions(portalResult.data.missions)
        setLoading(false)
    }, [workspaceSlug, router])

    useEffect(() => { loadData() }, [loadData])

    // =============================================
    // RENDER
    // =============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7 text-gray-300" />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900 mb-2">{t('notAvailable')}</h1>
                    <p className="text-sm text-gray-500">{t('notAvailableDesc')}</p>
                </div>
            </div>
        )
    }

    const primaryColor = workspace.portal_primary_color || '#7C3AED'
    const isMultiMission = missions.length > 1
    const primaryMission = missions[0]

    // Build reward items for single-mission display
    const rewardItems: { icon: React.ElementType; label: string; value: string }[] = []
    if (primaryMission && !isMultiMission) {
        if (primaryMission.sale_enabled && primaryMission.sale_reward_amount) {
            rewardItems.push({
                icon: DollarSign,
                label: t('perSale'),
                value: formatReward(primaryMission.sale_reward_amount, primaryMission.sale_reward_structure) || '',
            })
        }
        if (primaryMission.lead_enabled && primaryMission.lead_reward_amount) {
            rewardItems.push({
                icon: Users,
                label: t('perLead'),
                value: formatReward(primaryMission.lead_reward_amount, null) || '',
            })
        }
        if (primaryMission.recurring_enabled && primaryMission.recurring_reward_amount) {
            rewardItems.push({
                icon: RefreshCw,
                label: t('recurringCommission'),
                value: formatReward(primaryMission.recurring_reward_amount, primaryMission.recurring_reward_structure) || '',
            })
        }
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Desktop: Split layout, Mobile: Stacked */}
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* LEFT PANEL — Branding */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 lg:py-0"
                    style={{ backgroundColor: `${primaryColor}06` }}
                >
                    <div className="max-w-lg mx-auto lg:mx-0 w-full">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            {profile?.logo_url ? (
                                <img src={profile.logo_url} alt={workspace.name} className="w-11 h-11 rounded-xl object-cover" />
                            ) : (
                                <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {workspace.name.charAt(0)}
                                </div>
                            )}
                            <span className="text-base font-semibold text-gray-900">{workspace.name}</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
                            {workspace.portal_headline || workspace.portal_welcome_text || tLanding('defaultHeadline', { name: workspace.name })}
                        </h1>

                        {/* Description */}
                        {profile?.description && (
                            <p className="text-base text-gray-500 mb-8 leading-relaxed">{profile.description}</p>
                        )}

                        {/* Single mission: reward cards */}
                        {!isMultiMission && rewardItems.length > 0 && (
                            <div className="mb-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{tLanding('whatYouEarn')}</p>
                                <div className="space-y-2">
                                    {rewardItems.map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3"
                                        >
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${primaryColor}12` }}
                                            >
                                                <item.icon className="w-4 h-4" style={{ color: primaryColor }} />
                                            </div>
                                            <span className="text-sm text-gray-600 flex-1">{item.label}</span>
                                            <span className="text-lg font-bold text-gray-900">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Multi-mission: mission cards grid */}
                        {isMultiMission && (
                            <div className="mb-8">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    {tLanding('availablePrograms', { count: missions.length })}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {missions.map(mission => (
                                        <PortalMissionPreviewCard
                                            key={mission.id}
                                            title={mission.title}
                                            description={mission.description}
                                            sale_enabled={mission.sale_enabled}
                                            sale_reward_amount={mission.sale_reward_amount}
                                            sale_reward_structure={mission.sale_reward_structure}
                                            lead_enabled={mission.lead_enabled}
                                            lead_reward_amount={mission.lead_reward_amount}
                                            recurring_enabled={mission.recurring_enabled}
                                            recurring_reward_amount={mission.recurring_reward_amount}
                                            recurring_reward_structure={mission.recurring_reward_structure}
                                            primaryColor={primaryColor}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trust elements */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                {tLanding('freeToJoin')}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {tLanding('paidMonthly')}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5" />
                                {tLanding('realTimeTracking')}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT PANEL — Auth Form */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12 lg:py-0"
                >
                    <div className="max-w-md mx-auto w-full">
                        <PortalAuthForm
                            workspaceSlug={workspaceSlug}
                            primaryColor={primaryColor}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 py-4 text-center">
                <a
                    href="https://traaaction.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
                >
                    Powered by Traaaction
                </a>
            </div>
        </div>
    )
}
