'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Loader2, Shield, Clock, BarChart3, CheckCircle2, ArrowDown } from 'lucide-react'
import { getPortalData, getPortalUserStatus } from '@/app/actions/portal'
import PortalAuthForm from '@/components/portal/PortalAuthForm'
import PortalProgramShowcase from '@/components/portal/PortalProgramShowcase'
import { portalPath } from '@/components/portal/portal-utils'

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

export default function PortalPage() {
    const params = useParams()
    const router = useRouter()
    const t = useTranslations('portal')
    const tLanding = useTranslations('portal.landing')
    const workspaceSlug = params.workspaceSlug as string
    const authRef = useRef<HTMLDivElement>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPreviewMode, setIsPreviewMode] = useState(false)
    const searchParams = useSearchParams()
    const [workspace, setWorkspace] = useState<{
        id: string; name: string; slug: string;
        portal_welcome_text: string | null;
        portal_primary_color: string | null;
        portal_headline: string | null;
        portal_logo_url: string | null;
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

        // If authenticated AND has a seller profile, redirect to dashboard
        if (statusResult.authenticated && statusResult.hasSeller) {
            router.replace(portalPath(workspaceSlug, '/dashboard'))
            return
        }

        // If authenticated but no seller (e.g. startup previewing), show preview mode
        if (statusResult.authenticated && !statusResult.hasSeller) {
            setIsPreviewMode(true)
        }

        setWorkspace(portalResult.data.workspace)
        setProfile(portalResult.data.profile)
        setMissions(portalResult.data.missions)
        setLoading(false)
    }, [workspaceSlug, router])

    useEffect(() => { loadData() }, [loadData])

    // Set trac_ref cookie if ?ref=CODE is in URL (Traaaction global + portal referral)
    useEffect(() => {
        const refCode = searchParams.get('ref')
        if (refCode) {
            document.cookie = `trac_ref=${refCode};path=/;max-age=${90 * 24 * 60 * 60};samesite=lax`
            document.cookie = `trac_portal_ref=${refCode};path=/;max-age=${90 * 24 * 60 * 60};samesite=lax`
        }
    }, [searchParams])

    const scrollToAuth = () => {
        authRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

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

    return (
        <div className="min-h-screen bg-white">
            {/* Preview Mode Banner */}
            {isPreviewMode && (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">{t('previewMode')}</span>
                        <span className="text-xs text-amber-600">{t('previewModeDesc')}</span>
                    </div>
                </div>
            )}

            {/* Desktop: 65/35 layout with sticky auth. Mobile: stacked */}
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* LEFT — Content (programmes first) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="lg:w-[63%] px-6 sm:px-10 lg:px-14 py-10 lg:py-16"
                >
                    <div className="max-w-xl">
                        {/* Logo + Name */}
                        <div className="flex items-center gap-3 mb-8">
                            {(workspace.portal_logo_url || profile?.logo_url) ? (
                                <img src={workspace.portal_logo_url || profile?.logo_url || ''} alt={workspace.name} className="w-11 h-11 rounded-xl object-cover" />
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
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 leading-tight mb-4">
                            {workspace.portal_headline || tLanding('defaultHeadline', { name: workspace.name })}
                        </h1>

                        {/* Description */}
                        {(workspace.portal_welcome_text || profile?.description) && (
                            <p className="text-base text-gray-500 mb-8 leading-relaxed">
                                {workspace.portal_welcome_text || profile?.description}
                            </p>
                        )}

                        {/* CTA (mobile: scroll to auth, desktop: visual anchor) */}
                        <button
                            onClick={scrollToAuth}
                            className="lg:hidden inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl text-sm font-semibold transition-all hover:opacity-90 mb-8"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {t('createAccount')}
                            <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Trust elements */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-10">
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

                        {/* Programs Section */}
                        {missions.length === 0 ? (
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8 text-center">
                                <p className="text-sm text-gray-500">{tLanding('noMissions')}</p>
                            </div>
                        ) : missions.length === 1 ? (
                            <PortalProgramShowcase
                                title={missions[0].title}
                                description={missions[0].description}
                                sale_enabled={missions[0].sale_enabled}
                                sale_reward_amount={missions[0].sale_reward_amount}
                                sale_reward_structure={missions[0].sale_reward_structure}
                                lead_enabled={missions[0].lead_enabled}
                                lead_reward_amount={missions[0].lead_reward_amount}
                                recurring_enabled={missions[0].recurring_enabled}
                                recurring_reward_amount={missions[0].recurring_reward_amount}
                                recurring_reward_structure={missions[0].recurring_reward_structure}
                                recurring_duration_months={missions[0].recurring_duration_months}
                                primaryColor={primaryColor}
                            />
                        ) : (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    {tLanding('availablePrograms', { count: missions.length })}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {missions.map(mission => (
                                        <PortalProgramShowcase
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
                                            recurring_duration_months={mission.recurring_duration_months}
                                            primaryColor={primaryColor}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* RIGHT — Auth Form (sticky on desktop) */}
                <motion.div
                    ref={authRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="lg:w-[37%] lg:border-l lg:border-gray-100"
                >
                    <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:items-center px-6 sm:px-10 lg:px-10 py-10 lg:py-0">
                        <div className="w-full max-w-sm mx-auto">
                            {isPreviewMode ? (
                                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
                                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 mb-1">{t('previewMode')}</h3>
                                    <p className="text-sm text-gray-500">{t('previewModeDesc')}</p>
                                </div>
                            ) : (
                                <PortalAuthForm
                                    workspaceSlug={workspaceSlug}
                                    workspaceId={workspace.id}
                                    primaryColor={primaryColor}
                                />
                            )}
                        </div>
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
                    {t('poweredBy')}
                </a>
            </div>
        </div>
    )
}
