'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getPortalFullDashboard } from '@/app/actions/portal'
import PortalNav from '@/components/portal/PortalNav'

interface PortalDashboardData {
    workspace: {
        id: string
        name: string
        slug: string
        portal_primary_color: string | null
        portal_headline: string | null
    }
    profile: {
        logo_url: string | null
        description: string | null
    } | null
    mission: {
        id: string
        title: string
        description: string
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
    }
    linkUrl: string | null
    linkSlug: string | null
    stats: { clicks: number; leads: number; sales: number; revenue: number }
    balance: { pending: number; available: number; paid: number }
    sellerName: string
}

const PortalContext = createContext<PortalDashboardData | null>(null)
export const usePortalData = () => useContext(PortalContext)

export default function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const router = useRouter()
    const workspaceSlug = params.workspaceSlug as string

    const [data, setData] = useState<PortalDashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        const result = await getPortalFullDashboard(workspaceSlug)

        if (!result.success || !result.data) {
            // Not authenticated or no enrollment — redirect to landing
            router.replace(`/join/${workspaceSlug}`)
            return
        }

        setData(result.data)
        setLoading(false)
    }, [workspaceSlug, router])

    useEffect(() => { loadData() }, [loadData])

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        )
    }

    const primaryColor = data.workspace.portal_primary_color || '#7C3AED'

    return (
        <PortalContext.Provider value={data}>
            <div className="min-h-screen bg-gray-50/50">
                <PortalNav
                    workspaceSlug={workspaceSlug}
                    workspaceName={data.workspace.name}
                    logoUrl={data.profile?.logo_url}
                    primaryColor={primaryColor}
                    userName={data.sellerName}
                />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-100 py-4 mt-8 text-center">
                    <a
                        href="https://traaaction.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gray-300 hover:text-gray-400 transition-colors"
                    >
                        Powered by Traaaction
                    </a>
                </footer>
            </div>
        </PortalContext.Provider>
    )
}
