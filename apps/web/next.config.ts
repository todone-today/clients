import path from "node:path";
import type { NextConfig } from "next";

// The shared logic lives in sdk/ at the top of the repo, outside this app's folder.
const root = path.join(__dirname, "../../..");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@todone/sdk"],
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
