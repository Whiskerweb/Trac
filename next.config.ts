import type { NextConfig } from "next";

// Tinybird API URL with fallback for robustness
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.tinybird.co';

console.log('📢 Tinybird Proxy Target:', TINYBIRD_HOST);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
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
    ];
  },
};

export default nextConfig;
