import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * Debug endpoint for seller attribution
 * GET /api/admin/debug-seller-attribution?email=saler@saler.com
 */
export async function GET(request: Request) {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'saler@saler.com'

    const debug: any = {
        timestamp: new Date().toISOString(),
        email: email,
        steps: {}
    }

    try {
        // Step 1: Find seller
        debug.steps.step1_seller = { status: 'checking' }
        const seller = await prisma.seller.findFirst({
            where: { email }
        })

        if (!seller) {
            debug.steps.step1_seller = {
                status: 'failed',
                error: 'Seller not found'
            }
            return NextResponse.json(debug)
        }

        debug.steps.step1_seller = {
            status: 'success',
            data: {
                user_id: seller.user_id,
                name: seller.name,
                email: seller.email,
                status: seller.status
            }
        }

        // Step 2: Find user
        const user2 = seller.user_id ? await prisma.user.findUnique({
            where: { id: seller.user_id }
        }) : null

        debug.steps.step2_user = {
            status: seller.user_id ? (user2 ? 'success' : 'failed') : 'no_user_id',
            data: user2 ? { email: user2.email } : null
        }

        // Step 3: Find missions joined
        const enrollments = seller.user_id ? await prisma.missionEnrollment.findMany({
            where: { user_id: seller.user_id },
            include: {
                Mission: { select: { title: true, id: true } },
                ShortLink: { select: { id: true, slug: true, affiliate_id: true } }
            },
            take: 10
        }) : []

        debug.steps.step3_enrollments = {
            status: 'success',
            count: enrollments.length,
            data: enrollments.map((e: any) => ({
                mission_title: e.Mission.title,
                mission_id: e.Mission.id,
                enrollment_status: e.status,
                link: e.ShortLink ? {
                    id: e.ShortLink.id,
                    slug: e.ShortLink.slug,
                    affiliate_id: e.ShortLink.affiliate_id,
                    has_affiliate_id: !!e.ShortLink.affiliate_id,
                    matches_seller: e.ShortLink.affiliate_id === seller.user_id
                } : null
            }))
        }

        // Step 4: Find ALL links with this affiliate_id
        const allLinks = await prisma.shortLink.findMany({
            where: {
                OR: [
                    { affiliate_id: seller.user_id },
                    { affiliate_id: null }
                ]
            },
            select: {
                id: true,
                slug: true,
                affiliate_id: true,
                workspace_id: true,
                clicks: true,
                created_at: true
            },
            orderBy: { created_at: 'desc' },
            take: 20
        })

        debug.steps.step4_all_links = {
            status: 'success',
            total: allLinks.length,
            with_affiliate: allLinks.filter(l => l.affiliate_id === seller.user_id).length,
            without_affiliate: allLinks.filter(l => !l.affiliate_id).length,
            links: allLinks.map(l => ({
                slug: l.slug,
                affiliate_id: l.affiliate_id,
                matches_seller: l.affiliate_id === seller.user_id,
                clicks: l.clicks,
                created: l.created_at.toISOString()
            }))
        }

        // Step 5: Find specific link containing "finaltest"
        const finaltestLink = await prisma.shortLink.findFirst({
            where: {
                slug: { contains: 'finaltest' }
            },
            select: {
                id: true,
                slug: true,
                original_url: true,
                workspace_id: true,
                affiliate_id: true,
                clicks: true,
                created_at: true
            }
        })

        if (finaltestLink) {
            debug.steps.step5_finaltest_link = {
                status: 'success',
                data: {
                    id: finaltestLink.id,
                    slug: finaltestLink.slug,
                    url: finaltestLink.original_url,
                    workspace_id: finaltestLink.workspace_id,
                    affiliate_id: finaltestLink.affiliate_id,
                    clicks: finaltestLink.clicks,
                    created: finaltestLink.created_at.toISOString(),
                    PROBLEM: !finaltestLink.affiliate_id ? 'NO AFFILIATE_ID - THIS IS THE ISSUE!' : null,
                    matches_seller: finaltestLink.affiliate_id === seller.user_id,
                    FIX_COMMAND: !finaltestLink.affiliate_id ?
                        `Call: POST /api/admin/fix-attribution?linkId=${finaltestLink.id}&sellerId=${seller.user_id}`
                        : null
                }
            }
        } else {
            debug.steps.step5_finaltest_link = {
                status: 'not_found'
            }
        }

        // Step 6: Summary
        const hasProblems = allLinks.some(l => !l.affiliate_id && l.clicks > 0)

        debug.summary = {
            seller_found: true,
            enrollments_count: enrollments.length,
            links_with_attribution: allLinks.filter(l => l.affiliate_id === seller.user_id).length,
            links_without_attribution: allLinks.filter(l => !l.affiliate_id).length,
            finaltest_link_found: !!finaltestLink,
            finaltest_has_attribution: finaltestLink?.affiliate_id === seller.user_id,
            has_problems: hasProblems,
            recommendation: hasProblems || (finaltestLink && !finaltestLink.affiliate_id) ?
                'Some links are missing affiliate_id. Use the fix endpoint to correct them.' :
                'All links have correct attribution!'
        }

    } catch (error: any) {
        debug.error = {
            message: error.message,
            stack: error.stack
        }
    }

    return NextResponse.json(debug, {
        headers: { 'Content-Type': 'application/json' },
        status: 200
    })
}
