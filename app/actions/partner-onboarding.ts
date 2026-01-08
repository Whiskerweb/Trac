'use server'

import { prisma } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover'
})

// =============================================
// PARTNER ONBOARDING ACTIONS
// =============================================

interface OnboardingStep1Data {
    partnerId: string
    name: string
    bio?: string
}

interface OnboardingStep2Data {
    partnerId: string
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
    const { partnerId, name, bio } = data

    try {
        // Update partner name
        await prisma.partner.update({
            where: { id: partnerId },
            data: {
                name,
                onboarding_step: 1
            }
        })

        // Upsert profile with bio
        await prisma.partnerProfile.upsert({
            where: { partner_id: partnerId },
            create: {
                partner_id: partnerId,
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
    const { partnerId, tiktokUrl, instagramUrl, twitterUrl, youtubeUrl, websiteUrl } = data

    try {
        // Calculate profile score based on filled fields
        let scoreBonus = 0
        if (tiktokUrl) scoreBonus += 15
        if (instagramUrl) scoreBonus += 15
        if (twitterUrl) scoreBonus += 10
        if (youtubeUrl) scoreBonus += 15
        if (websiteUrl) scoreBonus += 5

        // Update profile
        await prisma.partnerProfile.upsert({
            where: { partner_id: partnerId },
            create: {
                partner_id: partnerId,
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

        // Update partner step
        await prisma.partner.update({
            where: { id: partnerId },
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
export async function createStripeConnectAccount(partnerId: string) {
    try {
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: { Program: true }
        })

        if (!partner) {
            return { success: false, error: 'Partner not found' }
        }

        // Check if already has Connect account
        if (partner.stripe_connect_id) {
            // Generate new onboarding link
            const accountLink = await stripe.accountLinks.create({
                account: partner.stripe_connect_id,
                refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/partner/onboarding?step=3&refresh=true`,
                return_url: `${process.env.NEXT_PUBLIC_APP_URL}/partner/onboarding?step=4`,
                type: 'account_onboarding'
            })
            return { success: true, url: accountLink.url }
        }

        // Create new Express account
        const account = await stripe.accounts.create({
            type: 'express',
            email: partner.email,
            metadata: {
                partner_id: partner.id,
                program_id: partner.program_id
            },
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            }
        })

        // Save account ID to partner
        await prisma.partner.update({
            where: { id: partnerId },
            data: {
                stripe_connect_id: account.id,
                onboarding_step: 3
            }
        })

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/partner/onboarding?step=3&refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/partner/onboarding?step=4`,
            type: 'account_onboarding'
        })

        return { success: true, url: accountLink.url, accountId: account.id }
    } catch (error) {
        console.error('[Onboarding] Stripe Connect failed:', error)
        return { success: false, error: 'Failed to create payment account' }
    }
}

/**
 * Step 4: Complete onboarding
 */
export async function completeOnboarding(partnerId: string) {
    try {
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId }
        })

        if (!partner) {
            return { success: false, error: 'Partner not found' }
        }

        // Verify Stripe Connect status
        if (partner.stripe_connect_id) {
            const account = await stripe.accounts.retrieve(partner.stripe_connect_id)

            if (account.payouts_enabled) {
                await prisma.partner.update({
                    where: { id: partnerId },
                    data: {
                        payouts_enabled_at: new Date(),
                        onboarding_step: 4,
                        status: 'APPROVED' // Auto-approve on Stripe verification
                    }
                })

                // Update profile score
                await prisma.partnerProfile.update({
                    where: { partner_id: partnerId },
                    data: { profile_score: { increment: 40 } } // +40 for Stripe verified
                })

                return { success: true, payoutsEnabled: true }
            }
        }

        // Mark as complete but not fully verified
        await prisma.partner.update({
            where: { id: partnerId },
            data: { onboarding_step: 4 }
        })

        return { success: true, payoutsEnabled: false }
    } catch (error) {
        console.error('[Onboarding] Completion failed:', error)
        return { success: false, error: 'Failed to complete onboarding' }
    }
}

/**
 * Get partner onboarding status
 */
export async function getOnboardingStatus(userId: string) {
    try {
        const partner = await prisma.partner.findFirst({
            where: { user_id: userId },
            include: {
                Profile: true,
                Program: true
            }
        })

        if (!partner) {
            return { success: false, error: 'No partner found', hasPartner: false }
        }

        return {
            success: true,
            hasPartner: true,
            partner: {
                id: partner.id,
                name: partner.name,
                email: partner.email,
                status: partner.status,
                onboardingStep: partner.onboarding_step,
                stripeConnected: !!partner.stripe_connect_id,
                payoutsEnabled: !!partner.payouts_enabled_at,
                program: partner.Program.name
            },
            profile: partner.Profile ? {
                bio: partner.Profile.bio,
                tiktokUrl: partner.Profile.tiktok_url,
                instagramUrl: partner.Profile.instagram_url,
                twitterUrl: partner.Profile.twitter_url,
                youtubeUrl: partner.Profile.youtube_url,
                websiteUrl: partner.Profile.website_url,
                profileScore: partner.Profile.profile_score
            } : null
        }
    } catch (error) {
        console.error('[Onboarding] Status check failed:', error)
        return { success: false, error: 'Failed to get status' }
    }
}
