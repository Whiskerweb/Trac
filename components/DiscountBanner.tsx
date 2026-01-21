'use client'

import { useTracAnalytics } from '@/lib/hooks/useTracAnalytics'
import Image from 'next/image'

interface DiscountBannerProps {
    className?: string
}

/**
 * DiscountBanner - Traaaction-style referral banner
 * 
 * Displays "{partner} vous offre {discount}% de réduction" when a user
 * arrives via ?via=john or similar referral link.
 * 
 * Usage:
 * ```tsx
 * <DiscountBanner />
 * // or with custom styling
 * <DiscountBanner className="my-4" />
 * ```
 */
export function DiscountBanner({ className = '' }: DiscountBannerProps) {
    const { partner, discount } = useTracAnalytics()

    // Don't render if no partner or discount
    if (!partner || !discount) return null

    const discountText = discount.type === 'PERCENTAGE'
        ? `${discount.amount}% de réduction`
        : `${discount.amount}€ de réduction`

    return (
        <div className={`flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg ${className}`}>
            {partner.image && (
                <Image
                    src={partner.image}
                    alt={partner.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                    unoptimized // External URLs
                />
            )}
            {!partner.image && (
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                        {partner.name.charAt(0).toUpperCase()}
                    </span>
                </div>
            )}
            <p className="text-sm text-gray-700">
                <span className="font-medium">{partner.name}</span> vous offre{' '}
                <span className="font-bold text-purple-600">
                    {discountText}
                </span>
            </p>
        </div>
    )
}

/**
 * Minimal version without styling for custom implementations
 */
export function DiscountBannerMinimal() {
    const { partner, discount } = useTracAnalytics()

    if (!partner || !discount) return null

    return (
        <span>
            {partner.name} vous offre {discount.amount}
            {discount.type === 'PERCENTAGE' ? '%' : '€'} de réduction
        </span>
    )
}
