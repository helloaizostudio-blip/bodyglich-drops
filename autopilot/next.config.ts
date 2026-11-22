import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / server-only packages must not be bundled.
  serverExternalPackages: ["better-sqlite3", "@resvg/resvg-js", "pg"],
  poweredByHeader: false,
};

export default nextConfig;
