import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily removing static export to allow dynamic functionality
  // output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
