'use server'

import { prisma } from '@/lib/db'
import { setManyLinksInRedis, RedisLinkData } from '@/lib/redis'

// =============================================
// ADMIN SERVER ACTIONS
// =============================================

/**
 * Synchronize all ShortLinks from PostgreSQL to Redis
 * This is a one-time migration action or can be used to repair Redis data
 * 
 * @returns Number of links synchronized
 */
export async function syncLinksToRedis(): Promise<{
    success: boolean
    count?: number
    error?: string
}> {
    console.log('[Admin] 🔄 Starting Redis sync...')

    try {
        // 1. Fetch ALL ShortLinks from PostgreSQL
        const shortLinks = await prisma.shortLink.findMany({
            select: {
                id: true,
                slug: true,
                original_url: true,
                workspace_id: true,
                affiliate_id: true,
            }
        })

        console.log(`[Admin] 📊 Found ${shortLinks.length} ShortLinks in PostgreSQL`)

        if (shortLinks.length === 0) {
            return { success: true, count: 0 }
        }

        // 2. Transform to Redis format
        const linksToSync = shortLinks.map(link => ({
            slug: link.slug,
            data: {
                url: link.original_url,
                linkId: link.id,
                workspaceId: link.workspace_id,
                affiliateId: link.affiliate_id,
            } as RedisLinkData
        }))

        // 3. Batch insert to Redis using pipeline
        const count = await setManyLinksInRedis(linksToSync)

        console.log(`[Admin] ✅ Synced ${count} links to Redis`)

        return { success: true, count }

    } catch (error) {
        console.error('[Admin] ❌ Sync failed:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}
