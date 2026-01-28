import type { NextConfig } from "next";

// Tinybird API URL with fallback for robustness
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.tinybird.co';

console.log('📢 Tinybird Proxy Target:', TINYBIRD_HOST);

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites are processed before pages/public files
      beforeFiles: [
        // =============================================
        // WHITE-LABEL PORTAL REWRITES
        // Seller portals serve Traaaction content while preserving their URL
        // =============================================
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'partners.cardz.dev' }],
          destination: '/seller/:path*',
        },
        // Add more white-label domains here:
        // {
        //   source: '/:path*',
        //   has: [{ type: 'host', value: 'affiliate.otherbrand.com' }],
        //   destination: '/seller/:path*',
        // },
      ],
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
    ],
  },
};

export default nextConfig;
// Force rebuild
