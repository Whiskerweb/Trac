'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { getActiveWorkspaceForUser } from '@/lib/workspace-context'
import {
    VERCEL_AUTH_TOKEN,
    VERCEL_PROJECT_ID,
    VERCEL_TEAM_ID,
    CNAME_TARGET,
} from '@/lib/config/constants'
import { redis } from '@/lib/redis'

// Cache TTL for Vercel API responses (seconds)
const DNS_CACHE_TTL = 60

function getDnsCacheKey(domain: string): string {
    return `dns_status:${domain}`
}

// =============================================
// TYPES
// =============================================

interface DomainResult {
    success: boolean
    error?: string
}

interface DomainData {
    id: string
    name: string
    verified: boolean
    createdAt: Date
    verifiedAt: Date | null
}

interface AddDomainResult extends DomainResult {
    domain?: DomainData
    cnameTarget?: string
}

interface VerifyDomainResult extends DomainResult {
    verified?: boolean
    configured?: boolean
    error?: string
    verification?: Array<{
        type: string
        domain: string
        value: string
        reason: string
    }>
    details?: {
        misconfigured: boolean
        conflicts: string[]
        acceptedChallenges: string[]
    }
}

interface VercelDomainResponse {
    name: string
    apexName: string
    projectId: string
    verified: boolean
    verification?: Array<{
        type: string
        domain: string
        value: string
        reason: string
    }>
    error?: {
        code: string
        message: string
    }
}

interface VercelDomainConfigResponse {
    configuredBy: string | null
    acceptedChallenges: string[]
    misconfigured: boolean
    conflicts: Array<{
        name: string
        type: string
        value: string
    }>
}

// =============================================
// VERCEL API HELPERS
// =============================================

const VERCEL_API_BASE = 'https://api.vercel.com'

function getVercelHeaders(): HeadersInit {
    return {
        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
    }
}

function getTeamQuery(): string {
    return VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
}

/**
 * Add a domain to Vercel project
 */
async function addDomainToVercel(domainName: string): Promise<{
    success: boolean
    error?: string
    data?: VercelDomainResponse
}> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        console.warn('[Domains] ⚠️ Vercel API not configured')
        return { success: true } // Allow domain addition without Vercel (for testing)
    }

    try {
        const url = `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'POST',
            headers: getVercelHeaders(),
            body: JSON.stringify({ name: domainName }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('[Domains] ❌ Vercel API error:', data)

            // Handle specific error codes
            if (data.error?.code === 'domain_already_in_use') {
                return { success: false, error: 'Ce domaine est déjà utilisé par un autre projet Vercel' }
            }
            if (data.error?.code === 'forbidden') {
                return { success: false, error: 'Token Vercel invalide ou permissions insuffisantes' }
            }

            return { success: false, error: data.error?.message || 'Erreur lors de l\'ajout du domaine' }
        }

        console.log('[Domains] ✅ Domain added to Vercel:', domainName)
        return { success: true, data }
    } catch (err) {
        console.error('[Domains] ❌ Vercel API request failed:', err)
        return { success: false, error: 'Erreur de connexion à l\'API Vercel' }
    }
}

/**
 * Check domain configuration status on Vercel
 */
async function checkDomainStatus(domainName: string, skipCache: boolean = false): Promise<{
    success: boolean
    configured: boolean
    verified: boolean
    error?: string
    details?: VercelDomainConfigResponse
}> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        console.warn('[Domains] ⚠️ Vercel API not configured')
        return { success: true, configured: false, verified: false }
    }

    try {
        const cacheKey = getDnsCacheKey(domainName)

        // Return cached result if available (unless skipping)
        if (!skipCache) {
            try {
                const cached = await redis.get<VercelDomainConfigResponse>(cacheKey)
                if (cached) {
                    console.log('[Domains] ⚡ Returning cached status for:', domainName)
                    const configured = cached.configuredBy !== null && !cached.misconfigured
                    const verified = configured && cached.conflicts.length === 0
                    return {
                        success: true,
                        configured,
                        verified,
                        details: cached,
                    }
                }
            } catch (err) {
                console.warn('[Domains] ⚠️ Redis cache read error:', err)
            }
        } else {
            console.log('[Domains] 🔄 Skipping cache for:', domainName)
        }

        const url = `${VERCEL_API_BASE}/v6/domains/${domainName}/config${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'GET',
            headers: getVercelHeaders(),
        })

        const data: VercelDomainConfigResponse = await res.json()

        if (!res.ok) {
            console.error('[Domains] ❌ Domain config check failed:', data)
            return { success: false, configured: false, verified: false, error: 'Impossible de vérifier le domaine' }
        }

        // Cache the result
        try {
            await redis.set(cacheKey, data, { ex: DNS_CACHE_TTL })
        } catch (err) {
            console.warn('[Domains] ⚠️ Redis cache set error:', err)
        }

        const configured = data.configuredBy !== null && !data.misconfigured
        const verified = configured && data.conflicts.length === 0

        console.log('[Domains] 🔍 Domain status:', domainName, { configured, verified, misconfigured: data.misconfigured })

        return {
            success: true,
            configured,
            verified,
            details: data,
        }
    } catch (err) {
        console.error('[Domains] ❌ Domain config check request failed:', err)
        return { success: false, configured: false, verified: false, error: 'Erreur de connexion' }
    }
}

/**
 * Get domain verification records (TXT) from Vercel
 */
async function getDomainVerification(domainName: string): Promise<{
    success: boolean
    verification?: Array<{ type: string; domain: string; value: string; reason: string }>
    error?: string
}> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        return { success: true, verification: [] }
    }

    try {
        const url = `${VERCEL_API_BASE}/v10/projects/${VERCEL_PROJECT_ID}/domains/${domainName}${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'GET',
            headers: getVercelHeaders(),
        })

        const data: VercelDomainResponse = await res.json()

        if (!res.ok) {
            console.error('[Domains] ❌ Domain verification fetch failed:', data)
            return { success: false, error: 'Impossible de récupérer les enregistrements de vérification' }
        }

        console.log('[Domains] 📄 Verification records for', domainName, ':', data.verification)

        return {
            success: true,
            verification: data.verification || [],
        }
    } catch (err) {
        console.error('[Domains] ❌ Domain verification fetch request failed:', err)
        return { success: false, error: 'Erreur de connexion' }
    }
}

/**
 * Remove a domain from Vercel project
 */
async function removeDomainFromVercel(domainName: string): Promise<{ success: boolean; error?: string }> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        console.warn('[Domains] ⚠️ Vercel API not configured')
        return { success: true }
    }

    try {
        const url = `${VERCEL_API_BASE}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domainName}${getTeamQuery()}`

        const res = await fetch(url, {
            method: 'DELETE',
            headers: getVercelHeaders(),
        })

        if (!res.ok && res.status !== 404) {
            const data = await res.json()
            console.error('[Domains] ❌ Vercel domain removal failed:', data)
            return { success: false, error: data.error?.message || 'Erreur lors de la suppression' }
        }

        console.log('[Domains] ✅ Domain removed from Vercel:', domainName)
        return { success: true }
    } catch (err) {
        console.error('[Domains] ❌ Vercel domain removal request failed:', err)
        return { success: false, error: 'Erreur de connexion' }
    }
}

// =============================================
// SERVER ACTIONS
// =============================================

/**
 * Get all domains for the current workspace
 */
export async function getDomains(): Promise<{
    success: boolean
    domains?: DomainData[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        const domains = await prisma.domain.findMany({
            where: { workspace_id: workspace.workspaceId },
            orderBy: { created_at: 'desc' },
        })

        return {
            success: true,
            domains: domains.map(d => ({
                id: d.id,
                name: d.name,
                verified: d.verified,
                createdAt: d.created_at,
                verifiedAt: d.verified_at,
            })),
        }
    } catch (error) {
        console.error('[Domains] ❌ getDomains error:', error)
        return { success: false, error: 'Erreur lors du chargement des domaines' }
    }
}

/**
 * Add a new domain to the workspace
 */
export async function addDomain(domainName: string): Promise<AddDomainResult> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    const cleanDomain = domainName.toLowerCase().trim()

    if (!domainRegex.test(cleanDomain)) {
        return { success: false, error: 'Format de domaine invalide' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        // Check if domain already exists globally
        const existing = await prisma.domain.findUnique({
            where: { name: cleanDomain },
        })

        if (existing) {
            if (existing.workspace_id === workspace.workspaceId) {
                return { success: false, error: 'Ce domaine est déjà ajouté à votre workspace' }
            }
            return { success: false, error: 'Ce domaine est déjà utilisé par un autre workspace' }
        }

        // 🔒 RESTRICTION: Check if workspace already has a domain (Limit: 1)
        const count = await prisma.domain.count({
            where: { workspace_id: workspace.workspaceId }
        })

        if (count >= 1) {
            return { success: false, error: 'Vous ne pouvez avoir qu\'un seul domaine personnalisé. Veuillez modifier ou supprimer l\'existant.' }
        }

        // Add to Vercel first
        const vercelResult = await addDomainToVercel(cleanDomain)

        if (!vercelResult.success) {
            return { success: false, error: vercelResult.error }
        }

        // Create in database
        const domain = await prisma.domain.create({
            data: {
                name: cleanDomain,
                workspace_id: workspace.workspaceId,
                verified: false,
            },
        })

        console.log('[Domains] ✅ Domain added:', cleanDomain, 'for workspace:', workspace.workspaceId)

        revalidatePath('/dashboard/domains')

        return {
            success: true,
            domain: {
                id: domain.id,
                name: domain.name,
                verified: domain.verified,
                createdAt: domain.created_at,
                verifiedAt: domain.verified_at,
            },
            cnameTarget: CNAME_TARGET,
        }
    } catch (error) {
        console.error('[Domains] ❌ addDomain error:', error)
        return { success: false, error: 'Erreur lors de l\'ajout du domaine' }
    }
}

/**
 * Update an existing domain (Change name -> Re-verify)
 */
export async function updateDomain(domainId: string, newName: string): Promise<AddDomainResult> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    const cleanDomain = newName.toLowerCase().trim()

    if (!domainRegex.test(cleanDomain)) {
        return { success: false, error: 'Format de domaine invalide' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        // Get existing domain to verify ownership
        const currentDomain = await prisma.domain.findFirst({
            where: { id: domainId, workspace_id: workspace.workspaceId }
        })

        if (!currentDomain) {
            return { success: false, error: 'Domaine introuvable' }
        }

        // If name is same, do nothing
        if (currentDomain.name === cleanDomain) {
            return {
                success: true, domain: {
                    id: currentDomain.id,
                    name: currentDomain.name,
                    verified: currentDomain.verified,
                    createdAt: currentDomain.created_at,
                    verifiedAt: currentDomain.verified_at,
                }
            }
        }

        // Check availability
        const existing = await prisma.domain.findUnique({
            where: { name: cleanDomain },
        })

        if (existing) {
            return { success: false, error: 'Ce domaine est déjà utilisé.' }
        }

        // 1. Remove OLD domain from Vercel
        await removeDomainFromVercel(currentDomain.name)

        // 2. Add NEW domain to Vercel
        const vercelResult = await addDomainToVercel(cleanDomain)

        if (!vercelResult.success) {
            return { success: false, error: vercelResult.error }
        }

        // 3. Update DB
        const updatedDomain = await prisma.domain.update({
            where: { id: domainId },
            data: {
                name: cleanDomain,
                verified: false,
                verified_at: null,
                created_at: new Date() // Reset creation date to restart verification flow visually if needed
            }
        })

        console.log('[Domains] ♻️ Domain updated:', currentDomain.name, '->', cleanDomain)

        revalidatePath('/dashboard/domains')

        return {
            success: true,
            domain: {
                id: updatedDomain.id,
                name: updatedDomain.name,
                verified: updatedDomain.verified,
                createdAt: updatedDomain.created_at,
                verifiedAt: updatedDomain.verified_at,
            },
            cnameTarget: CNAME_TARGET,
        }

    } catch (error) {
        console.error('[Domains] ❌ updateDomain error:', error)
        return { success: false, error: 'Erreur lors de la modification du domaine' }
    }
}

/**
 * Verify domain DNS configuration
 */
export async function verifyDomain(domainId: string, skipCache: boolean = false): Promise<VerifyDomainResult> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        // Get domain with workspace check
        const domain = await prisma.domain.findFirst({
            where: {
                id: domainId,
                workspace_id: workspace.workspaceId,
            },
        })

        if (!domain) {
            return { success: false, error: 'Domaine non trouvé' }
        }

        // Check status with Vercel
        const status = await checkDomainStatus(domain.name, skipCache)

        if (!status.success) {
            return { success: false, error: status.error }
        }

        // Get verification records if not verified
        let verification: Array<{ type: string; domain: string; value: string; reason: string }> = []
        if (!status.verified) {
            const verificationResult = await getDomainVerification(domain.name)
            if (verificationResult.success && verificationResult.verification) {
                verification = verificationResult.verification
            }
        }

        // Update database if verified
        if (status.verified && !domain.verified) {
            await prisma.domain.update({
                where: { id: domainId },
                data: {
                    verified: true,
                    verified_at: new Date(),
                },
            })

            console.log('[Domains] ✅ Domain verified:', domain.name)

            // Invalidate cache immediately to reflect new status
            await redis.del(getDnsCacheKey(domain.name))
        }

        revalidatePath('/dashboard/domains')

        return {
            success: true,
            verified: status.verified,
            configured: status.configured,
            verification,
            details: status.details ? {
                misconfigured: status.details.misconfigured,
                conflicts: status.details.conflicts.map(c => `${c.type}: ${c.name} → ${c.value}`),
                acceptedChallenges: status.details.acceptedChallenges,
            } : undefined,
        }
    } catch (error) {
        console.error('[Domains] ❌ verifyDomain error:', error)
        return { success: false, error: 'Erreur lors de la vérification' }
    }
}

/**
 * Remove a domain from the workspace
 */
export async function removeDomain(domainId: string): Promise<DomainResult> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        // Get domain with workspace check
        const domain = await prisma.domain.findFirst({
            where: {
                id: domainId,
                workspace_id: workspace.workspaceId,
            },
        })

        if (!domain) {
            return { success: false, error: 'Domaine non trouvé' }
        }

        // Remove from Vercel first
        const vercelResult = await removeDomainFromVercel(domain.name)

        if (!vercelResult.success) {
            // Log but don't block - domain might already be removed from Vercel
            console.warn('[Domains] ⚠️ Vercel removal failed:', vercelResult.error)
        }

        // Delete from database
        await prisma.domain.delete({
            where: { id: domainId },
        })

        console.log('[Domains] ✅ Domain removed:', domain.name)

        // 🔒 BLOCK MISSIONS: Archive all active missions when domain is deleted
        // This prevents broken affiliate links from being shared
        const archivedMissions = await prisma.mission.updateMany({
            where: {
                workspace_id: workspace.workspaceId,
                status: 'ACTIVE',
            },
            data: {
                status: 'ARCHIVED',
            },
        })

        if (archivedMissions.count > 0) {
            console.log(`[Domains] ⏸️ Archived ${archivedMissions.count} missions due to domain removal`)
        }

        revalidatePath('/dashboard/domains')
        revalidatePath('/dashboard/missions')

        return { success: true }
    } catch (error) {
        console.error('[Domains] ❌ removeDomain error:', error)
        return { success: false, error: 'Erreur lors de la suppression' }
    }
}

/**
 * Get the first verified domain for the current workspace
 * Used by integration page to generate first-party SDK snippet
 */
export async function getVerifiedDomainForWorkspace(): Promise<{
    success: boolean
    domain?: string
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { success: false, error: 'Non authentifié' }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()

        if (!workspace) {
            return { success: false, error: 'Aucun workspace actif' }
        }

        // Get first verified domain
        const domain = await prisma.domain.findFirst({
            where: {
                workspace_id: workspace.workspaceId,
                verified: true,
            },
            orderBy: { created_at: 'asc' }, // Oldest verified domain first (primary)
        })

        if (!domain) {
            return { success: true, domain: undefined }
        }

        return {
            success: true,
            domain: domain.name,
        }
    } catch (error) {
        console.error('[Domains] ❌ getVerifiedDomainForWorkspace error:', error)
        return { success: false, error: 'Erreur lors du chargement' }
    }
}

/**
 * Check if the workspace has a verified domain (Gatekeeper check)
 * Returns a simple boolean for UI use
 */
export async function getWorkspaceDNSStatus(): Promise<{
    success: boolean
    hasVerifiedDomain: boolean
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, hasVerifiedDomain: false }
    }

    try {
        const workspace = await getActiveWorkspaceForUser()
        if (!workspace) return { success: true, hasVerifiedDomain: false }

        const domain = await prisma.domain.findFirst({
            where: {
                workspace_id: workspace.workspaceId,
                verified: true
            },
            select: { id: true }
        })

        return { success: true, hasVerifiedDomain: !!domain }
    } catch (error) {
        console.error('[Domains] ❌ getWorkspaceDNSStatus error:', error)
        return { success: false, hasVerifiedDomain: false }
    }
}
