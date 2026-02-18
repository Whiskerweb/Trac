'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { getPortalFullDashboard } from '@/app/actions/portal'
import PortalHeader from '@/components/portal/PortalHeader'
import { portalPath } from '@/components/portal/portal-utils'

interface EnrollmentStats {
    clicks: number
    leads: number
    sales: number
    revenue: number
}

interface EnrollmentData {
    id: string
    missionId: string
    missionTitle: string
    missionDescription: string
    linkSlug: string | null
    linkUrl: string | null
    linkId: string | null
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
    recurring_duration_months: number | null
    company_name: string | null
    logo_url: string | null
    stats: EnrollmentStats
}

interface RecentCommission {
    id: string
    amount: number
    status: string
    source: string
    createdAt: string
    maturedAt: string | null
    holdDays: number
    recurringMonth: number | null
    rate: string | null
}

interface AvailableMission {
    id: string
    title: string
    description: string
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

interface PayoutData {
    method: string
    stripeConnected: boolean
    balance: number
    pending: number
    due: number
    paidTotal: number
}

export interface PortalDashboardData {
    workspace: {
        id: string
        name: string
        slug: string
        portal_primary_color: string | null
        portal_headline: string | null
        portal_logo_url: string | null
    }
    profile: {
        logo_url: string | null
        description: string | null
    } | null
    enrollments: EnrollmentData[]
    availableMissions: AvailableMission[]
    balance: { pending: number; available: number; paid: number }
    recentCommissions: RecentCommission[]
    payout: PayoutData
    sellerName: string
    sellerId: string
    referralCode: string
}

const PortalContext = createContext<{
    data: PortalDashboardData
    refresh: () => Promise<void>
} | null>(null)

export const usePortalData = () => {
    const ctx = useContext(PortalContext)
    return ctx
}

export default function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const router = useRouter()
    const t = useTranslations('portal')
    const workspaceSlug = params.workspaceSlug as string

    const [data, setData] = useState<PortalDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        const result = await getPortalFullDashboard(workspaceSlug)

        if (!result.success || !result.data) {
            if (result.error === 'Not authenticated') {
                router.replace(portalPath(workspaceSlug))
                return
            }
            setError(result.error || 'Failed to load dashboard')
            setLoading(false)
            return
        }

        setData(result.data as PortalDashboardData)
        setLoading(false)
    }, [workspaceSlug, router])

    useEffect(() => { loadData() }, [loadData])

    if (loading && !error) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h1>
                    <p className="text-sm text-gray-500 mb-6">{error || 'Failed to load dashboard'}</p>
                    <a
                        href={portalPath(workspaceSlug)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to portal
                    </a>
                </div>
            </div>
        )
    }

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    return (
        <PortalContext.Provider value={{ data, refresh: loadData }}>
            <div className="min-h-screen bg-gray-50/50">
                <PortalHeader
                    workspaceSlug={workspaceSlug}
                    workspaceName={data.workspace.name}
                    logoUrl={data.profile?.logo_url ?? null}
                    portalLogoUrl={data.workspace.portal_logo_url ?? null}
                    primaryColor={primaryColor}
                    userName={data.sellerName}
                />
                <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {children}
                </main>

                <footer className="border-t border-gray-100 py-4 mt-8 text-center">
                    <a
                        href="https://traaaction.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
                    >
                        {t('poweredBy')}
                    </a>
                </footer>
            </div>
        </PortalContext.Provider>
    )
}
