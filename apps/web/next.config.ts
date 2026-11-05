import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The todone server answers /api. Forwarding it keeps one address for the browser: the session cookie,
  // OAuth callbacks, calendar and Markdown links all live on this site.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.SERVER_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
};

export default nextConfig;
