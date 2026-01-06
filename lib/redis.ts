import { Redis } from '@upstash/redis'

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// =============================================
// REDIS KEY STRATEGY (Dub.co Pattern)
// =============================================
// Key format: shortlink:{domain}:{slug}
// Example: shortlink:trac.sh:summer-sale

const SHORTLINK_PREFIX = 'shortlink'

/**
 * Extract domain from APP_URL environment variable
 */
function getDefaultDomain(): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
        const url = new URL(appUrl)
        return url.hostname
    } catch {
        return 'localhost'
    }
}

/**
 * Build Redis key for a short link
 */
export function buildLinkKey(slug: string, domain?: string): string {
    return `${SHORTLINK_PREFIX}:${domain || getDefaultDomain()}:${slug}`
}

// =============================================
// REDIS LINK DATA TYPES
// =============================================

export interface RedisLinkData {
    url: string
    linkId: string
    workspaceId: string
    affiliateId?: string | null
}

// =============================================
// REDIS HELPER FUNCTIONS
// =============================================

/**
 * Store a short link in Redis
 * @param slug - The short link slug
 * @param data - Link data to store
 * @param domain - Optional domain override
 */
export async function setLinkInRedis(
    slug: string,
    data: RedisLinkData,
    domain?: string
): Promise<void> {
    const key = buildLinkKey(slug, domain)

    // 🔍 EXPLICIT KEY LOGGING FOR VERCEL DEBUG
    console.log('========================================')
    console.log('[Redis] 📝 CREATING SHORTLINK KEY')
    console.log('[Redis] Key:', key)
    console.log('[Redis] Slug:', slug)
    console.log('[Redis] Domain:', domain || 'DEFAULT')
    console.log('[Redis] Data:', JSON.stringify(data, null, 2))
    console.log('========================================')

    try {
        await redis.set(key, JSON.stringify(data))
        console.log(`[Redis] ✅ SET SUCCESS: ${key}`)
    } catch (error) {
        console.error(`[Redis] ❌ SET FAILED: ${key}`, error)
        throw error  // Re-throw to surface the error
    }
}

/**
 * Get a short link from Redis
 * @param slug - The short link slug
 * @param domain - Optional domain override
 * @returns Link data or null if not found
 */
export async function getLinkFromRedis(
    slug: string,
    domain?: string
): Promise<RedisLinkData | null> {
    const key = buildLinkKey(slug, domain)
    const data = await redis.get<string>(key)

    if (!data) {
        return null
    }

    try {
        return typeof data === 'string' ? JSON.parse(data) : data as RedisLinkData
    } catch {
        console.error(`[Redis] ❌ Failed to parse data for key: ${key}`)
        return null
    }
}

/**
 * Delete a short link from Redis
 * @param slug - The short link slug
 * @param domain - Optional domain override
 */
export async function deleteLinkFromRedis(
    slug: string,
    domain?: string
): Promise<void> {
    const key = buildLinkKey(slug, domain)
    await redis.del(key)
    console.log(`[Redis] 🗑️ DEL ${key}`)
}

/**
 * Batch set multiple links in Redis (for sync)
 * @param links - Array of {slug, data} objects
 * @param domain - Optional domain override
 */
export async function setManyLinksInRedis(
    links: Array<{ slug: string; data: RedisLinkData }>,
    domain?: string
): Promise<number> {
    if (links.length === 0) return 0

    const pipeline = redis.pipeline()

    for (const { slug, data } of links) {
        const key = buildLinkKey(slug, domain)
        pipeline.set(key, JSON.stringify(data))
    }

    await pipeline.exec()
    console.log(`[Redis] ✅ MSET ${links.length} links`)
    return links.length
}
