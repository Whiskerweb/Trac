'use server'

import {
    VERCEL_AUTH_TOKEN,
    VERCEL_PROJECT_ID,
    VERCEL_TEAM_ID,
} from '@/lib/config/constants'

/**
 * Diagnostic function to check Vercel API configuration
 * Can be called from UI to verify setup
 */
export async function checkVercelConfig(): Promise<{
    configured: boolean
    details: {
        hasAuthToken: boolean
        hasProjectId: boolean
        hasTeamId: boolean
        projectIdPreview?: string
    }
    testResult?: {
        success: boolean
        projectName?: string
        error?: string
    }
}> {
    const hasAuthToken = !!VERCEL_AUTH_TOKEN
    const hasProjectId = !!VERCEL_PROJECT_ID
    const hasTeamId = !!VERCEL_TEAM_ID

    const details = {
        hasAuthToken,
        hasProjectId,
        hasTeamId,
        projectIdPreview: VERCEL_PROJECT_ID ? `${VERCEL_PROJECT_ID.slice(0, 12)}...` : undefined,
    }

    if (!hasAuthToken || !hasProjectId) {
        return {
            configured: false,
            details,
        }
    }

    // Test API connection by fetching project info
    try {
        const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
        const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}${teamQuery}`

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
            },
        })

        if (res.ok) {
            const data = await res.json()
            return {
                configured: true,
                details,
                testResult: {
                    success: true,
                    projectName: data.name,
                },
            }
        } else {
            const errorData = await res.json()
            return {
                configured: true,
                details,
                testResult: {
                    success: false,
                    error: errorData.error?.message || `HTTP ${res.status}`,
                },
            }
        }
    } catch (err) {
        return {
            configured: true,
            details,
            testResult: {
                success: false,
                error: err instanceof Error ? err.message : 'Connection failed',
            },
        }
    }
}

/**
 * Force add an existing domain to Vercel (for fixing missing domains)
 */
export async function forceAddDomainToVercel(domainName: string): Promise<{
    success: boolean
    error?: string
    data?: unknown
}> {
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
        return {
            success: false,
            error: 'VERCEL_AUTH_TOKEN ou VERCEL_PROJECT_ID non configuré'
        }
    }

    const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
    const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`

    console.log('[Vercel Diagnostic] Force adding domain:', domainName)
    console.log('[Vercel Diagnostic] URL:', url)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: domainName }),
        })

        const data = await res.json()

        console.log('[Vercel Diagnostic] Response:', {
            status: res.status,
            ok: res.ok,
            data,
        })

        if (!res.ok) {
            return {
                success: false,
                error: data.error?.message || `HTTP ${res.status}`,
                data,
            }
        }

        return { success: true, data }
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Request failed',
        }
    }
}
