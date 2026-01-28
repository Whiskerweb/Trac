import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateSellerToken } from '@/lib/analytics/seller-token'
import { getSellerByUserId } from '@/app/actions/sellers'

/**
 * GET /api/seller/analytics
 *
 * Generate a short-lived JWT token for Tinybird analytics queries
 * Token contains seller_id claim for automatic RLS filtering
 *
 * Frontend uses this token to query Tinybird pipes directly
 */
export async function GET() {
    try {
        // Get authenticated user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            )
        }

        // Get seller record
        const seller = await getSellerByUserId(user.id)

        if (!seller) {
            return NextResponse.json(
                { error: 'Seller not found' },
                { status: 404 }
            )
        }

        // Generate JWT with seller_id claim (1 hour expiry)
        const token = await generateSellerToken(seller.id, '1h')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

        // IMPORTANT: Return user.id (Supabase UUID), NOT seller.id (Prisma CUID)
        // Tinybird affiliate_id column stores the Supabase user ID (from ShortLink.affiliate_id)
        return NextResponse.json({
            token,
            expiresAt,
            sellerId: user.id
        })

    } catch (error) {
        console.error('[API] ❌ Failed to generate partner analytics token:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
