import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jose', 'resend'],
  transpilePackages: ['@aws-sdk/client-s3'],
};

export default nextConfig;
