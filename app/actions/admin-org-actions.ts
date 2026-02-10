'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/lib/admin'

// =============================================
// ADMIN: Organization Management
// =============================================

async function requireAdminUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAdmin(user.email)) {
        throw new Error('Unauthorized')
    }
    return user
}

/**
 * Get all organizations with counts (admin view)
 */
export async function getAllOrgs(filter?: 'PENDING' | 'ACTIVE' | 'SUSPENDED') {
    try {
        await requireAdminUser()

        const where = filter ? { status: filter as any } : {}

        const organizations = await prisma.organization.findMany({
            where,
            include: {
                Leader: { select: { id: true, name: true, email: true, status: true } },
                _count: {
                    select: {
                        Members: { where: { status: 'ACTIVE' } },
                        Missions: { where: { status: 'ACCEPTED' } },
                    }
                },
            },
            orderBy: { created_at: 'desc' }
        })

        return { success: true, organizations }
    } catch (error) {
        console.error('[Admin Org] Failed to get orgs:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get pending organization applications
 */
export async function getOrgApplications() {
    try {
        await requireAdminUser()

        const applications = await prisma.organization.findMany({
            where: { status: 'PENDING' },
            include: {
                Leader: {
                    select: {
                        id: true, name: true, email: true, status: true,
                        stripe_connect_id: true, onboarding_step: true
                    }
                },
            },
            orderBy: { created_at: 'asc' }
        })

        return { success: true, applications }
    } catch (error) {
        console.error('[Admin Org] Failed to get applications:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Approve an organization application → ACTIVE
 */
export async function approveOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { Leader: { select: { id: true, name: true } } }
        })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'PENDING') {
            return { success: false, error: 'Organization is not pending approval' }
        }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'ACTIVE' }
        })

        await notifyOrgLeader(org, 'approved')

        console.log(`[Admin Org] Approved org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to approve org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Suspend an organization → SUSPENDED
 */
export async function suspendOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { Leader: { select: { id: true, name: true } } }
        })
        if (!org) return { success: false, error: 'Organization not found' }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'SUSPENDED' }
        })

        await notifyOrgLeader(org, 'suspended')

        console.log(`[Admin Org] Suspended org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to suspend org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Reactivate a suspended organization → ACTIVE
 */
export async function reactivateOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { Leader: { select: { id: true, name: true } } }
        })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'SUSPENDED') {
            return { success: false, error: 'Organization is not suspended' }
        }

        await prisma.organization.update({
            where: { id: orgId },
            data: { status: 'ACTIVE' }
        })

        await notifyOrgLeader(org, 'reactivated')

        console.log(`[Admin Org] Reactivated org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to reactivate org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

// =============================================
// SUPPORT MESSAGING HELPER
// =============================================

const SUPPORT_WORKSPACE_SLUG = 'traaaction-support'

/**
 * Get or create the "Traaaction Support" workspace used for platform notifications.
 */
async function getOrCreateSupportWorkspace(): Promise<string> {
    const existing = await prisma.workspace.findUnique({
        where: { slug: SUPPORT_WORKSPACE_SLUG },
        include: { Profile: true }
    })
    if (existing) {
        if (!existing.Profile) {
            await prisma.workspaceProfile.create({
                data: {
                    workspace_id: existing.id,
                    logo_url: '/Logotrac/logo1.png',
                    description: 'Traaaction Platform Support',
                }
            })
        }
        return existing.id
    }

    const ws = await prisma.workspace.create({
        data: {
            name: 'Traaaction Support',
            slug: SUPPORT_WORKSPACE_SLUG,
            owner_id: 'system',
        }
    })

    await prisma.workspaceProfile.create({
        data: {
            workspace_id: ws.id,
            logo_url: '/Logotrac/logo1.png',
            description: 'Traaaction Platform Support',
        }
    })

    return ws.id
}

/**
 * Send a support/system message to a seller.
 */
async function sendSupportMessage(sellerId: string, content: string) {
    const workspaceId = await getOrCreateSupportWorkspace()

    const conversation = await prisma.conversation.upsert({
        where: {
            workspace_id_seller_id: {
                workspace_id: workspaceId,
                seller_id: sellerId,
            }
        },
        create: {
            workspace_id: workspaceId,
            seller_id: sellerId,
            last_message: content.slice(0, 100),
            last_at: new Date(),
            unread_partner: 1,
        },
        update: {
            last_message: content.slice(0, 100),
            last_at: new Date(),
            unread_partner: { increment: 1 },
        }
    })

    await prisma.message.create({
        data: {
            conversation_id: conversation.id,
            sender_type: 'STARTUP',
            content,
        }
    })

    console.log(`[Admin] Sent support message to seller ${sellerId}`)
}

// =============================================
// I18N: Organization notification messages
// =============================================

type OrgLocale = 'fr' | 'en' | 'es'

const FRENCH_COUNTRIES = ['france', 'fr', 'belgique', 'belgium', 'be', 'suisse', 'switzerland', 'ch', 'luxembourg', 'lu', 'canada', 'ca', 'monaco', 'mc']
const SPANISH_COUNTRIES = ['espagne', 'spain', 'es', 'mexique', 'mexico', 'mx', 'argentine', 'argentina', 'ar', 'colombie', 'colombia', 'co', 'chili', 'chile', 'cl', 'perou', 'peru', 'pe']

/**
 * Detect seller locale from their profile country
 */
async function getSellerLocale(sellerId: string): Promise<OrgLocale> {
    const profile = await prisma.sellerProfile.findUnique({
        where: { seller_id: sellerId },
        select: { country: true }
    })
    if (!profile?.country) return 'en'
    const c = profile.country.toLowerCase().trim()
    if (FRENCH_COUNTRIES.some(fc => c.includes(fc))) return 'fr'
    if (SPANISH_COUNTRIES.some(sc => c.includes(sc))) return 'es'
    return 'en'
}

const ORG_MESSAGES: Record<string, Record<OrgLocale, (name: string, orgName: string) => string>> = {
    approved: {
        fr: (name, orgName) =>
            `Bonjour${name ? ` ${name}` : ''},\n\nBonne nouvelle ! Votre organisation "${orgName}" a été approuvée. Elle est maintenant active et visible sur la plateforme.\n\nVous pouvez dès à présent inviter des membres et accepter des missions depuis votre tableau de bord.\n\n— L'équipe Traaaction`,
        en: (name, orgName) =>
            `Hi${name ? ` ${name}` : ''},\n\nGreat news! Your organization "${orgName}" has been approved. It is now active and visible on the platform.\n\nYou can start inviting members and accepting missions from your dashboard.\n\n— The Traaaction Team`,
        es: (name, orgName) =>
            `Hola${name ? ` ${name}` : ''},\n\nBuenas noticias! Tu organización "${orgName}" ha sido aprobada. Ahora está activa y visible en la plataforma.\n\nYa puedes invitar miembros y aceptar misiones desde tu panel de control.\n\n— El equipo de Traaaction`,
    },
    rejected: {
        fr: (name, orgName) =>
            `Bonjour${name ? ` ${name}` : ''},\n\nNous avons examiné votre demande de création de l'organisation "${orgName}" et malheureusement, celle-ci n'a pas été approuvée.\n\nCela peut être dû à un manque de détails dans votre candidature ou à des critères qui ne correspondent pas à nos exigences actuelles.\n\nN'hésitez pas à soumettre une nouvelle demande avec plus de détails sur votre projet et votre équipe.\n\n— L'équipe Traaaction`,
        en: (name, orgName) =>
            `Hi${name ? ` ${name}` : ''},\n\nWe reviewed your application to create the organization "${orgName}" and unfortunately, it was not approved.\n\nThis may be due to insufficient details in your application or criteria that don't match our current requirements.\n\nFeel free to submit a new application with more details about your project and team.\n\n— The Traaaction Team`,
        es: (name, orgName) =>
            `Hola${name ? ` ${name}` : ''},\n\nHemos revisado tu solicitud para crear la organización "${orgName}" y lamentablemente no ha sido aprobada.\n\nEsto puede deberse a falta de detalles en tu solicitud o a criterios que no coinciden con nuestros requisitos actuales.\n\nNo dudes en enviar una nueva solicitud con más detalles sobre tu proyecto y equipo.\n\n— El equipo de Traaaction`,
    },
    suspended: {
        fr: (name, orgName) =>
            `Bonjour${name ? ` ${name}` : ''},\n\nVotre organisation "${orgName}" a été suspendue par notre équipe de modération.\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez nous contacter pour clarifier la situation.\n\n— L'équipe Traaaction`,
        en: (name, orgName) =>
            `Hi${name ? ` ${name}` : ''},\n\nYour organization "${orgName}" has been suspended by our moderation team.\n\nIf you believe this is an error, please contact us to clarify the situation.\n\n— The Traaaction Team`,
        es: (name, orgName) =>
            `Hola${name ? ` ${name}` : ''},\n\nTu organización "${orgName}" ha sido suspendida por nuestro equipo de moderación.\n\nSi crees que se trata de un error, contáctanos para aclarar la situación.\n\n— El equipo de Traaaction`,
    },
    reactivated: {
        fr: (name, orgName) =>
            `Bonjour${name ? ` ${name}` : ''},\n\nVotre organisation "${orgName}" a été réactivée. Elle est à nouveau active et visible sur la plateforme.\n\nVous pouvez reprendre vos activités normalement.\n\n— L'équipe Traaaction`,
        en: (name, orgName) =>
            `Hi${name ? ` ${name}` : ''},\n\nYour organization "${orgName}" has been reactivated. It is active and visible on the platform again.\n\nYou can resume your activities as normal.\n\n— The Traaaction Team`,
        es: (name, orgName) =>
            `Hola${name ? ` ${name}` : ''},\n\nTu organización "${orgName}" ha sido reactivada. Está activa y visible en la plataforma nuevamente.\n\nPuedes retomar tus actividades con normalidad.\n\n— El equipo de Traaaction`,
    },
}

/**
 * Send a localized org notification to the leader
 */
async function notifyOrgLeader(org: { leader_id: string; name: string; Leader?: { name?: string | null } | null }, action: string) {
    const validActions = Object.keys(ORG_MESSAGES) as (keyof typeof ORG_MESSAGES)[]
    if (!validActions.includes(action as keyof typeof ORG_MESSAGES)) {
        console.error(`[Admin Org] Invalid notification action: ${action}`)
        return
    }
    try {
        const locale = await getSellerLocale(org.leader_id)
        const message = ORG_MESSAGES[action as keyof typeof ORG_MESSAGES][locale](org.Leader?.name || '', org.name)
        await sendSupportMessage(org.leader_id, message)
    } catch (error) {
        console.error(`[Admin Org] Failed to notify org leader:`, error)
    }
}

// =============================================
// ADMIN: Reject Organization
// =============================================

/**
 * Reject a pending organization application → REJECTED + notify seller
 */
export async function rejectOrg(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: { Leader: { select: { id: true, name: true } } }
        })
        if (!org) return { success: false, error: 'Organization not found' }
        if (org.status !== 'PENDING') {
            return { success: false, error: 'Organization is not pending' }
        }

        // Send notification BEFORE deleting the org
        await notifyOrgLeader(org, 'rejected')

        // Delete the org (cascades to Members + Missions)
        await prisma.organization.delete({
            where: { id: orgId },
        })

        console.log(`[Admin Org] Rejected & deleted org ${orgId} (${org.name})`)
        return { success: true }
    } catch (error) {
        console.error('[Admin Org] Failed to reject org:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

/**
 * Get full admin detail of an organization
 */
export async function getOrgAdminDetail(orgId: string) {
    try {
        await requireAdminUser()

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                Leader: {
                    select: {
                        id: true, name: true, email: true, status: true,
                        stripe_connect_id: true, payout_method: true,
                        created_at: true, onboarding_step: true,
                        Profile: {
                            select: {
                                avatar_url: true, bio: true, country: true,
                                tiktok_url: true, instagram_url: true, twitter_url: true,
                                youtube_url: true, website_url: true,
                            }
                        },
                        _count: {
                            select: { Commissions: true, Requests: true }
                        }
                    }
                },
                Members: {
                    include: {
                        Seller: {
                            select: {
                                id: true, name: true, email: true, status: true,
                                created_at: true, stripe_connect_id: true,
                                Profile: { select: { avatar_url: true, country: true } },
                                _count: { select: { Commissions: true } }
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' }
                },
                Missions: {
                    include: {
                        Mission: { select: { id: true, title: true, status: true, workspace_id: true } }
                    },
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!org) return { success: false, error: 'Organization not found' }

        // Fetch leader balance separately (no direct relation)
        const leaderBalance = await prisma.sellerBalance.findUnique({
            where: { seller_id: org.leader_id },
            select: { balance: true, pending: true, due: true, paid_total: true }
        })

        return { success: true, organization: { ...org, leaderBalance } }
    } catch (error) {
        console.error('[Admin Org] Failed to get org detail:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
