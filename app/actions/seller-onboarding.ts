'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover'
})

// =============================================
// SELLER ONBOARDING ACTIONS
// =============================================

interface OnboardingStep1Data {
    sellerId: string
    name: string
    bio?: string
}

interface OnboardingStep2Data {
    sellerId: string
    tiktokUrl?: string
    instagramUrl?: string
    twitterUrl?: string
    youtubeUrl?: string
    websiteUrl?: string
}

/**
 * Step 1: Basic info
 */
export async function saveOnboardingStep1(data: OnboardingStep1Data) {
    const { sellerId, name, bio } = data

    try {
        // Update seller name
        await prisma.seller.update({
            where: { id: sellerId },
            data: {
                name,
                onboarding_step: 1
            }
        })

        // Upsert profile with bio
        await prisma.sellerProfile.upsert({
            where: { seller_id: sellerId },
            create: {
                seller_id: sellerId,
                bio,
                profile_score: 10 // +10 for completing step 1
            },
            update: {
                bio,
                profile_score: { increment: 0 } // Don't double-count
            }
        })

        return { success: true }
    } catch (error) {
        console.error('[Onboarding] Step 1 failed:', error)
        return { success: false, error: 'Failed to save profile' }
    }
}

/**
 * Step 2: Social profiles
 */
export async function saveOnboardingStep2(data: OnboardingStep2Data) {
    const { sellerId, tiktokUrl, instagramUrl, twitterUrl, youtubeUrl, websiteUrl } = data

    try {
        // Calculate profile score based on filled fields
        let scoreBonus = 0
        if (tiktokUrl) scoreBonus += 15
        if (instagramUrl) scoreBonus += 15
        if (twitterUrl) scoreBonus += 10
        if (youtubeUrl) scoreBonus += 15
        if (websiteUrl) scoreBonus += 5

        // Update profile
        await prisma.sellerProfile.upsert({
            where: { seller_id: sellerId },
            create: {
                seller_id: sellerId,
                tiktok_url: tiktokUrl,
                instagram_url: instagramUrl,
                twitter_url: twitterUrl,
                youtube_url: youtubeUrl,
                website_url: websiteUrl,
                profile_score: 10 + scoreBonus
            },
            update: {
                tiktok_url: tiktokUrl,
                instagram_url: instagramUrl,
                twitter_url: twitterUrl,
                youtube_url: youtubeUrl,
                website_url: websiteUrl,
                profile_score: { set: 10 + scoreBonus } // Recalculate
            }
        })

        // Update seller step
        await prisma.seller.update({
            where: { id: sellerId },
            data: { onboarding_step: 2 }
        })

        return { success: true, profileScore: 10 + scoreBonus }
    } catch (error) {
        console.error('[Onboarding] Step 2 failed:', error)
        return { success: false, error: 'Failed to save social profiles' }
    }
}

/**
 * Step 3: Create Stripe Connect Express account
 */
export async function createStripeConnectAccount(sellerId: string) {
    try {
        console.log('[Stripe Connect] Starting account creation for seller:', sellerId)

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { Program: true }
        })

        if (!seller) {
            console.error('[Stripe Connect] Seller not found:', sellerId)
            return { success: false, error: 'Seller not found' }
        }

        console.log('[Stripe Connect] Seller found:', {
            id: seller.id,
            email: seller.email,
            hasStripeConnect: !!seller.stripe_connect_id
        })

        // Check if already has Connect account
        if (seller.stripe_connect_id) {
            console.log('[Stripe Connect] Generating new onboarding link for existing account:', seller.stripe_connect_id)
            // Generate new onboarding link
            const accountLink = await stripe.accountLinks.create({
                account: seller.stripe_connect_id,
                refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?step=3&refresh=true`,
                return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?step=4`,
                type: 'account_onboarding'
            })
            console.log('[Stripe Connect] Onboarding link created:', accountLink.url)
            return { success: true, url: accountLink.url }
        }

        // Create new Express account
        console.log('[Stripe Connect] Creating new Express account...')
        const account = await stripe.accounts.create({
            type: 'express',
            email: seller.email,
            metadata: {
                seller_id: seller.id,
                program_id: seller.program_id || 'global'
            },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            }
        })

        console.log('[Stripe Connect] Account created:', account.id)

        // Save account ID to seller AND set payout_method to STRIPE_CONNECT
        await prisma.seller.update({
            where: { id: sellerId },
            data: {
                stripe_connect_id: account.id,
                payout_method: 'STRIPE_CONNECT',  // ← CRITICAL: Set payout method!
                onboarding_step: 3
            }
        })

        console.log('[Stripe Connect] Seller updated with stripe_connect_id')

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?step=3&refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/onboarding?step=4`,
            type: 'account_onboarding'
        })

        console.log('[Stripe Connect] Onboarding link created:', accountLink.url)

        return { success: true, url: accountLink.url, accountId: account.id }
    } catch (error) {
        console.error('[Stripe Connect] FULL ERROR:', error)
        // @ts-ignore - Stripe errors have a message property
        const errorMessage = error?.message || 'Failed to create payment account'
        console.error('[Stripe Connect] Error message:', errorMessage)
        return { success: false, error: errorMessage }
    }
}

/**
 * Step 4: Complete onboarding
 */
export async function completeOnboarding(sellerId: string) {
    try {
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId }
        })

        if (!seller) {
            return { success: false, error: 'Seller not found' }
        }

        // Verify Stripe Connect status
        if (seller.stripe_connect_id) {
            const account = await stripe.accounts.retrieve(seller.stripe_connect_id)

            if (account.payouts_enabled) {
                await prisma.seller.update({
                    where: { id: sellerId },
                    data: {
                        payouts_enabled_at: new Date(),
                        onboarding_step: 4,
                        status: 'APPROVED' // Auto-approve on Stripe verification
                    }
                })

                // Update profile score
                await prisma.sellerProfile.update({
                    where: { seller_id: sellerId },
                    data: { profile_score: { increment: 40 } } // +40 for Stripe verified
                })

                return { success: true, payoutsEnabled: true }
            }
        }

        // Mark as complete but not fully verified
        await prisma.seller.update({
            where: { id: sellerId },
            data: { onboarding_step: 4 }
        })

        return { success: true, payoutsEnabled: false }
    } catch (error) {
        console.error('[Onboarding] Completion failed:', error)
        return { success: false, error: 'Failed to complete onboarding' }
    }
}

/**
 * Get seller onboarding status
 */
export async function getOnboardingStatus(userId: string) {
    try {
        // Handle 'current-user' keyword
        let actualUserId = userId
        if (userId === 'current-user') {
            const supabase = await createClient()
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error || !user) {
                return { success: false, error: 'Not authenticated', hasSeller: false }
            }

            actualUserId = user.id
        }

        const seller = await prisma.seller.findFirst({
            where: { user_id: actualUserId },
            include: {
                Profile: true,
                Program: true
            }
        })

        if (!seller) {
            return { success: false, error: 'No seller found', hasSeller: false }
        }

        return {
            success: true,
            hasSeller: true,
            seller: {
                id: seller.id,
                name: seller.name,
                email: seller.email,
                status: seller.status,
                onboardingStep: seller.onboarding_step,
                stripeConnected: !!seller.stripe_connect_id,
                payoutsEnabled: !!seller.payouts_enabled_at,
                program: seller.Program?.name || 'Global Seller'
            },
            profile: seller.Profile ? {
                bio: seller.Profile.bio,
                tiktokUrl: seller.Profile.tiktok_url,
                instagramUrl: seller.Profile.instagram_url,
                twitterUrl: seller.Profile.twitter_url,
                youtubeUrl: seller.Profile.youtube_url,
                websiteUrl: seller.Profile.website_url,
                profileScore: seller.Profile.profile_score
            } : null
        }
    } catch (error) {
        console.error('[Onboarding] Status check failed:', error)
        return { success: false, error: 'Failed to get status' }
    }
}
