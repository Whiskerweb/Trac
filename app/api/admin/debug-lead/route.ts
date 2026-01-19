import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { createClient } from '@/utils/supabase/server'

// SECURITY: UUID validation to prevent injection
function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/**
 * GET /api/admin/debug-lead
 * Debug lead attribution issues
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'lucas.roncey@gmail.com') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clickId = searchParams.get('clickId')
    const customerId = searchParams.get('customerId')

    const results: any = {}

    // 1. Check Redis click data
    if (clickId) {
        try {
            const redisData = await redis.get(`click:${clickId}`)
            results.redis_click = redisData || 'NOT FOUND'
        } catch (e) {
            results.redis_click = `ERROR: ${e}`
        }
    }

    // 2. Check Customer in Prisma
    if (customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                external_id: true,
                click_id: true,
                link_id: true,
                affiliate_id: true,
                created_at: true
            }
        })
        results.prisma_customer = customer || 'NOT FOUND'
    }

    // 3. Get recent customers with click_id but missing affiliate_id
    const orphanCustomers = await prisma.customer.findMany({
        where: {
            click_id: { not: null },
            affiliate_id: null
        },
        select: {
            id: true,
            external_id: true,
            click_id: true,
            affiliate_id: true
        },
        take: 10,
        orderBy: { created_at: 'desc' }
    })
    results.orphan_customers = orphanCustomers

    // 4. Get recent leads in Tinybird
    results.tinybird_note = 'Check Tinybird via separate query'

    return NextResponse.json(results, { status: 200 })
}

/**
 * POST /api/admin/debug-lead
 * Fix orphan customers by looking up affiliate_id from Redis or ShortLink
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'lucas.roncey@gmail.com') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, customerId, affiliateId: providedAffiliateId, linkId: providedLinkId } = await request.json()

    // SECURITY: Validate all IDs are valid UUIDs
    if (customerId && !isValidUUID(customerId)) {
        return NextResponse.json({ error: 'Invalid customerId format' }, { status: 400 })
    }
    if (providedAffiliateId && !isValidUUID(providedAffiliateId)) {
        return NextResponse.json({ error: 'Invalid affiliateId format' }, { status: 400 })
    }
    if (providedLinkId && !isValidUUID(providedLinkId)) {
        return NextResponse.json({ error: 'Invalid linkId format' }, { status: 400 })
    }

    if (action === 'fix_orphan') {
        // Find customer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        })

        if (!customer || !customer.click_id) {
            return NextResponse.json({ error: 'Customer not found or no click_id' }, { status: 400 })
        }

        // Try to get affiliate from Redis
        let affiliateId: string | null = null
        let linkId: string | null = null

        try {
            const redisData = await redis.get<{ linkId?: string; affiliateId?: string }>(`click:${customer.click_id}`)
            if (redisData) {
                affiliateId = redisData.affiliateId || null
                linkId = redisData.linkId || null
            }
        } catch (e) {
            console.error('Redis lookup failed:', e)
        }

        // If still no affiliate, try to lookup from Tinybird clicks table
        if (!affiliateId) {
            // For now, return guidance
            return NextResponse.json({
                error: 'No affiliate found in Redis. Use fix_with_data action with affiliateId from Tinybird.',
                customer,
                redis_empty: true,
                hint: 'POST with { action: "fix_with_data", customerId: "...", affiliateId: "...", linkId: "..." }'
            }, { status: 400 })
        }

        // Update customer
        await prisma.customer.update({
            where: { id: customerId },
            data: { affiliate_id: affiliateId, link_id: linkId }
        })

        return NextResponse.json({
            success: true,
            fixed: {
                customerId,
                affiliateId,
                linkId
            }
        })
    }

    // Action: fix_with_data - Fix customer with provided data (from Tinybird lookup)
    if (action === 'fix_with_data') {
        if (!customerId || !providedAffiliateId) {
            return NextResponse.json({
                error: 'Missing customerId or affiliateId',
                usage: { action: 'fix_with_data', customerId: 'xxx', affiliateId: 'yyy', linkId: 'zzz' }
            }, { status: 400 })
        }

        // Update customer
        await prisma.customer.update({
            where: { id: customerId },
            data: {
                affiliate_id: providedAffiliateId,
                ...(providedLinkId && { link_id: providedLinkId })
            }
        })

        return NextResponse.json({
            success: true,
            fixed: {
                customerId,
                affiliateId: providedAffiliateId,
                linkId: providedLinkId
            }
        })
    }

    return NextResponse.json({ error: 'Unknown action. Use fix_orphan or fix_with_data' }, { status: 400 })
}
