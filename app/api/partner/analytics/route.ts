import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generatePartnerToken } from '@/lib/analytics/partner-token'
import { getPartnerByUserId } from '@/app/actions/partners'

/**
 * GET /api/partner/analytics
 * 
 * Generate a short-lived JWT token for Tinybird analytics queries
 * Token contains partner_id claim for automatic RLS filtering
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

        // Get partner record
        const partner = await getPartnerByUserId(user.id)

        if (!partner) {
            return NextResponse.json(
                { error: 'Partner not found' },
                { status: 404 }
            )
        }

        // Generate JWT with partner_id claim (1 hour expiry)
        const token = await generatePartnerToken(partner.id, '1h')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

        return NextResponse.json({
            token,
            expiresAt,
            partnerId: partner.id
        })

    } catch (error) {
        console.error('[API] ❌ Failed to generate partner analytics token:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
