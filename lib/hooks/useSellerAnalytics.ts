'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================
// SELLER ANALYTICS HOOK
// =============================================

const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'

export interface SellerStats {
    totalClicks: number
    totalSales: number
    totalRevenue: number  // In cents
    totalCommission: number  // In cents
    pendingPayout: number  // In cents
}

export interface SellerEvent {
    id: string
    type: 'click' | 'sale' | 'payout'
    program: string | null
    amount: number | null
    commission: number | null
    timestamp: string
    customer: string | null
}

interface UseSellerAnalyticsResult {
    stats: SellerStats
    events: SellerEvent[]
    loading: boolean
    error: string | null
    refresh: () => Promise<void>
}

/**
 * Hook to fetch real-time seller analytics from Tinybird
 *
 * 1. Calls /api/seller/analytics to get JWT token
 * 2. Queries Tinybird seller_kpis pipe with RLS token
 * 3. Returns stats with automatic refresh support
 */
export function useSellerAnalytics(): UseSellerAnalyticsResult {
    const [stats, setStats] = useState<SellerStats>({
        totalClicks: 0,
        totalSales: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingPayout: 0
    })
    const [events, setEvents] = useState<SellerEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            // Step 1: Get JWT token from our API
            const tokenResponse = await fetch('/api/seller/analytics')

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json()
                throw new Error(errorData.error || 'Failed to get analytics token')
            }

            const { token, sellerId } = await tokenResponse.json()

            // Step 2: Fetch stats from Tinybird with seller_id RLS
            const tinybirdUrl = new URL(`${TINYBIRD_HOST}/v0/pipes/seller_kpis.json`)
            tinybirdUrl.searchParams.set('seller_id', sellerId)

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
                console.warn('[useSellerAnalytics] Tinybird query failed, using fallback')
                // Fallback: Fetch from database via server action
                await fetchFallbackStats()
            }

            // Step 3: Fetch recent events (sales, clicks) - optional enhancement
            // For now, leave events empty - can be populated from commission history

        } catch (err) {
            console.error('[useSellerAnalytics] Error:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')

            // Try fallback on error
            await fetchFallbackStats()
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchFallbackStats = async () => {
        try {
            // Use getMyGlobalStats which queries Tinybird by link_id (always reliable)
            const { getMyGlobalStats } = await import('@/app/actions/marketplace')
            const result = await getMyGlobalStats()

            if (result.success && result.stats) {
                setStats({
                    totalClicks: result.stats.clicks || 0,
                    totalSales: result.stats.sales || 0,
                    totalRevenue: result.stats.revenue || 0,
                    totalCommission: result.stats.revenue || 0,
                    pendingPayout: 0
                })
            }
        } catch (fallbackError) {
            console.error('[useSellerAnalytics] Fallback also failed:', fallbackError)
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
