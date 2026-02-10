
// =============================================
// TINYBIRD CONFIGURATION
// =============================================

export const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.europe-west2.gcp.tinybird.co';
export const TINYBIRD_TOKEN = process.env.TINYBIRD_API_KEY || process.env.TINYBIRD_ADMIN_TOKEN;
export const IS_MOCK_MODE = process.env.TINYBIRD_MOCK_MODE === 'true';

// =============================================
// VERCEL API CONFIGURATION (Custom Domains)
// =============================================

export const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
export const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
export const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional, for team projects

// CNAME target for custom domains - users point their domain here
export const CNAME_TARGET = 'cname.traaaction.com';

// =============================================
// DOMAIN CONFIGURATION
// =============================================

// Primary domain for the application (redirects for admin routes)
export const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'traaaction.com';

// Seller subdomain (biface architecture)
export const SELLER_SUBDOMAIN = 'seller.traaaction.com';
export const SELLER_SUBDOMAIN_DEV = 'seller.localhost';
export const APP_SUBDOMAIN = 'app.traaaction.com';

// List of known primary/internal domains (not custom domains)
export const PRIMARY_DOMAINS = [
    'traaaction.com',
    'www.traaaction.com',
    'seller.traaaction.com',
    'app.traaaction.com',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
];

// =============================================
// API SCOPES CONFIGURATION
// =============================================

/**
 * Available API scopes for granular permission control
 * Partners can only be granted a subset of these scopes
 */
export const API_SCOPES = [
    'links:read',      // Read short links
    'links:write',     // Create/update short links
    'partners:read',   // Read partner data
    'partners:write',  // Create/update partners
    'analytics:read',  // Read analytics data
    'conversions:write', // Record conversions
    'admin:*',         // Full admin access (NEVER grant to partners)
] as const;

export type ApiScope = typeof API_SCOPES[number];

/**
 * Scopes that are safe to grant to partner API keys
 * Admin scopes are explicitly excluded
 */
export const PARTNER_SAFE_SCOPES: ApiScope[] = [
    'links:read',
    'analytics:read',
];

/**
 * Default scopes for new API keys
 */
export const DEFAULT_API_SCOPES: ApiScope[] = [
    'analytics:read',
    'links:write',
];

// =============================================
// ADMIN CONFIGURATION
// =============================================

/**
 * List of admin email addresses
 * These users have access to /admin/* routes
 */
export const ADMIN_EMAILS = [
    'lucas@traaaction.com',
    'admin@traaaction.com',
    // Add more admin emails as needed
];

