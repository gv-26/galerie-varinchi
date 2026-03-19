import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@neondatabase/serverless', 'jose', 'resend', 'bcrypt'],
};

export default nextConfig;
