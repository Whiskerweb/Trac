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

// =============================================
// CUSTOMER ACTIVITY (from Tinybird)
// =============================================

export interface CustomerActivity {
    id: string
    type: 'click' | 'lead' | 'sale'
    description: string
    timestamp: Date
    metadata?: Record<string, string>
    amount?: number  // For sales
}

export interface CustomerDetailWithActivity extends CustomerWithDetails {
    // Device info (from first click)
    device: string | null
    browser: string | null
    os: string | null
    city: string | null
    region: string | null
    // Activity timeline
    activity: CustomerActivity[]
    // Sales
    sales: {
        id: string
        orderId: string
        amount: number
        netAmount: number
        timestamp: Date
    }[]
    lifetimeValue: number
    // Referrer link
    referrerLinkSlug: string | null
}

/**
 * Get customer activity from Tinybird (clicks, sales)
 */
async function getCustomerActivityFromTinybird(
    workspaceId: string,
    clickId: string | null,
    customerExternalId: string
): Promise<{
    clicks: Array<{
        click_id: string
        timestamp: string
        country: string
        city: string
        region: string
        device: string
        browser: string
        os: string
        referer: string
        link_id: string
    }>
    sales: Array<{
        invoice_id: string
        timestamp: string
        amount: number
        net_amount: number
        currency: string
    }>
}> {
    const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
    const TINYBIRD_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

    if (!TINYBIRD_TOKEN) {
        console.warn('[Customers] No Tinybird token, skipping activity fetch')
        return { clicks: [], sales: [] }
    }

    try {
        // Fetch clicks for this customer (via click_id)
        let clicks: Array<any> = []
        if (clickId) {
            const clicksSQL = `
                SELECT click_id, timestamp, country, city, region, device, browser, os, referer, link_id
                FROM clicks
                WHERE workspace_id = '${workspaceId}'
                  AND click_id = '${clickId}'
                ORDER BY timestamp DESC
                LIMIT 50
                FORMAT JSON
            `
            const clicksResponse = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                    'Content-Type': 'text/plain',
                },
                body: clicksSQL,
                signal: AbortSignal.timeout(5000)
            })

            if (clicksResponse.ok) {
                const result = await clicksResponse.json()
                clicks = result.data || []
            }
        }

        // Fetch sales for this customer
        const salesSQL = `
            SELECT invoice_id, timestamp, amount, net_amount, currency
            FROM sales
            WHERE workspace_id = '${workspaceId}'
              AND (customer_external_id = '${customerExternalId}' ${clickId ? `OR click_id = '${clickId}'` : ''})
            ORDER BY timestamp DESC
            LIMIT 50
            FORMAT JSON
        `
        const salesResponse = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
                'Content-Type': 'text/plain',
            },
            body: salesSQL,
            signal: AbortSignal.timeout(5000)
        })

        let sales: Array<any> = []
        if (salesResponse.ok) {
            const result = await salesResponse.json()
            sales = result.data || []
        }

        return { clicks, sales }

    } catch (error) {
        console.error('[Customers] Tinybird fetch error:', error)
        return { clicks: [], sales: [] }
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

/**
 * Get a single customer with full activity timeline from Tinybird
 */
export async function getCustomerWithActivity(customerId: string): Promise<{
    success: boolean
    customer: CustomerDetailWithActivity | null
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

        // Get the ShortLink separately if link_id exists
        let referrerLinkSlug: string | null = null
        if (customer?.link_id) {
            const shortLink = await prisma.shortLink.findUnique({
                where: { id: customer.link_id },
                select: { slug: true }
            })
            referrerLinkSlug = shortLink?.slug || null
        }

        if (!customer) {
            return { success: false, customer: null, error: 'Customer not found' }
        }

        // Get seller info if attributed
        let seller = null
        if (customer.affiliate_id) {
            seller = await prisma.seller.findFirst({
                where: { user_id: customer.affiliate_id },
                include: {
                    Profile: { select: { avatar_url: true } }
                }
            })
        }

        // Fetch activity from Tinybird
        const { clicks, sales } = await getCustomerActivityFromTinybird(
            workspace.workspaceId,
            customer.click_id,
            customer.external_id
        )

        // Extract device info from first click
        const firstClick = clicks[0]
        const device = firstClick?.device || null
        const browser = firstClick?.browser || null
        const os = firstClick?.os || null
        const city = firstClick?.city || null
        const region = firstClick?.region || null

        // Build activity timeline
        const activity: CustomerActivity[] = []

        // Add clicks
        for (const click of clicks) {
            activity.push({
                id: `click-${click.click_id}`,
                type: 'click',
                description: 'Clicked affiliate link',
                timestamp: new Date(click.timestamp),
                metadata: {
                    device: click.device,
                    browser: click.browser,
                    country: click.country,
                    referer: click.referer || 'direct'
                }
            })
        }

        // Add leads
        for (const lead of customer.LeadEvents) {
            activity.push({
                id: `lead-${lead.id}`,
                type: 'lead',
                description: lead.event_name,
                timestamp: lead.created_at
            })
        }

        // Add sales
        for (const sale of sales) {
            activity.push({
                id: `sale-${sale.invoice_id}`,
                type: 'sale',
                description: 'Purchase completed',
                timestamp: new Date(sale.timestamp),
                amount: sale.amount,
                metadata: {
                    amount: `${sale.amount}€`,
                    currency: sale.currency
                }
            })
        }

        // Sort by timestamp DESC
        activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

        // Calculate lifetime value
        const lifetimeValue = sales.reduce((sum, s) => sum + (s.amount || 0), 0)

        const customerWithActivity: CustomerDetailWithActivity = {
            id: customer.id,
            externalId: customer.external_id,
            name: customer.name,
            email: customer.email,
            avatar: customer.avatar,
            country: customer.country || firstClick?.country || null,
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
            })),
            // Device info
            device,
            browser,
            os,
            city,
            region,
            // Activity
            activity,
            // Sales
            sales: sales.map(s => ({
                id: `sale-${s.invoice_id}`,
                orderId: s.invoice_id,
                amount: s.amount,  // Already in cents from Tinybird
                netAmount: s.net_amount || s.amount,
                timestamp: new Date(s.timestamp)
            })),
            lifetimeValue: lifetimeValue,  // Already in cents from Tinybird
            // Referrer link
            referrerLinkSlug
        }

        return { success: true, customer: customerWithActivity }

    } catch (error) {
        console.error('[Customers] Error fetching customer with activity:', error)
        return {
            success: false,
            customer: null,
            error: error instanceof Error ? error.message : 'Failed to fetch customer'
        }
    }
}
