'use server'

import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { addDomainToVercel, removeDomainFromVercel } from '@/lib/vercel-domains'

/**
 * Get portal settings for the active workspace (includes portal missions with configs)
 */
export async function getPortalSettings() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: ws.workspaceId },
            select: {
                slug: true,
                portal_enabled: true,
                portal_welcome_text: true,
                portal_primary_color: true,
                portal_headline: true,
                portal_logo_url: true,
                portal_subdomain: true,
                Domain: {
                    where: { verified: true },
                    take: 1,
                    select: { name: true },
                },
                Mission: {
                    where: {
                        status: 'ACTIVE',
                        portal_visible: true,
                        organization_id: null,
                    },
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        target_url: true,
                        portal_visible: true,
                        portal_exclusive: true,
                        sale_enabled: true,
                        sale_reward_amount: true,
                        sale_reward_structure: true,
                        lead_enabled: true,
                        lead_reward_amount: true,
                        recurring_enabled: true,
                        recurring_reward_amount: true,
                        recurring_reward_structure: true,
                        recurring_duration_months: true,
                        Contents: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                type: true,
                                url: true,
                                title: true,
                                description: true,
                            },
                        },
                    },
                },
            },
        })

        if (!workspace) return { success: false, error: 'Workspace not found' }

        return {
            success: true,
            data: {
                slug: workspace.slug,
                portal_enabled: workspace.portal_enabled,
                portal_welcome_text: workspace.portal_welcome_text,
                portal_primary_color: workspace.portal_primary_color,
                portal_headline: workspace.portal_headline,
                portal_logo_url: workspace.portal_logo_url,
                portal_subdomain: workspace.portal_subdomain,
                customDomain: workspace.Domain[0]?.name || null,
                missions: workspace.Mission,
            },
        }
    } catch (error) {
        console.error('[Portal Settings] getPortalSettings error:', error)
        return { success: false, error: 'Failed to load settings' }
    }
}

/**
 * Toggle portal on/off
 */
export async function togglePortal(enabled: boolean) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_enabled: enabled },
        })

        // When enabling portal, auto-set portal_visible=true on eligible missions
        if (enabled) {
            await prisma.mission.updateMany({
                where: {
                    workspace_id: ws.workspaceId,
                    status: 'ACTIVE',
                    visibility: { in: ['PUBLIC', 'PRIVATE'] },
                    organization_id: null,
                    portal_visible: false,
                },
                data: { portal_visible: true },
            })

            // Ensure subdomain is registered in Vercel (idempotent)
            const workspace = await prisma.workspace.findUnique({
                where: { id: ws.workspaceId },
                select: { portal_subdomain: true },
            })
            if (workspace?.portal_subdomain) {
                const vercelResult = await addDomainToVercel(`${workspace.portal_subdomain}.traaaction.com`)
                if (!vercelResult.success) {
                    console.warn('[Portal Settings] Vercel domain sync on toggle:', vercelResult.error)
                }
            }
        }

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] togglePortal error:', error)
        return { success: false, error: 'Failed to update portal' }
    }
}

/**
 * Update portal branding (headline + welcome text + color + logo) in a single call
 */
export async function updatePortalBranding(data: {
    headline: string
    welcomeText: string
    primaryColor: string
    logoUrl?: string
}) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    if (data.headline.length > 80) {
        return { success: false, error: 'Headline must be 80 characters or less' }
    }

    if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
        return { success: false, error: 'Invalid color format (must be #RRGGBB)' }
    }

    try {
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: {
                portal_headline: data.headline || null,
                portal_welcome_text: data.welcomeText || null,
                portal_primary_color: data.primaryColor || '#7C3AED',
                portal_logo_url: data.logoUrl || null,
            },
        })

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] updatePortalBranding error:', error)
        return { success: false, error: 'Failed to update branding' }
    }
}

/**
 * Update portal subdomain (e.g. "cardz" → cardz.traaaction.com)
 * Registers/removes the subdomain in Vercel via API.
 */
export async function updatePortalSubdomain(subdomain: string) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    // Fetch current subdomain from DB
    const currentWorkspace = await prisma.workspace.findUnique({
        where: { id: ws.workspaceId },
        select: { portal_subdomain: true },
    })
    const oldSubdomain = currentWorkspace?.portal_subdomain || null

    // Normalize
    const clean = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')

    if (!clean) {
        // Clear subdomain — remove old from Vercel if exists
        if (oldSubdomain) {
            await removeDomainFromVercel(`${oldSubdomain}.traaaction.com`)
        }
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_subdomain: null },
        })
        revalidatePath('/dashboard/portal')
        return { success: true }
    }

    // Same subdomain — still ensure it's registered in Vercel (idempotent re-sync)
    if (clean === oldSubdomain) {
        let dnsWarning: string | undefined
        const vercelResult = await addDomainToVercel(`${clean}.traaaction.com`)
        if (!vercelResult.success) {
            console.warn('[Portal Settings] Vercel re-sync failed:', vercelResult.error)
            dnsWarning = vercelResult.error
        }
        return { success: true, data: { subdomain: clean }, dnsWarning }
    }

    if (clean.length < 3 || clean.length > 30) {
        return { success: false, error: 'Subdomain must be 3-30 characters' }
    }

    const reserved = ['www', 'seller', 'app', 'admin', 'api', 'mail', 'smtp', 'ftp']
    if (reserved.includes(clean)) {
        return { success: false, error: 'This subdomain is reserved' }
    }

    try {
        // Check uniqueness (another workspace might have this subdomain or slug)
        const existing = await prisma.workspace.findFirst({
            where: {
                OR: [{ portal_subdomain: clean }, { slug: clean }],
                NOT: { id: ws.workspaceId },
            },
        })
        if (existing) {
            return { success: false, error: 'This subdomain is already taken' }
        }

        // Save to DB first
        await prisma.workspace.update({
            where: { id: ws.workspaceId },
            data: { portal_subdomain: clean },
        })

        // Remove old domain from Vercel (if changing)
        if (oldSubdomain && oldSubdomain !== clean) {
            await removeDomainFromVercel(`${oldSubdomain}.traaaction.com`)
        }

        // Add new domain to Vercel
        let dnsWarning: string | undefined
        const vercelResult = await addDomainToVercel(`${clean}.traaaction.com`)
        if (!vercelResult.success) {
            console.warn('[Portal Settings] Vercel domain add failed (DB saved):', vercelResult.error)
            dnsWarning = vercelResult.error
        }

        revalidatePath('/dashboard/portal')
        return { success: true, data: { subdomain: clean }, dnsWarning }
    } catch (error) {
        console.error('[Portal Settings] updatePortalSubdomain error:', error)
        return { success: false, error: 'Failed to update subdomain' }
    }
}

/**
 * Get portal overview stats: total affiliates, commissions, revenue
 */
export async function getPortalOverview() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        // Get portal-visible mission IDs
        const portalMissions = await prisma.mission.findMany({
            where: {
                workspace_id: ws.workspaceId,
                portal_visible: true,
            },
            select: { id: true },
        })

        const missionIds = portalMissions.map(m => m.id)

        if (missionIds.length === 0) {
            return {
                success: true,
                data: { totalAffiliates: 0, totalCommissions: 0, totalRevenue: 0 },
            }
        }

        const [enrollmentCount, commissionAgg] = await Promise.all([
            prisma.missionEnrollment.count({
                where: {
                    mission_id: { in: missionIds },
                    status: 'APPROVED',
                },
            }),
            prisma.commission.aggregate({
                where: {
                    program_id: ws.workspaceId,
                    org_parent_commission_id: null,
                    referral_generation: null,
                },
                _count: { id: true },
                _sum: { commission_amount: true },
            }),
        ])

        return {
            success: true,
            data: {
                totalAffiliates: enrollmentCount,
                totalCommissions: commissionAgg._count.id,
                totalRevenue: commissionAgg._sum.commission_amount || 0,
            },
        }
    } catch (error) {
        console.error('[Portal Settings] getPortalOverview error:', error)
        return { success: false, error: 'Failed to load overview' }
    }
}

// =============================================
// PORTAL MISSION CRUD
// =============================================

/**
 * Create a portal mission (simplified — visibility PUBLIC, portal_visible true)
 */
export async function createPortalMission(data: {
    title: string
    description: string
    targetUrl: string
    sale: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number }
    lead: { enabled: boolean; amount: number }
    recurring: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number; duration: number | null }
    resources: { title: string; url: string; type: 'LINK' | 'PDF' | 'YOUTUBE' | 'TEXT' }[]
}) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    if (!data.title.trim()) return { success: false, error: 'Title is required' }
    if (!data.targetUrl.trim()) return { success: false, error: 'Target URL is required' }

    try {
        // Build reward display string
        const parts: string[] = []
        if (data.sale.enabled && data.sale.amount > 0) {
            parts.push(data.sale.structure === 'PERCENTAGE' ? `${data.sale.amount}%/sale` : `${data.sale.amount / 100}€/sale`)
        }
        if (data.lead.enabled && data.lead.amount > 0) {
            parts.push(`${data.lead.amount / 100}€/lead`)
        }
        if (data.recurring.enabled && data.recurring.amount > 0) {
            parts.push(data.recurring.structure === 'PERCENTAGE' ? `${data.recurring.amount}%/recurring` : `${data.recurring.amount / 100}€/recurring`)
        }

        const mission = await prisma.mission.create({
            data: {
                workspace_id: ws.workspaceId,
                title: data.title.trim(),
                description: data.description.trim(),
                target_url: data.targetUrl.trim(),
                reward: parts.join(' + ') || '0',
                status: 'ACTIVE',
                visibility: 'PUBLIC',
                portal_visible: true,
                portal_exclusive: true,
                company_name: ws.workspaceName || null,

                sale_enabled: data.sale.enabled,
                sale_reward_amount: data.sale.enabled ? data.sale.amount : null,
                sale_reward_structure: data.sale.enabled ? data.sale.structure : null,

                lead_enabled: data.lead.enabled,
                lead_reward_amount: data.lead.enabled ? data.lead.amount : null,

                recurring_enabled: data.recurring.enabled,
                recurring_reward_amount: data.recurring.enabled ? data.recurring.amount : null,
                recurring_reward_structure: data.recurring.enabled ? data.recurring.structure : null,
                recurring_duration_months: data.recurring.enabled ? data.recurring.duration : null,
            },
        })

        // Create resources
        if (data.resources.length > 0) {
            await prisma.missionContent.createMany({
                data: data.resources.map((r, i) => ({
                    mission_id: mission.id,
                    title: r.title,
                    url: r.type !== 'TEXT' ? r.url : null,
                    description: r.type === 'TEXT' ? r.url : null,
                    type: r.type,
                    order: i,
                })),
            })
        }

        revalidatePath('/dashboard/portal')
        return { success: true, data: { missionId: mission.id } }
    } catch (error) {
        console.error('[Portal Settings] createPortalMission error:', error)
        return { success: false, error: 'Failed to create mission' }
    }
}

/**
 * Update a portal mission
 */
export async function updatePortalMission(missionId: string, data: {
    title: string
    description: string
    targetUrl: string
    sale: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number }
    lead: { enabled: boolean; amount: number }
    recurring: { enabled: boolean; structure: 'FLAT' | 'PERCENTAGE'; amount: number; duration: number | null }
    resources: { title: string; url: string; type: 'LINK' | 'PDF' | 'YOUTUBE' | 'TEXT' }[]
}) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: ws.workspaceId },
        })
        if (!mission) return { success: false, error: 'Mission not found' }

        const parts: string[] = []
        if (data.sale.enabled && data.sale.amount > 0) {
            parts.push(data.sale.structure === 'PERCENTAGE' ? `${data.sale.amount}%/sale` : `${data.sale.amount / 100}€/sale`)
        }
        if (data.lead.enabled && data.lead.amount > 0) {
            parts.push(`${data.lead.amount / 100}€/lead`)
        }
        if (data.recurring.enabled && data.recurring.amount > 0) {
            parts.push(data.recurring.structure === 'PERCENTAGE' ? `${data.recurring.amount}%/recurring` : `${data.recurring.amount / 100}€/recurring`)
        }

        await prisma.mission.update({
            where: { id: missionId },
            data: {
                title: data.title.trim(),
                description: data.description.trim(),
                target_url: data.targetUrl.trim(),
                reward: parts.join(' + ') || '0',

                sale_enabled: data.sale.enabled,
                sale_reward_amount: data.sale.enabled ? data.sale.amount : null,
                sale_reward_structure: data.sale.enabled ? data.sale.structure : null,

                lead_enabled: data.lead.enabled,
                lead_reward_amount: data.lead.enabled ? data.lead.amount : null,

                recurring_enabled: data.recurring.enabled,
                recurring_reward_amount: data.recurring.enabled ? data.recurring.amount : null,
                recurring_reward_structure: data.recurring.enabled ? data.recurring.structure : null,
                recurring_duration_months: data.recurring.enabled ? data.recurring.duration : null,
            },
        })

        // Replace resources
        await prisma.missionContent.deleteMany({ where: { mission_id: missionId } })
        if (data.resources.length > 0) {
            await prisma.missionContent.createMany({
                data: data.resources.map((r, i) => ({
                    mission_id: missionId,
                    title: r.title,
                    url: r.type !== 'TEXT' ? r.url : null,
                    description: r.type === 'TEXT' ? r.url : null,
                    type: r.type,
                    order: i,
                })),
            })
        }

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] updatePortalMission error:', error)
        return { success: false, error: 'Failed to update mission' }
    }
}

/**
 * Delete a portal mission (archive if has enrollments, hard-delete otherwise)
 */
export async function deletePortalMission(missionId: string) {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const mission = await prisma.mission.findFirst({
            where: { id: missionId, workspace_id: ws.workspaceId },
            include: { _count: { select: { MissionEnrollment: true } } },
        })
        if (!mission) return { success: false, error: 'Mission not found' }

        if (mission._count.MissionEnrollment > 0) {
            // Soft-delete: archive
            await prisma.mission.update({
                where: { id: missionId },
                data: { status: 'ARCHIVED', portal_visible: false, archived_at: new Date() },
            })
        } else {
            // Hard-delete: no enrollments
            await prisma.missionContent.deleteMany({ where: { mission_id: missionId } })
            await prisma.mission.delete({ where: { id: missionId } })
        }

        revalidatePath('/dashboard/portal')
        return { success: true }
    } catch (error) {
        console.error('[Portal Settings] deletePortalMission error:', error)
        return { success: false, error: 'Failed to delete mission' }
    }
}

/**
 * Portal analytics for startup (isolated)
 */
export async function getPortalAnalytics() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const portalMissions = await prisma.mission.findMany({
            where: { workspace_id: ws.workspaceId, portal_visible: true },
            select: { id: true },
        })
        const missionIds = portalMissions.map(m => m.id)

        if (missionIds.length === 0) {
            return {
                success: true,
                data: {
                    totalAffiliates: 0, totalCommissions: 0,
                    totalRevenue: 0, conversionRate: 0,
                },
            }
        }

        const [enrollmentCount, commissionAgg, totalClicks] = await Promise.all([
            prisma.missionEnrollment.count({
                where: { mission_id: { in: missionIds }, status: 'APPROVED' },
            }),
            prisma.commission.aggregate({
                where: {
                    program_id: ws.workspaceId,
                    org_parent_commission_id: null,
                    referral_generation: null,
                },
                _count: { id: true },
                _sum: { commission_amount: true },
            }),
            prisma.shortLink.aggregate({
                where: { workspace_id: ws.workspaceId },
                _sum: { clicks: true },
            }),
        ])

        const clicks = totalClicks._sum.clicks || 0
        const sales = commissionAgg._count.id
        const conversionRate = clicks > 0 ? (sales / clicks) * 100 : 0

        return {
            success: true,
            data: {
                totalAffiliates: enrollmentCount,
                totalCommissions: sales,
                totalRevenue: commissionAgg._sum.commission_amount || 0,
                conversionRate: Math.round(conversionRate * 100) / 100,
            },
        }
    } catch (error) {
        console.error('[Portal Settings] getPortalAnalytics error:', error)
        return { success: false, error: 'Failed to load analytics' }
    }
}

// =============================================
// PORTAL SOURCE SELLERS
// =============================================

/**
 * Get sellers who signed up through this workspace's portal
 */
export async function getPortalSellers() {
    const ws = await getActiveWorkspaceForUser()
    if (!ws) return { success: false, error: 'No workspace' }

    try {
        const sellers = await prisma.seller.findMany({
            where: { portal_source_workspace_id: ws.workspaceId },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                created_at: true,
            },
            orderBy: { created_at: 'desc' },
        })

        return { success: true, data: sellers }
    } catch (error) {
        console.error('[Portal Settings] getPortalSellers error:', error)
        return { success: false, error: 'Failed to load portal sellers' }
    }
}
