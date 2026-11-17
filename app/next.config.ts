import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite (local development database) loads its own WebAssembly files; keep it out of the bundle
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
