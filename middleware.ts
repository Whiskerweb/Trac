import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protected routes
    if (pathname.startsWith('/dashboard')) {
        const token = request.cookies.get('auth_token')?.value

        if (!token) {
            // Redirect to login if no token
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Verify token
        const payload = await verifyToken(token)

        if (!payload) {
            // Invalid token, redirect to login
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Role-based access control
        if (pathname.startsWith('/dashboard/startup') && payload.role !== 'STARTUP') {
            return NextResponse.redirect(new URL('/dashboard/affiliate', request.url))
        }

        if (pathname.startsWith('/dashboard/affiliate') && payload.role !== 'AFFILIATE') {
            return NextResponse.redirect(new URL('/dashboard/startup', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*'],
}
