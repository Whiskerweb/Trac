import { prisma } from '@/lib/db'

// =============================================
// SHARED: Organization Notification System
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
export async function sendSupportMessage(sellerId: string, content: string) {
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
}

// =============================================
// I18N: Locale detection
// =============================================

export type OrgLocale = 'fr' | 'en' | 'es'

const FRENCH_COUNTRIES = ['france', 'fr', 'belgique', 'belgium', 'be', 'suisse', 'switzerland', 'ch', 'luxembourg', 'lu', 'canada', 'ca', 'monaco', 'mc']
const SPANISH_COUNTRIES = ['espagne', 'spain', 'es', 'mexique', 'mexico', 'mx', 'argentine', 'argentina', 'ar', 'colombie', 'colombia', 'co', 'chili', 'chile', 'cl', 'perou', 'peru', 'pe']

/**
 * Detect seller locale from their profile country
 */
export async function getSellerLocale(sellerId: string): Promise<OrgLocale> {
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

// =============================================
// I18N: Message templates
// =============================================

type MessageFn = (name: string, orgName: string) => string
type MissionMessageFn = (name: string, orgName: string, missionTitle: string, reward?: string) => string

// Admin org status messages (used by admin-org-actions)
export const ORG_MESSAGES: Record<string, Record<OrgLocale, MessageFn>> = {
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

// Organization mission lifecycle messages
export const ORG_MISSION_MESSAGES: Record<string, Record<OrgLocale, MissionMessageFn>> = {
    mission_accepted: {
        fr: (_name, orgName, missionTitle, reward) =>
            `Nouvelle mission disponible dans "${orgName}" !\n\nLa mission "${missionTitle}" a été acceptée par le leader de votre organisation. Votre commission : ${reward || 'voir détails'}.\n\nVous êtes automatiquement inscrit(e). Rendez-vous dans votre tableau de bord pour obtenir votre lien.\n\n— L'équipe Traaaction`,
        en: (_name, orgName, missionTitle, reward) =>
            `New mission available in "${orgName}"!\n\nThe mission "${missionTitle}" has been accepted by your organization's leader. Your commission: ${reward || 'see details'}.\n\nYou are automatically enrolled. Head to your dashboard to get your link.\n\n— The Traaaction Team`,
        es: (_name, orgName, missionTitle, reward) =>
            `Nueva misión disponible en "${orgName}"!\n\nLa misión "${missionTitle}" ha sido aceptada por el líder de tu organización. Tu comisión: ${reward || 'ver detalles'}.\n\nEstás inscrito(a) automáticamente. Ve a tu panel de control para obtener tu enlace.\n\n— El equipo de Traaaction`,
    },
    mission_cancelled: {
        fr: (_name, orgName, missionTitle) =>
            `La mission "${missionTitle}" dans l'organisation "${orgName}" a été annulée par la startup.\n\nLes commissions en attente ont été supprimées. Les commissions déjà validées sont conservées.\n\n— L'équipe Traaaction`,
        en: (_name, orgName, missionTitle) =>
            `The mission "${missionTitle}" in organization "${orgName}" has been cancelled by the startup.\n\nPending commissions have been removed. Already validated commissions are preserved.\n\n— The Traaaction Team`,
        es: (_name, orgName, missionTitle) =>
            `La misión "${missionTitle}" en la organización "${orgName}" ha sido cancelada por la startup.\n\nLas comisiones pendientes han sido eliminadas. Las comisiones ya validadas se conservan.\n\n— El equipo de Traaaction`,
    },
}

// Member lifecycle messages (sent to leader)
export const ORG_MEMBER_MESSAGES: Record<string, Record<OrgLocale, (leaderName: string, orgName: string, sellerName: string) => string>> = {
    member_joined: {
        fr: (_leaderName, orgName, sellerName) =>
            `${sellerName} a rejoint votre organisation "${orgName}".\n\nIl/elle a été automatiquement inscrit(e) à toutes les missions actives.\n\n— L'équipe Traaaction`,
        en: (_leaderName, orgName, sellerName) =>
            `${sellerName} has joined your organization "${orgName}".\n\nThey have been automatically enrolled in all active missions.\n\n— The Traaaction Team`,
        es: (_leaderName, orgName, sellerName) =>
            `${sellerName} se ha unido a tu organización "${orgName}".\n\nSe ha inscrito automáticamente en todas las misiones activas.\n\n— El equipo de Traaaction`,
    },
    member_left: {
        fr: (_leaderName, orgName, sellerName) =>
            `${sellerName} a quitté votre organisation "${orgName}".\n\n— L'équipe Traaaction`,
        en: (_leaderName, orgName, sellerName) =>
            `${sellerName} has left your organization "${orgName}".\n\n— The Traaaction Team`,
        es: (_leaderName, orgName, sellerName) =>
            `${sellerName} ha dejado tu organización "${orgName}".\n\n— El equipo de Traaaction`,
    },
    member_removed: {
        fr: (_name, orgName, _sellerName) =>
            `Vous avez été retiré(e) de l'organisation "${orgName}" par le leader.\n\n— L'équipe Traaaction`,
        en: (_name, orgName, _sellerName) =>
            `You have been removed from the organization "${orgName}" by the leader.\n\n— The Traaaction Team`,
        es: (_name, orgName, _sellerName) =>
            `Has sido eliminado(a) de la organización "${orgName}" por el líder.\n\n— El equipo de Traaaction`,
    },
}

// =============================================
// HIGH-LEVEL NOTIFICATION FUNCTIONS
// =============================================

/**
 * Send a localized admin org notification to the leader (approved, rejected, suspended, reactivated)
 */
export async function notifyOrgLeader(
    org: { leader_id: string; name: string; Leader?: { name?: string | null } | null },
    action: string
) {
    const validActions = Object.keys(ORG_MESSAGES)
    if (!validActions.includes(action)) {
        console.error(`[Org Notify] Invalid notification action: ${action}`)
        return
    }
    try {
        const locale = await getSellerLocale(org.leader_id)
        const message = ORG_MESSAGES[action][locale](org.Leader?.name || '', org.name)
        await sendSupportMessage(org.leader_id, message)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify org leader:`, error)
    }
}

/**
 * Notify all active members when a mission is accepted.
 * Sends a localized message to each member with their commission info.
 */
export async function notifyMembersOfMissionAccepted(
    orgId: string,
    orgName: string,
    missionTitle: string,
    memberReward: string
) {
    try {
        const members = await prisma.organizationMember.findMany({
            where: { organization_id: orgId, status: 'ACTIVE' },
            select: { seller_id: true }
        })

        for (const member of members) {
            const locale = await getSellerLocale(member.seller_id)
            const message = ORG_MISSION_MESSAGES.mission_accepted[locale]('', orgName, missionTitle, memberReward)
            await sendSupportMessage(member.seller_id, message)
        }

        console.log(`[Org Notify] Notified ${members.length} members of mission accepted: ${missionTitle}`)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify members of mission accepted:`, error)
    }
}

/**
 * Notify leader + all active members when a mission is cancelled.
 */
export async function notifyOfMissionCancelled(
    orgId: string,
    leaderId: string,
    orgName: string,
    missionTitle: string
) {
    try {
        // Notify leader
        const leaderLocale = await getSellerLocale(leaderId)
        const leaderMessage = ORG_MISSION_MESSAGES.mission_cancelled[leaderLocale]('', orgName, missionTitle)
        await sendSupportMessage(leaderId, leaderMessage)

        // Notify all active members
        const members = await prisma.organizationMember.findMany({
            where: { organization_id: orgId, status: 'ACTIVE' },
            select: { seller_id: true }
        })

        for (const member of members) {
            const locale = await getSellerLocale(member.seller_id)
            const message = ORG_MISSION_MESSAGES.mission_cancelled[locale]('', orgName, missionTitle)
            await sendSupportMessage(member.seller_id, message)
        }

        console.log(`[Org Notify] Notified leader + ${members.length} members of mission cancelled: ${missionTitle}`)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify of mission cancelled:`, error)
    }
}

/**
 * Notify leader when a new member joins the organization.
 */
export async function notifyLeaderOfNewMember(
    leaderId: string,
    orgName: string,
    sellerName: string
) {
    try {
        const locale = await getSellerLocale(leaderId)
        const message = ORG_MEMBER_MESSAGES.member_joined[locale]('', orgName, sellerName)
        await sendSupportMessage(leaderId, message)
        console.log(`[Org Notify] Notified leader of new member: ${sellerName}`)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify leader of new member:`, error)
    }
}

/**
 * Notify leader when a member leaves the organization.
 */
export async function notifyLeaderOfMemberLeft(
    leaderId: string,
    orgName: string,
    sellerName: string
) {
    try {
        const locale = await getSellerLocale(leaderId)
        const message = ORG_MEMBER_MESSAGES.member_left[locale]('', orgName, sellerName)
        await sendSupportMessage(leaderId, message)
        console.log(`[Org Notify] Notified leader of member left: ${sellerName}`)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify leader of member left:`, error)
    }
}

/**
 * Notify a member that they've been removed from the organization.
 */
export async function notifyMemberRemoved(
    sellerId: string,
    orgName: string
) {
    try {
        const locale = await getSellerLocale(sellerId)
        const message = ORG_MEMBER_MESSAGES.member_removed[locale]('', orgName, '')
        await sendSupportMessage(sellerId, message)
        console.log(`[Org Notify] Notified removed member: ${sellerId}`)
    } catch (error) {
        console.error(`[Org Notify] Failed to notify removed member:`, error)
    }
}
