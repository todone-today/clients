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
  // The todone server answers /api. Forwarding it keeps one address for the browser: the session cookie,
  // OAuth callbacks, calendar and Markdown links all live on this site.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.SERVER_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
};

export default nextConfig;
