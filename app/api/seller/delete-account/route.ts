import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

export async function DELETE() {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
        }

        const userId = currentUser.userId

        // Find all seller records for this user
        const sellers = await prisma.seller.findMany({
            where: { user_id: userId },
            include: {
                Profile: true
            }
        })

        if (sellers.length === 0) {
            return NextResponse.json({ success: false, error: 'Seller account not found' }, { status: 404 })
        }

        // Check if seller has pending commissions or balance
        const sellerIds = sellers.map(s => s.id)
        const balances = await prisma.sellerBalance.findMany({
            where: { seller_id: { in: sellerIds } }
        })
        const hasBalance = balances.some(b => b.balance > 0 || b.pending > 0 || b.due > 0)
        if (hasBalance) {
            return NextResponse.json({
                success: false,
                error: 'Cannot delete account with pending balance. Please withdraw or wait for commissions to be paid out.'
            }, { status: 400 })
        }

        // Delete in transaction
        await prisma.$transaction(async (tx) => {
            // Delete seller profiles
            await tx.sellerProfile.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete seller balances
            await tx.sellerBalance.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete gift card redemptions
            await tx.giftCardRedemption.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete mission enrollments (user_id based)
            await tx.missionEnrollment.deleteMany({
                where: { user_id: userId }
            })

            // Delete program requests
            await tx.programRequest.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete conversations where seller is involved
            await tx.message.deleteMany({
                where: {
                    Conversation: {
                        seller_id: { in: sellerIds }
                    }
                }
            })
            await tx.conversation.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete commissions (seller_id is required, can't be nullified)
            // Note: This permanently removes commission history
            await tx.commission.deleteMany({
                where: { seller_id: { in: sellerIds } }
            })

            // Delete sellers
            await tx.seller.deleteMany({
                where: { id: { in: sellerIds } }
            })

            // Delete Supabase user (requires service role key)
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

            if (supabaseServiceKey && supabaseUrl) {
                const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                })

                const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
                if (deleteUserError) {
                    console.error('Failed to delete Supabase user:', deleteUserError)
                    // Don't fail the whole operation, user data is already cleaned up
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting account:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 })
    }
}
