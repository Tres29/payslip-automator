import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "node-cron"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "puppeteer", "@sparticuz/chromium"];
    }
    return config;
  },
};

export default nextConfig;
