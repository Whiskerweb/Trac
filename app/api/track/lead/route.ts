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
            // PRIORITY 1: Try Redis (fast)
            try {
                const { redis } = await import('@/lib/redis')
                const clickData = await redis.get<{ linkId: string; affiliateId?: string }>(`click:${resolvedClickId}`)
                if (clickData) {
                    linkId = clickData.linkId
                    affiliateId = clickData.affiliateId || null
                    console.log(`[track/lead] ✅ Redis hit: linkId=${linkId}, affiliateId=${affiliateId}`)
                }
            } catch (e) {
                console.log('[track/lead] ⚠️ Redis lookup failed:', e)
            }

            // ✅ FIXED: PRIORITY 2: Fallback to Tinybird if Redis miss
            if (!linkId && resolvedClickId) {
                console.log(`[track/lead] 🔄 Redis miss, falling back to Tinybird for clickId=${resolvedClickId}`)

                try {
                    const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'
                    const TINYBIRD_ADMIN_TOKEN = process.env.TINYBIRD_ADMIN_TOKEN

                    const tinybirdSQL = `
                        SELECT link_id, affiliate_id, workspace_id
                        FROM clicks
                        WHERE click_id = '${resolvedClickId}'
                        LIMIT 1
                        FORMAT JSON
                    `

                    const response = await fetch(`${TINYBIRD_HOST}/v0/sql`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${TINYBIRD_ADMIN_TOKEN}`,
                            'Content-Type': 'text/plain',
                        },
                        body: tinybirdSQL,
                        signal: AbortSignal.timeout(5000)  // 5s timeout
                    })

                    if (response.ok) {
                        const result = await response.json()
                        if (result.data?.[0]) {
                            linkId = result.data[0].link_id || null
                            affiliateId = result.data[0].affiliate_id || null
                            console.log(`[track/lead] ✅ Tinybird recovery: linkId=${linkId}, affiliateId=${affiliateId}`)
                        } else {
                            console.log(`[track/lead] ⚠️ Tinybird: No click found for clickId=${resolvedClickId}`)
                        }
                    } else {
                        console.error(`[track/lead] ❌ Tinybird error: ${response.status}`)
                    }
                } catch (tinybirdError) {
                    console.error('[track/lead] ❌ Tinybird fallback failed:', tinybirdError)
                    // Continue without link data (will be orphaned)
                }
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

        // =============================================
        // CREATE COMMISSION FOR LEAD MISSIONS
        // =============================================
        // If this lead is attributed to a link that belongs to a LEAD mission,
        // we create a commission for the seller
        if (leadEvent && customer.link_id && customer.affiliate_id) {
            try {
                // 1. Get mission via link → enrollment chain
                const shortLink = await prisma.shortLink.findUnique({
                    where: { id: customer.link_id },
                    include: {
                        MissionEnrollment: {
                            include: {
                                Mission: {
                                    select: {
                                        id: true,
                                        workspace_id: true,
                                        reward_type: true,
                                        reward_amount: true,
                                        reward_structure: true,
                                        status: true
                                    }
                                }
                            }
                        }
                    }
                })

                const mission = shortLink?.MissionEnrollment?.Mission

                // 2. Only create commission if LEAD mission and ACTIVE
                if (mission?.reward_type === 'LEAD' && mission.status === 'ACTIVE') {
                    // 3. Get seller from affiliate_id (user_id)
                    const seller = await prisma.seller.findFirst({
                        where: { user_id: customer.affiliate_id }
                    })

                    if (seller) {
                        // 4. Build reward string (e.g., "5€")
                        const rewardString = `${mission.reward_amount}€`

                        // 5. Create commission
                        const { createCommission } = await import('@/lib/commission/engine')

                        const commissionResult = await createCommission({
                            partnerId: seller.id,
                            programId: mission.workspace_id,
                            saleId: leadEvent.id,  // Use LeadEvent ID for deduplication
                            linkId: customer.link_id,
                            grossAmount: 0,         // LEAD = no revenue
                            htAmount: 0,            // LEAD = no HT (triggers LEAD logic in engine)
                            netAmount: 0,
                            stripeFee: 0,
                            taxAmount: 0,
                            missionReward: rewardString,
                            currency: 'EUR',
                            holdDays: 30            // Same as sales
                        })

                        if (commissionResult.success) {
                            console.log(`[track/lead] 💰 Commission created for LEAD mission: ${mission.id}, seller: ${seller.id}, amount: ${commissionResult.commission?.commission_amount}`)
                        } else {
                            console.error(`[track/lead] ⚠️ Failed to create commission: ${commissionResult.error}`)
                        }
                    } else {
                        console.log(`[track/lead] ℹ️ No seller found for affiliate_id: ${customer.affiliate_id}`)
                    }
                } else if (mission) {
                    console.log(`[track/lead] ℹ️ Mission ${mission.id} is not a LEAD type (${mission.reward_type}) or not ACTIVE (${mission.status})`)
                }
            } catch (commissionError) {
                // Log but don't fail the request - lead is already tracked
                console.error('[track/lead] ⚠️ Error creating commission:', commissionError)
            }
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
