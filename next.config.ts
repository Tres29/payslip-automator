import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "node-cron"],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "puppeteer", "@sparticuz/chromium"];
    }
    return config;
  },
};

export default nextConfig;
