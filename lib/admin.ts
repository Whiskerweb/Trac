/**
 * Admin Configuration
 *
 * Centralized admin settings and utilities
 */

// =============================================
// ADMIN EMAIL WHITELIST
// =============================================
// Add admin emails here OR use ADMIN_EMAILS env var (comma-separated)
// Example env: ADMIN_EMAILS=lucas@traaaction.com,admin@traaaction.com

const DEFAULT_ADMIN_EMAILS = [
    'lucas@traaaction.com',
    'admin@traaaction.com',
    'lucas.music.manager@gmail.com',
    'contact.traaaction@gmail.com',
]

/**
 * Get list of admin emails
 * Reads from ADMIN_EMAILS env var if set, otherwise uses defaults
 */
export function getAdminEmails(): string[] {
    const envEmails = process.env.ADMIN_EMAILS
    if (envEmails) {
        return envEmails.split(',').map(e => e.trim().toLowerCase())
    }
    return DEFAULT_ADMIN_EMAILS.map(e => e.toLowerCase())
}

/**
 * Check if an email has admin access
 */
export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false
    const adminEmails = getAdminEmails()
    return adminEmails.includes(email.toLowerCase())
}

/**
 * Admin auth check for API routes
 * Returns the user if admin, throws otherwise
 */
export async function requireAdmin(supabaseUser: { email?: string | null } | null): Promise<void> {
    if (!supabaseUser?.email) {
        throw new AdminAuthError('Unauthorized', 401)
    }
    if (!isAdmin(supabaseUser.email)) {
        throw new AdminAuthError('Not authorized', 403)
    }
}

/**
 * Custom error for admin auth failures
 */
export class AdminAuthError extends Error {
    constructor(
        message: string,
        public statusCode: number
    ) {
        super(message)
        this.name = 'AdminAuthError'
    }
}
