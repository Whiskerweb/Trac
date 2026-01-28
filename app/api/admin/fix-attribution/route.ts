import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * Fix endpoint to assign affiliate_id to a link
 * POST /api/admin/fix-attribution?linkId=xxx&sellerId=yyy
 */
export async function POST(request: Request) {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')
    const sellerId = searchParams.get('sellerId')

    if (!linkId || !sellerId) {
        return NextResponse.json({
            error: 'Missing required parameters',
            required: ['linkId', 'sellerId']
        }, { status: 400 })
    }

    try {
        // Verify link exists
        const link = await prisma.shortLink.findUnique({
            where: { id: linkId }
        })

        if (!link) {
            return NextResponse.json({
                error: 'Link not found'
            }, { status: 404 })
        }

        // Verify seller exists
        const seller = await prisma.seller.findFirst({
            where: { user_id: sellerId }
        })

        if (!seller) {
            return NextResponse.json({
                error: 'Seller not found'
            }, { status: 404 })
        }

        // Update the link
        const updated = await prisma.shortLink.update({
            where: { id: linkId },
            data: {
                affiliate_id: sellerId
            }
        })

        // Update Redis cache
        const { setLinkInRedis } = await import('@/lib/redis')

        try {
            await setLinkInRedis(updated.slug, {
                url: updated.original_url,
                linkId: updated.id,
                workspaceId: updated.workspace_id,
                sellerId: updated.affiliate_id,
            })
        } catch (redisError: any) {
            console.error('Redis update failed:', redisError)
            // Continue even if Redis fails
        }

        return NextResponse.json({
            success: true,
            message: 'Attribution fixed successfully',
            data: {
                link_id: updated.id,
                link_slug: updated.slug,
                old_affiliate_id: link.affiliate_id,
                new_affiliate_id: updated.affiliate_id,
                seller_name: seller.name,
                seller_email: seller.email
            },
            next_steps: [
                'Clear your browser cache',
                `Create a new test click on: https://dodo.cardz.dev/s/${updated.slug}`,
                'Check the activity feed to see if the seller name appears',
                'Note: Old clicks in Tinybird will still show "Anonymous" (cannot be retroactively updated)'
            ]
        })

    } catch (error: any) {
        console.error('Fix attribution error:', error)
        return NextResponse.json({
            error: 'Failed to fix attribution',
            details: error.message
        }, { status: 500 })
    }
}
