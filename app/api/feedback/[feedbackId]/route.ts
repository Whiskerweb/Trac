import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Update feedback status or notes
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ feedbackId: string }> }
) {
    try {
        const user = await getCurrentUser()
        const { feedbackId } = await params

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { status, admin_notes } = body

        // Validate status
        if (status && !['NEW', 'REVIEWED', 'RESOLVED', 'ARCHIVED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const updateData: Record<string, unknown> = {}
        if (status) updateData.status = status
        if (admin_notes !== undefined) updateData.admin_notes = admin_notes

        const feedback = await prisma.feedback.update({
            where: { id: feedbackId },
            data: updateData,
        })

        return NextResponse.json({ success: true, feedback })
    } catch (error) {
        console.error('Failed to update feedback:', error)
        return NextResponse.json(
            { error: 'Failed to update feedback' },
            { status: 500 }
        )
    }
}

// Get single feedback
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ feedbackId: string }> }
) {
    try {
        const user = await getCurrentUser()
        const { feedbackId } = await params

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const feedback = await prisma.feedback.findUnique({
            where: { id: feedbackId },
        })

        if (!feedback) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
        }

        return NextResponse.json({ feedback })
    } catch (error) {
        console.error('Failed to fetch feedback:', error)
        return NextResponse.json(
            { error: 'Failed to fetch feedback' },
            { status: 500 }
        )
    }
}

// Delete feedback
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ feedbackId: string }> }
) {
    try {
        const user = await getCurrentUser()
        const { feedbackId } = await params

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await prisma.feedback.delete({
            where: { id: feedbackId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete feedback:', error)
        return NextResponse.json(
            { error: 'Failed to delete feedback' },
            { status: 500 }
        )
    }
}
