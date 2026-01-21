'use client'
import { useState, useEffect } from 'react'

/**
 * Partner and Discount data from trac_partner_data cookie
 * Equivalent to Traaaction's useAnalytics() hook
 */
export interface TracPartnerData {
    clickId: string
    partner: {
        id: string
        name: string
        image?: string
    } | null
    discount: {
        id: string
        amount: number
        type: 'PERCENTAGE' | 'FIXED'
        couponId?: string
    } | null
}

/**
 * useTracAnalytics - React hook for Traaaction-style partner data
 * 
 * Reads from trac_partner_data cookie set by the tracking script
 * when a user arrives via ?via=john or similar query param.
 * 
 * Usage:
 * ```tsx
 * function DiscountBanner() {
 *   const { partner, discount } = useTracAnalytics()
 *   if (!partner || !discount) return null
 *   return <p>{partner.name} vous offre {discount.amount}% de réduction</p>
 * }
 * ```
 */
export function useTracAnalytics(): TracPartnerData {
    const [data, setData] = useState<TracPartnerData>({
        clickId: '',
        partner: null,
        discount: null
    })

    useEffect(() => {
        // Read trac_partner_data cookie
        try {
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith('trac_partner_data='))
                ?.split('=')[1]

            if (cookieValue) {
                const parsed = JSON.parse(decodeURIComponent(cookieValue))
                setData({
                    clickId: parsed.clickId || '',
                    partner: parsed.partner || null,
                    discount: parsed.discount || null
                })
            }
        } catch (e) {
            console.error('[useTracAnalytics] Error parsing cookie:', e)
        }
    }, [])

    return data
}

/**
 * Alias for consistency with Dub naming
 */
export const useAnalytics = useTracAnalytics
