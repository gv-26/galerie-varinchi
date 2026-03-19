import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['jose', 'resend', 'bcrypt'],
};

export default nextConfig;
