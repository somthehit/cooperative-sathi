import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["exceljs"],
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
