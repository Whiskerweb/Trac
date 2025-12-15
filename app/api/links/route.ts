import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { url, slug: customSlug } = body

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            )
        }

        // Generate slug if not provided
        const slug = customSlug || nanoid(6)

        // Check if slug already exists
        const existingLink = await redis.get(`link:${slug}`)
        if (existingLink) {
            return NextResponse.json(
                { error: 'Slug already exists' },
                { status: 409 }
            )
        }

        // Save to Prisma (Supabase)
        const link = await prisma.link.create({
            data: {
                slug,
                url,
            },
        })

        // Save to Redis (Upstash) for fast lookup
        await redis.set(`link:${slug}`, url)

        return NextResponse.json(link, { status: 201 })
    } catch (error) {
        console.error('Error creating link:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const links = await prisma.link.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        return NextResponse.json(links)
    } catch (error) {
        console.error('Error fetching links:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
