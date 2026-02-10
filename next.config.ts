import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to silence webpack/turbopack conflict
  turbopack: {},
  webpack(config) {
    // Enable WASM support for ergo-lib-wasm-browser
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
