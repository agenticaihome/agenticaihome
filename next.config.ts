import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Temporarily disabled for dynamic routes
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
