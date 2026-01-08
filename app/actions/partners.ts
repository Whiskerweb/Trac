'use server'

import { prisma } from '@/lib/db'

// =============================================
// SHADOW PARTNER ONBOARDING (Dub.co Style)
// =============================================

/**
 * Generate a unique tenant ID for a partner
 */
function generateTenantId(programId: string | null, email: string): string {
    const prefix = programId ? programId.slice(0, 4) : 'glob'
    const hash = Buffer.from(`${programId || 'global'}:${email}`).toString('base64url')
    return `ptn_${prefix}_${hash.slice(0, 16)}`
}

interface CreateShadowPartnerParams {
    programId: string
    email: string
    name?: string
    tenantId?: string // Optional - will be generated if not provided
}

/**
 * Create a shadow partner (no account required)
 * Idempotent: Returns existing partner if already exists
 * 
 * This allows startups to pre-register affiliates before they create accounts
 */
export async function createShadowPartner(params: CreateShadowPartnerParams): Promise<{
    success: boolean
    partner?: Awaited<ReturnType<typeof prisma.partner.findUnique>>
    isNew?: boolean
    error?: string
}> {
    const { programId, email, name, tenantId } = params

    // Validate email
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail.includes('@')) {
        return { success: false, error: 'Invalid email address' }
    }

    try {
        // Check if partner already exists for this program
        const existing = await prisma.partner.findUnique({
            where: {
                program_id_email: {
                    program_id: programId,
                    email: normalizedEmail
                }
            }
        })

        if (existing) {
            console.log(`[Partner] ℹ️ Partner already exists for ${normalizedEmail} in program ${programId}`)
            return { success: true, partner: existing, isNew: false }
        }

        // Generate tenant ID if not provided
        const finalTenantId = tenantId || generateTenantId(programId, normalizedEmail)

        // Create shadow partner (no user_id)
        const partner = await prisma.partner.create({
            data: {
                program_id: programId,
                email: normalizedEmail,
                name,
                tenant_id: finalTenantId,
                status: 'PENDING', // Needs approval
                user_id: null // Shadow user - no account yet
            }
        })

        console.log(`[Partner] ✅ Created shadow partner ${partner.id} for ${normalizedEmail}`)

        return { success: true, partner, isNew: true }

    } catch (error) {
        console.error('[Partner] ❌ Failed to create shadow partner:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Create a GLOBAL partner (not tied to any program initially)
 * Used when a user signs up directly as a Partner
 */
export async function createGlobalPartner(params: { userId: string, email: string, name?: string }): Promise<{
    success: boolean
    partner?: Awaited<ReturnType<typeof prisma.partner.findFirst>>
    error?: string
}> {
    const { userId, email, name } = params
    const normalizedEmail = email.toLowerCase().trim()

    try {
        // Check if already has a partner record (any kind)
        const existing = await prisma.partner.findFirst({
            where: { user_id: userId }
        })

        if (existing) {
            return { success: true, partner: existing }
        }

        // Check if there are pending shadow partners to claim
        // If so, we claim them instead of creating a new empty one
        const claimResult = await claimPartners(userId, normalizedEmail)
        if (claimResult.success && claimResult.claimed > 0 && claimResult.partners) {
            return { success: true, partner: claimResult.partners[0] }
        }

        // Create new global partner
        const tenantId = generateTenantId(null, normalizedEmail)

        // Robustness: Check if partner with this tenant_id already exists (dangling from deleted user?)
        const existingByTenant = await prisma.partner.findUnique({
            where: { tenant_id: tenantId }
        })

        let partner;

        if (existingByTenant) {
            console.log(`[Partner] ⚠️ Found existing partner ${existingByTenant.id} for tenant ${tenantId} - Reclaiming.`)
            partner = await prisma.partner.update({
                where: { id: existingByTenant.id },
                data: {
                    user_id: userId,
                    status: 'APPROVED', // Reactivate if it was banned/pending? Safest is to ensure it's approved.
                }
            })
            return { success: true, partner }
        }

        partner = await prisma.partner.create({
            data: {
                program_id: null, // Global partner
                email: normalizedEmail,
                name: name || email.split('@')[0],
                tenant_id: tenantId,
                status: 'APPROVED', // Auto-approve global partners (they have no program to be banned from yet)
                user_id: userId,
                onboarding_step: 0
            }
        })

        // Initialize empty balance
        await prisma.partnerBalance.create({
            data: { partner_id: partner.id }
        })

        // Create initial profile
        await prisma.partnerProfile.create({
            data: { partner_id: partner.id }
        })

        console.log(`[Partner] ✅ Created Global Partner ${partner.id} for user ${userId}`)
        return { success: true, partner }

    } catch (error) {
        console.error('[Partner] ❌ Failed to create global partner:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Claim shadow partners when a user signs up
 * 
 * Called after successful authentication to link any pre-existing
 * partner records with the new user account
 * 
 * @param userId - The authenticated user's ID
 * @param email - The user's verified email
 * @returns All partner records now linked to this user
 */
export async function claimPartners(userId: string, email: string): Promise<{
    success: boolean
    claimed: number
    partners?: Awaited<ReturnType<typeof prisma.partner.findMany>>
    error?: string
}> {
    const normalizedEmail = email.toLowerCase().trim()

    try {
        // Find all shadow partners with this email
        const shadowPartners = await prisma.partner.findMany({
            where: {
                email: normalizedEmail,
                user_id: null // Only unclaimed
            }
        })

        if (shadowPartners.length === 0) {
            console.log(`[Partner] ℹ️ No shadow partners to claim for ${normalizedEmail}`)
            return { success: true, claimed: 0, partners: [] }
        }

        // Claim all shadow partners
        await prisma.partner.updateMany({
            where: {
                email: normalizedEmail,
                user_id: null
            },
            data: {
                user_id: userId
            }
        })

        // Get updated records
        const claimedPartners = await prisma.partner.findMany({
            where: {
                email: normalizedEmail,
                user_id: userId
            },
            include: { Program: true }
        })

        console.log(`[Partner] ✅ User ${userId} claimed ${claimedPartners.length} partner records`)

        return {
            success: true,
            claimed: claimedPartners.length,
            partners: claimedPartners
        }

    } catch (error) {
        console.error('[Partner] ❌ Failed to claim partners:', error)
        return {
            success: false,
            claimed: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Approve a partner application
 */
export async function approvePartner(partnerId: string): Promise<{
    success: boolean
    partner?: Awaited<ReturnType<typeof prisma.partner.findUnique>>
    error?: string
}> {
    try {
        const partner = await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'APPROVED' }
        })

        console.log(`[Partner] ✅ Approved partner ${partnerId}`)
        return { success: true, partner }

    } catch (error) {
        console.error('[Partner] ❌ Failed to approve partner:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Ban a partner from the program
 */
export async function banPartner(partnerId: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'BANNED' }
        })

        console.log(`[Partner] 🚫 Banned partner ${partnerId}`)
        return { success: true }

    } catch (error) {
        console.error('[Partner] ❌ Failed to ban partner:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get partner by user ID
 */
export async function getPartnerByUserId(userId: string): Promise<Awaited<ReturnType<typeof prisma.partner.findFirst>> | null> {
    return prisma.partner.findFirst({
        where: { user_id: userId },
        include: {
            Program: true,
            Commissions: {
                orderBy: { created_at: 'desc' },
                take: 10
            }
        }
    })
}

/**
 * Get partner dashboard data
 */
export async function getPartnerDashboard(): Promise<{
    success: boolean
    partner?: Awaited<ReturnType<typeof prisma.partner.findFirst>>
    balance?: Awaited<ReturnType<typeof prisma.partnerBalance.findUnique>>
    stats?: {
        totalEarned: number
        pendingAmount: number
        dueAmount: number
        paidAmount: number
        conversionCount: number
    }
    error?: string
}> {
    try {
        const { createClient } = await import('@/utils/supabase/server')
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const userId = user.id

        // Try to find a partner record
        // Prioritize one that has a program if multiples exist
        const partner = await prisma.partner.findFirst({
            where: { user_id: userId },
            include: { Program: true }
        })

        if (!partner) {
            return {
                success: false,
                error: 'Partner not found.'
            }
        }

        // Get balance
        let balance = await prisma.partnerBalance.findUnique({
            where: { partner_id: partner.id }
        })

        if (!balance) {
            // Lazy create balance if missing
            balance = await prisma.partnerBalance.create({
                data: { partner_id: partner.id }
            })
        }

        // Get commission stats
        const commissions = await prisma.commission.groupBy({
            by: ['status'],
            where: { partner_id: partner.id },
            _sum: { commission_amount: true },
            _count: true
        })

        const stats = {
            totalEarned: 0,
            pendingAmount: 0,
            dueAmount: 0,
            paidAmount: 0,
            conversionCount: 0
        }

        for (const c of commissions) {
            const amount = c._sum.commission_amount || 0
            stats.totalEarned += amount
            stats.conversionCount += c._count

            if (c.status === 'PENDING') stats.pendingAmount = amount
            else if (c.status === 'DUE') stats.dueAmount = amount
            else if (c.status === 'PAID') stats.paidAmount = amount
        }

        return {
            success: true,
            partner,
            balance,
            stats
        }

    } catch (error) {
        console.error('[Partner] ❌ Failed to get dashboard:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get ALL partner programs for the current user
 * Returns list of programs with stats for the dashboard grid
 */
export async function getAllPartnerPrograms(): Promise<{
    success: boolean
    programs?: Array<{
        partner: Awaited<ReturnType<typeof prisma.partner.findFirst>>
        stats: {
            totalEarned: number
            pendingAmount: number
            dueAmount: number
            paidAmount: number
        }
    }>
    error?: string
}> {
    try {
        const { createClient } = await import('@/utils/supabase/server')
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        const partners = await prisma.partner.findMany({
            where: { user_id: user.id },
            include: { Program: true }
        })

        if (!partners.length) {
            return { success: true, programs: [] }
        }

        const partnerIds = partners.map(p => p.id)

        // Aggregate commissions by partner_id and status
        const commissionStats = await prisma.commission.groupBy({
            by: ['partner_id', 'status'],
            where: { partner_id: { in: partnerIds } },
            _sum: { commission_amount: true }
        })

        // Map data to result structure
        const result = partners.map(partner => {
            const partnerStats = commissionStats.filter(s => s.partner_id === partner.id)

            const stats = {
                totalEarned: 0,
                pendingAmount: 0,
                dueAmount: 0,
                paidAmount: 0
            }

            for (const s of partnerStats) {
                const amount = s._sum.commission_amount || 0
                stats.totalEarned += amount
                if (s.status === 'PENDING') stats.pendingAmount = amount
                else if (s.status === 'DUE') stats.dueAmount = amount
                else if (s.status === 'PAID') stats.paidAmount = amount
            }

            return {
                partner,
                stats
            }
        })

        return { success: true, programs: result }

    } catch (error) {
        console.error('[Partner] ❌ Failed to get all programs:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get commission history for the current partner
 * Used in the wallet page to display transaction history
 */
export async function getPartnerCommissions(limit: number = 50): Promise<{
    success: boolean
    commissions?: Array<{
        id: string
        sale_id: string
        gross_amount: number
        commission_amount: number
        status: string
        created_at: Date
        matured_at: Date | null
    }>
    error?: string
}> {
    try {
        const { createClient } = await import('@/utils/supabase/server')
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Find partner for this user
        const partner = await prisma.partner.findFirst({
            where: { user_id: user.id }
        })

        if (!partner) {
            return { success: false, error: 'Partner not found' }
        }

        // Fetch commissions
        const commissions = await prisma.commission.findMany({
            where: { partner_id: partner.id },
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true,
                sale_id: true,
                gross_amount: true,
                commission_amount: true,
                status: true,
                created_at: true,
                matured_at: true
            }
        })

        return { success: true, commissions }

    } catch (error) {
        console.error('[Partner] ❌ Failed to get commissions:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}
