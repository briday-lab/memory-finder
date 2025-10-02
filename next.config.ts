import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Simplified webpack config
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
