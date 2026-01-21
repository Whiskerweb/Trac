'use server'

import { prisma } from '@/prisma'
import { getWorkspaceFromCookie } from '@/lib/auth-utils'

// =============================================
// GET MY PARTNERS (Partners who joined our missions)
// =============================================

export async function getMyPartners() {
    try {
        const workspace = await getWorkspaceFromCookie()
        if (!workspace) {
            return { success: false, error: 'Non authentifié' }
        }

        // Get all enrollments for this workspace's missions
        const enrollments = await prisma.missionEnrollment.findMany({
            where: {
                mission: {
                    workspace_id: workspace.id
                }
            },
            include: {
                user: true,
                mission: true,
                link: true
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        // Aggregate stats per partner
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
                existing.totalClicks += enrollment.link?.clicks || 0
                // TODO: Aggregate sales from Tinybird
                if (enrollment.created_at > existing.lastActivity) {
                    existing.lastActivity = enrollment.created_at
                }
            } else {
                partnerMap.set(enrollment.user_id, {
                    id: enrollment.user_id,
                    name: enrollment.user.name || 'Sans nom',
                    email: enrollment.user.email,
                    avatar: (enrollment.user.name || 'U').slice(0, 2).toUpperCase(),
                    status: enrollment.status === 'APPROVED' ? 'active' :
                        enrollment.status === 'PENDING' ? 'pending' : 'inactive',
                    missionsCount: 1,
                    totalClicks: enrollment.link?.clicks || 0,
                    totalSales: 0, // TODO: From Tinybird
                    commissionEarned: 0, // TODO: From commissions table
                    joinedAt: enrollment.created_at,
                    lastActivity: enrollment.created_at
                })
            }
        }

        // Sort by commission earned (or clicks as fallback)
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
        // Get all users who have partner profiles
        // In production, this would query a dedicated PartnerProfile table
        const partners = await prisma.user.findMany({
            where: {
                // Filter users who have enrolled in any mission (they are partners)
                enrollments: {
                    some: {}
                },
                // Search filter
                ...(filters?.search && {
                    OR: [
                        { name: { contains: filters.search, mode: 'insensitive' } },
                        { email: { contains: filters.search, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                enrollments: {
                    include: {
                        link: true
                    }
                }
            },
            take: 50 // Limit for performance
        })

        // Transform to Partner format with aggregated stats
        const formattedPartners = partners.map(user => {
            const totalClicks = user.enrollments.reduce((sum, e) => sum + (e.link?.clicks || 0), 0)
            const totalSales = 0 // TODO: From Tinybird
            const totalEarnings = 0 // TODO: From commissions

            return {
                id: user.id,
                name: user.name || 'Sans nom',
                email: user.email,
                avatar: (user.name || 'U').slice(0, 2).toUpperCase(),
                country: 'Non renseigné', // TODO: From partner profile
                countryCode: '🌍',
                profileType: 'individual' as const,
                industryInterests: [] as string[], // TODO: From partner profile
                salesChannels: [] as string[],
                earningPreferences: [] as string[],
                monthlyTraffic: 'Non renseigné',
                globalStats: {
                    totalClicks,
                    totalSales,
                    totalEarnings,
                    conversionRate: totalClicks > 0 ? (totalSales / totalClicks * 100) : 0,
                    activeMissions: user.enrollments.filter(e => e.status === 'APPROVED').length
                }
            }
        })

        // Sort by earnings/clicks
        formattedPartners.sort((a, b) => b.globalStats.totalClicks - a.globalStats.totalClicks)

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
        const workspace = await getWorkspaceFromCookie()
        if (!workspace) {
            return { success: false, error: 'Non authentifié' }
        }

        const user = await prisma.user.findUnique({
            where: { id: partnerId },
            include: {
                enrollments: {
                    include: {
                        mission: true,
                        link: true
                    }
                }
            }
        })

        if (!user) {
            return { success: false, error: 'Partner non trouvé' }
        }

        // Separate enrollments by workspace
        const ourEnrollments = user.enrollments.filter(e => e.mission.workspace_id === workspace.id)
        const allEnrollments = user.enrollments

        // Calculate global stats
        const globalStats = {
            totalClicks: allEnrollments.reduce((sum, e) => sum + (e.link?.clicks || 0), 0),
            totalSales: 0, // TODO: From Tinybird
            totalEarnings: 0, // TODO: From commissions
            conversionRate: 0,
            activeMissions: allEnrollments.filter(e => e.status === 'APPROVED').length
        }

        // Calculate our workspace stats
        const ourStats = {
            missionsJoined: ourEnrollments.length,
            totalClicks: ourEnrollments.reduce((sum, e) => sum + (e.link?.clicks || 0), 0),
            totalSales: 0,
            totalEarnings: 0,
            conversionRate: 0
        }

        // Format missions
        const missions = ourEnrollments.map(e => ({
            id: e.mission.id,
            name: e.mission.title,
            clicks: e.link?.clicks || 0,
            sales: 0,
            earnings: 0,
            status: e.status === 'APPROVED' ? 'active' :
                e.status === 'PENDING' ? 'pending' : 'inactive'
        }))

        return {
            success: true,
            partner: {
                id: user.id,
                name: user.name || 'Sans nom',
                email: user.email,
                avatar: (user.name || 'U').slice(0, 2).toUpperCase(),
                status: 'active',
                country: 'Non renseigné', // TODO: From partner profile
                profileType: 'individual',
                partnerSince: user.created_at,
                bio: '', // TODO: From partner profile
                industryInterests: [],
                monthlyTraffic: 'Non renseigné',
                socials: {},
                earningPreferences: [],
                salesChannels: [],
                globalStats,
                ourStats,
                missions
            }
        }
    } catch (error) {
        console.error('Error fetching partner profile:', error)
        return { success: false, error: 'Erreur lors du chargement' }
    }
}
