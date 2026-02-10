import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Tinybird API URL with fallback for robustness
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.tinybird.co';

console.log('📢 Tinybird Proxy Target:', TINYBIRD_HOST);

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites are processed before pages/public files
      // NOTE: Subdomain rewrites (seller, app) are handled by middleware
      // which correctly excludes /_next, /api, etc. beforeFiles rewrites
      // would also rewrite static assets, causing 404s on JS/CSS chunks.
      beforeFiles: [],
      // afterFiles rewrites run after pages check but before fallback
      afterFiles: [
        // Anti-adblock proxy: /_trac/api/* -> /api/*
        // This allows the SDK to send requests through a "cloaked" path
        // that is less likely to be blocked by ad blockers
        {
          source: "/_trac/api/:path*",
          destination: "/api/:path*",
        },
        // Tinybird analytics proxy
        {
          source: "/api/analytics/:path*",
          destination: `${TINYBIRD_HOST}/:path*`,
        },
      ],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
