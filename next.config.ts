import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jose', 'resend', 'async_hooks'],
  transpilePackages: ['@aws-sdk/client-s3'],
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
