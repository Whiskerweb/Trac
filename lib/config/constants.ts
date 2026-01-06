
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
export const CNAME_TARGET = 'cname.vercel-dns.com';

// =============================================
// DOMAIN CONFIGURATION
// =============================================

// Primary domain for the application (redirects for admin routes)
export const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN || 'traaaction.com';

// List of known primary/internal domains (not custom domains)
export const PRIMARY_DOMAINS = [
    'traaaction.com',
    'www.traaaction.com',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
];
