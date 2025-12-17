import type { NextConfig } from "next";

// Tinybird API URL with fallback for robustness
const TINYBIRD_HOST = process.env.NEXT_PUBLIC_TINYBIRD_HOST || 'https://api.tinybird.co';

console.log('📢 Tinybird Proxy Target:', TINYBIRD_HOST);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/analytics/:path*",
        destination: `${TINYBIRD_HOST}/:path*`,
      },
    ];
  },
};

export default nextConfig;
