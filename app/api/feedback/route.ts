import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const message = formData.get('message') as string
        const userType = formData.get('userType') as 'STARTUP' | 'SELLER'
        const pageUrl = formData.get('pageUrl') as string
        const userAgent = formData.get('userAgent') as string

        // Debug logging
        console.log('Feedback submission:', {
            userId: user.userId,
            userType,
            message: message?.substring(0, 50),
            pageUrl
        })

        // Collect attachments
        const attachments: { name: string; type: string; size: number; url: string }[] = []
        let voiceUrl: string | undefined

        // Process all form data entries
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('attachment_') && value instanceof File) {
                if (value.size > MAX_FILE_SIZE) {
                    return NextResponse.json(
                        { error: `File ${value.name} exceeds 10MB limit` },
                        { status: 400 }
                    )
                }

                // For MVP, store file info without actual upload
                // In production, upload to S3/Cloudflare R2
                attachments.push({
                    name: value.name,
                    type: value.type,
                    size: value.size,
                    url: `pending_upload_${Date.now()}_${value.name}`,
                })
            }

            if (key === 'audio' && value instanceof File) {
                if (value.size > MAX_FILE_SIZE) {
                    return NextResponse.json(
                        { error: 'Voice recording exceeds 10MB limit' },
                        { status: 400 }
                    )
                }

                // For MVP, mark as pending upload
                voiceUrl = `pending_voice_${Date.now()}`
            }
        }

        // Validate that there's some content
        if (!message?.trim() && attachments.length === 0 && !voiceUrl) {
            return NextResponse.json(
                { error: 'Please provide a message, attachment, or voice recording' },
                { status: 400 }
            )
        }

        // Create feedback entry
        const feedback = await prisma.feedback.create({
            data: {
                user_id: user.userId,
                user_email: user.email || null,
                user_name: user.email?.split('@')[0] || 'Anonymous',
                user_type: userType,
                message: message || '',
                attachments: attachments.length > 0 ? attachments : undefined,
                voice_url: voiceUrl || null,
                page_url: pageUrl || null,
                user_agent: userAgent || null,
            },
        })

        return NextResponse.json({
            success: true,
            feedbackId: feedback.id,
        })
    } catch (error) {
        console.error('Failed to submit feedback:', error)
        // Log more details for debugging
        if (error instanceof Error) {
            console.error('Error name:', error.name)
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
        }
        return NextResponse.json(
            { error: 'Failed to submit feedback', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

// GET endpoint for admin to fetch all feedback
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // For now, allow any authenticated user to view feedback
        // In production, add admin role check

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const userType = searchParams.get('userType')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: Record<string, unknown> = {}
        if (status) where.status = status
        if (userType) where.user_type = userType

        const [feedback, total] = await Promise.all([
            prisma.feedback.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.feedback.count({ where }),
        ])

        return NextResponse.json({
            feedback,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Failed to fetch feedback:', error)
        return NextResponse.json(
            { error: 'Failed to fetch feedback' },
            { status: 500 }
        )
    }
}
