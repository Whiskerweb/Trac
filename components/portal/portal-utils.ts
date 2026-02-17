/**
 * Portal subdomain utilities
 * Handles routing for both subdomain (slug.traaaction.com) and path-based (/join/slug) portals
 */

export function isPortalSubdomain(): boolean {
    if (typeof window === 'undefined') return false
    const h = window.location.hostname
    if (h.endsWith('.traaaction.com') &&
        !['www.traaaction.com', 'seller.traaaction.com', 'app.traaaction.com', 'traaaction.com'].includes(h)) {
        return true
    }
    if (h.endsWith('.localhost') &&
        !['seller.localhost', 'app.localhost'].includes(h) && h !== 'localhost') {
        return true
    }
    return false
}

/**
 * Builds the correct path for portal navigation.
 * On subdomain: portalPath('slug', '/dashboard') → '/dashboard'
 * On main domain: portalPath('slug', '/dashboard') → '/join/slug/dashboard'
 */
export function portalPath(workspaceSlug: string, path: string = ''): string {
    if (isPortalSubdomain()) return path || '/'
    return `/join/${workspaceSlug}${path}`
}
