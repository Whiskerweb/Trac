'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================
// PARTNER ANALYTICS HOOK
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'

export interface PartnerStats {
    totalClicks: number
    totalSales: number
    totalRevenue: number  // In cents
    totalCommission: number  // In cents
    pendingPayout: number  // In cents
}

export interface PartnerEvent {
    id: string
    type: 'click' | 'sale' | 'payout'
    program: string | null
    amount: number | null
    commission: number | null
    timestamp: string
    customer: string | null
}

interface UsePartnerAnalyticsResult {
    stats: PartnerStats
    events: PartnerEvent[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

/**
 * Hook to fetch real-time partner analytics from Tinybird
 * 
 * 1. Calls /api/partner/analytics to get JWT token
 * 2. Queries Tinybird partner_kpis pipe with RLS token
 * 3. Returns stats with automatic refresh support
 */
export function usePartnerAnalytics(): UsePartnerAnalyticsResult {
    const [stats, setStats] = useState<PartnerStats>({
        totalClicks: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingPayout: 0
    })
    const [events, setEvents] = useState<PartnerEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // Step 1: Get JWT token from our API
            const tokenResponse = await fetch('/api/partner/analytics')

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json()
                throw new Error(errorData.error || 'Failed to get analytics token')
            }

            const { token, partnerId } = await tokenResponse.json()

            // Step 2: Fetch stats from Tinybird with partner_id RLS
            const tinybirdUrl = new URL(`${TINYBIRD_HOST}/v0/pipes/partner_kpis.json`)
            tinybirdUrl.searchParams.set('affiliate_id', partnerId)

            const statsResponse = await fetch(tinybirdUrl.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (statsResponse.ok) {
                const result = await statsResponse.json()
                if (result.data && result.data.length > 0) {
                    const data = result.data[0]
                    setStats({
                        totalClicks: data.total_clicks || 0,
                        totalSales: data.total_sales || 0,
                        totalRevenue: data.total_revenue || 0,
                        totalCommission: data.total_commission || 0,
                        pendingPayout: data.pending_payout || 0
                    })
                }
            } else {
                console.warn('[usePartnerAnalytics] Tinybird query failed, using fallback')
                // Fallback: Fetch from database via server action
                await fetchFallbackStats()
            }

            // Step 3: Fetch recent events (sales, clicks) - optional enhancement
            // For now, leave events empty - can be populated from commission history

        } catch (err) {
            console.error('[usePartnerAnalytics] Error:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')

            // Try fallback on error
            await fetchFallbackStats()
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchFallbackStats = async () => {
        try {
            // Import dynamically to avoid server-side import issues
            const { getPartnerDashboard } = await import('@/app/actions/partners')
            const result = await getPartnerDashboard()

            if ('stats' in result && result.stats) {
                setStats({
                    totalClicks: result.stats.totalClicks || 0,
                    totalSales: result.stats.totalSales || 0,
                    totalRevenue: result.stats.totalEarnings || 0,
                    totalCommission: result.stats.totalEarnings || 0,
                    pendingPayout: 0
                })
            }
        } catch (fallbackError) {
            console.error('[usePartnerAnalytics] Fallback also failed:', fallbackError)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [fetchAnalytics])

    return {
        stats,
        events,
        loading,
        error,
        refresh: fetchAnalytics
    }
}
