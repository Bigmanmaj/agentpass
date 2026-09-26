import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor SDK loads native modules at runtime; keep it out of the bundle.
  serverExternalPackages: ["@cursor/sdk"],
};

export default nextConfig;
