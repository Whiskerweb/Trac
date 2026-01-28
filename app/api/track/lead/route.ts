import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { recordLeadToTinybird } from '@/lib/analytics/tinybird'
import { validatePublicKey } from '@/lib/api-keys'

/**
 * POST /api/track/lead
 * 
 * Track a lead conversion event (Traaaction-style)
 * Creates/updates a Customer and records the lead event
 * 
 * Authentication (in priority order):
 * 1. x-workspace-id header (from middleware domain lookup)
 * 2. x-publishable-key header (pk_xxx token)
 * 
 * Flow:
 * 1. Validate workspace via header or publishable key
 * 2. Create/Update Customer with click_id (first-click attribution)
 * 3. If mode !== "deferred", create LeadEvent
 * 4. Return customer + lead info
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request)

    try {
        const body = await request.json()
        const {
            clickId,
            eventName,
            customerExternalId,
            customerName,
            customerEmail,
            customerAvatar,
            mode = 'async',
            metadata
        } = body

        // Validate required fields
        if (!eventName || !customerExternalId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: eventName, customerExternalId' },
                { status: 400, headers: corsHeaders }
            )
        }

        // Get workspace from middleware headers (primary method)
        let workspaceId = request.headers.get('x-workspace-id')

        // Fallback: Try publishable key authentication (Traaaction-style)
        if (!workspaceId) {
            const publishableKey = request.headers.get('x-publishable-key')
            if (publishableKey) {
                const validation = await validatePublicKey(publishableKey)
                if (validation.valid && validation.workspaceId) {
                    workspaceId = validation.workspaceId
                    console.log('[track/lead] 🔑 Authenticated via publishable key:', publishableKey.slice(0, 10) + '...')
                } else {
                    return NextResponse.json(
                        { success: false, error: 'Invalid publishable key' },
                        { status: 401, headers: corsHeaders }
                    )
                }
            }
        }

        if (!workspaceId) {
            return NextResponse.json(
                { success: false, error: 'Workspace not identified. Provide x-workspace-id or x-publishable-key header.' },
                { status: 400, headers: corsHeaders }
            )
        }

        // Resolve click_id: use provided or lookup from existing customer
        let resolvedClickId = clickId

        // If clickId is empty string, lookup from existing customer (deferred mode second call)
        if (clickId === '' || !clickId) {
            const existingCustomer = await prisma.customer.findUnique({
                where: {
                    workspace_id_external_id: {
                        workspace_id: workspaceId,
                        external_id: customerExternalId
                    }
                }
            })
            resolvedClickId = existingCustomer?.click_id || null
        }

        // Lookup link_id and affiliate_id from click if available
        let linkId: string | null = null
        let affiliateId: string | null = null

        if (resolvedClickId) {
            // Try to find the link from the click
            // In a real implementation, you'd lookup from Tinybird or Redis
            // For now, we parse click_id format or use Redis cache
            try {
                const { redis } = await import('@/lib/redis')
                const clickData = await redis.get<{ linkId: string; affiliateId?: string }>(`click:${resolvedClickId}`)
                if (clickData) {
                    linkId = clickData.linkId
                    affiliateId = clickData.affiliateId || null
                }
            } catch (e) {
                // Redis lookup failed, continue without link data
                console.log('[track/lead] Click lookup failed:', e)
            }
        }

        // Create or update Customer (upsert)
        // FIRST-CLICK ATTRIBUTION: Only set click_id/link_id/affiliate_id if not already set

        // First, check if customer exists and has attribution
        const existingCustomer = await prisma.customer.findUnique({
            where: {
                workspace_id_external_id: {
                    workspace_id: workspaceId,
                    external_id: customerExternalId
                }
            },
            select: { click_id: true, link_id: true, affiliate_id: true }
        })

        const customer = await prisma.customer.upsert({
            where: {
                workspace_id_external_id: {
                    workspace_id: workspaceId,
                    external_id: customerExternalId
                }
            },
            create: {
                workspace_id: workspaceId,
                external_id: customerExternalId,
                click_id: resolvedClickId,
                link_id: linkId,
                affiliate_id: affiliateId,
                name: customerName,
                email: customerEmail,
                avatar: customerAvatar
            },
            update: {
                // Update metadata
                name: customerName || undefined,
                email: customerEmail || undefined,
                avatar: customerAvatar || undefined,
                // FIRST-CLICK ATTRIBUTION: Only set if not already set
                ...(resolvedClickId && !existingCustomer?.click_id && {
                    click_id: resolvedClickId
                }),
                ...(linkId && !existingCustomer?.link_id && {
                    link_id: linkId
                }),
                ...(affiliateId && !existingCustomer?.affiliate_id && {
                    affiliate_id: affiliateId
                })
            }
        })

        // If deferred mode, don't create lead event yet
        if (mode === 'deferred') {
            console.log('[track/lead] Deferred mode - Customer created, lead event deferred')

            return NextResponse.json({
                success: true,
                deferred: true,
                customer: {
                    id: customer.id,
                    externalId: customer.external_id,
                    name: customer.name,
                    email: customer.email
                }
            }, { status: 200, headers: corsHeaders })
        }

        // Check for duplicate lead event (same customer + event_name)
        const existingLead = await prisma.leadEvent.findUnique({
            where: {
                customer_id_event_name: {
                    customer_id: customer.id,
                    event_name: eventName
                }
            }
        })

        if (existingLead) {
            console.log('[track/lead] Duplicate lead event, returning existing')
            return NextResponse.json({
                success: true,
                duplicate: true,
                customer: {
                    id: customer.id,
                    externalId: customer.external_id,
                    name: customer.name,
                    email: customer.email
                },
                lead: {
                    id: existingLead.id,
                    eventName: existingLead.event_name
                }
            }, { status: 200, headers: corsHeaders })
        }

        // Create lead event
        const leadEvent = await prisma.leadEvent.create({
            data: {
                workspace_id: workspaceId,
                customer_id: customer.id,
                click_id: customer.click_id,
                link_id: customer.link_id,
                event_name: eventName,
                metadata: metadata || undefined
            }
        })

        // Record to Tinybird (async)
        console.log('[track/lead] 📊 About to record to Tinybird:', {
            mock_mode: process.env.TINYBIRD_MOCK_MODE,
            workspace_id: workspaceId,
            customer_id: customer.id,
            event_name: eventName
        })

        if (process.env.TINYBIRD_MOCK_MODE !== 'true') {
            // MUST await - otherwise Vercel terminates before fetch completes
            try {
                await recordLeadToTinybird({
                    timestamp: new Date().toISOString(),
                    workspace_id: workspaceId,
                    customer_id: customer.id,
                    customer_external_id: customerExternalId,
                    click_id: customer.click_id,
                    link_id: customer.link_id,
                    seller_id: customer.affiliate_id,
                    event_name: eventName,
                    metadata: JSON.stringify(metadata || {})
                })
                console.log('[track/lead] ✅ Tinybird lead recorded successfully')
            } catch (tinybirdError) {
                // Log but don't fail the request - lead is already in Prisma
                console.error('[track/lead] ❌ Tinybird error (non-blocking):', tinybirdError)
            }
        } else {
            console.log('[🦁 MOCK] Lead tracked:', {
                customer_id: customer.id,
                external_id: customerExternalId,
                click_id: customer.click_id,
                event_name: eventName
            })
        }

        return NextResponse.json({
            success: true,
            customer: {
                id: customer.id,
                externalId: customer.external_id,
                name: customer.name,
                email: customer.email,
                avatar: customer.avatar
            },
            lead: {
                id: leadEvent.id,
                eventName: leadEvent.event_name,
                clickId: leadEvent.click_id
            }
        }, { status: 200, headers: corsHeaders })

    } catch (error) {
        console.error('[track/lead] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: corsHeaders }
        )
    }
}

/**
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(request),
    })
}

function getCorsHeaders(request: NextRequest) {
    const customDomain = request.headers.get('x-custom-domain')
    const origin = customDomain ? `https://${customDomain}` : '*'

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true'
    }
}
