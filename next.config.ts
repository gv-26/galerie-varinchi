import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jose', 'resend', '@aws-sdk/client-s3'],
};

export default nextConfig;
