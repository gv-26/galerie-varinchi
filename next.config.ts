import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages with @cloudflare/next-on-pages: remove staticPageGenerationTimeout.
  // That option is for Vercel/Node server builds, not edge compilation.
};

export default nextConfig;
