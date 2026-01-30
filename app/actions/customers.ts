'use server'

import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'

// =============================================
// CUSTOMERS SERVER ACTIONS
// =============================================

export interface CustomerWithDetails {
    id: string
    externalId: string
    name: string | null
    email: string | null
    avatar: string | null
    country: string | null
    createdAt: Date
    updatedAt: Date
    // Attribution
    clickId: string | null
    linkId: string | null
    affiliateId: string | null
    referrerName: string | null
    referrerEmail: string | null
    referrerAvatar: string | null
    // Aggregates
    leadCount: number
    leadEvents: {
        id: string
        eventName: string
        createdAt: Date
    }[]
}

export interface CustomersResponse {
    success: boolean
    customers: CustomerWithDetails[]
    stats: {
        total: number
        withReferrer: number
        totalLeads: number
    }
    error?: string
}

/**
 * Get all customers for the current workspace with seller attribution
 */
export async function getWorkspaceCustomers(): Promise<CustomersResponse> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return {
                success: false,
                customers: [],
                stats: { total: 0, withReferrer: 0, totalLeads: 0 },
                error: 'No active workspace'
            }
        }

        // Fetch customers with their lead events
        const customers = await prisma.customer.findMany({
            where: { workspace_id: workspace.workspaceId },
            include: {
                LeadEvents: {
                    orderBy: { created_at: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        // Get unique affiliate IDs to fetch seller info
        const affiliateIds = [...new Set(
            customers
                .map(c => c.affiliate_id)
                .filter((id): id is string => id !== null)
        )]

        // Fetch sellers for attribution
        const sellers = affiliateIds.length > 0
            ? await prisma.seller.findMany({
                where: { user_id: { in: affiliateIds } },
                include: {
                    Profile: {
                        select: { avatar_url: true }
                    }
                }
            })
            : []

        // Create a map for quick lookup
        const sellerMap = new Map(sellers.map(s => [s.user_id, s]))

        // Transform customers with seller details
        const customersWithDetails: CustomerWithDetails[] = customers.map(c => {
            const seller = c.affiliate_id ? sellerMap.get(c.affiliate_id) : null

            return {
                id: c.id,
                externalId: c.external_id,
                name: c.name,
                email: c.email,
                avatar: c.avatar,
                country: c.country,
                createdAt: c.created_at,
                updatedAt: c.updated_at,
                // Attribution
                clickId: c.click_id,
                linkId: c.link_id,
                affiliateId: c.affiliate_id,
                referrerName: seller?.name || null,
                referrerEmail: seller?.email || null,
                referrerAvatar: seller?.Profile?.avatar_url || null,
                // Aggregates
                leadCount: c.LeadEvents.length,
                leadEvents: c.LeadEvents.map(le => ({
                    id: le.id,
                    eventName: le.event_name,
                    createdAt: le.created_at
                }))
            }
        })

        // Calculate stats
        const stats = {
            total: customers.length,
            withReferrer: customers.filter(c => c.affiliate_id).length,
            totalLeads: customers.reduce((sum, c) => sum + c.LeadEvents.length, 0)
        }

        return {
            success: true,
            customers: customersWithDetails,
            stats
        }

    } catch (error) {
        console.error('[Customers] Error fetching customers:', error)
        return {
            success: false,
            customers: [],
            stats: { total: 0, withReferrer: 0, totalLeads: 0 },
            error: error instanceof Error ? error.message : 'Failed to fetch customers'
        }
    }
}

/**
 * Get a single customer by ID with full details
 */
export async function getCustomerById(customerId: string): Promise<{
    success: boolean
    customer: CustomerWithDetails | null
    error?: string
}> {
    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) {
            return { success: false, customer: null, error: 'No active workspace' }
        }

        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                workspace_id: workspace.workspaceId
            },
            include: {
                LeadEvents: {
                    orderBy: { created_at: 'desc' }
                }
            }
        })

        if (!customer) {
            return { success: false, customer: null, error: 'Customer not found' }
        }

        // Get seller info if attributed
        let seller = null
        if (customer.affiliate_id) {
            seller = await prisma.seller.findFirst({
                where: { user_id: customer.affiliate_id },
                include: {
                    Profile: {
                        select: { avatar_url: true }
                    }
                }
            })
        }

        const customerWithDetails: CustomerWithDetails = {
            id: customer.id,
            externalId: customer.external_id,
            name: customer.name,
            email: customer.email,
            avatar: customer.avatar,
            country: customer.country,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at,
            // Attribution
            clickId: customer.click_id,
            linkId: customer.link_id,
            affiliateId: customer.affiliate_id,
            referrerName: seller?.name || null,
            referrerEmail: seller?.email || null,
            referrerAvatar: seller?.Profile?.avatar_url || null,
            // Aggregates
            leadCount: customer.LeadEvents.length,
            leadEvents: customer.LeadEvents.map(le => ({
                id: le.id,
                eventName: le.event_name,
                createdAt: le.created_at
            }))
        }

        return { success: true, customer: customerWithDetails }

    } catch (error) {
        console.error('[Customers] Error fetching customer:', error)
        return {
            success: false,
            customer: null,
            error: error instanceof Error ? error.message : 'Failed to fetch customer'
        }
    }
}
