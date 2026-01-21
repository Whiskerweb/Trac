'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { getCurrentUser } from '@/lib/auth'

// =============================================
// GET MY PARTNERS (Partners who joined our missions)
// =============================================

export async function getMyPartners() {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Non authentifié' }
        }

        // Get all enrollments for this workspace's missions
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                Mission: {
                    workspace_id: workspace.workspaceId
                }
            },
            include: {
                Mission: true,
                ShortLink: true
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        // Aggregate stats per partner (using user_id from enrollment)
        const partnerMap = new Map<string, {
            id: string
            name: string
            email: string
            avatar: string
            status: 'active' | 'pending' | 'inactive'
            missionsCount: number
            totalClicks: number
            totalSales: number
            commissionEarned: number
            joinedAt: Date
            lastActivity: Date
        }>()

        for (const enrollment of enrollments) {
            const existing = partnerMap.get(enrollment.user_id)

            if (existing) {
                existing.missionsCount += 1
                existing.totalClicks += enrollment.ShortLink?.clicks || 0
                if (enrollment.created_at > existing.lastActivity) {
                    existing.lastActivity = enrollment.created_at
                }
            } else {
                partnerMap.set(enrollment.user_id, {
                    id: enrollment.user_id,
                    name: `Partner ${enrollment.user_id.slice(0, 8)}`,
                    email: `${enrollment.user_id.slice(0, 8)}@partner.com`,
                    avatar: 'PA',
                    status: enrollment.status === 'APPROVED' ? 'active' :
                        enrollment.status === 'PENDING' ? 'pending' : 'inactive',
                    missionsCount: 1,
                    totalClicks: enrollment.ShortLink?.clicks || 0,
                    totalSales: 0,
                    commissionEarned: 0,
                    joinedAt: enrollment.created_at,
                    lastActivity: enrollment.created_at
                })
            }
        }

        const partners = Array.from(partnerMap.values())
            .sort((a, b) => b.totalClicks - a.totalClicks)

        return { success: true, partners }
    } catch (error) {
        console.error('Error fetching my partners:', error)
        return { success: false, error: 'Erreur lors du chargement' }
    }
}

// =============================================
// GET ALL PLATFORM PARTNERS (Marketplace)
// =============================================

export async function getAllPlatformPartners(filters?: {
    countries?: string[]
    industries?: string[]
    channels?: string[]
    earningPrefs?: string[]
    search?: string
}) {
    try {
        // Get Partners from the Partner table (not Users)
        const partners = await prisma.partner.findMany({
            where: {
                status: 'APPROVED',
                ...(filters?.search && {
                    OR: [
                        { name: { contains: filters.search, mode: 'insensitive' } },
                        { email: { contains: filters.search, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                Commissions: true,
                Profile: true
            },
            take: 50
        })

        // Transform
        const formattedPartners = partners.map(partner => {
            const totalClicks = 0 // Would come from Tinybird
            const totalSales = partner.Commissions.length
            const totalEarnings = partner.Commissions.reduce((sum, c) => sum + c.commission_amount, 0)

            return {
                id: partner.id,
                name: partner.name || 'Sans nom',
                email: partner.email,
                avatar: (partner.name || 'PA').slice(0, 2).toUpperCase(),
                country: 'Non renseigné',
                countryCode: '🌍',
                profileType: 'individual' as const,
                industryInterests: [] as string[],
                salesChannels: [] as string[],
                earningPreferences: [] as string[],
                monthlyTraffic: 'Non renseigné',
                globalStats: {
                    totalClicks,
                    totalSales,
                    totalEarnings,
                    conversionRate: 0,
                    activeMissions: 0
                }
            }
        })

        formattedPartners.sort((a, b) => b.globalStats.totalEarnings - a.globalStats.totalEarnings)

        return { success: true, partners: formattedPartners }
    } catch (error) {
        console.error('Error fetching platform partners:', error)
        return { success: false, error: 'Erreur lors du chargement' }
    }
}

// =============================================
// GET PARTNER PROFILE DETAILS
// =============================================

export async function getPartnerProfile(partnerId: string) {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, error: 'Non authentifié' }
        }

        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            include: {
                Commissions: true,
                Profile: true
            }
        })

        if (!partner) {
            return { success: false, error: 'Partner non trouvé' }
        }

        const globalStats = {
            totalClicks: 0,
            totalSales: partner.Commissions.length,
            totalEarnings: partner.Commissions.reduce((sum, c) => sum + c.commission_amount, 0),
            conversionRate: 0,
            activeMissions: 0
        }

        return {
            success: true,
            partner: {
                id: partner.id,
                name: partner.name || 'Sans nom',
                email: partner.email,
                avatar: (partner.name || 'PA').slice(0, 2).toUpperCase(),
                status: partner.status.toLowerCase(),
                country: 'Non renseigné',
                profileType: 'individual',
                partnerSince: partner.created_at,
                bio: partner.Profile?.bio || '',
                industryInterests: [],
                monthlyTraffic: 'Non renseigné',
                socials: {
                    twitter: partner.Profile?.twitter_url,
                    instagram: partner.Profile?.instagram_url,
                    youtube: partner.Profile?.youtube_url,
                    tiktok: partner.Profile?.tiktok_url,
                    website: partner.Profile?.website_url
                },
                earningPreferences: [],
                salesChannels: [],
                globalStats,
                ourStats: globalStats,
                missions: []
            }
        }
    } catch (error) {
        console.error('Error fetching partner profile:', error)
        return { success: false, error: 'Erreur lors du chargement' }
    }
}

// =============================================
// CREATE GLOBAL PARTNER
// =============================================

export async function createGlobalPartner(data: {
    userId: string
    email: string
    name: string
}) {
    try {
        // Check if partner already exists
        const existingPartner = await prisma.partner.findUnique({
            where: { tenant_id: data.userId }
        })

        if (existingPartner) {
            return { success: true, partnerId: existingPartner.id }
        }

        // Create new partner
        const partner = await prisma.partner.create({
            data: {
                tenant_id: data.userId,
                user_id: data.userId,
                email: data.email,
                name: data.name,
                status: 'APPROVED'
            }
        })

        return { success: true, partnerId: partner.id }
    } catch (error) {
        console.error('Error creating global partner:', error)
        return { success: false, error: 'Failed to create partner profile' }
    }
}

// =============================================
// CLAIM SHADOW PARTNERS
// =============================================

export async function claimPartners(userId: string, email: string) {
    try {
        // Find shadow partners by email that don't have a user_id yet
        const shadowPartners = await prisma.partner.findMany({
            where: {
                email: email,
                user_id: null
            }
        })

        if (shadowPartners.length === 0) {
            return { success: true, claimed: 0 }
        }

        // Claim them
        await prisma.partner.updateMany({
            where: {
                email: email,
                user_id: null
            },
            data: {
                user_id: userId
            }
        })

        return { success: true, claimed: shadowPartners.length }
    } catch (error) {
        console.error('Error claiming partners:', error)
        return { success: false, error: 'Failed to claim partners' }
    }
}

// =============================================
// GET PARTNER BY USER ID (For Analytics Token)
// =============================================

export async function getPartnerByUserId(userId: string) {
    const partner = await prisma.partner.findFirst({
        where: { user_id: userId },
        select: { id: true, name: true, email: true }
    })
    return partner
}

// =============================================
// GET PARTNER DASHBOARD (For Portal Homepage)
// =============================================

export async function getPartnerDashboard() {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return { error: 'Non authentifié' }

        // Find the partner for this user
        const partner = await prisma.partner.findFirst({
            where: { user_id: currentUser.userId },
            include: {
                Commissions: {
                    orderBy: { created_at: 'desc' },
                    take: 5
                }
            }
        })

        if (!partner) {
            return {
                partner: {
                    id: currentUser.userId,
                    name: currentUser.email.split('@')[0],
                },
                stats: {
                    totalClicks: 0,
                    totalEarnings: 0,
                    totalSales: 0,
                    conversionRate: 0,
                    activeMissions: 0
                },
                recentActivity: []
            }
        }

        const totalEarnings = partner.Commissions.reduce((sum, c) => sum + c.commission_amount, 0)

        return {
            partner: {
                id: partner.id,
                name: partner.name || currentUser.email.split('@')[0],
            },
            stats: {
                totalClicks: 0,
                totalEarnings,
                totalSales: partner.Commissions.length,
                conversionRate: 0,
                activeMissions: 0
            },
            recentActivity: partner.Commissions.map(c => ({
                id: c.id,
                mission: 'Commission',
                date: c.created_at,
                amount: c.commission_amount
            }))
        }
    } catch (error) {
        console.error('Error fetching partner dashboard:', error)
        return { error: 'Erreur load dashboard' }
    }
}

// =============================================
// GET PARTNER COMMISSIONS (For Portal Earnings)
// =============================================

export async function getPartnerCommissions() {
    return {
        commissions: [],
        summary: {
            pending: 0,
            available: 0,
            paid: 0
        }
    }
}
