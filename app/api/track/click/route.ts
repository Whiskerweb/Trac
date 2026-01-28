import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { prisma } from '@/lib/db'

/**
 * POST /api/track/click
 * 
 * Click tracking endpoint (Dub Partners Style)
 * 
 * Two modes:
 * 1. Server-side: Called by middleware during shortlink redirect
 * 2. Client-side: Called by trac.js for query param tracking (e.g., ?via=john)
 * 
 * Body: { key: "john", domain?: "client.com", click_id?: "clk_xxx" }
 * 
 * Returns: { clickId, partner, discount } for client-side cookie storage
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request)

    try {
        const body = await request.json()
        const { key, domain, click_id } = body

        // Extract workspace context from middleware headers (First-Party)
        const workspaceId = request.headers.get('x-workspace-id')
        const customDomain = request.headers.get('x-custom-domain')
        const isFirstParty = request.headers.get('x-first-party') === 'true'

        // Use provided click_id or generate new one
        const clickId = click_id || generateClickId()

        // ========================================
        // PARTNER & DISCOUNT LOOKUP (Dub Style)
        // ========================================
        let partner: { id: string; name: string; image?: string } | null = null
        let discount: { id: string; amount: number; type: string; couponId?: string } | null = null
        let affiliateId: string | null = null
        let linkId: string | null = null
        let resolvedWorkspaceId = workspaceId

        if (key) {
            const lookupDomain = domain || customDomain || 'traaaction.com'
            const redisKey = `link:${lookupDomain}:${key}`

            try {
                // First: try Redis for shortlink lookup
                const linkData = await redis.get<{ linkId: string; affiliateId?: string; workspaceId?: string }>(redisKey)
                if (linkData) {
                    linkId = linkData.linkId
                    affiliateId = linkData.affiliateId || null
                    resolvedWorkspaceId = linkData.workspaceId || workspaceId
                }
            } catch (e) {
                console.error('[track/click] Redis lookup failed:', e)
            }

            // Second: lookup ShortLink by slug if no Redis hit, then get Partner
            if (!affiliateId && key) {
                try {
                    // First try to find the ShortLink by slug
                    const shortLink = await prisma.shortLink.findUnique({
                        where: { slug: key }
                    })

                    if (shortLink && shortLink.affiliate_id) {
                        affiliateId = shortLink.affiliate_id
                        resolvedWorkspaceId = shortLink.workspace_id

                        // Now lookup the Seller to get name/image
                        const sellerRecord = await prisma.seller.findUnique({
                            where: { id: shortLink.affiliate_id },
                            include: { Profile: true }
                        })

                        if (sellerRecord) {
                            partner = {
                                id: sellerRecord.id,
                                name: sellerRecord.name || sellerRecord.email?.split('@')[0] || 'Seller',
                                image: sellerRecord.Profile?.website_url || undefined
                            }
                        }
                    }
                } catch (e) {
                    console.error('[track/click] ShortLink/Partner lookup failed:', e)
                }
            }

            // Third: lookup Discount for the program/workspace
            if (resolvedWorkspaceId) {
                try {
                    const discountRecord = await prisma.discount.findUnique({
                        where: {
                            workspace_id: resolvedWorkspaceId,
                            active: true
                        }
                    })

                    if (discountRecord) {
                        discount = {
                            id: discountRecord.id,
                            amount: discountRecord.amount,
                            type: discountRecord.type,
                            couponId: process.env.NODE_ENV === 'production'
                                ? discountRecord.coupon_id || undefined
                                : discountRecord.coupon_test_id || undefined
                        }
                    }
                } catch (e) {
                    console.error('[track/click] Discount lookup failed:', e)
                }
            }
        }

        // Log in mock mode
        if (process.env.TINYBIRD_MOCK_MODE === 'true') {
            console.log('[🦁 MOCK] Click tracked:', {
                click_id: clickId,
                key,
                workspace_id: resolvedWorkspaceId,
                affiliate_id: affiliateId,
                partner: partner?.name,
                discount: discount?.amount,
                first_party: isFirstParty
            })

            // Store in Redis even in mock mode (for Lead attribution testing)
            if (clickId && (linkId || affiliateId)) {
                try {
                    await redis.set(
                        `click:${clickId}`,
                        { linkId, affiliateId, workspaceId: resolvedWorkspaceId },
                        { ex: 90 * 24 * 60 * 60 }
                    )
                    console.log(`[🦁 MOCK] ✅ Stored click:${clickId} in Redis`)
                } catch (e) {
                    console.error('[🦁 MOCK] Failed to store click in Redis:', e)
                }
            }

            const response = NextResponse.json(
                {
                    success: true,
                    clickId,
                    partner,
                    discount,
                    mock: true
                },
                { status: 200, headers: corsHeaders }
            )

            // Set cookies
            setClickCookie(response, clickId, customDomain)
            if (partner || discount) {
                setPartnerDataCookie(response, { clickId, partner, discount }, customDomain)
            }
            return response
        }

        // Production: Record to Tinybird
        // Import from constants for consistency with other routes
        const tinybirdToken = process.env.TINYBIRD_API_KEY || process.env.TINYBIRD_ADMIN_TOKEN
        const tinybirdHost = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co'

        if (tinybirdToken) {
            // Map country ISO code to name
            const countryCode = request.headers.get('x-vercel-ip-country') || ''
            const countryName = getCountryName(countryCode)

            // City comes URL-encoded from Vercel
            const rawCity = request.headers.get('x-vercel-ip-city') || 'unknown'
            const cityName = rawCity !== 'unknown' ? decodeURIComponent(rawCity) : 'unknown'

            const clickData = {
                timestamp: new Date().toISOString(),
                workspace_id: resolvedWorkspaceId || 'unknown',
                click_id: clickId,
                link_id: linkId,
                affiliate_id: affiliateId,
                key: key || null,
                source: isFirstParty ? 'first_party' : 'client_side',
                country: countryName,
                city: cityName,
                device: getDeviceType(request.headers.get('user-agent') || ''),
                user_agent: request.headers.get('user-agent') || 'unknown'
            }

            await fetch(`${tinybirdHost}/v0/events?name=clicks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tinybirdToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clickData),
            }).catch(e => console.error('[track/click] Tinybird error:', e))
        }

        // ========================================
        // CRITICAL: Store click data in Redis for Lead attribution
        // Lead tracking looks up click:{clickId} to get linkId & affiliateId
        // Expires in 90 days (same as cookie)
        // ========================================
        if (clickId && (linkId || affiliateId)) {
            try {
                await redis.set(
                    `click:${clickId}`,
                    { linkId, affiliateId, workspaceId: resolvedWorkspaceId },
                    { ex: 90 * 24 * 60 * 60 } // 90 days
                )
                console.log(`[track/click] ✅ Stored click:${clickId} in Redis for Lead attribution`)
            } catch (e) {
                console.error('[track/click] ⚠️ Failed to store click in Redis:', e)
            }
        }

        const response = NextResponse.json(
            {
                success: true,
                clickId,
                partner,
                discount
            },
            { status: 200, headers: corsHeaders }
        )

        // Set cookies
        setClickCookie(response, clickId, customDomain)
        if (partner || discount) {
            setPartnerDataCookie(response, { clickId, partner, discount }, customDomain)
        }
        return response

    } catch (error) {
        console.error('[track/click] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal error' },
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

function generateClickId(): string {
    const timestamp = Math.floor(Date.now() / 1000)
    let random = ''
    for (let i = 0; i < 16; i++) {
        random += Math.floor(Math.random() * 16).toString(16)
    }
    return `clk_${timestamp}_${random}`
}

function setClickCookie(response: NextResponse, clickId: string, customDomain?: string | null) {
    const domain = extractRootDomain(customDomain)

    response.cookies.set({
        name: 'trac_click_id',
        value: clickId,
        httpOnly: false,  // JS accessible for Stripe injection
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,  // 90 days
        path: '/',
        ...(domain && { domain })
    })
}

function setPartnerDataCookie(
    response: NextResponse,
    data: { clickId: string; partner: any; discount: any },
    customDomain?: string | null
) {
    const domain = extractRootDomain(customDomain)

    response.cookies.set({
        name: 'trac_partner_data',
        value: JSON.stringify(data),
        httpOnly: false,  // JS accessible for UI
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90,  // 90 days
        path: '/',
        ...(domain && { domain })
    })
}

function extractRootDomain(customDomain?: string | null): string | undefined {
    if (!customDomain) return undefined
    const parts = customDomain.split('.')
    if (parts.length >= 2) {
        return '.' + parts.slice(-2).join('.')
    }
    return undefined
}

function getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|ipod/.test(ua)) return 'mobile'
    if (/tablet|ipad/.test(ua)) return 'tablet'
    return 'desktop'
}

// ISO country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
    'FR': 'France',
    'US': 'United States',
    'DE': 'Germany',
    'GB': 'United Kingdom',
    'ES': 'Spain',
    'IT': 'Italy',
    'CA': 'Canada',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'JP': 'Japan',
    'AU': 'Australia',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'IN': 'India',
    'CN': 'China',
    'KR': 'South Korea',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'AE': 'United Arab Emirates',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'AT': 'Austria',
    'PL': 'Poland',
    'PT': 'Portugal',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'ZA': 'South Africa',
    'IL': 'Israel',
    'RU': 'Russia',
    'TR': 'Turkey',
    'TH': 'Thailand',
    'ID': 'Indonesia',
    'MY': 'Malaysia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
}

function getCountryName(isoCode: string): string {
    return COUNTRY_NAMES[isoCode.toUpperCase()] || isoCode || 'unknown'
}
