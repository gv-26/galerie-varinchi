import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'resend',
    'async_hooks',
    '@neondatabase/serverless',
    'drizzle-orm',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'www.galerievarinchi.com',
        'galerievarinchi.com',
        'di99n8n4hpbj.cloudfront.net',
      ],
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'www.galerievarinchi.com' },
      { protocol: 'https', hostname: 'galerievarinchi.com' },
    ],
  },
};

export default nextConfig;
