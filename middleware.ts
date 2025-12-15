import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for internal routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api') ||
        pathname === '/favicon.ico' ||
        pathname === '/'
    ) {
        return NextResponse.next()
    }

    // Extract slug from pathname (e.g., /abc123 -> abc123)
    const slug = pathname.slice(1)

    if (!slug) {
        return NextResponse.next()
    }

    try {
        // Look up the destination URL in Redis
        const destinationUrl = await redis.get<string>(`link:${slug}`)

        if (!destinationUrl) {
            return NextResponse.next()
        }

        // Generate unique click_id for conversion tracking
        const clickId = crypto.randomUUID()

        // Build redirect URL with ref_id for tracking
        const redirectUrl = new URL(destinationUrl)
        redirectUrl.searchParams.set('ref_id', clickId)

        // TODO: Log click to Tinybird asynchronously
        // This would be done via fetch to Tinybird Events API
        // We'll implement this in the next sprint

        return NextResponse.redirect(redirectUrl.toString())
    } catch (error) {
        console.error('Middleware error:', error)
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
}
