import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Standalone output is required for local Docker self-hosting, but unnecessary on Vercel
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  
};

export default nextConfig;
