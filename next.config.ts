import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'staging-apis-v2.oono.ai',
      },
      {
        protocol: 'https',
        hostname: 'media.oono.ai',
      },
      {
        protocol: 'https',
        hostname: 'cdn.arstechnica.net',
      },
    ],
  },
  // Performance: enable compression
  compress: true,
  // Allow AMP scripts
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
